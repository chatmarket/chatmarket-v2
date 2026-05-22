/**
 * createCrowdfundingCheckout
 * クラウドファンディング寄付用の Stripe Checkout Session を作成。
 * プロジェクトオーナーの月間累計支援額からプログレッシブ還元率を計算し、
 * metadata に記録する。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// プログレッシブ還元率テーブル（月間累計寄付額/円）
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
const BASE_RATE = 0.85;

function getProgressiveRate(monthlyYen) {
  for (const tier of TIERS) {
    if (monthlyYen >= tier.threshold) return tier.rate;
  }
  return BASE_RATE;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id, amount, message, is_anonymous } = await req.json();
    if (!project_id || !amount || amount < 100) {
      return Response.json({ error: '支援金額は100円以上が必要です' }, { status: 400 });
    }

    // プロジェクト取得
    const projects = await base44.asServiceRole.entities.CrowdfundingProject.filter({ id: project_id });
    const project = projects[0];
    if (!project || project.status !== 'active') {
      return Response.json({ error: 'プロジェクトが見つからないか、募集中ではありません' }, { status: 404 });
    }

    // オーナーの当月累計寄付額を集計（月間プログレッシブ計算用）
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const donations = await base44.asServiceRole.entities.CrowdfundingDonation.filter({
      owner_email: project.owner_email,
      status: 'completed',
    });
    const monthlyYen = donations
      .filter(d => d.created_date >= monthStart)
      .reduce((s, d) => s + (d.amount || 0), 0);

    const progressiveRate = getProgressiveRate(monthlyYen);

    // 手数料計算
    // Stripe手数料: 3.6% + 固定（概算）
    const stripeFeeRate = 0.036;
    const stripeFee = Math.ceil(amount * stripeFeeRate);
    // プラットフォーム手数料: (1 - progressiveRate) × amount
    const platformFeeRate = 1 - progressiveRate;
    const platformFee = Math.floor(amount * platformFeeRate);
    const payoutYen = amount - stripeFee - platformFee;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const origin = req.headers.get('origin') || 'https://live-chat-market.com';
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `${project.organization_name} への支援`,
            description: project.title,
          },
          unit_amount: amount,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/crowdfunding/${project_id}?donation=success`,
      cancel_url: `${origin}/crowdfunding/${project_id}`,
      metadata: {
        type: 'crowdfunding_donation',
        project_id,
        project_title: project.title,
        owner_email: project.owner_email,
        donor_email: user.email,
        donor_name: user.full_name || '',
        amount: String(amount),
        stripe_fee_yen: String(stripeFee),
        platform_fee_yen: String(platformFee),
        progressive_rate: String(progressiveRate),
        payout_yen: String(payoutYen),
        message: message || '',
        is_anonymous: String(is_anonymous || false),
      },
    });

    return Response.json({ checkout_url: session.url, progressive_rate: progressiveRate, payout_yen: payoutYen });
  } catch (err) {
    console.error('[createCrowdfundingCheckout]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});