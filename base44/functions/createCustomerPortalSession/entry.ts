/**
 * createCustomerPortalSession
 * Stripe Customer Portal セッションを作成する
 * 通常有料契約者が自分で管理できる:
 *   - 支払い方法の更新
 *   - 請求書の確認
 *   - サブスクリプションの解約
 *   - 契約状態の確認
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { returnUrl } = await req.json();

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    // PlanSubscriptionからStripe Customer IDを取得
    const subscriptions = await base44.entities.PlanSubscription.filter({ user_email: user.email, status: 'active' });
    const customerId = subscriptions.find(s => s.stripe_customer_id)?.stripe_customer_id;

    if (!customerId) {
      return Response.json({ error: 'no_stripe_customer', message: '有効なStripe契約が見つかりません' }, { status: 404 });
    }

    const params = new URLSearchParams({
      'customer': customerId,
      'return_url': returnUrl || `${req.headers.get('origin') || ''}/plan-select`,
    });

    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[createCustomerPortalSession] Stripe error:', error);
      return Response.json({ error: 'Stripe error', detail: error }, { status: 500 });
    }

    const portalSession = await response.json();
    return Response.json({ portalUrl: portalSession.url });
  } catch (error) {
    console.error('[createCustomerPortalSession] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});