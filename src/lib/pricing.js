/**
 * プログレッシブインセンティブ対応の決済ロジック（フロントエンド用）
 */

export const PLANS = {
  FREE: {
    id: 'free',
    name: 'FREEプラン',
    price: 0,
    monthlyFee: 0,
    revenueShare: 0.70,
  },
  BASIC: {
    id: 'basic',
    name: 'BASICプラン',
    price: 3300,
    monthlyFee: 3300,
    revenueShare: 0.85,
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