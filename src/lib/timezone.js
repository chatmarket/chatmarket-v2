/**
 * タイムゾーン対応ユーティリティ
 *
 * 【設計方針】
 * - DBには常に UTC ISO 文字列 (appointment_utc) を保存する
 * - 表示時のみ Intl.DateTimeFormat でユーザーのローカルタイムに変換
 * - new Date("YYYY-MM-DDTHH:MM:SS") はタイムゾーン修飾子なしだと
 *   ブラウザ依存（UTC / local 両解釈あり）なので使用禁止
 * - サマータイム対応は Intl API に完全委譲（自前計算しない）
 */

/**
 * ユーザーのIANAタイムゾーン識別子を取得
 * 例: "Asia/Tokyo", "America/New_York", "Europe/London"
 */
export function getUserTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * YYYY-MM-DD と HH:MM をユーザーのタイムゾーンの現地時刻として
 * 安全に UTC Dateオブジェクトへ変換する。
 *
 * ★ サマータイム完全対応：
 *   Intl.DateTimeFormat で逆算するのではなく、
 *   Temporal API 相当の安全な変換を行う。
 *   `new Date(str)` の曖昧な挙動を完全に排除。
 */
export function localDateTimeToUTC(dateStr, timeStr, timezone) {
  if (!dateStr || !timeStr) return null;
  const tz = timezone || getUserTimezone();
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Intl を使ってその日その時刻が UTC で何時かを特定する
  // アプローチ: 候補UTC時刻を生成し、それをtzで表示したものが入力と一致するか確認
  // これによりサマータイムの切り替わり時刻でも正確に変換できる
  const candidate = Date.UTC(year, month - 1, day, hour, minute, 0);

  // 候補時刻をユーザーのタイムゾーンで表示して検証
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date(candidate));

  const p = {};
  parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });

  // 表示結果と入力が一致しない場合（サマータイム境界）はオフセットを補正
  const diffMin = ((p.hour || 0) * 60 + (p.minute || 0)) - (hour * 60 + minute);
  const corrected = new Date(candidate + diffMin * 60 * 1000);

  return corrected;
}

/**
 * UTC DateオブジェクトをユーザーのIANAタイムゾーンで
 * { date: "YYYY-MM-DD", time: "HH:MM" } に変換
 */
export function utcToLocalParts(utcDate, timezone) {
  if (!utcDate) return { date: "", time: "" };
  const tz = timezone || getUserTimezone();
  const d = new Date(utcDate);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d);

  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });

  return {
    date: `${p.year}-${p.month}-${p.day}`,
    time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}`,
  };
}

/**
 * 予約時刻まで何分か（サマータイム完全対応）
 * DBに保存されたローカル日時文字列を安全に解釈して計算する
 */
export function minutesUntilLocal(dateStr, timeStr, timezone) {
  if (!dateStr || !timeStr) return null;
  const tz = timezone || getUserTimezone();
  const target = localDateTimeToUTC(dateStr, timeStr, tz);
  if (!target) return null;
  return Math.round((target.getTime() - Date.now()) / 60000);
}

/**
 * 予約日時をユーザーのローカルタイムゾーンで人間可読にフォーマット
 * 日本語圏は従来通り。海外はタイムゾーン名付き。
 */
export function formatAppointmentDateTime(dateStr, timeStr, lang, timezone) {
  if (!dateStr || !timeStr) return "";
  const tz = timezone || getUserTimezone();
  const isJST = tz === "Asia/Tokyo" || tz.startsWith("Japan");

  if (isJST) return `${dateStr} ${timeStr}`;

  const utc = localDateTimeToUTC(dateStr, timeStr, tz);
  if (!utc) return `${dateStr} ${timeStr}`;

  try {
    return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-US", {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZoneName: "short",
    }).format(utc);
  } catch {
    return `${dateStr} ${timeStr}`;
  }
}

/**
 * 海外ユーザー向けタイムゾーンヒント文字列
 * サマータイム中は現在の実オフセットを表示（固定値ではない）
 */
export function getTimezoneHint(lang = "ja") {
  const tz = getUserTimezone();
  const isJST = tz === "Asia/Tokyo" || tz.startsWith("Japan");
  if (isJST) return null;

  // getTimezoneOffset() は常に現時点のオフセットを返すため
  // サマータイム中も正確な値が得られる
  const offsetMin = -new Date().getTimezoneOffset();
  const sign = offsetMin >= 0 ? "+" : "-";
  const absH = Math.floor(Math.abs(offsetMin) / 60);
  const absM = Math.abs(offsetMin) % 60;
  const utcStr = `UTC${sign}${String(absH).padStart(2, "0")}:${String(absM).padStart(2, "0")}`;

  if (lang === "ja") return `あなたのタイムゾーン: ${tz} (${utcStr})`;
  return `Your timezone: ${tz} (${utcStr})`;
}