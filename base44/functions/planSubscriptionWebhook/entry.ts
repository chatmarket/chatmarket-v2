/**
 * planSubscriptionWebhook
 * Stripeのプランサブスクリプション関連Webhookを処理する
 *
 * 処理対象イベント:
 *   - checkout.session.completed (type=plan_subscription)
 *   - customer.subscription.created
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 *   - invoice.payment_succeeded
 *   - invoice.payment_failed
 *
 * Red Lines:
 *   ❌ 成功URLへの遷移だけでactiveにしない → Webhookで確認した場合のみactive化
 *   ❌ キャンペーン対象者へPlanSubscriptionを作成しない
 *   ❌ 同じstripe_subscription_idで重複作成しない
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// plan_id マッピング（Stripe metadata.plan_id → DB plan_id）
const VALID_PLAN_IDS = ['basic', 'call-anser', 'vod', 'ppv', 'mini-school'];

const PLAN_NAMES = {
  basic: 'BASICプラン',
  'call-anser': 'CALL&ANSERプラン',
  vod: 'VODプラン',
  ppv: 'PPVプラン',
  'mini-school': 'ミニスクールプラン',
};

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Stripe webhook 署名検証（HMAC-SHA256）
    const encoder = new TextEncoder();
    const parts = signature.split(',');
    const timestampPart = parts.find(p => p.startsWith('t='))?.split('=')[1];
    const signaturePart = parts.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!timestampPart || !signaturePart) {
      return Response.json({ error: 'Invalid signature format' }, { status: 400 });
    }

    const signedData = `${timestampPart}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(signaturePart.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signedData));

    if (!isValid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    // ── checkout.session.completed (plan_subscription) ───────────────
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};

      if (meta.type !== 'plan_subscription') {
        // このWebhookはplan_subscription以外は処理しない
        return Response.json({ ok: true, skipped: 'not_plan_subscription' });
      }

      const userEmail = meta.user_email || session.customer_details?.email || session.customer_email;
      const planId = meta.plan_id;

      if (!userEmail || !VALID_PLAN_IDS.includes(planId)) {
        console.warn(`[PlanSubscriptionWebhook] invalid metadata: ${JSON.stringify(meta)}`);
        return Response.json({ ok: true, skipped: 'invalid_metadata' });
      }

      // キャンペーン対象者チェック（Red Line: キャンペーン対象者へPlanSubscriptionを作成しない）
      const grantees = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: userEmail });
      const now = new Date();
      const hasActiveCampaign = grantees.some(g => g.expires_at && new Date(g.expires_at) > now);
      if (hasActiveCampaign) {
        console.warn(`[PlanSubscriptionWebhook] campaign user tried to subscribe: ${userEmail}`);
        return Response.json({ ok: true, skipped: 'campaign_user' });
      }

      const subscriptionId = session.subscription;

      // 二重処理防止: 同じstripe_session_idがあればスキップ
      if (session.id) {
        const existing = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_session_id: session.id });
        if (existing.length > 0) {
          console.log(`[PlanSubscriptionWebhook] duplicate session skipped: ${session.id}`);
          return Response.json({ ok: true, skipped: 'duplicate_session' });
        }
      }

      // 同じsubscription_idが既に存在するか確認
      if (subscriptionId) {
        const existingSub = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: subscriptionId });
        if (existingSub.length > 0) {
          console.log(`[PlanSubscriptionWebhook] subscription already exists: ${subscriptionId}`);
          return Response.json({ ok: true, skipped: 'duplicate_subscription' });
        }
      }

      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: userEmail,
        user_id: meta.user_id || '',
        plan_id: planId,
        plan_name: PLAN_NAMES[planId] || planId,
        status: 'active',
        start_date: new Date().toISOString(),
        stripe_customer_id: session.customer || '',
        stripe_subscription_id: subscriptionId || '',
        stripe_session_id: session.id,
        last_payment_status: 'succeeded',
        source: meta.source || 'plan_confirm',
        campaign_applied: false,
      });

      console.log(`[PlanSubscriptionWebhook] created: ${userEmail} -> ${planId} (sub: ${subscriptionId})`);
    }

    // ── customer.subscription.created ────────────────────────────────
    if (event.type === 'customer.subscription.created') {
      const sub = event.data.object;
      const meta = sub.metadata || {};
      const userEmail = meta.user_email;
      const planId = meta.plan_id;

      if (!userEmail || !VALID_PLAN_IDS.includes(planId)) {
        return Response.json({ ok: true, skipped: 'no_metadata' });
      }

      // 既存チェック
      const existing = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: sub.id });
      if (existing.length > 0) {
        // already handled by checkout.session.completed
        return Response.json({ ok: true, skipped: 'already_exists' });
      }

      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: userEmail,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId] || planId,
        status: sub.status === 'active' ? 'active' : 'incomplete',
        start_date: sub.start_date ? new Date(sub.start_date * 1000).toISOString() : new Date().toISOString(),
        stripe_customer_id: sub.customer || '',
        stripe_subscription_id: sub.id,
        stripe_price_id: sub.items?.data?.[0]?.price?.id || '',
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : '',
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : '',
        cancel_at_period_end: sub.cancel_at_period_end || false,
        source: meta.source || '',
        campaign_applied: false,
      });

      console.log(`[PlanSubscriptionWebhook] subscription.created: ${userEmail} -> ${planId}`);
    }

    // ── customer.subscription.updated ────────────────────────────────
    if (event.type === 'customer.subscription.updated') {
      const sub = event.data.object;
      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: sub.id });

      if (records.length === 0) {
        return Response.json({ ok: true, skipped: 'not_found' });
      }

      const record = records[0];
      let newStatus = record.status;
      if (sub.status === 'active') newStatus = 'active';
      else if (sub.status === 'canceled') newStatus = 'cancelled';
      else if (sub.status === 'past_due') newStatus = 'past_due';
      else if (sub.status === 'incomplete') newStatus = 'incomplete';

      await base44.asServiceRole.entities.PlanSubscription.update(record.id, {
        status: newStatus,
        current_period_start: sub.current_period_start ? new Date(sub.current_period_start * 1000).toISOString() : record.current_period_start,
        current_period_end: sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : record.current_period_end,
        cancel_at_period_end: sub.cancel_at_period_end || false,
        end_date: sub.status === 'canceled' ? new Date().toISOString() : record.end_date,
      });

      console.log(`[PlanSubscriptionWebhook] subscription.updated: ${sub.id} -> ${newStatus}`);
    }

    // ── customer.subscription.deleted ────────────────────────────────
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: sub.id });

      if (records.length > 0) {
        await base44.asServiceRole.entities.PlanSubscription.update(records[0].id, {
          status: 'cancelled',
          end_date: new Date().toISOString(),
          cancel_at_period_end: false,
        });
        console.log(`[PlanSubscriptionWebhook] subscription.deleted: ${sub.id}`);
      }
    }

    // ── invoice.payment_succeeded ─────────────────────────────────────
    if (event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) return Response.json({ ok: true });

      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: subscriptionId });
      if (records.length > 0) {
        await base44.asServiceRole.entities.PlanSubscription.update(records[0].id, {
          status: 'active',
          last_payment_status: 'succeeded',
          current_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : records[0].current_period_start,
          current_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : records[0].current_period_end,
        });
        console.log(`[PlanSubscriptionWebhook] invoice.payment_succeeded: ${subscriptionId}`);
      }
    }

    // ── invoice.payment_failed ────────────────────────────────────────
    if (event.type === 'invoice.payment_failed') {
      const invoice = event.data.object;
      const subscriptionId = invoice.subscription;

      if (!subscriptionId) return Response.json({ ok: true });

      const records = await base44.asServiceRole.entities.PlanSubscription.filter({ stripe_subscription_id: subscriptionId });
      if (records.length > 0) {
        await base44.asServiceRole.entities.PlanSubscription.update(records[0].id, {
          status: 'past_due',
          last_payment_status: 'failed',
        });
        console.log(`[PlanSubscriptionWebhook] invoice.payment_failed: ${subscriptionId}`);
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[planSubscriptionWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});