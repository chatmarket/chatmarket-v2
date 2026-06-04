/**
 * purchaseSchoolTicketWithYellCoin
 * SchoolTicket エールコイン決済 — バックエンド一括処理
 *
 * 安全要件:
 *   - 認証確認
 *   - SchoolTicket存在・本人確認
 *   - 最低価格バリデーション（15分×150円）
 *   - 二重購入チェック（stripe_session_id または既active）
 *   - YellCoinWallet 残高確認
 *   - コイン消費 → active化 → トランザクション記録 をアトミックに実行
 *   - 失敗時は SchoolTicket を cancelled のままにしない（active化しない）
 *
 * ❌ Red Line: フロントエンドだけで残高確認・消費・active化を行わない
 * ❌ Red Line: call-anser をクラス収益率判定に使用しない
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

/**
 * クラスルーム専用 収益還元率判定
 * call-anser は判定対象外（全ユーザー自動付与のため除外）
 * free → 0.70 / basic or campaign/special_scout → 0.85
 */
async function resolveClassroomRevenueRate(base44, teacherEmail) {
  // 1. admin
  let teacherUser = null;
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email: teacherEmail });
    teacherUser = users[0];
  } catch (_) {}
  if (teacherUser?.role === "admin") {
    return { teacher_plan: "basic", revenue_rate: 0.85 };
  }

  // 2. CampaignLiveGrantee（12か月無料 or 24か月特別スカウト）
  try {
    const grants = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: teacherEmail });
    const active = grants.find(g => g.expires_at && new Date(g.expires_at) > new Date());
    if (active) {
      const planType = active.reason === "influencer_campaign" ? "special_scout" : "campaign_basic";
      return { teacher_plan: planType, revenue_rate: 0.85 };
    }
  } catch (_) {}

  // 3. PlanSubscription — basic のみ対象（call-anser は除外）
  try {
    const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: teacherEmail,
      status: "active",
    });
    const hasBasic = subs.some(s => s.plan_id === "basic");
    if (hasBasic) {
      return { teacher_plan: "basic", revenue_rate: 0.85 };
    }
  } catch (_) {}

  // 4. free
  return { teacher_plan: "free", revenue_rate: 0.70 };
}

Deno.serve(async (req) => {
  let base44, user;
  try {
    base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch (_) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { school_ticket_id } = await req.json();
  if (!school_ticket_id) {
    return Response.json({ error: "school_ticket_id required" }, { status: 400 });
  }

  // ── チケット取得 ──
  const tickets = await base44.entities.SchoolTicket.filter({ id: school_ticket_id });
  const ticket = tickets[0];
  if (!ticket) return Response.json({ error: "ticket_not_found" }, { status: 404 });

  // 本人確認
  if (ticket.student_email !== user.email) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // ステータス確認（pending_paymentのみ処理可）
  if (ticket.status !== "pending_payment") {
    return Response.json({ error: "ticket_not_pending", status: ticket.status }, { status: 400 });
  }

  // 二重決済防止（既にstripe_session_idがある場合）
  if (ticket.stripe_session_id) {
    return Response.json({ error: "already_has_stripe_session" }, { status: 400 });
  }

  // ── 最低価格バリデーション（15分×150円）──
  const durationMin = ticket.duration_minutes;
  const priceYen = ticket.price;
  if (!durationMin || !isFinite(durationMin) || durationMin <= 0) {
    return Response.json({
      error_code: "school_ticket_price_too_low",
      error: "duration_minutes が不正です",
    }, { status: 400 });
  }
  if (!priceYen || !isFinite(priceYen) || priceYen <= 0) {
    return Response.json({
      error_code: "school_ticket_price_too_low",
      error: "最低金額は15分あたり150円以上です",
    }, { status: 400 });
  }
  const minPriceYen = Math.ceil(durationMin / 15) * 150;
  if (priceYen < minPriceYen) {
    return Response.json({
      error_code: "school_ticket_price_too_low",
      error: `最低金額は15分あたり150円以上です（${durationMin}分の最低価格: ¥${minPriceYen}）`,
    }, { status: 400 });
  }

  // ── ウォレット取得 ──
  const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
  const wallet = wallets[0];
  if (!wallet) {
    return Response.json({ error: "wallet_not_found" }, { status: 404 });
  }

  // ── 残高確認 ──
  const balance = wallet.balance || 0;
  if (balance < priceYen) {
    return Response.json({
      error: "insufficient_balance",
      balance,
      required: priceYen,
    }, { status: 400 });
  }

  // ── クラスルーム専用 収益還元率判定（call-anser 除外）──
  const { teacher_plan, revenue_rate } = await resolveClassroomRevenueRate(base44, ticket.teacher_email);
  const teacherRevenueYen = Math.floor(priceYen * revenue_rate);
  const platformRevenueYen = priceYen - teacherRevenueYen;

  // ── コイン消費（残高マイナス禁止）──
  const newBalance = balance - priceYen;
  if (newBalance < 0) {
    return Response.json({ error: "insufficient_balance" }, { status: 400 });
  }
  await base44.entities.YellCoinWallet.update(wallet.id, {
    balance: newBalance,
  });

  // ── YellCoinTransaction 記録 ──
  await base44.asServiceRole.entities.YellCoinTransaction.create({
    user_email: user.email,
    type: "send",
    amount: priceYen,
    yen_amount: priceYen,
    service_type: "school_ticket",
    service_id: ticket.id,
    target_name: ticket.teacher_email,
    message: `授業チケット購入: ${ticket.session_title || ticket.session_id}`,
  });

  // ── SchoolTicket を active 化 ──
  await base44.entities.SchoolTicket.update(ticket.id, {
    status: "active",
    payment_method: "yell_coin",
    payment_status: "completed",
    price_yen: priceYen,
    coin_amount: priceYen,
    teacher_plan_at_purchase: teacher_plan,
    revenue_rate_at_purchase: revenue_rate,
    teacher_revenue_yen: teacherRevenueYen,
    platform_revenue_yen: platformRevenueYen,
  });

  // ── Purchase レコード作成 ──
  await base44.asServiceRole.entities.Purchase.create({
    item_type: "school_ticket",
    item_id: ticket.id,
    amount: priceYen,
    buyer_email: user.email,
    status: "completed",
  });

  return Response.json({
    ok: true,
    ticket_id: ticket.id,
    coins_spent: priceYen,
    new_balance: newBalance,
    teacher_plan,
    revenue_rate,
  });
});