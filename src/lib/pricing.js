/**
 * 決済・報酬計算ロジック（確定版 v2）
 *
 * ─── エールコイン基準 ───────────────────────────────────────────────
 *   1 エールコイン = 1 円（決済手数料はユーザー負担・外乗せ方式）
 *
 * ─── 外乗せ方式 ────────────────────────────────────────────────────
 *   ユーザーが「1000コイン」を選択した場合:
 *     請求額 = ceil(1000 × 1.036) = 1036円
 *     DB残高 = 1000コイン（端数なし）
 *
 * ─── AWS インフラ実費（確定） ──────────────────────────────────────
 *   IVS 入力 (場所代):    30円 / 時間
 *   IVS 出力 (送料):      5円 / 視聴者 / 時間
 *   Chime 通信費:         4円 / 分（双方向）
 *   録画費:               2円 / 分
 */

// ─── エールコイン ────────────────────────────────────────────────────
export const COIN_TO_YEN = 1; // 1コイン = 1円（確定）

// ─── Stripe手数料（視聴者負担・外出し） ───────────────────────────
// Stripe Japan 国内カード: 3.6%のみ・固定手数料なし（公式: stripe.com/jp/pricing 確認済み）
// ※ STRIPE_FEE_FIXED=40は Stripe US の料金。Stripe Japan 国内カードには適用されない。
export const STRIPE_FEE_RATE  = 0.036; // 3.6%のみ
export const STRIPE_FEE_FIXED = 0;     // 固定費なし（Stripe Japan 国内カード）

/**
 * 視聴者が実際に支払う金額（Stripe手数料込み・外乗せ）
 * Stripe Japan 国内カード: ceil(coins / (1 - 0.036))
 * 例: 150円 → ceil(150 / 0.964) = 156円
 * @param {number} coinAmount  購入コイン数（= 円相当）
 * @returns {{ chargeYen: number, coinAmount: number }}
 */
export function calcCoinCharge(coinAmount) {
  const chargeYen = Math.ceil(coinAmount / (1 - STRIPE_FEE_RATE));
  return { chargeYen, coinAmount }; // DB残高は coinAmount のみ（端数なし）
}

/** 後方互換 */
export function calcChargeAmount(desiredAmount) {
  return calcCoinCharge(desiredAmount).chargeYen;
}

// ─── AWS コスト定数 ────────────────────────────────────────────────
export const AWS_COST = {
  IVS_INPUT_PER_HOUR:         30,   // 円/時間
  IVS_OUTPUT_PER_VIEWER_HOUR:  5,   // 円/視聴者/時間
  // Chime WebRTC: $0.0017/分/参加者（公式）× 2人 × 155円/$ ≒ 0.527円/分
  // 15分1対1通話 = 約8円/ユニット（録画なし）
  // 旧値「4円/分」は Media Pipeline 録画を含む過剰見積もりだったため修正
  CHIME_COMM_PER_MIN:         Math.ceil(0.0017 * 2 * 155 * 10) / 10, // ≒ 0.527円/分（参考値）
  CHIME_COST_PER_UNIT_15MIN:  8,    // 円/15分/1対1通話（確定値）
  RECORDING_PER_MIN:           2,   // 円/分
};

/** ライブ配信の運営純利益を計算 */
export function calcLiveProfit({ revenueCoins, durationMin, totalViewerMinutes }) {
  const platformRevYen  = Math.floor(revenueCoins * COIN_TO_YEN * 0.15);
  const inputCost       = (durationMin / 60) * AWS_COST.IVS_INPUT_PER_HOUR;
  const outputCost      = (totalViewerMinutes / 60) * AWS_COST.IVS_OUTPUT_PER_VIEWER_HOUR;
  return { platformRevYen, inputCost, outputCost, profit: platformRevYen - inputCost - outputCost };
}

/**
 * 通話の運営純利益を計算
 * AWS Chime SDK 公式単価: $0.0017/分/参加者（ap-northeast-1）
 * 1対1通話 = 2参加者。15分 = $0.051 ≒ ¥8（155円/$換算）
 * 旧試算の「¥4/分」は録画(Media Pipeline)込みの誤計算。プレーン通話は¥0.527/分相当。
 */
export function calcCallProfit({ coinsConsumed, actualMinutes, recordingMinutes = 0 }) {
  const platformRevYen = Math.floor(coinsConsumed * COIN_TO_YEN * 0.15);
  const commCost       = Math.ceil(actualMinutes * 0.0017 * 2 * 155); // $0.0017×2人×155円/分
  const recCost        = recordingMinutes * AWS_COST.RECORDING_PER_MIN;
  return { platformRevYen, commCost, recCost, profit: platformRevYen - commCost - recCost };
}

// ─── プラン別基本還元率 ───────────────────────────────────────────
export const PLAN_REVENUE_SHARE = {
  free:           0.70,
  basic:          0.85,
  vod:            0.85,
  ppv:            0.85,
  'call-anser':   0.85,
  'mini-school':  0.90,
  enterprise:     0.90,
  crowdfunding:   0.90,
};

// ─── プログレッシブ・インセンティブ階層表 ─────────────────────────
export const PROGRESSIVE_TIERS = [
  { threshold:  1000000, rate: 0.86 },
  { threshold:  3000000, rate: 0.87 },
  { threshold:  6000000, rate: 0.88 },
  { threshold:  9000000, rate: 0.89 },
  { threshold: 12000000, rate: 0.90 },
  { threshold: 15000000, rate: 0.91 },
  { threshold: 16500000, rate: 0.92 },
  { threshold: 18000000, rate: 0.93 },
  { threshold: 19500000, rate: 0.94 },
  { threshold: 10000000, rate: 0.95 }, // 累計1,000万円超 → トップライバー特例
];

/** トップライバー特例：累計売上1,000万円超 → 最大95%・最低価格引き上げ */
export const TOP_LIVER_THRESHOLD = 10000000; // 1,000万円

export function isTopLiver(cumulativeRevenueYen) {
  return cumulativeRevenueYen >= TOP_LIVER_THRESHOLD;
}

/** トップライバー特例: 最低 15分200コイン（通常は150） */
export const TOP_LIVER_MIN_COINS_PER_15MIN = 200;
export const STANDARD_MIN_COINS_PER_15MIN  = 150; // 通常ライブ最低価格

export function getProgressiveRate(monthlyGrossRevenue) {
  for (let i = PROGRESSIVE_TIERS.length - 1; i >= 0; i--) {
    if (monthlyGrossRevenue >= PROGRESSIVE_TIERS[i].threshold) {
      return PROGRESSIVE_TIERS[i].rate;
    }
  }
  return 0.85;
}

export function getApplicableRate(planId, monthlyGrossRevenue = 0) {
  const progressivePlans = ['basic', 'vod', 'ppv', 'call-anser'];
  if (progressivePlans.includes(planId)) {
    return getProgressiveRate(monthlyGrossRevenue);
  }
  return PLAN_REVENUE_SHARE[planId] ?? 0.70;
}

export function calcPayout({ grossRevenue, planId, monthlyGrossRevenue = 0, infraCost = 0, transferFee = 0 }) {
  const rate     = getApplicableRate(planId, monthlyGrossRevenue);
  const afterInfra = grossRevenue - infraCost;
  const payout   = Math.floor(afterInfra * rate) - transferFee;
  return { grossRevenue, infraCost, afterInfra, rate, payout: Math.max(0, payout), transferFee };
}

// ─── ライブ配信料金ルール ─────────────────────────────────────────
export const LIVE_RULES = {
  MIN_COINS_PER_15MIN:         STANDARD_MIN_COINS_PER_15MIN, // 150
  TOP_MIN_COINS_PER_15MIN:     TOP_LIVER_MIN_COINS_PER_15MIN, // 200
  CREATOR_SHARE:               0.85,
  PLATFORM_SHARE:              0.15,
};

/** ライブ最低価格を計算（duration_min 分の配信） */
export function minLivePrice(durationMin, isTopLiver = false) {
  const perBlock = isTopLiver ? TOP_LIVER_MIN_COINS_PER_15MIN : STANDARD_MIN_COINS_PER_15MIN;
  return Math.ceil(durationMin / 15) * perBlock;
}

// ─── 通話料金ルール ────────────────────────────────────────────────
export const CALL_RULES = {
  MIN_COINS_PER_15MIN: 150,  // 確定仕様: 15分150円
  STEP_MINUTES:        15,
  MAX_MINUTES:         120,
  COMM_COST_PER_MIN:   AWS_COST.CHIME_COMM_PER_MIN,
  CREATOR_SHARE:       0.85,
  PLATFORM_SHARE:      0.15,
};

export const CALL_DURATION_OPTIONS = Array.from(
  { length: CALL_RULES.MAX_MINUTES / CALL_RULES.STEP_MINUTES },
  (_, i) => (i + 1) * CALL_RULES.STEP_MINUTES
);

export function minCallPrice(minutes) {
  return Math.ceil(minutes / CALL_RULES.STEP_MINUTES) * CALL_RULES.MIN_COINS_PER_15MIN;
}

// ─── VOD料金ルール ────────────────────────────────────────────────
export const VOD_RULES = {
  MIN_COINS: 100,
  CREATOR_SHARE: 0.85,
};

// ─── 後方互換エクスポート ─────────────────────────────────────────
export const PLANS = {
  FREE:  { id: 'free',  name: 'FREEプラン',  monthlyFee: 0,    revenueShare: PLAN_REVENUE_SHARE.free },
  BASIC: { id: 'basic', name: 'BASICプラン', monthlyFee: 3300, revenueShare: PLAN_REVENUE_SHARE.basic },
  VOD:   { id: 'vod',   name: 'VODプラン',   monthlyFee: 9900, revenueShare: PLAN_REVENUE_SHARE.vod },
  PPV:   { id: 'ppv',   name: 'PPVプラン',   monthlyFee: 9900, revenueShare: PLAN_REVENUE_SHARE.ppv },
};