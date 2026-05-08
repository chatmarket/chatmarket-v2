import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * notifyFollowers
 *
 * 呼び出しパターン:
 *   A) ライブ配信開始（エンティティオートメーション経由）
 *      payload: { event, data } — LiveStream エンティティデータ
 *
 *   B) 動画投稿（フロントエンドから直接呼び出し）
 *      payload: { video_id, channel_id, channel_name, video_title, thumbnail_url }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // ── A: ライブ開始通知（オートメーション経由）──
    if (body.event?.entity_name === 'LiveStream') {
      const stream = body.data;
      if (!stream) return Response.json({ skipped: 'no stream data' });

      const { channel_id, channel_name, title, id: stream_id, thumbnail_url } = stream;

      // フォロワー全件取得
      const follows = await base44.asServiceRole.entities.ChannelFollow.filter({ channel_id });
      if (follows.length === 0) return Response.json({ notified: 0 });

      // ① アプリ内通知を一括生成
      const notifications = follows.map((f) => ({
        user_email: f.follower_email,
        type: 'new_video',
        title: `🔴 ${channel_name || 'ライバー'} がライブ配信を開始しました！`,
        message: title || 'ライブ配信中',
        link: `/live/${stream_id}`,
        channel_id,
        thumbnail_url: thumbnail_url || '',
        is_read: false,
        is_broadcast: false,
      }));
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

      // ② メール通知（フォロワー全員）
      const emailPromises = follows.map((f) =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: f.follower_email,
          from_name: channel_name || 'チャットマーケット',
          subject: `🔴 ${channel_name || 'ライバー'} がライブ配信を開始しました！`,
          body: `
<div style="font-family:sans-serif;max-width:480px;margin:auto;background:#0a0f0a;color:#fff;border-radius:16px;overflow:hidden;">
  <div style="background:linear-gradient(135deg,#0d2a0d,#061006);padding:32px 24px;text-align:center;">
    <p style="color:rgba(0,255,157,0.7);font-size:11px;letter-spacing:0.15em;margin:0 0 8px;">ChatMarket LIVE</p>
    <h1 style="color:#00ff9d;font-size:28px;margin:0;text-shadow:0 0 20px rgba(0,255,157,0.5);">🔴 LIVE配信中</h1>
  </div>
  <div style="padding:24px;">
    <p style="font-size:18px;font-weight:bold;margin:0 0 8px;">${channel_name || 'ライバー'} さんがライブ配信を開始しました！</p>
    <p style="color:#aaa;font-size:14px;margin:0 0 24px;">${title || 'ライブ配信中'}</p>
    <a href="https://chatmarket.info/live/${stream_id}"
       style="display:inline-block;background:linear-gradient(135deg,#00ff9d,#00d4aa);color:#000;font-weight:900;font-size:15px;padding:14px 32px;border-radius:12px;text-decoration:none;">
      今すぐ視聴する →
    </a>
    <p style="color:#555;font-size:11px;margin-top:24px;">
      このメールは ${f.follower_email} 宛に送信されました。<br>
      配信通知を停止するにはチャンネルのフォローを解除してください。
    </p>
  </div>
</div>
          `.trim(),
        }).catch((e) => console.warn(`[notifyFollowers] email failed: ${f.follower_email}`, e.message))
      );

      // メールは並列送信（失敗しても続行）
      await Promise.allSettled(emailPromises);

      console.log(`[notifyFollowers] LIVE: channel=${channel_id} followers=${follows.length} stream=${stream_id}`);
      return Response.json({ notified: follows.length, mode: 'live' });
    }

    // ── B: 動画投稿通知（従来の直接呼び出し）──
    const { video_id, channel_id, channel_name, video_title, thumbnail_url } = body;
    if (!channel_id) return Response.json({ error: 'channel_id required' }, { status: 400 });

    const follows = await base44.asServiceRole.entities.ChannelFollow.filter({ channel_id });
    if (follows.length === 0) return Response.json({ notified: 0 });

    const notifications = follows.map((f) => ({
      user_email: f.follower_email,
      type: 'new_video',
      title: `${channel_name} が新しい動画を投稿しました`,
      message: video_title,
      link: `/watch/${video_id}`,
      channel_id,
      video_id,
      thumbnail_url: thumbnail_url || '',
      is_read: false,
    }));
    await base44.asServiceRole.entities.Notification.bulkCreate(notifications);

    console.log(`[notifyFollowers] VIDEO: channel=${channel_id} followers=${follows.length}`);
    return Response.json({ notified: notifications.length, mode: 'video' });

  } catch (error) {
    console.error('[notifyFollowers] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});