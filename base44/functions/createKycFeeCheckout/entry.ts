import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ライバー登録「認証手数料 500円」のStripe Checkoutセッションを作成する
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const { successUrl, cancelUrl } = await req.json();

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][unit_amount]': '500',
        'line_items[0][price_data][product_data][name]': '公式ライバー認証手数料',
        'line_items[0][price_data][product_data][description]': 'ChatMarket 公式ライバー認証・本人確認システム利用料（実費）',
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${successUrl}?kyc_paid=1&session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || successUrl,
        'metadata[type]': 'kyc_fee',
        'metadata[userEmail]': user.email,
        'customer_email': user.email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Stripe error', detail: error }, { status: 500 });
    }

    const session = await response.json();
    return Response.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});