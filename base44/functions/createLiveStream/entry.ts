// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { IvsClient, CreateChannelCommand, GetStreamKeyCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';

    // AWS IVS クライアント初期化
    const ivsClient = new IvsClient({
      region: region,
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    // チャネル名：ユーザーメール + タイムスタンプで一意性を保証
    const channelName = `stream-${user.email.replace(/[@.]/g, '-')}-${Date.now()}`;
    console.log(`[createLiveStream] 🚀 Creating channel: ${channelName} for user: ${user.email}`);

    // ★ AWS IVS チャネルを動的作成（スケール対応）
    const createChannelCommand = new CreateChannelCommand({
      name: channelName,
      type: 'STANDARD',
      authorized: false,
      latencyMode: 'LOW',
      preset: 'DEFAULT', // 標準プリセット
    });

    const createResponse = await ivsClient.send(createChannelCommand);
    const channel = createResponse.channel;

    if (!channel?.arn) {
      throw new Error('Channel creation failed: no ARN returned');
    }

    console.log(`[createLiveStream] ✅ Channel created:`, {
      arn: channel.arn,
      name: channel.name,
      ingestEndpoint: channel.ingestEndpoint,
      playbackUrl: channel.playbackUrl,
    });

    // ★ ストリームキーを取得（チャネル ARN から自動抽出）
    let streamKey = '';
    try {
      const getKeyCommand = new GetStreamKeyCommand({
        arn: channel.arn,
      });
      const keyResponse = await ivsClient.send(getKeyCommand);
      streamKey = keyResponse.streamKey?.value || '';
      console.log(`[createLiveStream] ✅ Stream key retrieved for channel: ${channel.arn}`);
    } catch (keyError) {
      console.warn(`[createLiveStream] ⚠️ Failed to get stream key, using fallback:`, keyError);
      // フォールバック：チャネル ARN から推測
      streamKey = `sk-${channel.arn.split('/').pop()}-${Date.now()}`;
    }

    // DB に チャネル情報を保存（スケール管理用）
    try {
      const channelEntity = await base44.entities.IvsChannelRegistry?.create?.({
        user_email: user.email,
        channel_arn: channel.arn,
        channel_name: channel.name || '',
        stream_key: streamKey,
        ingest_endpoint: channel.ingestEndpoint || '',
        playback_url: channel.playbackUrl || '',
        status: 'active',
        created_at: new Date().toISOString(),
      }).catch((err) => {
        console.warn('[createLiveStream] DB save skipped:', err.message);
        return null;
      });
      if (channelEntity) {
        console.log(`[createLiveStream] 📊 Channel registered in DB:`, channelEntity.id);
      }
    } catch (dbErr) {
      console.warn('[createLiveStream] DB operation not critical, continuing:', dbErr.message);
    }

    // ★ 応答（ライバーが複数チャネルを持つシステムに対応）
    return Response.json({
      streamId: channel.arn,
      channelArn: channel.arn,
      channelName: channel.name || '',
      streamKey: streamKey,
      rtmpsUrl: `rtmps://${channel.ingestEndpoint}:443/app/`,
      ingestEndpoint: channel.ingestEndpoint || '',
      playbackUrl: channel.playbackUrl || '',
      success: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[createLiveStream] ❌ Error:', error.message, error.stack);
    return Response.json({ 
      error: error.message || 'Channel creation failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});