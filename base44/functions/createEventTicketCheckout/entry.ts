/**
 * createEventTicketCheckout
 * TicketEvent（ライブ告知）のチケットStripe決済セッション作成
 * quantity対応: 複数枚まとめて購入できる
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.12.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { event_id, tier_name, tier_type, quantity = 1 } = await req.json();
    if (!event_id || !tier_name) {
      return Response.json({ error: 'Missing event_id or tier_name' }, { status: 400 });
    }
    const qty = Math.max(1, Math.min(10, parseInt(quantity) || 1)); // 上限10枚

    const events = await base44.entities.TicketEvent.filter({ id: event_id });
    const event = events[0];
    if (!event) return Response.json({ error: 'Event not found' }, { status: 404 });

    const tier = (event.ticket_types || []).find(t => t.name === tier_name);
    if (!tier) return Response.json({ error: 'Tier not found' }, { status: 404 });

    const remaining = (tier.capacity || 0) - (tier.sold || 0);
    if (remaining < qty) return Response.json({ error: `残り${remaining}枚しかありません`, remaining }, { status: 400 });

    // 席種別連番の開始番号を計算（既発行数+1）
    const existingTickets = await base44.entities.DigitalTicket.filter({ event_id, tier_name: tier.name });
    const startSerial = (existingTickets.length || 0) + 1;
    const prefix = tier.name.replace(/[^a-zA-Z0-9\u3040-\u9FFF]/g, '').slice(0, 6).toUpperCase() || 'TKT';

    // 購入セッションID（複数枚購入の紐付け用）
    const purchaseSessionId = `PS-${Date.now().toString(36).toUpperCase()}-${user.email.split('@')[0]}`;

    const appUrl = Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173';

    // 無料チケット: 枚数分まとめて直接発行
    if (!tier.price || tier.price === 0) {
      for (let i = 0; i < qty; i++) {
        const serial = startSerial + i;
        const ticketNumber = `${prefix}-${String(serial).padStart(3, '0')}`;
        await base44.entities.DigitalTicket.create({
          owner_email: user.email,
          owner_name: user.full_name || user.email,
          original_buyer_email: user.email,
          purchase_session_id: purchaseSessionId,
          event_id,
          event_name: event.event_name,
          event_date: event.event_date,
          event_location: event.location || '',
          ticket_type: tier_type || 'general',
          tier_name: tier.name,
          tier_serial: serial,
          channel_id: event.channel_id,
          channel_name: event.channel_name,
          price: 0,
          status: 'valid',
          ticket_number: ticketNumber,
          thumbnail_url: event.thumbnail_url || '',
        });
      }
      const updated = event.ticket_types.map(t =>
        t.name === tier.name ? { ...t, sold: (t.sold || 0) + qty } : t
      );
      await base44.entities.TicketEvent.update(event_id, { ticket_types: updated });
      return Response.json({ success: true, free: true });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${event.event_name} - ${tier.name}`,
            description: `${event.event_date ? new Date(event.event_date).toLocaleDateString('ja-JP') : ''}${event.location ? ' / ' + event.location : ''}`,
            images: event.thumbnail_url ? [event.thumbnail_url] : [],
          },
          unit_amount: tier.price,
        },
        quantity: qty,
      }],
      mode: 'payment',
      success_url: `${appUrl}/my-tickets?purchased=1`,
      cancel_url: `${appUrl}/tickets/${event.channel_id}`,
      metadata: {
        event_id,
        buyer_email: user.email,
        buyer_name: user.full_name || user.email,
        tier_name: tier.name,
        tier_type: tier_type || 'general',
        quantity: String(qty),
        start_serial: String(startSerial),
        purchase_session_id: purchaseSessionId,
      },
    });

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});