/**
 * Stripe決済リンク一元管理
 * 社長からStripe設定が届いたら、ここに流し込むだけで全決済ボタンが自動対応
 * 環境変数形式: VITE_STRIPE_<PRODUCT>_URL=https://buy.stripe.com/...
 */

const STRIPE_LINKS = {
  // コイン購入
  coin_1000: import.meta.env.VITE_STRIPE_COIN_1000_URL || null,
  coin_5000: import.meta.env.VITE_STRIPE_COIN_5000_URL || null,
  coin_10000: import.meta.env.VITE_STRIPE_COIN_10000_URL || null,

  // チケット購入（動的に生成される場合は null）
  ticket: import.meta.env.VITE_STRIPE_TICKET_URL || null,

  // ファンクラブ
  fanclub_standard: import.meta.env.VITE_STRIPE_FANCLUB_STANDARD_URL || null,
  fanclub_premium: import.meta.env.VITE_STRIPE_FANCLUB_PREMIUM_URL || null,
  fanclub_diamond: import.meta.env.VITE_STRIPE_FANCLUB_DIAMOND_URL || null,

  // PPV（有料ライブ）
  ppv: import.meta.env.VITE_STRIPE_PPV_URL || null,

  // VOD
  vod: import.meta.env.VITE_STRIPE_VOD_URL || null,
};

/**
 * 指定されたStripeリンクを取得
 * @param {string} productKey - 商品キー (e.g., "coin_1000", "fanclub_premium")
 * @returns {string|null} - Stripeリンク or null
 */
export function getStripeLink(productKey) {
  return STRIPE_LINKS[productKey] || null;
}

/**
 * 全Stripeリンクを取得（デバッグ用）
 */
export function getAllStripeLinks() {
  return STRIPE_LINKS;
}

/**
 * Stripeリンクが設定されているかチェック
 * @param {string} productKey
 * @returns {boolean}
 */
export function hasStripeLink(productKey) {
  return !!STRIPE_LINKS[productKey];
}

export default STRIPE_LINKS;