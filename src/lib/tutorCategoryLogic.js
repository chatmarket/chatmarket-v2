/**
 * Tutor Category Logic
 * 家庭教師カテゴリ登録時の自動ロジック
 */

export const TUTOR_CATEGORY = {
  id: "tutor",
  name: "家庭教師",
  revenueRate: 0.90, // 90% 講師還元率
  freeSubscriptionMonths: 12, // 12ヶ月無料
  freeSubscriptionStartDate: null, // 登録日から自動開始
};

/**
 * 講師登録時、家庭教師カテゴリが選ばれた場合の処理
 * @param {Object} channelData - チャンネル登録データ
 * @returns {Object} 修正されたチャンネルデータ
 */
export function applyTutorCategoryLogic(channelData) {
  if (channelData.category_id !== TUTOR_CATEGORY.id) {
    return channelData;
  }

  return {
    ...channelData,
    // 90%の収益還元率を自動適用
    progressive_rate: TUTOR_CATEGORY.revenueRate,
    // 家庭教師専用説明
    stream_category: "tutor",
    // 12ヶ月無料サブスク開始日を記録
    free_subscription_until: new Date(Date.now() + 12 * 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * ユーザーが家庭教師カテゴリで登録したかチェック
 * @param {Object} channel - チャンネルデータ
 * @returns {boolean}
 */
export function isTutorCategory(channel) {
  return channel?.category_id === TUTOR_CATEGORY.id || channel?.stream_category === "tutor";
}

/**
 * 12ヶ月無料期間が有効かチェック
 * @param {Object} channel - チャンネルデータ
 * @returns {boolean}
 */
export function isInFreeSubscriptionPeriod(channel) {
  if (!channel?.free_subscription_until) return false;
  return new Date(channel.free_subscription_until) > new Date();
}

/**
 * 無料期間の残り日数を計算
 * @param {Object} channel - チャンネルデータ
 * @returns {number} 残り日数（負の値は期間終了）
 */
export function getRemainingFreeSubscriptionDays(channel) {
  if (!channel?.free_subscription_until) return 0;
  const now = new Date();
  const until = new Date(channel.free_subscription_until);
  const diffMs = until - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}