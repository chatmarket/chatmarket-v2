import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// Backend enforcement of upload restrictions:
// 1. Free video limit: max 1 per 7 days
// 2. Daily duration limit: max 120 minutes per day
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { is_free, duration_seconds } = await req.json();

  const now = new Date();
  const oneWeekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  // Fetch only this user's videos (server-side filter)
  const userVideos = await base44.entities.Video.filter({ created_by: user.email }, "-created_date", 500);

  // Check free video limit
  if (is_free) {
    const recentFreeVideos = userVideos.filter(
      (v) => v.is_free && v.created_date >= oneWeekAgo
    );
    if (recentFreeVideos.length >= 1) {
      return Response.json({
        allowed: false,
        reason: 'free_limit',
        message: '無料動画は1週間に1本までです。'
      });
    }
  }

  // Check daily duration limit (7200 seconds = 120 minutes)
  const todayVideos = userVideos.filter((v) => v.created_date >= todayStart);
  const todayTotalSeconds = todayVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
  const remaining = 7200 - todayTotalSeconds;

  if (duration_seconds > remaining) {
    return Response.json({
      allowed: false,
      reason: 'duration_limit',
      message: `本日のアップロード可能時間を超えています。残り: ${Math.floor(remaining / 60)}分`,
      remaining_seconds: remaining
    });
  }

  return Response.json({
    allowed: true,
    remaining_seconds: remaining,
    today_used_seconds: todayTotalSeconds
  });
});