/**
 * 決済・報酬計算ロジック（確定版）
 *
 * 視聴者（支払い側）:
 *   購入希望額 × 1.036 を請求 → Stripe手数料(3.6%)をプラットフォーム利用料として外出し
 *
 * 配信者（受け取り側）:
 *   売上総額（面額） × 適用還元率 - インフラ実費 - 銀行振込手数料
 */

// ─── Stripe手数料（視聴者負担・外出し） ───────────────────────────
export const STRIPE_FEE_RATE = 0.036; // 3.6%

/**
 * 視聴者が実際に支払う金額（Stripe手数料込み）
 * @param {number} desiredAmount - 購入希望額（円）
 * @returns {number} 請求金額（円・切り上げ）
 */
export function calcChargeAmount(desiredAmount) {
  return Math.ceil(desiredAmount * (1 + STRIPE_FEE_RATE));
}

// ─── プラン別基本還元率 ───────────────────────────────────────────
export const PLAN_REVENUE_SHARE = {
  free:           0.70,
  basic:          0.85, // プログレッシブ対象
  vod:            0.85, // プログレッシブ対象
  ppv:            0.85, // プログレッシブ対象
  'call-anser':   0.85, // プログレッシブ対象
  'mini-school':  0.90,
  enterprise:     0.90,
  crowdfunding:   0.90, // NPO・政治政党特例（一律）
};

// ─── プログレッシブ・インセンティブ階層表 ─────────────────────────
// BASICプラン以上が対象。月間総売上に基づき翌月の還元率を自動更新。
export const PROGRESSIVE_TIERS = [
  { threshold:  1000000, rate: 0.86 }, //  100万円超 → 86%
  { threshold:  3000000, rate: 0.87 }, //  300万円超 → 87%
  { threshold:  6000000, rate: 0.88 }, //  600万円超 → 88%
  { threshold:  9000000, rate: 0.89 }, //  900万円超 → 89%
  { threshold: 12000000, rate: 0.90 }, // 1,200万円超 → 90%
  { threshold: 15000000, rate: 0.91 }, // 1,500万円超 → 91%
  { threshold: 16500000, rate: 0.92 }, // 1,650万円超 → 92%
  { threshold: 18000000, rate: 0.93 }, // 1,800万円超 → 93%
  { threshold: 19500000, rate: 0.94 }, // 1,950万円超 → 94%
  { threshold: 20000000, rate: 0.95 }, // 2,000万円以上 → 95%（上限）
];

/**
 * 月間売上からプログレッシブ還元率を返す（BASICプラン以上用）
 * @param {number} monthlyGrossRevenue - 月間総売上（円）
 * @returns {number} 適用還元率（0.85〜0.95）
 */
export function getProgressiveRate(monthlyGrossRevenue) {
  // 降順で最初にthresholdを超えたものを返す
  for (let i = PROGRESSIVE_TIERS.length - 1; i >= 0; i--) {
    if (monthlyGrossRevenue >= PROGRESSIVE_TIERS[i].threshold) {
      return PROGRESSIVE_TIERS[i].rate;
    }
  }
  return 0.85; // 基本還元率
}

/**
 * プラン・月間売上から適用還元率を返す
 * @param {string} planId
 * @param {number} monthlyGrossRevenue
 * @returns {number}
 */
export function getApplicableRate(planId, monthlyGrossRevenue = 0) {
  const progressivePlans = ['basic', 'vod', 'ppv', 'call-anser'];
  if (progressivePlans.includes(planId)) {
    return getProgressiveRate(monthlyGrossRevenue);
  }
  return PLAN_REVENUE_SHARE[planId] ?? 0.70;
}

/**
 * 最終振込額を計算
 * 最終振込額 = (売上総額 - インフラ実費) × 還元率 - 銀行振込手数料
 *
 * @param {object} params
 * @param {number} params.grossRevenue       - 売上総額（面額・3.6%引く前）
 * @param {string} params.planId             - プランID
 * @param {number} params.monthlyGrossRevenue - 月間総売上（プログレッシブ判定用）
 * @param {number} [params.infraCost]        - AWS等インフラ実費（省略可）
 * @param {number} [params.transferFee]      - 銀行振込手数料（省略可）
 * @returns {object}
 */
export function calcPayout({ grossRevenue, planId, monthlyGrossRevenue = 0, infraCost = 0, transferFee = 0 }) {
  const rate = getApplicableRate(planId, monthlyGrossRevenue);
  const afterInfra = grossRevenue - infraCost;
  const payout = Math.floor(afterInfra * rate) - transferFee;
  return {
    grossRevenue,
    infraCost,
    afterInfra,
    rate,
    payout: Math.max(0, payout),
    transferFee,
  };
}

// ─── 通話料金ルール（後方互換） ───────────────────────────────────
export const CALL_RULES = {
  MIN_PRICE_PER_15MIN: 150,
  STEP_MINUTES: 15,
  MAX_MINUTES: 120,
  FREE_REVENUE_SHARE: PLAN_REVENUE_SHARE.free,
  BASIC_REVENUE_SHARE: PLAN_REVENUE_SHARE.basic,
};

export const CALL_DURATION_OPTIONS = Array.from(
  { length: CALL_RULES.MAX_MINUTES / CALL_RULES.STEP_MINUTES },
  (_, i) => (i + 1) * CALL_RULES.STEP_MINUTES
);

export function minCallPrice(minutes) {
  return (minutes / CALL_RULES.STEP_MINUTES) * CALL_RULES.MIN_PRICE_PER_15MIN;
}

// 後方互換エクスポート
export const PLANS = {
  FREE:  { id: 'free',  name: 'FREEプラン',  monthlyFee: 0,    revenueShare: PLAN_REVENUE_SHARE.free },
  BASIC: { id: 'basic', name: 'BASICプラン', monthlyFee: 3300, revenueShare: PLAN_REVENUE_SHARE.basic },
  VOD:   { id: 'vod',   name: 'VODプラン',   monthlyFee: 9900, revenueShare: PLAN_REVENUE_SHARE.vod },
  PPV:   { id: 'ppv',   name: 'PPVプラン',   monthlyFee: 9900, revenueShare: PLAN_REVENUE_SHARE.ppv },
};