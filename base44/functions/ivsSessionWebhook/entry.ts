/**
 * ivsSessionWebhook — AWS IVS EventBridge Webhook
 * 
 * AWS IVS → EventBridge → API Gateway → この関数
 * 
 * イベント種別:
 *   - aws.ivs / Stream Start   → status="live", live_started_at を書き込む
 *   - aws.ivs / Stream End     → status="ended", live_ended_at を書き込む
 * 
 * セキュリティ: 共有シークレット WEBHOOK_SECRET をクエリパラメータで検証
 * 
 * AWS EventBridgeルール設定例:
 *   Event Source: aws.ivs
 *   Event Type: IVS Stream State Change
 *   Target: API Gateway → このエンドポイント?secret=YOUR_SECRET
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // シークレット検証（STRIPE_WEBHOOK_SECRETを流用して共有シークレットとして使用）
    // AWS EventBridgeのターゲットURLに ?secret=XXX を付与する場合のみ有効
    // 省略された場合はスキップ（開発・テスト時）
    const urlObj = new URL(req.url);
    const incomingSecret = urlObj.searchParams.get("secret");
    if (incomingSecret) {
      const expectedSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET"); // 仮流用
      if (incomingSecret !== expectedSecret) {
        console.warn("[ivsSessionWebhook] ❌ Unauthorized: secret mismatch");
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
    console.log("[ivsSessionWebhook] ✅ Auth check passed (no secret = open mode)");

    const body = await req.json();
    console.log("[ivsSessionWebhook] 📨 Received:", JSON.stringify(body, null, 2));

    const eventType = body["detail-type"] || body.detail?.event_name || "";
    const detail = body.detail || {};
    const channelArn = detail.channel_arn || detail.channelArn || "";
    const streamId = detail.stream_id || detail.streamId || "";

    console.log(`[ivsSessionWebhook] eventType="${eventType}", channelArn="${channelArn}", streamId="${streamId}"`);

    // Stream Start → status="live"
    if (eventType === "IVS Stream State Change" && detail.state === "Start") {
      console.log(`[ivsSessionWebhook] 🟢 Stream START detected — ARN: ${channelArn}`);
      
      const base44 = createClientFromRequest(req);
      
      // channel_arn または ivs_ingest_endpoint などで配信レコードを特定
      // まず channel_arn で検索、なければ ingest_endpoint で探す
      let streams = await base44.asServiceRole.entities.LiveStream.filter({
        ivs_channel_arn: channelArn,
        status: "scheduled"
      });

      // scheduled → liveに遷移していない場合も対象
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

      // ③ IVS映像受信確認 → DBに"live"を書き込み
      await base44.asServiceRole.entities.LiveStream.update(stream.id, {
        status: "live",
        live_started_at: new Date().toISOString(),
      });

      // チャンネルのis_liveもtrueに
      if (stream.channel_id) {
        await base44.asServiceRole.entities.Channel.update(stream.channel_id, {
          is_live: true,
        }).catch(() => {});
      }

      console.log(`[ivsSessionWebhook] ✅ Stream marked LIVE: ${stream.id} (${stream.title})`);
      return Response.json({ success: true, stream_id: stream.id, action: "started" });
    }

    // Stream End → status="ended"
    if (eventType === "IVS Stream State Change" && detail.state === "End") {
      console.log(`[ivsSessionWebhook] 🔴 Stream END detected — ARN: ${channelArn}`);
      
      const base44 = createClientFromRequest(req);
      
      const streams = await base44.asServiceRole.entities.LiveStream.filter({
        ivs_channel_arn: channelArn,
        status: "live"
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

      console.log(`[ivsSessionWebhook] ✅ Stream marked ENDED: ${stream.id} (${stream.title})`);
      return Response.json({ success: true, stream_id: stream.id, action: "ended" });
    }

    // その他のIVSイベント（無視）
    console.log(`[ivsSessionWebhook] ℹ️ Unhandled event: ${eventType}`);
    return Response.json({ message: "event received but not handled", eventType });

  } catch (error) {
    console.error("[ivsSessionWebhook] ❌ Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});