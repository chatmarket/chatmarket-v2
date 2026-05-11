// @ts-nocheck
/* global Deno */
/**
 * refreshIvsStreamKey
 *
 * 既存IVSチャンネルARNに紐付くストリームキーを AWS API から直接取得・検証し、
 * 無効なら即座に再生成（CreateStreamKey）して返す。
 * DBキャッシュを一切信頼しない「新鮮な鍵」を保証する。
 *
 * Input: { channelArn: string }
 * Output: { streamKey, ingestEndpoint, rtmpsUrl, playbackUrl, regenerated: bool }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  IvsClient,
  ListStreamKeysCommand,
  GetStreamKeyCommand,
  CreateStreamKeyCommand,
  DeleteStreamKeyCommand,
  GetChannelCommand,
} from 'npm:@aws-sdk/client-ivs@3.1029.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { channelArn } = body;

    if (!channelArn) {
      return Response.json({ error: 'channelArn is required' }, { status: 400 });
    }

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials missing', code: 'AWS_CREDENTIALS_MISSING' }, { status: 500 });
    }

    const ivsClient = new IvsClient({ region, credentials: { accessKeyId, secretAccessKey } });

    // 1. チャンネル情報をAWSから直接取得（DB不使用）
    console.log(`[refreshIvsStreamKey] Fetching channel from AWS: ${channelArn}`);
    const channelRes = await ivsClient.send(new GetChannelCommand({ arn: channelArn }));
    const channel = channelRes.channel;

    if (!channel) {
      return Response.json({ error: 'Channel not found in AWS', code: 'CHANNEL_NOT_FOUND' }, { status: 404 });
    }

    const ingestEndpoint = channel.ingestEndpoint;
    const playbackUrl = channel.playbackUrl;

    // 2. このチャンネルARNに紐付くストリームキー一覧をAWSから直接取得
    const listRes = await ivsClient.send(new ListStreamKeysCommand({ channelArn }));
    const streamKeyArns = listRes.streamKeys || [];

    console.log(`[refreshIvsStreamKey] Found ${streamKeyArns.length} stream key(s) for ARN: ${channelArn}`);

    let streamKey = null;
    let regenerated = false;

    if (streamKeyArns.length > 0) {
      // 既存キーを GetStreamKey で取得（valueフィールドを含む完全なキー）
      const keyArn = streamKeyArns[0].arn;
      const keyRes = await ivsClient.send(new GetStreamKeyCommand({ arn: keyArn }));
      streamKey = keyRes.streamKey?.value || null;

      // キー値が空/無効なら再生成
      if (!streamKey || streamKey.length < 10) {
        console.warn(`[refreshIvsStreamKey] ⚠️ Stream key value invalid, regenerating...`);
        // 古いキーを削除
        await ivsClient.send(new DeleteStreamKeyCommand({ arn: keyArn })).catch(() => {});
        streamKey = null;
      }
    }

    // 3. キーが存在しないか無効 → 新しいキーを生成
    if (!streamKey) {
      console.log(`[refreshIvsStreamKey] 🔑 Creating new stream key for channel: ${channelArn}`);
      const createKeyRes = await ivsClient.send(new CreateStreamKeyCommand({ channelArn }));
      streamKey = createKeyRes.streamKey?.value || null;
      regenerated = true;

      if (!streamKey) {
        throw new Error('新しいストリームキーの生成に失敗しました');
      }
    }

    // 4. DB（IvsChannelRegistry）を最新情報で更新
    try {
      const existing = await base44.asServiceRole.entities.IvsChannelRegistry.filter({ channel_arn: channelArn });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.IvsChannelRegistry.update(existing[0].id, {
          stream_key: streamKey,
          ingest_endpoint: ingestEndpoint,
          playback_url: playbackUrl,
          notes: `Refreshed${regenerated ? ' (regenerated)' : ''} at ${new Date().toISOString()}`,
        });
      }
    } catch (dbErr) {
      console.warn('[refreshIvsStreamKey] DB update failed (non-critical):', dbErr.message);
    }

    const rtmpsUrl = `rtmps://${ingestEndpoint}:443/app/`;
    console.log(`[refreshIvsStreamKey] ✅ Fresh key ready. regenerated=${regenerated}, ingestEndpoint=${ingestEndpoint}`);

    return Response.json({
      success: true,
      streamKey,
      ingestEndpoint,
      rtmpsUrl,
      playbackUrl,
      regenerated,
      channelArn,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[refreshIvsStreamKey] 💥 エラー発生:', error.message);
    
    let friendlyMsg = 'ストリームキーの更新に失敗しました';
    let suggestion = '再度試してください';
    let code = 'UNKNOWN_ERROR';

    if (error.message.includes('not found') || error.message.includes('NotFound')) {
      code = 'CHANNEL_NOT_FOUND';
      friendlyMsg = '❌ IVSチャンネルが見つかりません';
      suggestion = 'チャンネルが削除されている可能性があります。管理者に「IVSチャンネルを強制リセット」を依頼してください。';
    } else if (error.message.includes('InvalidChannel')) {
      code = 'INVALID_CHANNEL';
      friendlyMsg = '❌ チャンネルが無効です';
      suggestion = '管理者ダッシュボード → ライブ配信 → 「IVSチャンネルを強制リセット」を実行してください。';
    } else if (error.message.includes('AccessDenied') || error.message.includes('Forbidden')) {
      code = 'AWS_PERMISSION_DENIED';
      friendlyMsg = '❌ AWS権限がありません（403 Forbidden）';
      suggestion = 'IAMユーザーに IVS 権限が付与されているか確認してください。';
    } else if (error.message.includes('credentials')) {
      code = 'AWS_CREDENTIALS_ERROR';
      friendlyMsg = '❌ AWS認証情報が無効です';
      suggestion = 'Base44ダッシュボード → 設定 → 環境変数 で AWS_ACCESS_KEY_ID と AWS_SECRET_ACCESS_KEY を確認してください。';
    } else if (error.message.includes('生成に失敗')) {
      code = 'CREATE_KEY_FAILED';
      friendlyMsg = '❌ ストリームキーの生成に失敗しました';
      suggestion = '強制リセット機能を試してください。';
    }

    console.error(`[refreshIvsStreamKey] エラーコード: ${code}`);
    console.error(`[refreshIvsStreamKey] 詳細: ${error.message}`);
    console.error(`[refreshIvsStreamKey] 提案: ${suggestion}`);

    return Response.json({
      error: friendlyMsg,
      code,
      suggestion,
      details: error.message,
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});