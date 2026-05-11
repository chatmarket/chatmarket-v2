/**
 * === Chat Market 定数定義 ===
 * 
 * ⚠️ LOCKED: 以下のパラメータはシステム保護変数です。
 * 更新は社長（ono@onestep-corp.com）の承認を経て行われます。
 * 
 * 更新履歴:
 * - 2026-05-11: 初版（小野社長要求）
 *   - コスト設定の確定
 *   - 解像度制限の固定化
 *   - エールコイン単価の保護化
 */

// ────────────────────────────────────────────────────────────
// 【AWS IVS コスト】LOCKED
// ────────────────────────────────────────────────────────────
export const IVS_COSTS = {
  INPUT_COST_PER_HOUR_YEN: 30,        // 入力コスト: 30円/時間
  OUTPUT_COST_PER_VIEWER_HOUR_YEN: 5, // 出力コスト: 5円/視聴者/時間
};

// ────────────────────────────────────────────────────────────
// 【動画価格 → 画質】自動マッピング LOCKED
// ────────────────────────────────────────────────────────────
export const QUALITY_TIERS = {
  SD_480P: {
    name: "SD 480p",
    minCoins: 15,
    maxCoins: 54,
    quality: "480p",
  },
  HD_720P: {
    name: "HD 720p",
    minCoins: 55,
    maxCoins: 149,
    quality: "720p",
  },
  FHD_1080P: {
    name: "FHD 1080p",
    minCoins: 150,
    maxCoins: null,
    quality: "1080p",
  },
};

/**
 * 価格からビットレート制限を自動決定
 * @param {number} price - 視聴価格（コイン）
 * @returns {string} - ビットレート制限値（'480p', '720p', '1080p'）
 */
export function getQualityFromPrice(price) {
  if (price === 0 || price >= QUALITY_TIERS.FHD_1080P.minCoins) {
    return QUALITY_TIERS.FHD_1080P.quality;
  }
  if (price >= QUALITY_TIERS.HD_720P.minCoins) {
    return QUALITY_TIERS.HD_720P.quality;
  }
  return QUALITY_TIERS.SD_480P.quality;
}

// ────────────────────────────────────────────────────────────
// 【エールコイン】 LOCKED - 社長の希望により統一固定
// ────────────────────────────────────────────────────────────
export const YELL_COIN_SETTINGS = {
  UNIT_NAME: "エールコイン",         // ✅ 全アプリで統一: SUPERCHAT → エールコイン
  COIN_TO_YEN_RATE: 1,              // 1コイン = 1円（確定仕様）
  CREATOR_REVENUE_RATE: 0.85,        // ライバー還元率: 85%（最小）
  PLATFORM_FEE_RATE: 0.036,          // プラットフォーム手数料: 3.6%
  BONUS_RATE_MAX: 0.08,              // ボーナス率最大: 8%（逆ざやリスク回避）
  TRANSACTION_LOG_RETENTION_DAYS: 365, // トランザクションログ保持期間: 365日
};

// ────────────────────────────────────────────────────────────
// 【チケット販売】LOCKED
// ────────────────────────────────────────────────────────────
export const TICKET_SETTINGS = {
  MIN_PRICE_YEN: 150,                // 最低チケット価格: 150円
  DURATION_UNIT_MINUTES: 15,         // 時間単位: 15分
  MAX_DURATION_MINUTES: 120,         // 最大配信時間: 120分（2時間）
  DURATIONS: [15, 30, 45, 60, 75, 90, 105, 120],
};

// ────────────────────────────────────────────────────────────
// 【PPV配信】LOCKED
// ────────────────────────────────────────────────────────────
export const PPV_SETTINGS = {
  MIN_PRICE_COINS: 15,               // 最低視聴価格: 15コイン
  FREE_PREVIEW_SECONDS: 30,          // 無料プレビュー: 30秒
  ARCHIVE_VOD_RETENTION_DAYS: 180,   // アーカイブ有効期限: 180日
};

// ────────────────────────────────────────────────────────────
// 【テストアカウント】LOCKED
// ────────────────────────────────────────────────────────────
export const TEST_ACCOUNT = {
  EMAIL: "ono@onestep-corp.com",     // テストアカウント（社長専用）
  UNLIMITED_COINS: 999999,           // テストコイン残高: 無限
};

// ────────────────────────────────────────────────────────────
// バージョンハッシュ（変更検知用）
// ────────────────────────────────────────────────────────────
export const CONSTANTS_VERSION = "20260511-v1.0.0";

/**
 * 定数の整合性チェック
 * サーバー起動時に実行して、設定値の矛盾を検出
 */
export function validateConstants() {
  const errors = [];

  // コイン → 円換算のチェック
  if (YELL_COIN_SETTINGS.COIN_TO_YEN_RATE !== 1) {
    errors.push("❌ CRITICAL: エールコイン単価が1円から変更されています。即座に復元してください。");
  }

  // ライバー還元率のチェック
  if (YELL_COIN_SETTINGS.CREATOR_REVENUE_RATE < 0.85) {
    errors.push("❌ CRITICAL: ライバー還元率が85%未満に設定されています。");
  }

  // ボーナス率のチェック
  if (YELL_COIN_SETTINGS.BONUS_RATE_MAX > 0.08) {
    errors.push("⚠️ WARNING: ボーナス率が8%を超えています。逆ざやリスクが発生します。");
  }

  // 画質設定の整合性
  const tiers = Object.values(QUALITY_TIERS);
  if (tiers.some(t => t.minCoins >= t.maxCoins && t.maxCoins !== null)) {
    errors.push("❌ CRITICAL: 画質設定の価格帯に重複があります。");
  }

  if (errors.length > 0) {
    console.error("=== CONSTANTS VALIDATION ERRORS ===");
    errors.forEach(err => console.error(err));
    console.error("===================================");
    throw new Error(`定数の整合性エラーが検出されました: ${errors.join(" | ")}`);
  }

  console.log("✅ 定数の整合性チェック: OK");
}

// アプリ起動時のエクスポート用（validateは明示的に呼び出す）
export default {
  IVS_COSTS,
  QUALITY_TIERS,
  YELL_COIN_SETTINGS,
  TICKET_SETTINGS,
  PPV_SETTINGS,
  TEST_ACCOUNT,
  getQualityFromPrice,
  validateConstants,
};