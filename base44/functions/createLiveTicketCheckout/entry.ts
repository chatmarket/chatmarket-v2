/**
 * createLiveTicketCheckout
 * ライブ配信チケットのStripe決済セッション作成
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@16.12.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { stream_id, user_email, price_yen, duration_minutes } = await req.json();

    if (!stream_id || !price_yen || !duration_minutes) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // チケット価格最低額チェック（15分150円・以降15分単位50円減算制約）
    const minPrice = Math.max(150, Math.ceil((duration_minutes / 15) * 150));
    if (price_yen < minPrice) {
      return Response.json(
        { error: `Minimum price is ¥${minPrice} for ${duration_minutes} minutes` },
        { status: 400 }
      );
    }

    // Stripe決済セッション作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'jpy',
            product_data: {
              name: `チケット: ${duration_minutes}分視聴`,
              description: `ライブ配信チケット`,
            },
            unit_amount: price_yen,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173'}/live-ticket-success?stream_id=${stream_id}`,
      cancel_url: `${Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:5173'}/live/${stream_id}`,
      metadata: {
        stream_id,
        user_email,
        duration_minutes,
        price_yen,
      },
    });

    return Response.json({ session_url: session.url });
  } catch (error) {
    console.error('createLiveTicketCheckout error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});