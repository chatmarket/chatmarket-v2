/**
 * プロモコード（promo）ユーティリティ
 * URLの ?promo=boss などを読み取り・保存・自動適用する
 */

const PROMO_KEY = "chatmarket_promo";

// 有効なプロモコードとその特典
export const PROMO_DEFINITIONS = {
  boss: {
    code: "boss",
    label: "社長DM特典",
    benefits: ["還元率85%", "12ヶ月プラン無料"],
    plan_ids: ["basic", "ppv", "vod", "call-anser"],
    months_free: 12,
  },
  dm: {
    code: "dm",
    label: "SNS特典",
    benefits: ["還元率85%", "12ヶ月プラン無料"],
    plan_ids: ["basic", "ppv", "vod", "call-anser"],
    months_free: 12,
  },
  genspark: {
    code: "genspark",
    label: "Genspark特典",
    benefits: ["還元率85%", "12ヶ月プラン無料"],
    plan_ids: ["basic", "ppv", "vod", "call-anser"],
    months_free: 12,
  },
  base44: {
    code: "base44",
    label: "Base44特典",
    benefits: ["還元率85%", "12ヶ月プラン無料"],
    plan_ids: ["basic", "ppv", "vod", "call-anser"],
    months_free: 12,
  },
};

/**
 * URLから ?promo= を読み取りlocalStorageに保存
 * ページロード時に呼び出す
 */
export function capturePromoFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("promo");
  if (code) {
    const def = PROMO_DEFINITIONS[code.toLowerCase()];
    if (def) {
      localStorage.setItem(PROMO_KEY, code.toLowerCase());
      localStorage.setItem(PROMO_KEY + "_ts", Date.now().toString());
      return def;
    }
  }
  return getStoredPromo();
}

/**
 * 保存されているpromoを取得（7日以内のもの）
 */
export function getStoredPromo() {
  const code = localStorage.getItem(PROMO_KEY);
  const ts = parseInt(localStorage.getItem(PROMO_KEY + "_ts") || "0");
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (code && Date.now() - ts < sevenDays) {
    return PROMO_DEFINITIONS[code] || null;
  }
  return null;
}

/**
 * promoを消費（登録完了後に呼ぶ）
 */
export function clearStoredPromo() {
  localStorage.removeItem(PROMO_KEY);
  localStorage.removeItem(PROMO_KEY + "_ts");
}