// Daily 2-hour usage limit check for streams, calls, and uploads
// Covers: video uploads, live streams, video calls
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DAILY_LIMIT_SECONDS = 7200; // 2 hours = 120 minutes

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action_type, duration_seconds } = await req.json();
    // action_type: 'upload' | 'stream' | 'call'
    // duration_seconds: how many seconds this action would consume

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // Sum today's video upload durations
    const userVideos = await base44.entities.Video.filter({ created_by: user.email }, '-created_date', 100);
    const todayVideos = userVideos.filter(v => v.created_date >= todayStart);
    const uploadedSeconds = todayVideos.reduce((sum, v) => sum + (parseInt(v.duration) || 0), 0);

    // Sum today's live streams
    const userStreams = await base44.entities.LiveStream.filter({ channel_id: '' }, '-created_date', 50)
      .catch(() => []);
    // Filter by created_by using channel owner
    const channels = await base44.entities.Channel.filter({ owner_email: user.email });
    const channelIds = channels.map(c => c.id);
    const todayStreams = userStreams.filter(s => channelIds.includes(s.channel_id) && s.created_date >= todayStart && s.status !== 'scheduled');
    const streamedSeconds = todayStreams.reduce((sum, s) => sum + ((s.duration || 0) * 60), 0);

    // Sum today's video calls
    const userCalls = await base44.entities.VideoCall.filter({ caller_email: user.email }, '-created_date', 50);
    const todayCalls = userCalls.filter(c => c.created_date >= todayStart && (c.status === 'ended' || c.status === 'active'));
    const callSeconds = todayCalls.reduce((sum, c) => sum + ((c.duration_minutes || 0) * 60), 0);

    const totalUsed = uploadedSeconds + streamedSeconds + callSeconds;
    const remaining = Math.max(0, DAILY_LIMIT_SECONDS - totalUsed);
    const requested = duration_seconds || 0;

    if (requested > remaining) {
      return Response.json({
        allowed: false,
        reason: 'daily_limit',
        message: `本日のアップロード制限に達しています。残り利用可能時間: ${Math.floor(remaining / 60)}分 / 制限: 120分`,
        remaining_seconds: remaining,
        total_used_seconds: totalUsed,
      });
    }

    return Response.json({
      allowed: true,
      remaining_seconds: remaining,
      total_used_seconds: totalUsed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});