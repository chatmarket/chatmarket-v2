/**
 * purchaseVideoWithCoin
 * 動画をエールコインで購入する
 *
 * - ブラウザから受け取るのは videoId のみ
 * - 購入者・価格・販売者・料率はすべてサーバー側で確定
 * - purchaseSchoolTicketWithYellCoin と同じ pending → completed 方式
 *
 * ❌ Red Line: クライアントから受け取った価格・メール・料率を信用しない
 * ❌ Red Line: ログに個人情報・残高・Secret を出力しない
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const HIGH_RATE_PLAN_IDS = ["basic", "call-anser", "mini-school"];

/**
 * クリエイターの受取率を判定する（サーバー側完結）
 * admin: 85% / 有効CampaignLiveGrantee: 85% / 有効High-rateプラン: 85% / それ以外: 70%
 */
async function resolveCreatorRate(base44, creatorEmail) {
  try {
    // admin チェック
    const users = await base44.asServiceRole.entities.User.filter({ email: creatorEmail });
    if (users[0]?.role === "admin") return 0.85;
  } catch (_) {}

  const now = new Date();

  // CampaignLiveGrantee チェック
  try {
    const grants = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: creatorEmail });
    const active = grants.find((g) => g.expires_at && new Date(g.expires_at) > now);
    if (active) return 0.85;
  } catch (_) {}

  // PlanSubscription チェック
  try {
    const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: creatorEmail,
      status: "active",
    });
    const hasHighRate = subs.some((s) => {
      if (!HIGH_RATE_PLAN_IDS.includes(s.plan_id)) return false;
      if (!s.end_date) return true;
      const end = new Date(s.end_date);
      if (isNaN(end.getTime())) return false;
      return end > now;
    });
    if (hasHighRate) return 0.85;
  } catch (_) {}

  return 0.70;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // ── 購入者を確定（クライアント情報を信用しない）──
    const buyer = await base44.auth.me();
    if (!buyer) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { videoId } = body;
    if (!videoId) return Response.json({ error: "videoId is required" }, { status: 400 });

    // ── Video を取得・検証 ──
    const video = await base44.asServiceRole.entities.Video.get(videoId);
    if (!video) return Response.json({ error: "Video not found" }, { status: 404 });
    if (video.is_free) return Response.json({ error: "This video is free" }, { status: 400 });
    if (!video.price || video.price <= 0) return Response.json({ error: "Invalid video price" }, { status: 400 });
    if (video.moderation_status !== "approved") return Response.json({ error: "Video not available" }, { status: 400 });

    // ── Channel から販売者を確定 ──
    const channels = await base44.asServiceRole.entities.Channel.filter({ id: video.channel_id });
    const channel = channels[0];
    if (!channel?.owner_email) return Response.json({ error: "Channel not found" }, { status: 404 });
    const sellerEmail = channel.owner_email;

    // 自分の動画は購入不可
    if (buyer.email === sellerEmail) {
      return Response.json({ error: "Cannot purchase your own video" }, { status: 400 });
    }

    const coinPrice = video.price; // Video.price = 必要コイン数（1:1）

    // ── 既存 Purchase チェック（冪等性）──
    const existingPurchases = await base44.asServiceRole.entities.Purchase.filter({
      item_type: "video",
      item_id: videoId,
      buyer_email: buyer.email,
    });
    const completed = existingPurchases.find((p) => p.status === "completed");
    if (completed) {
      return Response.json({ ok: true, alreadyPurchased: true, purchaseId: completed.id });
    }
    const pending = existingPurchases.find((p) => p.status === "pending");
    if (pending) {
      return Response.json({ ok: false, processing: true, purchaseId: pending.id, message: "処理中です。しばらくお待ちください。" });
    }

    // ── Wallet 残高確認 ──
    const wallets = await base44.asServiceRole.entities.YellCoinWallet.filter({ user_email: buyer.email });
    const wallet = wallets[0];
    if (!wallet) return Response.json({ error: "Wallet not found" }, { status: 400 });
    if (wallet.balance < coinPrice) {
      return Response.json({ error: "insufficient_balance", required: coinPrice, balance: wallet.balance }, { status: 400 });
    }

    // ── 料率をサーバー側で判定（クライアント値は使わない）──
    const creatorRate = await resolveCreatorRate(base44, sellerEmail);
    const creatorAmountYen = Math.floor(coinPrice * creatorRate);
    const platformAmountYen = coinPrice - creatorAmountYen;

    // ── Purchase を pending で作成（失敗時のゴミ防止）──
    const purchase = await base44.asServiceRole.entities.Purchase.create({
      item_type: "video",
      item_id: videoId,
      amount: coinPrice,
      buyer_email: buyer.email,
      status: "pending",
      payment_provider: "coin",
      coin_amount: coinPrice,
      channel_id: video.channel_id,
      creator_email: sellerEmail,
    });

    try {
      // ── Wallet 残高を減算 ──
      await base44.asServiceRole.entities.YellCoinWallet.update(wallet.id, {
        balance: wallet.balance - coinPrice,
        total_sent: (wallet.total_sent || 0) + coinPrice,
      });

      // ── YellCoinTransaction を作成 ──
      const txn = await base44.asServiceRole.entities.YellCoinTransaction.create({
        user_email: buyer.email,
        type: "send",
        amount: coinPrice,
        service_type: "video_purchase",
        service_id: videoId,
        target_id: videoId,
        target_name: video.title,
        channel_id: video.channel_id,
        channel_owner_email: sellerEmail,
      });

      // ── Purchase を completed へ更新 ──
      await base44.asServiceRole.entities.Purchase.update(purchase.id, { status: "completed" });

      // ── CreatorEarning を作成 ──
      await base44.asServiceRole.entities.CreatorEarning.create({
        service_type: "video_purchase",
        payment_provider: "coin",
        service_id: videoId,
        purchase_id: purchase.id,
        channel_id: video.channel_id,
        creator_email: sellerEmail,
        sender_email: buyer.email,
        coin_amount: coinPrice,
        yen_equivalent: coinPrice,
        creator_rate: creatorRate,
        creator_amount_yen: creatorAmountYen,
        platform_amount_yen: platformAmountYen,
        status: "confirmed",
        is_settled: false,
      });

      console.log(`[purchaseVideoWithCoin] ok | videoId=${videoId} | purchaseId=${purchase.id} | rate=${creatorRate}`);
      return Response.json({ ok: true, alreadyPurchased: false, purchaseId: purchase.id });

    } catch (innerErr) {
      // 途中失敗時は pending のまま残す（completed にしない）
      console.error(`[purchaseVideoWithCoin] inner error | purchaseId=${purchase.id}: ${innerErr.message}`);
      return Response.json({ error: "Purchase processing failed. Please try again.", purchaseId: purchase.id }, { status: 500 });
    }

  } catch (error) {
    console.error("[purchaseVideoWithCoin] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});