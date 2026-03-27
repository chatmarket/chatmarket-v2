/**
 * プログレッシブインセンティブ対応の決済ロジック（フロントエンド用）
 */

// 1対1ビデオ通話ルール
export const CALL_RULES = {
  MIN_PRICE_PER_15MIN: 150,   // 15分あたり最低料金（円）
  STEP_MINUTES: 15,            // 時間の刻み（分）
  MAX_MINUTES: 120,            // 最大通話時間（分）
  FREE_REVENUE_SHARE: 0.70,    // FREEプラン収益率
  BASIC_REVENUE_SHARE: 0.85,   // BASICプラン収益率
};

// 通話時間の選択肢（15分刻み、最大120分）
export const CALL_DURATION_OPTIONS = Array.from(
  { length: CALL_RULES.MAX_MINUTES / CALL_RULES.STEP_MINUTES },
  (_, i) => (i + 1) * CALL_RULES.STEP_MINUTES
);

// 指定分数の最低料金を返す
export function minCallPrice(minutes) {
  return (minutes / CALL_RULES.STEP_MINUTES) * CALL_RULES.MIN_PRICE_PER_15MIN;
}

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'FREEプラン',
    price: 0,
    monthlyFee: 0,
    revenueShare: 0.70,
    callRevenueShare: 0.70,
  },
  BASIC: {
    id: 'basic',
    name: 'BASICプラン',
    price: 3300,
    monthlyFee: 3300,
    revenueShare: 0.85,
    callRevenueShare: 0.85,
  },
  VOD: {
    id: 'vod',
    name: 'VODプラン',
    price: 9000,
    monthlyFee: 9000,
    revenueShare: 0.85,
  },
  PPV: {
    id: 'ppv',
    name: 'PPVプラン',
    price: 9000,
    monthlyFee: 9000,
    revenueShare: 0.85,
  },
};

/**
 * プログレッシブインセンティブ率を計算
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
  return 0.85;
}

/**
 * 支払い金額を計算（プログレッシブインセンティブ適用）
 */
export function calculatePayment(grossAmount, platformFeeRate = 0.15, monthlyRevenue = 0) {
  const platformFee = Math.floor(grossAmount * platformFeeRate);
  const afterFee = grossAmount - platformFee;
  const progressiveRate = getProgressiveRate(monthlyRevenue);
  const finalPayment = Math.floor(afterFee * progressiveRate);

  return {
    gross: grossAmount,
    platformFee,
    afterFee,
    progressiveRate,
    final: finalPayment,
  };
}