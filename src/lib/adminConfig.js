/**
 * 管理者判定ロジック
 * フロントエンドでの最終防衛は role === "admin" チェック（バックエンド付与）。
 * メールリストはサイドバー表示など UX 目的のみに使用し、
 * 実際のアクセス制御はバックエンド関数内の role チェックで行う。
 */

// スーパー管理者メールリスト（サイドバーメニュー表示制御用のみ）
// 実際の権限制御は user.role === "admin" で行う
export const SUPER_ADMIN_EMAILS = [
  "unei@chatmarket.info",
  "ono@onestep-corp.com",
  "taktak0315@icloud.com",
];

// 管理ダッシュボードへのアクセス許可判定
// role=admin であれば全ての管理者メールユーザーと同等にアクセス可
export function isAdmin(user) {
  if (!user) return false;
  return user.role === "admin" || SUPER_ADMIN_EMAILS.includes(user.email);
}

export function isSuperAdmin(user) {
  if (!user) return false;
  return SUPER_ADMIN_EMAILS.includes(user.email);
}