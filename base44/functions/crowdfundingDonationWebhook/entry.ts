/**
 * crowdfundingDonationWebhook
 * Stripe Checkout 完了後に呼ばれる Webhook。
 * - CrowdfundingDonation を completed に更新
 * - CrowdfundingProject の total_raised / supporter_count を更新
 * - CreatorEarning にプログレッシブ還元後の収益を記録
 * - Channel.monthly_revenue_coins / progressive_rate をリアルタイム更新
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const TIERS = [
  { threshold: 20000000, rate: 0.95 },
  { threshold: 19500000, rate: 0.94 },
  { threshold: 18000000, rate: 0.93 },
  { threshold: 16500000, rate: 0.92 },
  { threshold: 15000000, rate: 0.91 },
  { threshold: 12000000, rate: 0.90 },
  { threshold:  9000000, rate: 0.89 },
  { threshold:  6000000, rate: 0.88 },
  { threshold:  3000000, rate: 0.87 },
  { threshold:  1000000, rate: 0.86 },
];

function getProgressiveRate(monthlyYen) {
  for (const tier of TIERS) {
    if (monthlyYen >= tier.threshold) return tier.rate;
  }
  return 0.85;
}

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Stripe署名検証
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    let event;
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);

    if (event.type !== 'checkout.session.completed') {
      return Response.json({ ok: true, skipped: true });
    }

    const session = event.data.object;
    const meta = session.metadata || {};

    if (meta.type !== 'crowdfunding_donation') {
      return Response.json({ ok: true, skipped: true });
    }

    const base44 = createClientFromRequest(req);

    const projectId    = meta.project_id;
    const ownerEmail   = meta.owner_email;
    const donorEmail   = meta.donor_email;
    const amount       = parseInt(meta.amount || '0');
    const stripeFee    = parseInt(meta.stripe_fee_yen || '0');
    const platformFee  = parseInt(meta.platform_fee_yen || '0');
    const payoutYen    = parseInt(meta.payout_yen || '0');
    const storedRate   = parseFloat(meta.progressive_rate || '0.85');

    // ── 冪等性チェック: 同一 session.id で既に寄付レコードが存在する場合はスキップ ──
    const existingDonations = await base44.asServiceRole.entities.CrowdfundingDonation.filter({ stripe_session_id: session.id });
    if (existingDonations.length > 0) {
      console.log(`[CrowdfundingDonationWebhook] duplicate session skipped: ${session.id}`);
      return Response.json({ ok: true });
    }

    // ── 1. 寄付レコード作成 ──
    await base44.asServiceRole.entities.CrowdfundingDonation.create({
      project_id:      projectId,
      project_title:   meta.project_title || '',
      owner_email:     ownerEmail,
      donor_email:     donorEmail,
      donor_name:      meta.is_anonymous === 'true' ? '匿名' : (meta.donor_name || ''),
      amount,
      stripe_fee_yen:  stripeFee,
      platform_fee_yen: platformFee,
      progressive_rate: storedRate,
      payout_yen:      payoutYen,
      message:         meta.message || '',
      status:          'completed',
      is_anonymous:    meta.is_anonymous === 'true',
      stripe_session_id: session.id,
    });

    // ── 2. プロジェクト累計更新 ──
    const projects = await base44.asServiceRole.entities.CrowdfundingProject.filter({ id: projectId });
    const project = projects[0];
    if (project) {
      await base44.asServiceRole.entities.CrowdfundingProject.update(projectId, {
        total_raised:    (project.total_raised || 0) + amount,
        supporter_count: (project.supporter_count || 0) + 1,
      });
    }

    // ── 3. CreatorEarning 記録 ──
    await base44.asServiceRole.entities.CreatorEarning.create({
      channel_owner_email: ownerEmail,
      source_type:         'crowdfunding',
      yen_equivalent:      payoutYen,
      coin_amount:         0,
      progressive_rate:    storedRate,
      description:         `クラウドファンディング寄付 ¥${amount} → 還元¥${payoutYen} (率${Math.round(storedRate * 100)}%)`,
    });

    // ── 4. オーナーチャンネルのプログレッシブ還元率をリアルタイム更新 ──
    const channels = await base44.asServiceRole.entities.Channel.filter({ owner_email: ownerEmail });
    const channel = channels[0];
    if (channel) {
      // 当月累計再集計
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const allDonations = await base44.asServiceRole.entities.CrowdfundingDonation.filter({
        owner_email: ownerEmail,
        status: 'completed',
      });
      const monthlyYen = allDonations
        .filter(d => d.created_date >= monthStart)
        .reduce((s, d) => s + (d.amount || 0), 0);

      const newRate = getProgressiveRate(monthlyYen);

      await base44.asServiceRole.entities.Channel.update(channel.id, {
        progressive_rate: newRate,
        monthly_revenue_coins: Math.floor(monthlyYen / 1.1), // 円→コイン概算
        rate_applied_month: now.toISOString().slice(0, 7),
      });

      console.log(`[CrowdfundingWebhook] ${ownerEmail} 月間¥${monthlyYen} → 還元率${Math.round(newRate * 100)}% 適用`);
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('[crowdfundingDonationWebhook]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});