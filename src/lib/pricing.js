/**
 * プログレッシブインセンティブ対応の決済ロジック
 */

// プラン定義
export const PLANS = {
  FREE: {
    id: 'free',
    name: 'FREEプラン',
    price: 0,
    revenueShare: 0.70,
    features: ['1対1ビデオ通話', 'エールコイン受取'],
  },
  BASIC: {
    id: 'basic',
    name: 'BASICプラン',
    price: 3300,
    revenueShare: 0.85,
    features: ['有料ビデオ通話', 'エールコイン受取'],
    stripeProductId: process.env.STRIPE_BASIC_PRODUCT_ID,
  },
  VOD: {
    id: 'vod',
    name: 'VODプラン',
    price: 9000,
    revenueShare: 0.85,
    features: ['動画販売', '生配信アーカイブ販売'],
    stripeProductId: process.env.STRIPE_VOD_PRODUCT_ID,
  },
  PPV: {
    id: 'ppv',
    name: 'PPVプラン',
    price: 9000,
    revenueShare: 0.85,
    features: ['有料ライブ配信'],
    stripeProductId: process.env.STRIPE_PPV_PRODUCT_ID,
  },
};

/**
 * プログレッシブインセンティブ率を計算
 * @param {number} monthlyGrossRevenue - 月間総売上（円）
 * @returns {number} 還元率（0.85～0.95）
 */
export function getProgressiveRate(monthlyGrossRevenue) {
  if (monthlyGrossRevenue > 20000000) return 0.95;
  if (monthlyGrossRevenue > 19500000) return 0.94;
  if (monthlyGrossRevenue > 18000000) return 0.93;
  if (monthlyGrossRevenue > 16500000) return 0.92;
  if (monthlyGrossRevenue > 15000000) return 0.91;
  if (monthlyGrossRevenue > 12000000) return 0.90;
  if (monthlyGrossRevenue > 9000000) return 0.89;
  if (monthlyGrossRevenue > 6000000) return 0.88;
  if (monthlyGrossRevenue > 3000000) return 0.87;
  if (monthlyGrossRevenue > 2000000) return 0.86;
  return 0.85; // デフォルト
}

/**
 * 支払い金額を計算
 * @param {number} amount - 売上金額
 * @param {number} platformFeeRate - プラットフォーム手数料率
 * @param {number} monthlyGrossRevenue - 月間総売上（プログレッシブインセンティブ計算用）
 * @returns {object} { grossAmount, platformFee, afterPlatformFee, progressiveRate, finalPayment }
 */
export function calculatePayment(amount, platformFeeRate, monthlyGrossRevenue = 0) {
  const grossAmount = Math.floor(amount);
  const platformFee = Math.floor(grossAmount * platformFeeRate);
  const afterPlatformFee = grossAmount - platformFee;
  
  // プログレッシブインセンティブ適用
  const progressiveRate = getProgressiveRate(monthlyGrossRevenue);
  const finalPayment = Math.floor(afterPlatformFee * progressiveRate);
  
  return {
    grossAmount,
    platformFee,
    afterPlatformFee,
    progressiveRate,
    finalPayment,
  };
}

/**
 * ビデオ購入の支払い計算
 * @param {number} price - 販売価格
 * @param {number} monthlyGrossRevenue - 月間総売上
 * @returns {object} 支払い詳細
 */
export function calculateVideoPurchasePayment(price, monthlyGrossRevenue = 0) {
  // 動画販売：プラットフォーム手数料15%
  return calculatePayment(price, 0.15, monthlyGrossRevenue);
}

/**
 * ライブ配信チケット購入の支払い計算
 * @param {number} price - チケット価格
 * @param {number} monthlyGrossRevenue - 月間総売上
 * @returns {object} 支払い詳細
 */
export function calculateLiveTicketPayment(price, monthlyGrossRevenue = 0) {
  // ライブチケット：プラットフォーム手数料15%
  return calculatePayment(price, 0.15, monthlyGrossRevenue);
}

/**
 * エールコイン受取の支払い計算
 * @param {number} amount - エールコイン金額
 * @param {number} monthlyGrossRevenue - 月間総売上
 * @returns {object} 支払い詳細
 */
export function calculateYellCoinPayment(amount, monthlyGrossRevenue = 0) {
  // エールコイン：プラットフォーム手数料10%
  return calculatePayment(amount, 0.10, monthlyGrossRevenue);
}

/**
 * 月間売上から月間総売上を計算
 * @param {object[]} purchases - 購入レコード配列
 * @returns {number} 月間総売上
 */
export function calculateMonthlyGrossRevenue(purchases) {
  return purchases.reduce((sum, p) => {
    if (p.item_type === 'video') {
      return sum + calculateVideoPurchasePayment(p.amount).afterPlatformFee;
    } else if (p.item_type === 'livestream') {
      return sum + calculateLiveTicketPayment(p.amount).afterPlatformFee;
    } else if (p.item_type === 'yellcoin') {
      return sum + calculateYellCoinPayment(p.amount).afterPlatformFee;
    }
    return sum;
  }, 0);
}