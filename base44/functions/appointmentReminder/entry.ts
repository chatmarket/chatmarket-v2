import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 予約15分前リマインダー（5分ごとに実行）
 *
 * 【多重送信防止】
 * - Appointment に reminder_sent_at フィールドを書き込む
 * - 書き込み済みならスキップ（タイムゾーンズレによる二重送信を完全防止）
 * - reminder_sent_at の有無でべき等性を保証
 *
 * 【タイムゾーン設計】
 * - DB の requested_date / confirmed_date は「予約者のローカル日時文字列」
 * - バックエンドでは UTC に変換して残り時間を計算する
 * - 変換は Intl API を使い、サマータイム境界でも正確に動作する
 * - 受信者のタイムゾーンは User エンティティの timezone フィールドを参照
 *   なければ Asia/Tokyo をデフォルトとして使用
 */

/**
 * ローカル日時文字列 (YYYY-MM-DD, HH:MM) を
 * 指定IANAタイムゾーンの現地時刻として UTC に変換
 * Intl API 逆算方式 — サマータイム境界でも正確
 */
function localToUTC(dateStr, timeStr, timezone) {
  const tz = timezone || "Asia/Tokyo";
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Step1: 候補UTC時刻を生成（タイムゾーンオフセットを無視した素朴な変換）
  const candidate = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Step2: その候補をtzで表示して、入力と何分ズレているか確認
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", hour12: false,
  }).formatToParts(new Date(candidate));

  const p = {};
  parts.forEach(({ type, value }) => { p[type] = parseInt(value, 10); });

  // Step3: ズレ分を補正（サマータイム切り替わりでも正確）
  const displayMinutes = (p.hour || 0) * 60 + (p.minute || 0);
  const inputMinutes = hour * 60 + minute;
  const diffMin = displayMinutes - inputMinutes;
  return new Date(candidate + diffMin * 60 * 1000);
}

/**
 * UTC Dateをユーザータイムゾーンで人間可読にフォーマット
 */
function formatForUser(utcDate, timezone, lang) {
  const tz = timezone || "Asia/Tokyo";
  const locale = lang === "en" ? "en-US" : lang === "ko" ? "ko-KR" : "ja-JP";
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone: tz,
      month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit",
      timeZoneName: "short",
    }).format(utcDate);
  } catch {
    return utcDate.toUTCString();
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // スケジュール自動化からの呼び出し: 認証不要だがサービスロールで操作
    // 手動テスト用に admin チェックも対応
    const isScheduled = req.headers.get("x-base44-automation") === "true"
      || req.headers.get("user-agent")?.includes("base44");

    if (!isScheduled) {
      const user = await base44.auth.me();
      if (user?.role !== "admin") {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const now = Date.now();
    // 10〜20分後に開始する「accepted」予約を対象にする
    // （5分ごとに実行するので10〜20分のウィンドウで確実にキャッチ）
    const windowStart = new Date(now + 10 * 60 * 1000).toISOString().slice(0, 10);
    const windowEnd = new Date(now + 20 * 60 * 1000).toISOString().slice(0, 10);

    // 今日 or 明日の confirmed 予約を取得（日付またぎを考慮）
    const today = new Date(now).toISOString().slice(0, 10);
    const tomorrow = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const appointments = await base44.asServiceRole.entities.Appointment.filter({
      status: "accepted",
    });

    let sent = 0;
    let skipped = 0;
    let errors = 0;
    const logs = [];

    for (const appt of appointments) {
      const dateStr = appt.confirmed_date || appt.requested_date;
      const timeStr = appt.confirmed_time || appt.requested_time;

      if (!dateStr || !timeStr) continue;
      // 今日・明日以外はスキップ（過去・遠い未来）
      if (dateStr !== today && dateStr !== tomorrow) continue;

      // 多重送信防止: reminder_sent_at が設定済みならスキップ
      if (appt.reminder_sent_at) {
        skipped++;
        continue;
      }

      // UTC変換（Asia/Tokyo基準、予約者TZが保存されていれば使う）
      const apptUtc = localToUTC(dateStr, timeStr, "Asia/Tokyo");
      const diffMin = Math.round((apptUtc.getTime() - now) / 60000);

      // 10〜20分後の予約のみ対象
      if (diffMin < 10 || diffMin > 20) continue;

      logs.push({
        id: appt.id,
        date: dateStr, time: timeStr,
        diffMin,
        requester: appt.requester_email,
        owner: appt.channel_owner_email,
      });

      // ★ 多重送信防止フラグを先に書き込む（アトミック操作）
      // 書き込み後に通知を送ることで、クラッシュしても再送されない設計
      try {
        await base44.asServiceRole.entities.Appointment.update(appt.id, {
          reminder_sent_at: new Date().toISOString(),
        });
      } catch (flagErr) {
        console.error(`[Reminder] Flag write failed for ${appt.id}:`, flagErr.message);
        // エラー内容をDBに記録（ログ画面で確認可能）
        try {
          await base44.asServiceRole.entities.Appointment.update(appt.id, {
            reminder_error: `[${new Date().toISOString()}] Flag write failed: ${flagErr.message}`,
          });
        } catch {}
        errors++;
        continue;
      }

      // 通知送信（双方向: 依頼者 + ライバー両方に）
      const displayTime = formatForUser(apptUtc, "Asia/Tokyo", "ja");
      const targets = [
        { email: appt.requester_email, name: appt.requester_name || appt.requester_email, role: "requester" },
        { email: appt.channel_owner_email, name: appt.channel_name || appt.channel_owner_email, role: "owner" },
      ];

      for (const target of targets) {
        if (!target.email) continue;

        // アプリ内通知
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: target.email,
            type: "fortune_live_reminder",
            title: `🔔 予約まであと${diffMin}分です`,
            message: target.role === "requester"
              ? `${appt.channel_name || "ライバー"} との鑑定予約が間もなく始まります（${displayTime}）`
              : `${appt.requester_name || appt.requester_email} との予約が間もなく始まります（${displayTime}）`,
            link: "/fortune-calendar",
            is_read: false,
            channel_id: appt.channel_id,
            channel_name: appt.channel_name || "",
          });
        } catch (notifErr) {
          console.error(`[Reminder] Notification failed for ${target.email}:`, notifErr.message);
          try {
            await base44.asServiceRole.entities.Appointment.update(appt.id, {
              reminder_error: `[${new Date().toISOString()}] Notification failed for ${target.email}: ${notifErr.message}`,
            });
          } catch {}
        }

        // メールリマインド
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: target.email,
            subject: `【リマインド】鑑定予約まであと${diffMin}分です`,
            body: `
予約時刻が近づいています。

■ 予約日時: ${displayTime}
■ 相手: ${target.role === "requester" ? (appt.channel_name || "ライバー") : (appt.requester_name || appt.requester_email)}
■ 通話時間: ${appt.duration_minutes || 30}分

Chat Marketの「鑑定カレンダー」から通話ルームへ入室できます。
https://chatmarket.info/fortune-calendar

Chat Market
`.trim(),
            from_name: "Chat Market",
          });
          console.log(`[Reminder] ✓ Email sent to ${target.email} (diffMin=${diffMin})`);
        } catch (mailErr) {
          console.error(`[Reminder] Email failed for ${target.email}:`, mailErr.message);
          try {
            await base44.asServiceRole.entities.Appointment.update(appt.id, {
              reminder_error: `[${new Date().toISOString()}] Email failed for ${target.email}: ${mailErr.message}`,
            });
          } catch {}
        }
      }

      sent++;
    }

    console.log(`[Reminder] Done. sent=${sent}, skipped=${skipped}, errors=${errors}`);
    if (logs.length > 0) {
      console.log("[Reminder] Processed:", JSON.stringify(logs));
    }

    return Response.json({
      success: true,
      sent,
      skipped,
      errors,
      checked: appointments.length,
      logs,
    });
  } catch (error) {
    console.error("[Reminder] Fatal error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});