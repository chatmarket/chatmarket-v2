import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));
  const webhookSecret = Deno.env.get("STRIPE_FANCLUB_WEBHOOK_SECRET");

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook signature verification failed: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  try {
    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const { base44_user_email, channel_id, tier } = subscription.metadata || {};

      if (!base44_user_email || !channel_id || !tier) {
        console.warn('Missing metadata on subscription:', subscription.id);
        return Response.json({ received: true });
      }

      // Upsert PlanSubscription record
      const existing = await base44.asServiceRole.entities.PlanSubscription.filter({
        user_email: base44_user_email,
        plan_id: `sanctum_${channel_id}`,
      });

      if (existing.length > 0) {
        await base44.asServiceRole.entities.PlanSubscription.update(existing[0].id, {
          plan_name: `sanctum_${tier}`,
          status: subscription.status === 'active' ? 'active' : 'cancelled',
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
          end_date: subscription.cancel_at ? new Date(subscription.cancel_at * 1000).toISOString() : null,
        });
      } else {
        await base44.asServiceRole.entities.PlanSubscription.create({
          user_email: base44_user_email,
          plan_id: `sanctum_${channel_id}`,
          plan_name: `sanctum_${tier}`,
          status: 'active',
          start_date: new Date(subscription.start_date * 1000).toISOString(),
          stripe_subscription_id: subscription.id,
          stripe_customer_id: subscription.customer,
        });
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const { base44_user_email, channel_id } = subscription.metadata || {};

      if (base44_user_email && channel_id) {
        const existing = await base44.asServiceRole.entities.PlanSubscription.filter({
          user_email: base44_user_email,
          plan_id: `sanctum_${channel_id}`,
        });
        if (existing.length > 0) {
          await base44.asServiceRole.entities.PlanSubscription.update(existing[0].id, {
            status: 'cancelled',
            end_date: new Date().toISOString(),
          });
        }
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});