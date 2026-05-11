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
    console.error('[refreshIvsStreamKey] ❌ Error:', error.message);
    return Response.json({
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR',
    }, { status: 500 });
  }
});