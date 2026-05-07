/**
 * タイムゾーン対応ユーティリティ
 * 予約・カレンダー機能で使用
 */

/**
 * ユーザーのローカルタイムゾーンを取得
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * 日付文字列(YYYY-MM-DD)と時刻文字列(HH:MM)を
 * ユーザーのローカル時刻として解釈し、Dateオブジェクトを返す
 * ※DBには "YYYY-MM-DD" と "HH:MM" をそのまま保存し、
 *   表示時にのみローカルタイムゾーンで解釈する設計
 */
export function parseLocalDateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  // ブラウザのローカルタイムとして解釈（タイムゾーン修飾子なし）
  return new Date(`${dateStr}T${timeStr}:00`);
}

/**
 * Dateオブジェクトをユーザーのローカルタイムゾーンで
 * "YYYY-MM-DD" 形式にフォーマット
 */
export function toLocalDateString(date) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Dateオブジェクトをユーザーのローカルタイムゾーンで
 * "HH:MM" 形式にフォーマット
 */
export function toLocalTimeString(date) {
  if (!date) return "";
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * 予約日時表示用：ローカルタイムゾーンでフォーマット
 * タイムゾーンが日本以外の場合はタイムゾーン名を付記
 */
export function formatAppointmentDateTime(dateStr, timeStr, lang = "ja") {
  if (!dateStr || !timeStr) return "";
  const tz = getUserTimezone();
  const isJST = tz === "Asia/Tokyo" || tz.includes("Japan");

  if (isJST) {
    return `${dateStr} ${timeStr}`;
  }

  // 海外ユーザー向け：ローカル時刻 + タイムゾーン表記
  const date = parseLocalDateTime(dateStr, timeStr);
  if (!date) return `${dateStr} ${timeStr}`;

  try {
    const formatted = new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: tz,
    }).format(date);
    return formatted;
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

/**
 * 予約時刻まで何分か（ローカルタイムゾーン基準）
 */
export function minutesUntilLocal(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const target = parseLocalDateTime(dateStr, timeStr);
  if (!target) return null;
  return Math.round((target.getTime() - Date.now()) / 60000);
}

/**
 * 海外ユーザー向けに JST との時差を表示するヒント文字列を生成
 * 例: "Your timezone: America/New_York (UTC-5, JST-14)"
 */
export function getTimezoneHint(lang = "ja") {
  const tz = getUserTimezone();
  const isJST = tz === "Asia/Tokyo" || tz.includes("Japan");
  if (isJST) return null;

  const offsetMin = -new Date().getTimezoneOffset(); // ローカルのUTCオフセット（分）
  const sign = offsetMin >= 0 ? "+" : "-";
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const utcStr = `UTC${sign}${String(absH).padStart(2, "0")}:${String(absM).padStart(2, "0")}`;

  if (lang === "ja") {
    return `あなたのタイムゾーン: ${tz} (${utcStr})`;
  }
  return `Your timezone: ${tz} (${utcStr})`;
}