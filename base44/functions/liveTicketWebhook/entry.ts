/**
 * liveTicketWebhook
 * Stripe決済成功後、チケット購入を確定する
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.12.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      return Response.json({ error: 'No signature' }, { status: 400 });
    }

    const body = await req.text();
    const event = stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { stream_id, user_email, duration_minutes, price_yen } = session.metadata;

      // ライブストリーム取得
      const streams = await base44.asServiceRole.entities.LiveStream.filter({ id: stream_id });
      if (!streams[0]) {
        return Response.json({ error: 'Stream not found' }, { status: 404 });
      }

      const stream = streams[0];
      const updatedPurchases = [...(stream.ticket_purchases || [])];
      updatedPurchases.push({
        user_email,
        user_name: session.customer_details?.name || user_email,
        price_yen: parseInt(price_yen),
        payment_method: 'credit_card',
        coins_used: 0,
        purchased_at: new Date().toISOString(),
      });

      // チケット購入履歴とメタデータを更新
      await base44.asServiceRole.entities.LiveStream.update(stream_id, {
        ticket_purchases: updatedPurchases,
        ticket_total_revenue_yen: (stream.ticket_total_revenue_yen || 0) + parseInt(price_yen),
      });

      console.log(`[LiveTicket] Purchase confirmed: ${user_email} - ¥${price_yen}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('liveTicketWebhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});