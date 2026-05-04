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
    const channelArn = detail.channel_arn || detail.channelArn || "";

    console.log(`[ivsSessionWebhook] eventType="${eventType}", state="${detail.state}", channelArn="${channelArn}"`);

    if (eventType !== "IVS Stream State Change") {
      console.log(`[ivsSessionWebhook] ℹ️ Unhandled event type: ${eventType}`);
      return Response.json({ message: "event received but not handled", eventType });
    }

    const base44 = createClientFromRequest(req);

    // ─── 3a. Stream Start → "live" ──────────────────────────────────────
    if (detail.state === "Start") {
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
      return Response.json({ success: true, stream_id: stream.id, action: "started" });
    }

    // ─── 3b. Stream End → "ended" ───────────────────────────────────────
    if (detail.state === "End") {
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

    // ─── その他の state（無視） ─────────────────────────────────────────
    console.log(`[ivsSessionWebhook] ℹ️ Unhandled state: ${detail.state}`);
    return Response.json({ message: "state not handled", state: detail.state });

  } catch (error) {
    console.error("[ivsSessionWebhook] ❌ Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});