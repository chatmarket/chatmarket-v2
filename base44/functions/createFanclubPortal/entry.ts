import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { returnUrl } = await req.json();
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

    // Find Stripe customer by email
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    if (existing.data.length === 0) {
      return Response.json({ error: 'No Stripe customer found. Please subscribe first.' }, { status: 404 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: existing.data[0].id,
      return_url: returnUrl || `${req.headers.get('origin')}/my-library`,
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});