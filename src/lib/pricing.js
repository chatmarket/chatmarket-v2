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

// ─── エールコイン購入手数料（2026-06-04確定） ──────────────────────
// エールコイン購入手数料: 5%（外乗せ方式・ユーザー負担）
// Stripe実手数料（3.6%）とは別物。購入手数料がStripeコストをカバーする設計。
export const COIN_PURCHASE_FEE_RATE = 0.05; // 5%

/**
 * エールコイン購入時の視聴者支払総額を計算する
 * coin_purchase_fee_yen = Math.ceil(coins × 0.05)
 * viewer_total_yen      = coins + coin_purchase_fee_yen
 * granted_coins         = coins（手数料分のコインは付与しない）
 *
 * 例: 1000コイン → 手数料50円 → 支払1,050円 → 付与1,000コイン
 *
 * @param {number} coins 購入コイン数（= コイン本体価格円）
 * @returns {{ coinBaseAmountYen, coinPurchaseFeeYen, viewerTotalYen, grantedCoins }}
 */
export function calcCoinPurchase(coins) {
  const coinBaseAmountYen   = coins;
  const coinPurchaseFeeYen  = Math.ceil(coins * COIN_PURCHASE_FEE_RATE);
  const viewerTotalYen      = coinBaseAmountYen + coinPurchaseFeeYen;
  const grantedCoins        = coins; // 手数料分は付与しない
  return { coinBaseAmountYen, coinPurchaseFeeYen, viewerTotalYen, grantedCoins };
}

/** 後方互換 */
export const STRIPE_FEE_RATE  = 0.036; // Stripe Japan 実手数料（参考値・コスト計算用）
export const STRIPE_FEE_FIXED = 0;

export function calcCoinCharge(coinAmount) {
  const { viewerTotalYen } = calcCoinPurchase(coinAmount);
  return { chargeYen: viewerTotalYen, coinAmount };
}

export function calcChargeAmount(desiredAmount) {
  return calcCoinPurchase(desiredAmount).viewerTotalYen;
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

// ─── 有識者カテゴリ専用還元率（85%固定） ─────────────────────────
export const EXPERT_CATEGORY_ID = "expert";
export const EXPERT_REVENUE_SHARE = 0.85; // PPV・エールコイン共通

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

/** トップライバー特例: 最低 15分200コイン */
export const TOP_LIVER_MIN_COINS_PER_15MIN = 200;
export const STANDARD_MIN_COINS_PER_15MIN  = 15;  // 通常ライブ最低価格（SD画質前提）

export function getProgressiveRate(monthlyGrossRevenue) {
  for (let i = PROGRESSIVE_TIERS.length - 1; i >= 0; i--) {
    if (monthlyGrossRevenue >= PROGRESSIVE_TIERS[i].threshold) {
      return PROGRESSIVE_TIERS[i].rate;
    }
  }
  return 0.85;
}

export function getApplicableRate(planId, monthlyGrossRevenue = 0, categoryId = null) {
  // 有識者カテゴリ（Expert）：常に85%固定
  if (categoryId === EXPERT_CATEGORY_ID) {
    return EXPERT_REVENUE_SHARE;
  }
  
  const progressivePlans = ['basic', 'vod', 'ppv', 'call-anser'];
  if (progressivePlans.includes(planId)) {
    return getProgressiveRate(monthlyGrossRevenue);
  }
  return PLAN_REVENUE_SHARE[planId] ?? 0.70;
}

export function calcPayout({ grossRevenue, planId, monthlyGrossRevenue = 0, infraCost = 0, transferFee = 0, categoryId = null }) {
  const rate     = getApplicableRate(planId, monthlyGrossRevenue, categoryId);
  const afterInfra = grossRevenue - infraCost;
  const payout   = Math.floor(afterInfra * rate) - transferFee;
  return { grossRevenue, infraCost, afterInfra, rate, payout: Math.max(0, payout), transferFee };
}

// ─── 画質連動型・価格帯ルール ─────────────────────────────────────
// SD（480p）: 15〜54円/15分　→ Chime推定コスト約2〜3円でギリギリ黒字
// HD（720p）: 55〜149円/15分 → Chime推定コスト約5〜6円で黒字
// FHD（1080p）: 150円〜      → Chime推定コスト約8円で黒字
export const BITRATE_TIERS = [
  { minCoins: 15,  maxCoins: 54,  quality: "480p",  label: "SD"  },
  { minCoins: 55,  maxCoins: 149, quality: "720p",  label: "HD"  },
  { minCoins: 150, maxCoins: null, quality: "1080p", label: "FHD" },
];

/**
 * コイン単価から許可される最大画質を返す
 * @param {number} coinsPerBlock  15分あたりのコイン数
 * @returns {string} "480p" | "720p" | "1080p"
 */
export function getMaxBitrateForPrice(coinsPerBlock) {
  if (coinsPerBlock >= 150) return "1080p";
  if (coinsPerBlock >= 55)  return "720p";
  if (coinsPerBlock >= 15)  return "480p";
  return "480p"; // 最低でもSD
}

// ─── ライブ配信料金ルール ─────────────────────────────────────────
export const LIVE_RULES = {
  MIN_COINS_PER_15MIN:         15,   // 最低15コイン（SD画質前提）
  TOP_MIN_COINS_PER_15MIN:     TOP_LIVER_MIN_COINS_PER_15MIN, // 200
  SD_MAX_COINS_PER_15MIN:      54,   // 54以下はSD強制
  HD_MIN_COINS_PER_15MIN:      55,   // 55以上でHD許可
  HD_MAX_COINS_PER_15MIN:      149,  // 149以下はHD上限
  FHD_MIN_COINS_PER_15MIN:     150,  // 150以上でFHD許可（従来の最低価格）
  CREATOR_SHARE:               0.85,
  PLATFORM_SHARE:              0.15,
};

/** ライブ最低価格を計算（duration_min 分の配信） */
export function minLivePrice(durationMin, isTopLiver = false) {
  const perBlock = isTopLiver ? TOP_LIVER_MIN_COINS_PER_15MIN : LIVE_RULES.MIN_COINS_PER_15MIN;
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