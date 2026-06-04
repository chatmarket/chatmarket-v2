/**
 * createCoinCheckoutSession
 * エールコイン購入用 Stripe Checkout セッションを作成する
 *
 * ── 正式仕様（2026-06-04確定） ───────────────────────────────────────
 *   エールコイン購入手数料: 5%（外乗せ方式）
 *   coin_purchase_fee_yen = Math.ceil(coins × 0.05)
 *   viewer_total_yen      = coins + coin_purchase_fee_yen
 *   granted_coins         = coins（手数料分は付与しない）
 *
 *   1,000コイン → 手数料50円 → 支払1,050円 → 付与1,000コイン
 *   5,000コイン → 手数料250円 → 支払5,250円 → 付与5,000コイン
 *  10,000コイン → 手数料500円 → 支払10,500円 → 付与10,000コイン
 *
 * ── ボーナスコインについて ────────────────────────────────────────────
 *   ボーナスコインは廃止。granted_coins = coin_base_amount_yen のみ。
 *
 * ── Stripe実手数料との分離 ───────────────────────────────────────────
 *   エールコイン購入手数料5%（プラットフォーム収益）と
 *   Stripeが実際に請求する決済手数料は別物として管理。
 *   Stripe実手数料は推測値として保存しない。
 * ────────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// 確定販売プラン（2026-06-04改定）
// coin_purchase_fee_rate = 0.05（外乗せ方式）
const COIN_PLANS = {
  plan_1000: {
    coin_base_amount_yen: 1000,
    coin_purchase_fee_rate: 0.05,
    coin_purchase_fee_yen: Math.ceil(1000 * 0.05), // 50
    viewer_total_yen: 1000 + Math.ceil(1000 * 0.05), // 1050
    granted_coins: 1000,
    label: '¥1,000プラン（1,000コイン）',
  },
  plan_5000: {
    coin_base_amount_yen: 5000,
    coin_purchase_fee_rate: 0.05,
    coin_purchase_fee_yen: Math.ceil(5000 * 0.05), // 250
    viewer_total_yen: 5000 + Math.ceil(5000 * 0.05), // 5250
    granted_coins: 5000,
    label: '¥5,000プラン（5,000コイン）',
  },
  plan_10000: {
    coin_base_amount_yen: 10000,
    coin_purchase_fee_rate: 0.05,
    coin_purchase_fee_yen: Math.ceil(10000 * 0.05), // 500
    viewer_total_yen: 10000 + Math.ceil(10000 * 0.05), // 10500
    granted_coins: 10000,
    label: '¥10,000プラン（10,000コイン）',
  },
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { planId, successUrl, cancelUrl } = await req.json();

    const plan = COIN_PLANS[planId];
    if (!plan) {
      return Response.json({ error: `Invalid planId: ${planId}. Valid: ${Object.keys(COIN_PLANS).join(', ')}` }, { status: 400 });
    }

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) return Response.json({ error: 'Stripe not configured' }, { status: 500 });

    const description = `エールコイン ${plan.granted_coins.toLocaleString()}コイン（エールコイン購入手数料5%込）`;

    // Stripe Checkout Session作成
    // viewer_total_yen = coin_base_amount_yen + coin_purchase_fee_yen
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][unit_amount]': String(plan.viewer_total_yen), // 1050 / 5250 / 10500
        'line_items[0][price_data][product_data][name]': plan.label,
        'line_items[0][price_data][product_data][description]': description,
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
        'cancel_url': cancelUrl || successUrl,
        // metadata: 購入内訳を明確に記録
        'metadata[type]': 'yell_coin_purchase',
        'metadata[userEmail]': user.email,
        'metadata[planId]': planId,
        // 正式フィールド名（2026-06-04確定仕様）
        'metadata[coin_base_amount_yen]': String(plan.coin_base_amount_yen),
        'metadata[coin_purchase_fee_rate]': String(plan.coin_purchase_fee_rate),
        'metadata[coin_purchase_fee_yen]': String(plan.coin_purchase_fee_yen),
        'metadata[viewer_total_yen]': String(plan.viewer_total_yen),
        'metadata[granted_coins]': String(plan.granted_coins),
        // 後方互換（Webhookで旧フィールド名を参照している場合のフォールバック）
        'metadata[base_price]': String(plan.coin_base_amount_yen),
        'metadata[charge_amount]': String(plan.viewer_total_yen),
        'metadata[coins_purchased]': String(plan.granted_coins),
        'metadata[bonus_coins]': '0', // ボーナス廃止
        'metadata[total_coins]': String(plan.granted_coins),
        'customer_email': user.email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Stripe error', detail: error }, { status: 500 });
    }

    const session = await response.json();
    return Response.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      // フロントへ内訳を返す（表示用）
      breakdown: {
        coin_base_amount_yen: plan.coin_base_amount_yen,
        coin_purchase_fee_yen: plan.coin_purchase_fee_yen,
        viewer_total_yen: plan.viewer_total_yen,
        granted_coins: plan.granted_coins,
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});