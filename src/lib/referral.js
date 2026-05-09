/**
 * 紹介コード（ref）ユーティリティ
 * URLの ?ref=チャンネルID を読み取り・保存・記録する
 */
import { base44 } from "@/api/base44Client";

const REF_STORAGE_KEY = "chatmarket_ref";

/**
 * URLからrefパラメータを取得してlocalStorageに保存
 * ページロード時に呼び出す
 */
export function captureRefFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem(REF_STORAGE_KEY, ref);
    localStorage.setItem(REF_STORAGE_KEY + "_url", window.location.href);
    localStorage.setItem(REF_STORAGE_KEY + "_ts", Date.now().toString());
  }
  return ref;
}

/**
 * 保存されているrefコードを取得（30日以内のもの）
 */
export function getStoredRef() {
  const ref = localStorage.getItem(REF_STORAGE_KEY);
  const ts = parseInt(localStorage.getItem(REF_STORAGE_KEY + "_ts") || "0");
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  if (ref && Date.now() - ts < thirtyDays) {
    return ref;
  }
  return null;
}

/**
 * 紹介経由のコンバージョンをDBに記録
 */
export async function recordReferralConversion({ refCode, userEmail, userName, conversionType, conversionValueYen = 0 }) {
  if (!refCode) return;
  try {
    // 紹介元チャンネル情報を取得
    const channels = await base44.entities.Channel.filter({ id: refCode });
    const channel = channels[0];

    await base44.entities.Referral.create({
      referrer_channel_id: refCode,
      referrer_email: channel?.owner_email || "",
      referrer_name: channel?.name || "",
      referred_user_email: userEmail,
      referred_user_name: userName || "",
      ref_code: refCode,
      landing_url: localStorage.getItem(REF_STORAGE_KEY + "_url") || "",
      conversion_type: conversionType,
      conversion_value_yen: conversionValueYen,
      status: conversionType === "register" ? "registered" : "converted",
      converted_at: new Date().toISOString(),
    });

    // 登録コンバージョンの場合はlocalStorageをクリア
    if (conversionType === "register") {
      localStorage.removeItem(REF_STORAGE_KEY);
      localStorage.removeItem(REF_STORAGE_KEY + "_url");
      localStorage.removeItem(REF_STORAGE_KEY + "_ts");
    }
  } catch (err) {
    console.warn("[Referral] 記録失敗:", err.message);
  }
}

/**
 * チャンネルの紹介URL生成
 */
export function buildReferralUrl(channelId, channelName) {
  const base = window.location.origin;
  return `${base}/channel/${channelId}?ref=${channelId}`;
}