import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// Stripe Price IDs — set these in Stripe Dashboard and map here
// Each tier maps to a Stripe recurring Price ID
const TIER_PRICE_MAP = {
  standard: Deno.env.get("STRIPE_FANCLUB_PRICE_STANDARD"), // ¥500/month
  premium:  Deno.env.get("STRIPE_FANCLUB_PRICE_PREMIUM"),  // ¥3,000/month
  diamond:  Deno.env.get("STRIPE_FANCLUB_PRICE_DIAMOND"),  // ¥10,000/month
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tier, channelId, successUrl, cancelUrl } = await req.json();

    if (!tier || !channelId) {
      return Response.json({ error: 'tier and channelId are required' }, { status: 400 });
    }

    const priceId = TIER_PRICE_MAP[tier];
    if (!priceId) {
      return Response.json({ error: `Unknown tier: ${tier}. Check STRIPE_FANCLUB_PRICE_* env vars.` }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

    // Check for existing Stripe customer by email
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: { base44_user_email: user.email },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get('origin')}/fanclub/${channelId}?subscribed=1`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/fanclub/${channelId}`,
      subscription_data: {
        metadata: {
          base44_user_email: user.email,
          channel_id: channelId,
          tier,
        },
      },
      metadata: {
        base44_user_email: user.email,
        channel_id: channelId,
        tier,
      },
      locale: 'ja',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});