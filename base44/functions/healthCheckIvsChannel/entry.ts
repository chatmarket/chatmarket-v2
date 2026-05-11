import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { IvsClient, GetChannelCommand, GetPlaybackKeyPairCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

/**
 * healthCheckIvsChannel
 * IVSチャンネル生存確認 + プレイリストURL同期
 * 社長のストリームキーがAWS上に存在するか確認、なければ再生成
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await req.json();
    
    if (!streamId) {
      return Response.json({ error: 'Missing streamId' }, { status: 400 });
    }

    // ライブストリーム情報取得
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    const stream = streams[0];
    
    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    const channelArn = stream.ivs_channel_arn;
    if (!channelArn) {
      console.log('[healthCheckIvsChannel] ⚠️ No channel ARN found, needs re-provisioning');
      return Response.json({ 
        success: false, 
        error: 'No channel ARN',
        message: 'チャンネルが見つかりません。再生成が必要です。',
        requiresReprovision: true
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
      const getChannelCommand = new GetChannelCommand({ arn: channelArn });
      const channelData = await ivsClient.send(getChannelCommand);
      
      console.log('[healthCheckIvsChannel] ✅ Channel exists on AWS:', channelArn);
      
      // プレイバックURL が DB と一致するか確認
      const currentPlaybackUrl = channelData.channel?.playbackUrl;
      const dbPlaybackUrl = stream.ivs_playback_url;
      
      if (currentPlaybackUrl && currentPlaybackUrl !== dbPlaybackUrl) {
        console.log('[healthCheckIvsChannel] 🔄 Syncing playback URL:', {
          old: dbPlaybackUrl,
          new: currentPlaybackUrl
        });
        
        // DBのURLを最新情報で同期
        await base44.entities.LiveStream.update(streamId, {
          ivs_playback_url: currentPlaybackUrl,
        });
      }

      return Response.json({
        success: true,
        message: 'Channel is healthy',
        channelArn,
        playbackUrl: currentPlaybackUrl,
        ivsPlaybackUrl: currentPlaybackUrl,
        status: 'active',
        synced: true,
        timestamp: new Date().toISOString(),
      });
      
    } catch (ivsErr) {
      // チャンネルが削除されている場合
      console.log('[healthCheckIvsChannel] ❌ Channel deleted or unavailable:', ivsErr.message);
      
      return Response.json({
        success: false,
        error: 'Channel unavailable',
        message: 'AWS上のチャンネルが見つかりません。再生成中...',
        requiresReprovision: true,
        timestamp: new Date().toISOString(),
      });
    }
    
  } catch (error) {
    console.error('[healthCheckIvsChannel] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});