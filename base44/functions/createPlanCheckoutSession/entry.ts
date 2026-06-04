/**
 * createPlanCheckoutSession
 * 通常ユーザー向けプランのStripe Checkout Session（サブスクリプション）を作成する
 *
 * キャンペーン対象者は呼び出し禁止（フロントでチェック済みだが、バックエンドでも二重チェック）
 *
 * metadata に保存:
 *   - type: "plan_subscription"
 *   - user_id, user_email, plan_id, source, campaign_applied
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Stripe Price ID マッピング（Stripe Dashboardで事前に作成したPrice IDを設定してください）
// ⚠️ 要手動確認: Stripe Dashboard > Products > 各プラン > Price ID
const PLAN_PRICE_IDS = {
  'basic':      Deno.env.get('STRIPE_PRICE_BASIC_MONTHLY')      || '',
  'call-anser': Deno.env.get('STRIPE_PRICE_CALL_ANSER_MONTHLY') || '',
  'vod':        Deno.env.get('STRIPE_PRICE_VOD_MONTHLY')        || '',
  'ppv':        Deno.env.get('STRIPE_PRICE_PPV_MONTHLY')        || '',
};

const PLAN_NAMES = {
  basic: 'BASICプラン',
  'call-anser': 'CALL&ANSERプラン',
  vod: 'VODプラン',
  ppv: 'PPVプラン',
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { planId, successUrl, cancelUrl } = await req.json();

    if (!planId || !successUrl) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const validPlanIds = ['basic', 'call-anser', 'vod', 'ppv'];
    if (!validPlanIds.includes(planId)) {
      return Response.json({ error: 'Invalid plan_id' }, { status: 400 });
    }

    // ❌ Red Line: キャンペーン対象者にはCheckout Sessionを作成しない
    const grantees = await base44.entities.CampaignLiveGrantee.filter({ email: user.email });
    const now = new Date();
    const hasActiveCampaign = grantees.some(g => g.expires_at && new Date(g.expires_at) > now);
    if (hasActiveCampaign) {
      return Response.json({ error: 'campaign_user_not_billable', message: 'キャンペーン適用中のため、お支払いは不要です' }, { status: 403 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const priceId = PLAN_PRICE_IDS[planId];

    // Price IDが未設定の場合はPayment Linkにフォールバック
    if (!priceId) {
      return Response.json({
        error: 'stripe_price_not_configured',
        message: `${PLAN_NAMES[planId]}のStripe Price IDが未設定です。Stripe DashboardでPrice IDを取得し、環境変数に設定してください。`,
        env_var: `STRIPE_PRICE_${planId.toUpperCase().replace('-', '_')}_MONTHLY`,
      }, { status: 500 });
    }

    // Stripe Checkout Session作成（subscription mode）
    const params = new URLSearchParams({
      'mode': 'subscription',
      'payment_method_types[]': 'card',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      'cancel_url': cancelUrl || successUrl,
      'customer_email': user.email,
      'metadata[type]': 'plan_subscription',
      'metadata[user_id]': user.id || '',
      'metadata[user_email]': user.email,
      'metadata[plan_id]': planId,
      'metadata[source]': 'plan_confirm',
      'metadata[campaign_applied]': 'false',
      // サブスクリプションにもmetadataを付与
      'subscription_data[metadata][user_email]': user.email,
      'subscription_data[metadata][user_id]': user.id || '',
      'subscription_data[metadata][plan_id]': planId,
    });

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[createPlanCheckoutSession] Stripe error:', error);
      return Response.json({ error: 'Stripe error', detail: error }, { status: 500 });
    }

    const session = await response.json();
    console.log(`[createPlanCheckoutSession] created: ${user.email} -> ${planId} (${session.id})`);

    return Response.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    console.error('[createPlanCheckoutSession] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});