/**
 * checkCampaignExpiry
 * CampaignLiveGranteeの無料期間終了前通知チェック
 *
 * 通知タイミング: 30日前 / 14日前 / 7日前 / 前日(1日前) / 終了後(expired)
 *
 * 除外条件:
 *   - 管理者ユーザー
 *   - 有効なBasic / call-anser / mini-school のPlanSubscription保有者
 *     （end_dateが未来 or end_dateなしのもの）
 *   - 同一Grant・同一stageの通知が既に作成済みの場合（ref_idで重複チェック）
 *
 * 終了日判定:
 *   - 同一メールの複数Grantがある場合、最も遅いexpires_atを実質的な終了日として使用
 *
 * dry_run=true（デフォルト）の場合:
 *   - 通知作成・expiry_notified_stages更新は行わない
 *   - 対象件数・stageのみ返す（メール・期限日・残高等の個人情報はログ出力しない）
 *
 * ❌ Red Line: 管理者ユーザーへの通知作成禁止
 * ❌ Red Line: 有効85%対象プラン保有者への通知作成禁止
 * ❌ Red Line: 同一stage重複通知作成禁止
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

// 85%対象PlanSubscriptionのplan_id（Basic相当）
const HIGH_RATE_PLAN_IDS = ["basic", "call-anser", "mini-school"];

/**
 * JSTのカレンダー日付差を計算する
 * JST = UTC+9 なので +9h してから日付を取り出す
 * 例: expires_at が 2026-07-07T14:59:00Z → JST 2026-07-07 23:59 → JST日付 07/07
 *      now が 2026-07-06T15:00:00Z        → JST 2026-07-07 00:00 → JST日付 07/07
 *      → 差 = 0日 → stage "1"（当日＝前日扱い）
 * expires_at の時刻が何時であっても JST の日付単位で比較するため取りこぼしにくい
 */
function jstDateDiffDays(now, expiresAt) {
  const JST_OFFSET_MS = 9 * 60 * 60 * 1000;
  const nowJstMs      = now.getTime()       + JST_OFFSET_MS;
  const expJstMs      = expiresAt.getTime() + JST_OFFSET_MS;
  // 時刻部分を切り捨てて日付のみで比較
  const nowJstDay = Math.floor(nowJstMs  / (24 * 60 * 60 * 1000));
  const expJstDay = Math.floor(expJstMs  / (24 * 60 * 60 * 1000));
  return expJstDay - nowJstDay; // 正=未来, 0=当日, 負=過去
}

/**
 * 残日数（JST日付差）から通知すべき stage を返す
 * 残日数に応じて最も近い未送信段階を1つ選ぶ。
 * Automation停止後に再開した場合でも現在の残日数に合う段階だけを返す。
 *
 * 判定仕様:
 *   expires_at が現在時刻以前        → "expired"
 *   JST日付差 0〜1日（当日〜前日）  → "1"
 *   JST日付差 2〜7日                 → "7"
 *   JST日付差 8〜14日                → "14"
 *   JST日付差 15〜30日               → "30"
 *   JST日付差 31日以上               → null（通知しない）
 *
 * ※ expires_at が未来であっても当日中であれば expired は送らない
 */
function resolveStage(now, expiresAt) {
  // 実際にexpires_atを過ぎている場合のみ expired
  if (now >= expiresAt) return "expired";

  const diff = jstDateDiffDays(now, expiresAt);
  if (diff <= 1)  return "1";
  if (diff <= 7)  return "7";
  if (diff <= 14) return "14";
  if (diff <= 30) return "30";
  return null; // 31日以上先は通知しない
}

/**
 * 有効な85%対象PlanSubscriptionを保有しているか確認
 * end_dateなし or end_dateが未来 かつ status=active のものを有効とみなす
 */
async function hasHighRatePlan(base44, email) {
  try {
    const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: email,
      status: "active",
    });
    const now = new Date();
    return subs.some((s) => {
      if (!HIGH_RATE_PLAN_IDS.includes(s.plan_id)) return false;
      if (!s.end_date) return true; // Stripe通常サブスク（期限なし）は有効
      const end = new Date(s.end_date);
      if (isNaN(end.getTime())) return false;
      return end > now;
    });
  } catch (_) {
    return false;
  }
}

/**
 * 通知文を生成する
 */
function buildNotificationContent(stage, expiresAt) {
  const expireDate = new Date(expiresAt);
  const dateStr = expireDate.toLocaleDateString("ja-JP", {
    year: "numeric", month: "long", day: "numeric",
  });

  if (stage === "expired") {
    return {
      title: "無料期間が終了しました",
      message: `キャンペーン無料期間が終了しました。現在の受取率は70%です。Basicプランにご加入いただくと受取率85%を維持できます。`,
      link: "/plan-select",
    };
  }

  const daysMap = { "30": "30日", "14": "14日", "7": "7日", "1": "明日" };
  const daysLabel = daysMap[stage] || `${stage}日`;
  const prefix = stage === "1" ? "明日" : `${daysLabel}後`;

  return {
    title: `無料期間終了まで${stage === "1" ? "あと1日" : `${daysLabel}`}`,
    message: `${prefix}（${dateStr}）に無料期間が終了します。現在の受取率は85%です。終了後は70%になります。継続をご希望の場合はプランをご確認ください。自動課金はありません。`,
    link: "/plan-select",
  };
}

/**
 * ref_idを生成する（grantee_id + stage + expires_at日付部分）
 */
function buildRefId(granteeId, stage, expiresAt) {
  const dateStr = expiresAt.slice(0, 10); // YYYY-MM-DD
  return `${granteeId}_${stage}_${dateStr}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 管理者認証（定期実行はservice roleが呼ぶが、手動テスト時は管理者のみ許可）
    let callerIsAdmin = false;
    try {
      const caller = await base44.auth.me();
      callerIsAdmin = caller?.role === "admin";
    } catch (_) {}

    const body = await req.json().catch(() => ({}));
    // dry_run=falseを明示しない限りdry-runとして動作
    const dryRun = body.dry_run !== false;

    // dry_runでもない かつ 管理者でもない場合は拒否
    if (!dryRun && !callerIsAdmin) {
      return Response.json({ error: "admin only for live run" }, { status: 403 });
    }

    const now = new Date();

    // ── 全CampaignLiveGranteeを取得（最大500件・ページネーション対応）──
    let allGrantees = [];
    let skip = 0;
    const PAGE = 200;
    while (true) {
      const page = await base44.asServiceRole.entities.CampaignLiveGrantee.list("-expires_at", PAGE, skip);
      if (!page || page.length === 0) break;
      allGrantees = allGrantees.concat(page);
      if (page.length < PAGE) break;
      skip += PAGE;
    }

    // ── メール別にGrantをグループ化（複数Grant保有者への誤通知を防ぐ）──
    const grantsByEmail = {};
    for (const g of allGrantees) {
      if (!g.email) continue;
      if (!grantsByEmail[g.email]) grantsByEmail[g.email] = [];
      grantsByEmail[g.email].push(g);
    }

    const stats = {
      total_emails: 0,
      skipped_no_active_grant: 0,
      skipped_admin: 0,
      skipped_has_high_rate_plan: 0,
      notifications_to_create: 0,
      notifications_already_sent: 0,
      stage_counts: { "30": 0, "14": 0, "7": 0, "1": 0, "expired": 0 },
    };

    stats.total_emails = Object.keys(grantsByEmail).length;

    for (const [email, grants] of Object.entries(grantsByEmail)) {

      // ── 管理者チェック ──
      let isAdmin = false;
      try {
        const users = await base44.asServiceRole.entities.User.filter({ email });
        isAdmin = users[0]?.role === "admin";
      } catch (_) {}
      if (isAdmin) {
        stats.skipped_admin++;
        continue;
      }

      // ── 最も遅いexpires_atを実質的な終了日として使用 ──
      // 有効（expires_atが未来）なGrantの中で最大値を採用
      // 有効Grantがない場合でも終了後通知のために最大値を使用
      const validGrants = grants.filter(
        (g) => g.expires_at && !isNaN(new Date(g.expires_at).getTime())
      );
      if (validGrants.length === 0) {
        stats.skipped_no_active_grant++;
        continue;
      }

      // 最も遅いexpires_atを持つGrantを特定
      const latestGrant = validGrants.reduce((best, g) =>
        new Date(g.expires_at) > new Date(best.expires_at) ? g : best
      );
      const latestExpiry = new Date(latestGrant.expires_at);

      // そのGrantがすでに十分過去（90日以上前に終了）なら通知対象外
      const daysSinceExpiry = Math.floor((now - latestExpiry) / (1000 * 60 * 60 * 24));
      if (daysSinceExpiry > 90) {
        stats.skipped_no_active_grant++;
        continue;
      }

      // ── 85%対象PlanSubscription保有チェック ──
      const hasHighRate = await hasHighRatePlan(base44, email);
      if (hasHighRate) {
        stats.skipped_has_high_rate_plan++;
        continue;
      }

      // ── 通知すべきstageを判定（JST日付基準）──
      const stage = resolveStage(now, latestExpiry);

      // stage が null（31日以上先）は通知不要
      if (stage === null) continue;

      // latestGrantのexpiry_notified_stagesを参照
      const alreadyNotified = new Set(latestGrant.expiry_notified_stages || []);

      if (alreadyNotified.has(stage)) {
        stats.notifications_already_sent++;
        continue;
      }

      // ref_idで重複チェック（Notification側）
      const refId = buildRefId(latestGrant.id, stage, latestGrant.expires_at);
      const existingNotif = await base44.asServiceRole.entities.Notification.filter({ ref_id: refId });
      if (existingNotif.length > 0) {
        stats.notifications_already_sent++;
        // expiry_notified_stages側も同期
        if (!dryRun) {
          await base44.asServiceRole.entities.CampaignLiveGrantee.update(latestGrant.id, {
            expiry_notified_stages: [...alreadyNotified, stage],
          }).catch(() => {});
        }
        continue;
      }

      stats.notifications_to_create++;
      stats.stage_counts[stage] = (stats.stage_counts[stage] || 0) + 1;

      if (!dryRun) {
        // ── Notification作成（先に作成してから stages を更新）──
        const content = buildNotificationContent(stage, latestGrant.expires_at);
        try {
          await base44.asServiceRole.entities.Notification.create({
            user_email: email,
            type: "campaign_expiry_warning",
            title: content.title,
            message: content.message,
            link: content.link,
            is_read: false,
            ref_id: refId,
          });

          // Notification作成成功後にのみstagesを更新
          await base44.asServiceRole.entities.CampaignLiveGrantee.update(latestGrant.id, {
            expiry_notified_stages: [...alreadyNotified, stage],
          });

        } catch (err) {
          console.error(`[checkCampaignExpiry] notification failed for stage=${stage}: ${err.message}`);
          // stagesは更新しない（次回再実行でref_idチェックにより重複防止）
        }
      }
    }

    const mode = dryRun ? "dry_run" : "live";
    console.log(`[checkCampaignExpiry] ${mode} | total_emails=${stats.total_emails} | to_create=${stats.notifications_to_create} | already_sent=${stats.notifications_already_sent} | skipped_admin=${stats.skipped_admin} | skipped_high_rate=${stats.skipped_has_high_rate_plan}`);

    return Response.json({
      ok: true,
      mode,
      stats,
      note: dryRun
        ? "dry_run=true: 通知は作成されていません。stats.notifications_to_createで対象件数を確認してください。"
        : "live run完了。stats.notifications_to_createで作成件数を確認してください。",
    });

  } catch (error) {
    console.error("[checkCampaignExpiry] Error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});