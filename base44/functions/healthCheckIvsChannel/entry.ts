import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { IvsClient, GetChannelCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

/**
 * healthCheckIvsChannel
 * IVSチャンネル生存確認 + 404自動治癒
 * streamId または channelId のどちらでも動作（全ストリーム対応）
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId, channelId } = await req.json();

    if (!streamId && !channelId) {
      return Response.json({ error: 'Missing streamId or channelId' }, { status: 400 });
    }

    // ── ストリームIDまたはチャンネルIDどちらでも動作 ──
    let channelArn, dbRecord, recordId, isChannelMode;

    if (streamId) {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const stream = streams[0];
      if (!stream) return Response.json({ error: 'Stream not found' }, { status: 404 });
      channelArn = stream.ivs_channel_arn;
      dbRecord = stream;
      recordId = streamId;
      isChannelMode = false;
    } else {
      const channels = await base44.asServiceRole.entities.Channel.filter({ id: channelId });
      const channel = channels[0];
      if (!channel) return Response.json({ error: 'Channel not found' }, { status: 404 });
      channelArn = channel.ivs_channel_arn;
      dbRecord = channel;
      recordId = channelId;
      isChannelMode = true;
    }

    if (!channelArn) {
      console.log('[healthCheckIvsChannel] ⚠️ No channel ARN found, needs re-provisioning');
      return Response.json({
        success: false,
        error: 'No channel ARN',
        message: 'チャンネルが見つかりません。再生成が必要です。',
        requiresReprovision: true,
      });
    }

    // AWS IVSでチャンネル生存確認
    const ivsClient = new IvsClient({
      region: Deno.env.get('AWS_REGION'),
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
      },
    });

    try {
      const channelData = await ivsClient.send(new GetChannelCommand({ arn: channelArn }));
      console.log('[healthCheckIvsChannel] ✅ Channel exists on AWS:', channelArn);

      // プレイバックURLをDBと同期
      const currentPlaybackUrl = channelData.channel?.playbackUrl;
      const dbPlaybackUrl = dbRecord.ivs_playback_url;

      if (currentPlaybackUrl && currentPlaybackUrl !== dbPlaybackUrl) {
        console.log('[healthCheckIvsChannel] 🔄 Syncing playback URL');
        if (isChannelMode) {
          await base44.asServiceRole.entities.Channel.update(recordId, { ivs_playback_url: currentPlaybackUrl });
        } else {
          await base44.entities.LiveStream.update(recordId, { ivs_playback_url: currentPlaybackUrl });
        }
      }

      return Response.json({
        success: true,
        message: 'Channel is healthy',
        channelArn,
        playbackUrl: currentPlaybackUrl,
        status: 'active',
        synced: true,
        selfHealed: false,
        timestamp: new Date().toISOString(),
      });

    } catch (ivsErr) {
      // チャンネルが削除されている → 自動治癒トリガー
      console.log('[healthCheckIvsChannel] ⚠️ Channel unavailable:', ivsErr.message);
      console.log('[healthCheckIvsChannel] 🔧 Triggering self-healing re-provision...');

      // チャンネルモードなら即時再プロビジョニング
      if (isChannelMode) {
        try {
          await base44.asServiceRole.functions.invoke('provisionChannelStreamKey', { channel_id: recordId });
          console.log('[healthCheckIvsChannel] ✅ Self-heal re-provision triggered for channel:', recordId);
        } catch (reprovErr) {
          console.warn('[healthCheckIvsChannel] Re-provision failed:', reprovErr.message);
        }
      }

      return Response.json({
        success: false,
        error: 'Channel unavailable',
        message: 'AWS上のチャンネルが見つかりません。自動復旧を開始します...',
        requiresReprovision: true,
        autoReprovisionTriggered: isChannelMode,
        timestamp: new Date().toISOString(),
      });
    }

  } catch (error) {
    console.error('[healthCheckIvsChannel] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});