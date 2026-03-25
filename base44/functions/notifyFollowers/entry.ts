import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { video_id, channel_id, channel_name, video_title, thumbnail_url } = await req.json();

    // Get all followers of this channel
    const follows = await base44.asServiceRole.entities.ChannelFollow.filter({ channel_id });

    if (follows.length === 0) {
      return Response.json({ notified: 0 });
    }

    // Create a notification for each follower
    const notifications = follows.map((f) => ({
      user_email: f.follower_email,
      type: "new_video",
      title: `${channel_name} が新しい動画を投稿しました`,
      message: video_title,
      link: `/watch/${video_id}`,
      channel_id,
      video_id,
      thumbnail_url: thumbnail_url || "",
      is_read: false,
    }));

    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    return Response.json({ notified: notifications.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});