import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// コンテンツモデレーション: 動画を審査待ち/承認/却下する
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { video_id, action, reason } = await req.json(); // action: "approve" | "reject"

    const videos = await base44.entities.Video.filter({ id: video_id });
    if (videos.length === 0) {
      return Response.json({ error: 'Video not found' }, { status: 404 });
    }

    const video = videos[0];

    if (action === "approve") {
      await base44.entities.Video.update(video_id, {
        moderation_status: "approved",
        moderation_note: "",
      });

      // フォロワーに通知
      await base44.asServiceRole.functions.invoke("notifyFollowers", {
        video_id,
        channel_id: video.channel_id,
        channel_name: video.channel_name,
        video_title: video.title,
        thumbnail_url: video.thumbnail_url || "",
      });

      // アップローダーに通知
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: video.created_by,
        from_name: "ChatMarket",
        subject: `【審査通過】動画「${video.title}」が公開されました`,
        body: `投稿した動画「${video.title}」の審査が完了し、公開されました。\n\nご利用ありがとうございます。\nChatMarket サポートチーム`,
      });
    } else if (action === "reject") {
      await base44.entities.Video.update(video_id, {
        moderation_status: "rejected",
        moderation_note: reason || "規約違反の可能性があります",
      });

      // アップローダーに通知
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: video.created_by,
        from_name: "ChatMarket",
        subject: `【審査不通過】動画「${video.title}」について`,
        body: `投稿した動画「${video.title}」の審査結果についてお知らせします。\n\n■ 結果: 非承認\n■ 理由: ${reason || "規約違反の可能性があります"}\n\n詳細はサポートまでお問い合わせください。\nTEL: 03-6821-6715\n\nChatMarket サポートチーム`,
      });
    }

    return Response.json({ success: true, action });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});