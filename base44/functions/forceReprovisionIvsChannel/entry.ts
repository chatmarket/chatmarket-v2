/**
 * === forceReprovisionIvsChannel ===
 * IVSチャンネルの強制リセット機能
 * 既存のチャンネルを完全に削除して新しいチャンネルをゼロから作成
 * 「ストリームキーが無効」エラーが頻発する場合の最終手段
 */

import {
  IvsClient,
  DeleteChannelCommand,
  CreateChannelCommand,
  ListStreamKeysCommand,
  GetStreamKeyCommand,
  GetChannelCommand,
} from 'npm:@aws-sdk/client-ivs@3.1029.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'ユーザーが認証されていません' }, { status: 401 });
    }

    // 管理者のみ実行可能
    const superAdmins = Deno.env.get('SUPER_ADMIN_EMAILS')?.split(',').map(e => e.trim()) || [];
    if (!superAdmins.includes(user.email)) {
      console.warn(`[forceReprovision] ⚠️ 権限なしアクセス: ${user.email}`);
      return Response.json({ error: '権限がありません（管理者のみ）' }, { status: 403 });
    }

    const { streamId } = await req.json().catch(() => ({}));
    if (!streamId) {
      return Response.json({ error: 'streamIdが必要です' }, { status: 400 });
    }

    // AWS 認証情報
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';

    if (!accessKeyId || !secretAccessKey) {
      const msg = 'AWS認証情報が未設定です（AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY）';
      console.error(`[forceReprovision] ❌ ${msg}`);
      return Response.json({ error: msg, code: 'AWS_CREDENTIALS_MISSING' }, { status: 500 });
    }

    const ivsClient = new IvsClient({
      credentials: { accessKeyId, secretAccessKey },
      region,
    });

    // 既存のLiveStream取得
    let stream = null;
    try {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      stream = streams[0];
    } catch (err) {
      console.error(`[forceReprovision] ⚠️ LiveStream取得エラー: ${err.message}`);
      return Response.json({ error: 'LiveStreamの取得に失敗しました' }, { status: 404 });
    }

    if (!stream) {
      return Response.json({ error: 'LiveStreamが見つかりません' }, { status: 404 });
    }

    const oldChannelArn = stream.ivs_channel_arn;
    if (!oldChannelArn) {
      return Response.json({ error: '既存のチャンネルARNが見つかりません' }, { status: 400 });
    }

    console.log(`[forceReprovision] 🔄 強制リセット開始`);
    console.log(`[forceReprovision] 古いチャンネルARN: ${oldChannelArn}`);

    // ステップ1: 古いチャンネルを削除
    try {
      await ivsClient.send(new DeleteChannelCommand({ arn: oldChannelArn }));
      console.log(`[forceReprovision] ✅ 古いチャンネル削除完了`);
    } catch (err) {
      // ChannelNotFound は無視（既に削除済み）
      if (!err.message?.includes('not found')) {
        console.warn(`[forceReprovision] ⚠️ 削除エラー（無視）: ${err.message}`);
      } else {
        console.log(`[forceReprovision] ℹ️ チャンネル既に削除済み`);
      }
    }

    // ステップ2: 新しいチャンネルを作成
    let newChannelArn = null;
    let channelId = null;
    try {
      const createRes = await ivsClient.send(
        new CreateChannelCommand({
          name: `live-${Date.now()}`,
          type: 'STANDARD',
          latencyMode: 'LOW',
        })
      );
      newChannelArn = createRes.channel.arn;
      channelId = createRes.channel.id;
      console.log(`[forceReprovision] ✅ 新しいチャンネル作成完了`);
      console.log(`[forceReprovision] 新しいチャンネルARN: ${newChannelArn}`);
    } catch (err) {
      const msg = `新しいチャンネル作成に失敗`;
      console.error(`[forceReprovision] ❌ ${msg}: ${err.message}`);
      return Response.json({ 
        error: msg,
        code: 'CREATE_CHANNEL_FAILED',
        detail: err.message 
      }, { status: 500 });
    }

    // ステップ3: チャンネル情報を取得
    let ingestEndpoint = null;
    let playbackUrl = null;
    try {
      const channelRes = await ivsClient.send(
        new GetChannelCommand({ arn: newChannelArn })
      );
      ingestEndpoint = channelRes.channel.ingestEndpoint;
      playbackUrl = channelRes.channel.playbackUrl;
      console.log(`[forceReprovision] ✅ チャンネル情報取得完了`);
    } catch (err) {
      console.warn(`[forceReprovision] ⚠️ チャンネル情報取得エラー（スキップ）: ${err.message}`);
    }

    // ステップ4: ストリームキーを取得
    let streamKey = null;
    try {
      const keyListRes = await ivsClient.send(
        new ListStreamKeysCommand({ channelArn: newChannelArn })
      );
      
      if (keyListRes.streamKeys && keyListRes.streamKeys.length > 0) {
        const keyArn = keyListRes.streamKeys[0].arn;
        const keyRes = await ivsClient.send(
          new GetStreamKeyCommand({ arn: keyArn })
        );
        streamKey = keyRes.streamKey?.value;
      }

      if (!streamKey) {
        throw new Error('ストリームキーの値を取得できません');
      }
      
      console.log(`[forceReprovision] ✅ ストリームキー取得成功 (${streamKey?.substring(0, 8)}...)`);
    } catch (err) {
      const msg = `ストリームキー取得に失敗`;
      console.error(`[forceReprovision] ❌ ${msg}: ${err.message}`);
      
      // チャンネル作成後のエラーなので、ロールバック
      try {
        await ivsClient.send(new DeleteChannelCommand({ arn: newChannelArn }));
        console.log(`[forceReprovision] ⚠️ ロールバック実施`);
      } catch (_) {}

      return Response.json({
        error: msg,
        code: 'GET_STREAM_KEY_FAILED',
        detail: err.message,
      }, { status: 500 });
    }

    // ステップ5: DB を更新
    try {
      await base44.entities.LiveStream.update(streamId, {
        ivs_channel_arn: newChannelArn,
        ivs_stream_key: streamKey,
        ivs_ingest_endpoint: ingestEndpoint || 'a.rtmp.youtube.com',
        ivs_playback_url: playbackUrl || `https://d-${channelId}.cloudfront.net/`,
      });
      console.log(`[forceReprovision] ✅ DB更新完了`);
    } catch (err) {
      console.error(`[forceReprovision] ⚠️ DB更新エラー: ${err.message}`);
      // DB更新失敗してもキーは返す
    }

    const response = {
      success: true,
      message: '✅ IVSチャンネルを強制リセットしました。新しいキーが生成されています。',
      oldChannelArn,
      newChannelArn,
      streamKey,
      ingestEndpoint: ingestEndpoint || 'a.rtmp.youtube.com',
      playbackUrl: playbackUrl || `https://d-${channelId}.cloudfront.net/`,
      rtmpsUrl: `rtmps://${ingestEndpoint || 'a.rtmp.youtube.com'}:443/app/${streamKey}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[forceReprovision] 🎉 強制リセット成功`);
    return Response.json(response);
  } catch (err) {
    console.error(`[forceReprovision] 💥 予期しないエラー: ${err.message}`);
    return Response.json({
      error: '予期しないエラーが発生しました',
      detail: err.message,
    }, { status: 500 });
  }
});