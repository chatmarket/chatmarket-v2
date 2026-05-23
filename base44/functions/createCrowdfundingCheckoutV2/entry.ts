/**
 * createCrowdfundingCheckoutV2
 * Stripe Connect Destination Charges方式のクラウドファンディング決済。
 * - Stripe手数料3.6%は支援者側に上乗せ（支援者が支払う総額 = amount + stripe_fee）
 * - プラットフォーム手数料(1-progressiveRate)はapplication_feeとして自動徴収
 * - 残額はstripe_connect_account_idへDestination Chargeで直接振込
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

    // プログレッシブ還元率計算
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
    // Stripe手数料3.6%を支援者上乗せ → 支援者が払う総額
    const stripeFeeRate = 0.036;
    const stripeFee = Math.ceil(amount * stripeFeeRate);
    const totalCharge = amount + stripeFee; // 支援者が実際に支払う金額

    // プラットフォーム手数料 (application_fee): 寄付額 × (1 - progressiveRate)
    const platformFeeRate = 1 - progressiveRate;
    const applicationFee = Math.floor(amount * platformFeeRate);

    // NPO団体への振込額
    const payoutYen = amount - applicationFee;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://live-chat-market.com';

    // Connect対応チェック
    const connectAccountId = project.stripe_connect_account_id;
    const connectReady = project.stripe_connect_status === 'active' && connectAccountId;

    let session;

    if (connectReady) {
      // ── Destination Charges方式（Connect対応済み） ──
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: `${project.organization_name} への支援`,
                description: project.title,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: '決済手数料（Stripe）',
                description: '3.6% — 支援者ご負担',
              },
              unit_amount: stripeFee,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        payment_intent_data: {
          application_fee_amount: applicationFee,
          transfer_data: {
            destination: connectAccountId,
          },
        },
        success_url: `${origin}/crowdfunding/${project_id}?donation=success`,
        cancel_url: `${origin}/crowdfunding/${project_id}`,
        metadata: {
          type: 'crowdfunding_donation_v2',
          project_id,
          project_title: project.title,
          owner_email: project.owner_email,
          donor_email: user.email,
          donor_name: user.full_name || '',
          amount: String(amount),
          stripe_fee_yen: String(stripeFee),
          platform_fee_yen: String(applicationFee),
          progressive_rate: String(progressiveRate),
          payout_yen: String(payoutYen),
          message: message || '',
          is_anonymous: String(is_anonymous || false),
          connect_mode: 'destination_charges',
          connect_account_id: connectAccountId,
        },
      });
    } else {
      // ── フォールバック: Connect未設定の場合はプラットフォーム経由（旧方式） ──
      session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: `${project.organization_name} への支援`,
                description: project.title,
              },
              unit_amount: amount,
            },
            quantity: 1,
          },
          {
            price_data: {
              currency: 'jpy',
              product_data: {
                name: '決済手数料（Stripe）',
                description: '3.6% — 支援者ご負担',
              },
              unit_amount: stripeFee,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${origin}/crowdfunding/${project_id}?donation=success`,
        cancel_url: `${origin}/crowdfunding/${project_id}`,
        metadata: {
          type: 'crowdfunding_donation_v2',
          project_id,
          project_title: project.title,
          owner_email: project.owner_email,
          donor_email: user.email,
          donor_name: user.full_name || '',
          amount: String(amount),
          stripe_fee_yen: String(stripeFee),
          platform_fee_yen: String(applicationFee),
          progressive_rate: String(progressiveRate),
          payout_yen: String(payoutYen),
          message: message || '',
          is_anonymous: String(is_anonymous || false),
          connect_mode: 'platform_fallback',
        },
      });
    }

    return Response.json({
      checkout_url: session.url,
      progressive_rate: progressiveRate,
      payout_yen: payoutYen,
      total_charge: totalCharge,
      stripe_fee: stripeFee,
      connect_mode: connectReady ? 'destination_charges' : 'platform_fallback',
    });
  } catch (err) {
    console.error('[createCrowdfundingCheckoutV2]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});