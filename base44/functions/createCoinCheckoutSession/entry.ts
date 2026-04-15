/**
 * createCoinCheckoutSession
 * エールコイン購入用 Stripe Checkout セッションを作成する
 *
 * ── 販売テーブル（確定・変更禁止） ──────────────────────────────────
 *   ¥1,000  → 1,000コイン  (支払額 ¥1,038) ボーナスなし
 *   ¥5,000  → 5,400コイン  (支払額 ¥5,187) ボーナス8%
 *   ¥10,000 → 10,800コイン (支払額 ¥10,374) ボーナス8%
 *
 * ── 手数料計算ルール ─────────────────────────────────────────────
 *   Stripe手数料: 3.6%（国内カード）
 *   請求額 = floor(定価 × 1.036)
 *
 * ⚠️  ボーナス率を8%以上に設定することは逆ざやリスクのため禁止
 *     （docs/DEVELOPMENT_HISTORY.md Section 10 参照）
 * ──────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// 確定販売プラン（絶対に変更しないこと）
const COIN_PLANS = {
  plan_1000: { base_price: 1000, coins: 1000,  bonus_coins: 0,   charge_amount: 1038, label: '¥1,000プラン（1,000コイン）' },
  plan_5000: { base_price: 5000, coins: 5000,  bonus_coins: 400, charge_amount: 5187, label: '¥5,000プラン（5,400コイン / +8%ボーナス）' },
  plan_10000:{ base_price:10000, coins:10000,  bonus_coins: 800, charge_amount:10374, label: '¥10,000プラン（10,800コイン / +8%ボーナス）' },
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

    const totalCoins = plan.coins + plan.bonus_coins;
    const description = plan.bonus_coins > 0
      ? `エールコイン ${plan.coins.toLocaleString()}コイン + ボーナス${plan.bonus_coins}コイン = 合計${totalCoins.toLocaleString()}コイン（システム利用料3.6%込）`
      : `エールコイン ${plan.coins.toLocaleString()}コイン（システム利用料3.6%込）`;

    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeSecretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'line_items[0][price_data][currency]': 'jpy',
        'line_items[0][price_data][unit_amount]': String(plan.charge_amount),
        'line_items[0][price_data][product_data][name]': plan.label,
        'line_items[0][price_data][product_data][description]': description,
        'line_items[0][quantity]': '1',
        'mode': 'payment',
        'success_url': `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
        'cancel_url': cancelUrl || successUrl,
        // metadata に入金額・付与額を明確に分離して記録
        'metadata[type]': 'yell_coin_purchase',
        'metadata[userEmail]': user.email,
        'metadata[planId]': planId,
        'metadata[base_price]': String(plan.base_price),
        'metadata[charge_amount]': String(plan.charge_amount),
        'metadata[coins_purchased]': String(plan.coins),      // 入金に対応するコイン
        'metadata[bonus_coins]': String(plan.bonus_coins),    // ボーナスコイン（別記）
        'metadata[total_coins]': String(totalCoins),           // 付与合計
        'customer_email': user.email,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return Response.json({ error: 'Stripe error', detail: error }, { status: 500 });
    }

    const session = await response.json();
    return Response.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});