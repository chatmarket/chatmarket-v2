/**
 * Role-based Terminology Mapping
 * Musician ロールの場合、「鑑定」→「ライブ/レッスン」に自動置換
 */

export const ROLE_TERMINOLOGY = {
  default: {
    fortune: "鑑定",
    session: "相談セッション",
    category: "占い",
    live: "鑑定配信",
    lesson: "占いレッスン",
  },
  musician: {
    fortune: "ライブ/レッスン",
    session: "ライブセッション",
    category: "音楽",
    live: "ライブ配信",
    lesson: "レッスン",
  },
};

/**
 * ユーザーロールに応じた用語を取得
 * @param {string} userRole - ユーザーロール（"musician" など）
 * @param {string} key - 置換対象キー（"fortune", "session" など）
 * @returns {string} 置換後の用語
 */
export function getTermByRole(userRole, key) {
  const terminology = userRole === "musician" 
    ? ROLE_TERMINOLOGY.musician 
    : ROLE_TERMINOLOGY.default;
  return terminology[key] || ROLE_TERMINOLOGY.default[key];
}

/**
 * ユーザーが Musician かどうかを判定
 */
export function isMusician(user) {
  return user?.role === "musician";
}