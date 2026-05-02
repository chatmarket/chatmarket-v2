/**
 * Stripe決済リンク一元管理
 * 社長から渡されたリンクをここで厳密に管理
 * 
 * プラン × 期間別に8本のリンク
 */

const STRIPE_LINKS = {
  // 【12ヶ月無料：オープン記念リンク】
  basic_12m: "https://buy.stripe.com/6oUeVe2o62fR6kr0WI3ks04",
  call_12m: "https://buy.stripe.com/00w28s8Mu6w74cj48U3ks05",
  ppv_12m: "https://buy.stripe.com/7sY8wQ5Ai6w7107cFq3ks06",
  vod_12m: "https://buy.stripe.com/14AdRa7IqdYzdMTaxi3ks07",

  // 【24ヶ月無料：Invitationリンク】
  basic_24m: "https://buy.stripe.com/dRm5kE3sa07J6kr20M3ks03",
  call_24m: "https://buy.stripe.com/14A00ke6O7Ab9wDdJu3ks02",
  ppv_24m: "https://buy.stripe.com/28E14o9Qy2fR24b48U3ks00",
  vod_24m: "https://buy.stripe.com/eVq3cw4we07JcIPaxi3ks01",
};

/**
 * リンク取得（キーベース）
 * @param key - basic_12m, call_24m など
 */
export function getStripeLink(key) {
  return STRIPE_LINKS[key] || null;
}

/**
 * 特定プランのリンク取得（プラン名 + 期間）
 * @param planName - "basic", "call", "ppv", "vod"
 * @param months - 12 or 24
 */
export function getStripeLinkByPlan(planName, months = 12) {
  const key = `${planName}_${months}m`;
  return getStripeLink(key);
}

/**
 * 全リンク取得
 */
export function getAllStripeLinks() {
  return STRIPE_LINKS;
}

/**
 * リンク存在確認
 */
export function hasStripeLink(key) {
  return !!STRIPE_LINKS[key];
}