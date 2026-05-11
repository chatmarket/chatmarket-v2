/**
 * === provisionChannelStreamKey ===
 * チャンネルの IVS ストリームキーを初回だけ生成・永続化
 * 配信者1人につき1つの固定キー（生涯ツール）を作成
 */

import {
  IvsClient,
  CreateChannelCommand,
  ListStreamKeysCommand,
  GetStreamKeyCommand,
} from 'npm:@aws-sdk/client-ivs@3.1029.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'ユーザーが認証されていません' }, { status: 401 });
    }

    const { channel_id } = await req.json().catch(() => ({}));
    if (!channel_id) {
      return Response.json({ error: 'channel_idが必要です' }, { status: 400 });
    }

    // チャンネル取得
    const channels = await base44.entities.Channel.filter({ id: channel_id });
    const channel = channels[0];
    if (!channel) {
      return Response.json({ error: 'チャンネルが見つかりません' }, { status: 404 });
    }

    // オーナー確認
    if (channel.owner_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'このチャンネルの編集権限がありません' }, { status: 403 });
    }

    // 既にストリームキーが設定されている → 既存キーを返す
    if (channel.ivs_channel_arn && channel.ivs_stream_key) {
      console.log(`[provisionChannelStreamKey] ✅ 既存キーを返却: ${channel.owner_email}`);
      return Response.json({
        success: true,
        message: '既存のストリームキーを使用します',
        channel_arn: channel.ivs_channel_arn,
        stream_key: channel.ivs_stream_key,
        ingest_endpoint: channel.ivs_ingest_endpoint,
        playback_url: channel.ivs_playback_url,
        is_new: false,
      });
    }

    // AWS 認証情報
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';

    if (!accessKeyId || !secretAccessKey) {
      const msg = 'AWS認証情報が未設定です';
      console.error(`[provisionChannelStreamKey] ❌ ${msg}`);
      return Response.json({ error: msg, code: 'AWS_CREDENTIALS_MISSING' }, { status: 500 });
    }

    const ivsClient = new IvsClient({
      credentials: { accessKeyId, secretAccessKey },
      region,
    });

    // ステップ1: 新しいIVSチャンネルを作成（初回のみ）
    console.log(`[provisionChannelStreamKey] 🔄 IVSチャンネル初期化開始: ${channel.owner_email}`);

    let channelArn = null;
    let ingestEndpoint = null;
    let playbackUrl = null;

    try {
      const createRes = await ivsClient.send(
        new CreateChannelCommand({
          name: `channel-${channel_id}-${Date.now()}`,
          type: 'STANDARD',
          latencyMode: 'LOW',
        })
      );
      channelArn = createRes.channel.arn;
      ingestEndpoint = createRes.channel.ingestEndpoint;
      playbackUrl = createRes.channel.playbackUrl;
      console.log(`[provisionChannelStreamKey] ✅ IVSチャンネル作成: ${channelArn}`);
    } catch (err) {
      console.error(`[provisionChannelStreamKey] ❌ チャンネル作成失敗: ${err.message}`);
      return Response.json({
        error: 'IVSチャンネルの作成に失敗しました',
        code: 'CREATE_CHANNEL_FAILED',
        detail: err.message,
      }, { status: 500 });
    }

    // ステップ2: ストリームキーを取得
    let streamKey = null;
    try {
      const keyListRes = await ivsClient.send(
        new ListStreamKeysCommand({ channelArn })
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

      console.log(`[provisionChannelStreamKey] ✅ ストリームキー取得: ${streamKey?.substring(0, 8)}...`);
    } catch (err) {
      console.error(`[provisionChannelStreamKey] ❌ ストリームキー取得失敗: ${err.message}`);
      return Response.json({
        error: 'ストリームキーの取得に失敗しました',
        code: 'GET_STREAM_KEY_FAILED',
        detail: err.message,
      }, { status: 500 });
    }

    // ステップ3: チャンネルエンティティを永続化更新
    try {
      await base44.entities.Channel.update(channel_id, {
        ivs_channel_arn: channelArn,
        ivs_stream_key: streamKey,
        ivs_ingest_endpoint: ingestEndpoint,
        ivs_playback_url: playbackUrl,
        ivs_provisioned_at: new Date().toISOString(),
      });
      console.log(`[provisionChannelStreamKey] ✅ チャンネル永続化完了`);
    } catch (err) {
      console.error(`[provisionChannelStreamKey] ⚠️ DB更新エラー: ${err.message}`);
      // DB更新失敗してもキーは返す
    }

    const response = {
      success: true,
      message: '✅ ストリームキーを初期化しました。このキーは生涯有効です。',
      channel_arn: channelArn,
      stream_key: streamKey,
      ingest_endpoint: ingestEndpoint,
      playback_url: playbackUrl,
      is_new: true,
      rtmps_url: `rtmps://${ingestEndpoint}:443/app/${streamKey}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[provisionChannelStreamKey] 🎉 初期化完了: ${channel.owner_email}`);
    return Response.json(response);
  } catch (err) {
    console.error(`[provisionChannelStreamKey] 💥 予期しないエラー: ${err.message}`);
    return Response.json({
      error: '予期しないエラーが発生しました',
      detail: err.message,
    }, { status: 500 });
  }
});