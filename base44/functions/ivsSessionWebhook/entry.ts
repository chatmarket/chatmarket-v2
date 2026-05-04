/**
 * ivsSessionWebhook — AWS IVS EventBridge Webhook
 *
 * フロー: AWS IVS → EventBridge → HTTP API Target → この関数
 *
 * セキュリティ:
 *   環境変数 IVS_WEBHOOK_SECRET を専用シークレットとして使用。
 *   AWSのEventBridgeターゲットURLに ?secret=<IVS_WEBHOOK_SECRET の値> を付与すること。
 *   シークレットが一致しない場合は 401 を返す。スキップは一切行わない。
 *
 * イベント種別 (detail.state):
 *   "Start" → LiveStream.status = "live",  live_started_at を記録
 *   "End"   → LiveStream.status = "ended", live_ended_at  を記録
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * フォロワーへプッシュ通知とメール通知を送信
 */
async function notifyFollowersAsync(base44, stream) {
  const channelId = stream.channel_id;
  const streamTitle = stream.title || "新しい配信";
  const streamUrl = `https://${Deno.env.get("VERCEL_URL") || "localhost:5173"}/live/${stream.id}`;

  console.log(`[notifyFollowersAsync] 🔔 Fetching followers for channel: ${channelId}`);

  // フォロワーを取得
  const followers = await base44.asServiceRole.entities.ChannelFollow.filter({
    channel_id: channelId,
  });

  if (!followers || followers.length === 0) {
    console.log(`[notifyFollowersAsync] ℹ️ No followers for channel ${channelId}`);
    return;
  }

  console.log(`[notifyFollowersAsync] 📢 Found ${followers.length} followers`);

  // フォロワーごとに通知を送信（非同期並列）
  const promises = followers.map(async (follow) => {
    const followerEmail = follow.follower_email;
    const followerName = follow.channel_name;

    try {
      // 1. Notification エンティティに記録
      await base44.asServiceRole.entities.Notification.create({
        user_email: followerEmail,
        type: "new_video",
        title: "お気に入りのライバーが配信を開始しました！",
        message: `${followerName} が「${streamTitle}」の配信を開始しました`,
        link: streamUrl,
        is_read: false,
        channel_id: channelId,
        channel_name: followerName,
      }).catch(err => console.error(`[notifyFollowersAsync] Failed to create notification: ${err}`));

      // 2. メール送信（Core.SendEmail インテグレーション）
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: followerEmail,
        subject: `【ChatMarket】${followerName}が配信を開始しました！`,
        body: `
<h2>お気に入りのライバーが配信を開始しました！</h2>
<p><strong>${followerName}</strong> が新しい配信を開始しました。</p>
<h3>配信タイトル</h3>
<p>${streamTitle}</p>
<p><a href="${streamUrl}" style="background:linear-gradient(135deg,#10b981,#059669);color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">配信を視聴する</a></p>
<p style="color:#999;font-size:12px;">このメールはお気に入り通知設定に基づいて送信されています。</p>
        `,
      }).catch(err => console.error(`[notifyFollowersAsync] Failed to send email to ${followerEmail}: ${err}`));

      console.log(`[notifyFollowersAsync] ✅ Notified: ${followerEmail}`);
    } catch (err) {
      console.error(`[notifyFollowersAsync] ❌ Error notifying ${followerEmail}:`, err);
    }
  });

  await Promise.all(promises);
  console.log(`[notifyFollowersAsync] ✅ All follower notifications sent`);
}

Deno.serve(async (req) => {
  try {
    // ─── 1. シークレット厳格検証（スキップ禁止） ───────────────────────
    const expectedSecret = Deno.env.get("IVS_WEBHOOK_SECRET");
    if (!expectedSecret) {
      console.error("[ivsSessionWebhook] ❌ FATAL: IVS_WEBHOOK_SECRET is not set");
      return Response.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const urlObj = new URL(req.url);
    const incomingSecret = urlObj.searchParams.get("secret");

    if (!incomingSecret || incomingSecret !== expectedSecret) {
      console.warn("[ivsSessionWebhook] ❌ Unauthorized: secret missing or mismatch");
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[ivsSessionWebhook] ✅ Secret verified");

    // ─── 2. リクエストボディ解析 ────────────────────────────────────────
    const body = await req.json();
    console.log("[ivsSessionWebhook] 📨 Received:", JSON.stringify(body, null, 2));

    const eventType  = body["detail-type"] || "";
    const detail     = body.detail || {};
    // AWSはARNを resources 配列で送ってくる
    const channelArn = (body.resources && body.resources[0]) || detail.channel_arn || detail.channelArn || "";
    const eventName  = detail.event_name || "";

    console.log(`[ivsSessionWebhook] eventType="${eventType}", event_name="${eventName}", channelArn="${channelArn}"`);

    if (eventType !== "IVS Stream State Change") {
      console.log(`[ivsSessionWebhook] ℹ️ Unhandled event type: ${eventType}`);
      return Response.json({ message: "event received but not handled", eventType });
    }

    const base44 = createClientFromRequest(req);

    // ─── 3a. Stream Start → "live" ──────────────────────────────────────
    if (eventName === "Stream Start") {
      console.log(`[ivsSessionWebhook] 🟢 Stream START — ARN: ${channelArn}`);

      // scheduled のものを優先して検索、なければ ended 以外全件
      let streams = await base44.asServiceRole.entities.LiveStream.filter({
        ivs_channel_arn: channelArn,
        status: "scheduled",
      });

      if (!streams || streams.length === 0) {
        streams = await base44.asServiceRole.entities.LiveStream.filter({
          ivs_channel_arn: channelArn,
        });
      }

      const stream = streams?.find(s => s.status !== "ended") || streams?.[0];

      if (!stream) {
        console.warn(`[ivsSessionWebhook] ⚠️ No stream found for ARN: ${channelArn}`);
        return Response.json({ message: "stream not found", channelArn });
      }

      if (stream.status === "live") {
        console.log(`[ivsSessionWebhook] ℹ️ Already live: ${stream.id}`);
        return Response.json({ message: "already live", stream_id: stream.id });
      }

      await base44.asServiceRole.entities.LiveStream.update(stream.id, {
        status: "live",
        live_started_at: new Date().toISOString(),
      });

      if (stream.channel_id) {
        await base44.asServiceRole.entities.Channel.update(stream.channel_id, {
          is_live: true,
        }).catch(() => {});
      }

      console.log(`[ivsSessionWebhook] ✅ Marked LIVE: ${stream.id} "${stream.title}"`);

      // ─── フォロワー通知（非同期で実行、エラーが本処理をブロックしない） ───
      notifyFollowersAsync(base44, stream).catch(err => {
        console.error("[ivsSessionWebhook] ⚠️ Follower notification failed:", err);
      });

      return Response.json({ success: true, stream_id: stream.id, action: "started" });
    }

    // ─── 3b. Stream End → "ended" ───────────────────────────────────────
    if (eventName === "Stream End" || eventName === "Session Ended") {
      console.log(`[ivsSessionWebhook] 🔴 Stream END — ARN: ${channelArn}`);

      const streams = await base44.asServiceRole.entities.LiveStream.filter({
        ivs_channel_arn: channelArn,
        status: "live",
      });

      const stream = streams?.[0];

      if (!stream) {
        console.warn(`[ivsSessionWebhook] ⚠️ No live stream to end for ARN: ${channelArn}`);
        return Response.json({ message: "no live stream found", channelArn });
      }

      await base44.asServiceRole.entities.LiveStream.update(stream.id, {
        status: "ended",
        live_ended_at: new Date().toISOString(),
        auto_stopped: true,
      });

      if (stream.channel_id) {
        await base44.asServiceRole.entities.Channel.update(stream.channel_id, {
          is_live: false,
        }).catch(() => {});
      }

      console.log(`[ivsSessionWebhook] ✅ Marked ENDED: ${stream.id} "${stream.title}"`);
      return Response.json({ success: true, stream_id: stream.id, action: "ended" });
    }

    // ─── その他のイベント（無視） ──────────────────────────────────────
    console.log(`[ivsSessionWebhook] ℹ️ Unhandled event_name: ${eventName}`);
    return Response.json({ message: "event_name not handled", event_name: eventName });

  } catch (error) {
    console.error("[ivsSessionWebhook] ❌ Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});