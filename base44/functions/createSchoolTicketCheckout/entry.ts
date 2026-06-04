/**
 * createSchoolTicketCheckout — SchoolTicket Stripe直接決済
 *
 * エールコイン決済がメインだが、Stripe直接払いも選択可能。
 * 決済完了は schoolTicketWebhook で処理される。
 *
 * payload:
 *   school_ticket_id: string   — 事前にpending_paymentで作成済みのID
 *   success_url: string
 *   cancel_url: string
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import Stripe from "npm:stripe@14";

Deno.serve(async (req) => {
  let base44, user;
  try {
    base44 = createClientFromRequest(req);
    user = await base44.auth.me();
  } catch (_) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { school_ticket_id, success_url, cancel_url } = await req.json();
  if (!school_ticket_id) return Response.json({ error: "school_ticket_id required" }, { status: 400 });

  // チケット取得
  const tickets = await base44.entities.SchoolTicket.filter({ id: school_ticket_id });
  const ticket = tickets[0];
  if (!ticket) return Response.json({ error: "ticket_not_found" }, { status: 404 });
  if (ticket.student_email !== user.email) return Response.json({ error: "forbidden" }, { status: 403 });
  if (ticket.status !== "pending_payment") return Response.json({ error: "ticket_not_pending" }, { status: 400 });

  // ── 最低価格バリデーション（15分あたり150円）──
  const durationMin = ticket.duration_minutes;
  const priceCheck = ticket.price;
  if (!durationMin || !isFinite(durationMin) || durationMin <= 0) {
    return Response.json({ error_code: "school_ticket_price_too_low", error: "duration_minutes が不正です" }, { status: 400 });
  }
  if (!priceCheck || !isFinite(priceCheck) || priceCheck <= 0) {
    return Response.json({ error_code: "school_ticket_price_too_low", error: "最低金額は15分あたり150円以上です" }, { status: 400 });
  }
  const minPriceYen = Math.ceil(durationMin / 15) * 150;
  if (priceCheck < minPriceYen) {
    return Response.json({
      error_code: "school_ticket_price_too_low",
      error: `最低金額は15分あたり150円以上です（${durationMin}分の最低価格: ¥${minPriceYen}）`,
    }, { status: 400 });
  }

  // 二重決済防止
  if (ticket.stripe_session_id) {
    return Response.json({ error: "already_has_session" }, { status: 400 });
  }

  // 講師プラン確認
  const teacherChannels = await base44.asServiceRole.entities.Channel.filter({ owner_email: ticket.teacher_email });
  const teacherChannel = teacherChannels[0];

  // CampaignLiveGrantee or PlanSubscription でbasicか判定
  let teacherPlan = "free";
  let revenueRate = 0.70;
  try {
    const grants = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: ticket.teacher_email });
    const activeGrant = grants.find(g => g.expires_at && new Date(g.expires_at) > new Date());
    if (activeGrant) {
      teacherPlan = "basic";
      revenueRate = 0.85;
    } else {
      const subs = await base44.asServiceRole.entities.PlanSubscription.filter({ user_email: ticket.teacher_email, status: "active" });
      if (subs.some(s => s.plan_id === "basic" || s.plan_id === "call-anser")) {
        teacherPlan = "basic";
        revenueRate = 0.85;
      }
    }
  } catch (_) {}

  const priceYen = ticket.price;
  const teacherRevenueYen = Math.floor(priceYen * revenueRate);
  const platformRevenueYen = priceYen - teacherRevenueYen;

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "jpy",
        product_data: {
          name: ticket.session_title || "クラスルーム受講チケット",
          description: `講師: ${ticket.teacher_email}`,
        },
        unit_amount: priceYen,
      },
      quantity: 1,
    }],
    metadata: {
      type: "school_ticket",
      school_ticket_id: ticket.id,
      session_id: ticket.session_id,
      student_email: user.email,
      teacher_email: ticket.teacher_email,
      teacher_plan_at_purchase: teacherPlan,
      revenue_rate_at_purchase: String(revenueRate),
      teacher_revenue_yen: String(teacherRevenueYen),
      platform_revenue_yen: String(platformRevenueYen),
    },
    success_url: success_url || `${req.headers.get("origin")}/school-tickets?payment=success`,
    cancel_url: cancel_url || `${req.headers.get("origin")}/school-tickets?payment=cancel`,
  });

  // チケットにセッションIDと収益情報を保存
  await base44.entities.SchoolTicket.update(ticket.id, {
    stripe_session_id: session.id,
    payment_method: "stripe",
    payment_status: "pending",
    price_yen: priceYen,
    teacher_plan_at_purchase: teacherPlan,
    revenue_rate_at_purchase: revenueRate,
    teacher_revenue_yen: teacherRevenueYen,
    platform_revenue_yen: platformRevenueYen,
  });

  return Response.json({ url: session.url });
});