/**
 * eventTicketWebhook
 * Stripe決済完了後、DigitalTicketを自動生成する
 * Stripeダッシュボードのwebhook URLに登録してください
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.12.0';

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
      const { event_id, buyer_email, buyer_name, tier_name, tier_type, ticket_number } = session.metadata || {};

      if (!event_id) return Response.json({ received: true }); // 他のwebhookを無視

      const events = await base44.asServiceRole.entities.TicketEvent.filter({ id: event_id });
      const ticketEvent = events[0];
      if (!ticketEvent) {
        console.error(`[EventTicketWebhook] Event not found: ${event_id}`);
        return Response.json({ received: true });
      }

      // 席種別連番を計算
      const existingTickets = await base44.asServiceRole.entities.DigitalTicket.filter({ event_id, tier_name: tier_name });
      const tierSerial = (existingTickets.length || 0) + 1;
      const prefix = (tier_name || '').replace(/[^a-zA-Z0-9\u3040-\u9FFF]/g, '').slice(0, 6).toUpperCase() || 'TKT';
      const finalTicketNumber = `${prefix}-${String(tierSerial).padStart(3, '0')}`;

      // DigitalTicket生成
      await base44.asServiceRole.entities.DigitalTicket.create({
        owner_email: buyer_email,
        owner_name: buyer_name || buyer_email,
        event_id,
        event_name: ticketEvent.event_name,
        event_date: ticketEvent.event_date,
        event_location: ticketEvent.location || '',
        ticket_type: tier_type || 'general',
        tier_name: tier_name || '',
        tier_serial: tierSerial,
        channel_id: ticketEvent.channel_id,
        channel_name: ticketEvent.channel_name,
        price: session.amount_total || 0,
        status: 'valid',
        ticket_number: finalTicketNumber,
        thumbnail_url: ticketEvent.thumbnail_url || '',
      });

      // sold_count インクリメント
      const updatedTypes = (ticketEvent.ticket_types || []).map(t =>
        t.name === tier_name ? { ...t, sold: (t.sold || 0) + 1 } : t
      );
      await base44.asServiceRole.entities.TicketEvent.update(event_id, { ticket_types: updatedTypes });

      console.log(`[EventTicketWebhook] Ticket issued: ${buyer_email} -> ${ticketEvent.event_name}`);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[EventTicketWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});