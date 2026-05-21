import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { order_id, product_id, buyer_email, is_digital } = session.metadata || {};

      if (!order_id) return Response.json({ received: true });

      // 注文を completed に更新
      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1年
      await base44.asServiceRole.entities.ProductOrder.update(order_id, {
        status: 'completed',
        download_expires_at: is_digital === '1' ? expiresAt : null,
      });

      // 商品の sold_count をインクリメント
      if (product_id) {
        const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        const product = products[0];
        if (product) {
          await base44.asServiceRole.entities.Product.update(product_id, {
            sold_count: (product.sold_count || 0) + 1,
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});