import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { successUrl, cancelUrl } = await req.json();

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][unit_amount]': '100',
        'line_items[0][price_data][product_data][name]': 'ChatMarket 動作確認テスト',
        'line_items[0][price_data][product_data][description]': 'Stripe本番環境の決済機能確認用（¥100）',
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': cancelUrl || successUrl,
        'metadata[type]': 'test_payment',
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