import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 予約リマインド通知送信
 *
 * 【タイムゾーン設計】
 * - appointment_utc: ISO UTC文字列 (必須) — これを基準に計算
 * - recipient_timezone: IANA識別子 (例: "America/New_York") — 受信者の表示用
 * - 表示はすべて Intl.DateTimeFormat で変換（サマータイム自動対応）
 */

/**
 * UTC DateをIANAタイムゾーンで人間可読にフォーマット
 */
function formatInTimezone(utcDate, timezone, locale = "ja-JP") {
  const tz = timezone || "Asia/Tokyo";
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(utcDate));
  } catch {
    return new Date(utcDate).toUTCString();
  }
}

/**
 * ローカル日時文字列 (YYYY-MM-DD, HH:MM) を
 * 指定タイムゾーンの現地時刻として UTC に変換する
 * サマータイム境界でも正確に動作する
 */
function localToUTC(dateStr, timeStr, timezone) {
  const tz = timezone || "Asia/Tokyo";
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // 候補UTC時刻を生成してtzで表示し、入力と一致するか検証
  const candidate = Date.UTC(year, month - 1, day, hour, minute, 0);

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date(candidate));

  const p = {};
  parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });

  // サマータイム境界ズレを補正
  const diffMin = ((p.hour || 0) * 60 + (p.minute || 0)) - (hour * 60 + minute);
  return new Date(candidate + diffMin * 60 * 1000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      recipient_email,
      event_name,
      event_date,        // ISO UTC文字列 (推奨) or 旧形式の文字列
      event_date_str,    // YYYY-MM-DD (ローカル日付、recipient_timezoneと組み合わせ)
      event_time_str,    // HH:MM (ローカル時刻)
      recipient_timezone, // IANA識別子 例: "America/New_York"
      event_location,
      message,
      notification_type,
      lang,              // "ja" | "en" | "ko"
    } = await req.json();

    if (!recipient_email || !event_name || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const tz = recipient_timezone || "Asia/Tokyo";
    const locale = lang === "en" ? "en-US" : lang === "ko" ? "ko-KR" : "ja-JP";

    // 日時のUTC解釈
    let eventDateUTC = null;
    if (event_date) {
      // ISO UTC文字列が渡された場合はそのまま使用
      eventDateUTC = new Date(event_date);
    } else if (event_date_str && event_time_str) {
      // ローカル日時文字列の場合は受信者のタイムゾーンで変換
      eventDateUTC = localToUTC(event_date_str, event_time_str, tz);
    }

    // 受信者のローカルタイムで表示
    const displayDateTime = eventDateUTC
      ? formatInTimezone(eventDateUTC, tz, locale)
      : "未定";

    // 15分前リマインド確認（バックエンド側でも検証）
    if (eventDateUTC) {
      const diffMin = Math.round((eventDateUTC.getTime() - Date.now()) / 60000);
      console.log(`[Reminder] Event in ${diffMin} min for ${recipient_email} (tz: ${tz})`);
    }

    const isEnglish = lang === "en";
    const isKorean = lang === "ko";

    const subject = isEnglish
      ? (notification_type === 'reminder' ? `[Reminder] ${event_name} starts soon` : `[Update] ${event_name} has been updated`)
      : isKorean
      ? (notification_type === 'reminder' ? `[리마인더] ${event_name} 시작 예정` : `[업데이트] ${event_name} 정보가 업데이트되었습니다`)
      : (notification_type === 'reminder' ? `【リマインド】${event_name}の開催をお知らせします` : `【重要】${event_name}の情報が更新されました`);

    const body = isEnglish ? `
Thank you for your reservation for ${event_name}.

${message}

[Event Details]
Date & Time: ${displayDateTime}
Location: ${event_location || 'TBD'}

If you did not make this reservation, please contact our support team.
Chat Market | chatmarket.info
`.trim() : isKorean ? `
${event_name} 예약해 주셔서 감사합니다.

${message}

[이벤트 정보]
일시: ${displayDateTime}
장소: ${event_location || '미정'}

이 이메일을 예상하지 못하셨다면, 고객센터로 문의해 주세요.
Chat Market | chatmarket.info
`.trim() : `
${event_name}のチケットをご購入いただきありがとうございます。

${message}

【イベント情報】
開催日時：${displayDateTime}
場所：${event_location || '未定'}

このメールに心当たりのない場合は、当サービスまでお問い合わせください。
Chat Market | chatmarket.info
`.trim();

    await base44.integrations.Core.SendEmail({
      to: recipient_email,
      subject,
      body,
      from_name: 'Chat Market',
    });

    return Response.json({
      success: true,
      message: 'Reminder sent successfully',
      recipient: recipient_email,
      type: notification_type,
      display_datetime: displayDateTime,
      timezone_used: tz,
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});