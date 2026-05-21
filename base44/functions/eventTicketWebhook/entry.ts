/**
 * eventTicketWebhook
 * Stripe決済完了後、DigitalTicketを枚数分まとめて生成する
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.12.0';

async function sendLineNotify(message) {
  const token = Deno.env.get('LINE_NOTIFY_TOKEN');
  if (!token) { console.warn('[LineNotify] LINE_NOTIFY_TOKEN未設定。スキップ。'); return; }
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message }),
  });
  if (!res.ok) console.error(`[LineNotify] 失敗 ${res.status}: ${await res.text()}`);
}

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
      const { event_id, buyer_email, buyer_name, tier_name, tier_type, quantity, start_serial, purchase_session_id } = session.metadata || {};

      if (!event_id) return Response.json({ received: true }); // 他のwebhookを無視

      const events = await base44.asServiceRole.entities.TicketEvent.filter({ id: event_id });
      const ticketEvent = events[0];
      if (!ticketEvent) {
        console.error(`[EventTicketWebhook] Event not found: ${event_id}`);
        return Response.json({ received: true });
      }

      const qty = parseInt(quantity) || 1;
      const startSerial = parseInt(start_serial) || 1;
      const prefix = (tier_name || '').replace(/[^a-zA-Z0-9\u3040-\u9FFF]/g, '').slice(0, 6).toUpperCase() || 'TKT';
      const pricePerTicket = Math.round((session.amount_total || 0) / qty);

      // 枚数分DigitalTicketを生成
      for (let i = 0; i < qty; i++) {
        const serial = startSerial + i;
        const ticketNumber = `${prefix}-${String(serial).padStart(3, '0')}`;
        await base44.asServiceRole.entities.DigitalTicket.create({
          owner_email: buyer_email,
          owner_name: buyer_name || buyer_email,
          original_buyer_email: buyer_email,
          purchase_session_id: purchase_session_id || `PS-${session.id}`,
          event_id,
          event_name: ticketEvent.event_name,
          event_date: ticketEvent.event_date,
          event_location: ticketEvent.location || '',
          ticket_type: tier_type || 'general',
          tier_name: tier_name || '',
          tier_serial: serial,
          channel_id: ticketEvent.channel_id,
          channel_name: ticketEvent.channel_name,
          price: pricePerTicket,
          status: 'valid',
          ticket_number: ticketNumber,
          thumbnail_url: ticketEvent.thumbnail_url || '',
        });
      }

      // sold_count インクリメント（枚数分）
      const updatedTypes = (ticketEvent.ticket_types || []).map(t =>
        t.name === tier_name ? { ...t, sold: (t.sold || 0) + qty } : t
      );
      await base44.asServiceRole.entities.TicketEvent.update(event_id, { ticket_types: updatedTypes });

      console.log(`[EventTicketWebhook] ${qty}枚発券: ${buyer_email} -> ${ticketEvent.event_name} [${prefix}-${String(startSerial).padStart(3,'0')} ~ ${prefix}-${String(startSerial+qty-1).padStart(3,'0')}]`);

      // LINE Notify 通知
      const totalYen = Math.round((session.amount_total || 0) / 100);
      const lineMsg = [
        '',
        '🎟️ チケット購入通知',
        `イベント: ${ticketEvent.event_name}`,
        `席種: ${tier_name}`,
        `枚数: ${qty}枚`,
        `金額: ¥${totalYen.toLocaleString()}`,
        `購入者: ${buyer_name || buyer_email}`,
        `チャンネル: ${ticketEvent.channel_name || ''}`,
      ].join('\n');
      await sendLineNotify(lineMsg);
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('[EventTicketWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});