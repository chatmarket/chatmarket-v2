/**
 * 管理者判定ロジック
 *
 * ⚠️ セキュリティ方針:
 * - フロントエンドには機密メールアドレスをハードコードしない
 * - 権限制御の最終判定は常に user.role === "admin"（バックエンド付与）で行う
 * - サイドバーの管理者メニュー表示も role ベースに統一
 */

/**
 * 管理者かどうかを判定する（role ベース）
 */
export function isAdmin(user) {
  if (!user) return false;
  return user.role === "admin";
}

export function isSuperAdmin(user) {
  if (!user) return false;
  return user.role === "admin";
}

/**
 * SUPER_ADMIN_EMAILS は廃止済み。
 * サイドバー等の表示制御は isAdmin(user) を使用してください。
 * 後方互換のため空配列をエクスポートします。
 */
export const SUPER_ADMIN_EMAILS = [];