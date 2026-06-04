/**
 * campaignAutoGrant — キャンペーン自動付与
 *
 * 3モード:
 *   1. campaign_link: 公開キャンペーンコード経由（最大300名上限チェック）
 *   2. admin_designated: 管理者個別指定12か月（300名枠外）
 *   3. special_scout: 特別スカウト24か月（300名枠外・管理者のみ）
 *
 * POST body:
 *   mode: "campaign_link" | "admin_designated" | "special_scout"
 *   email: string
 *   campaign_code?: string  (mode=campaign_linkで必須)
 *   name?: string
 *   service_category?: string
 *
 * ※ フロントからの呼び出し(Recruitページ)は mode="campaign_link" のみ
 * ※ admin_designated / special_scout は管理者認証必須
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const PLANS = ["basic", "call-anser", "vod", "ppv"];
const PLAN_NAMES = {
  basic: "BASICプラン",
  "call-anser": "CALL&ANSERプラン",
  vod: "VODプラン",
  ppv: "PPVプラン",
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // ── 認証 ──
  let user = null;
  try { user = await base44.auth.me(); } catch (_) {}

  const body = await req.json();
  const { mode, email, campaign_code, name, service_category } = body;

  if (!email) return Response.json({ error: "email is required" }, { status: 400 });
  if (!mode) return Response.json({ error: "mode is required" }, { status: 400 });

  // admin_designated / special_scout は管理者のみ
  if (mode === "admin_designated" || mode === "special_scout") {
    if (!user || user.role !== "admin") {
      return Response.json({ error: "Forbidden: admin only" }, { status: 403 });
    }
  }

  const now = new Date();

  // ── モード別処理 ──

  // ══════════════════════════════════════════
  // 1. 公開キャンペーンリンク経由
  // ══════════════════════════════════════════
  if (mode === "campaign_link") {
    if (!campaign_code) {
      return Response.json({ error: "campaign_code is required for campaign_link mode" }, { status: 400 });
    }

    // キャンペーン取得
    const campaigns = await base44.asServiceRole.entities.Campaign.filter({ campaign_code });
    const campaign = campaigns[0];

    if (!campaign) {
      return Response.json({
        ok: false,
        skipped: true,
        reason: "キャンペーンの適用可否は、申込後にご案内します。",
      });
    }

    // status チェック
    if (campaign.status !== "active") {
      return Response.json({
        ok: false,
        skipped: true,
        reason: "キャンペーンの適用可否は、申込後にご案内します。",
      });
    }

    // 開始前チェック
    if (campaign.starts_at && new Date(campaign.starts_at) > now) {
      return Response.json({
        ok: false,
        skipped: true,
        reason: "キャンペーンの適用可否は、申込後にご案内します。",
      });
    }

    // 終了後チェック
    if (campaign.ends_at && new Date(campaign.ends_at) < now) {
      return Response.json({
        ok: false,
        skipped: true,
        reason: "キャンペーンの適用可否は、申込後にご案内します。",
      });
    }

    // ── 既存アクティブGranteeチェック（重複防止・枠消費しない）──
    const existingGrantees = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email });
    const activeGrantee = existingGrantees.find(
      (g) => g.expires_at && new Date(g.expires_at) > now
    );
    if (activeGrantee) {
      // 既に対象者 → 再申込でも枠を消費しない
      console.log(`[campaignAutoGrant] already granted: ${email}`);
      return Response.json({
        ok: true,
        skipped: true,
        reason: "already_granted",
        expires_at: activeGrantee.expires_at,
      });
    }

    // ── 上限チェック（サービスロールで最新カウントを取得）──
    // campaign_linkの承認済み数を直接カウント（approved_participants_count と並行して二重確認）
    const allGrantees = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({
      campaign_id: campaign.id,
    });
    const activeCampaignGrantees = allGrantees.filter(
      (g) => g.grant_source === "campaign_link" && g.expires_at && new Date(g.expires_at) > now
    );
    const currentCount = activeCampaignGrantees.length;

    if (currentCount >= campaign.max_participants) {
      // 300名到達 → キャンペーンをclosedに更新してもよい
      if (campaign.status === "active") {
        await base44.asServiceRole.entities.Campaign.update(campaign.id, { status: "closed" });
      }
      // 公開画面には上限を理由として表示しない
      return Response.json({
        ok: false,
        skipped: true,
        error_code: "campaign_capacity_reached",
        reason: "現在、このキャンペーンの受付状況を確認しています。",
      }, { status: 409 });
    }

    // ── 付与実行（12か月）──
    const benefitMonths = 12;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + benefitMonths);

    await base44.asServiceRole.entities.CampaignLiveGrantee.create({
      email,
      reason: "special_promotion",
      granted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      grant_source: "campaign_link",
      campaign_id: campaign.id,
      campaign_code,
      benefit_months: benefitMonths,
      notes: `Recruit申請 | service_category: ${service_category || "unknown"} | name: ${name || ""}`,
    });

    // campaign の approved_participants_count を +1
    await base44.asServiceRole.entities.Campaign.update(campaign.id, {
      approved_participants_count: currentCount + 1,
    });

    // PlanSubscription 付与（重複防止）
    const existingSubs = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: email,
      status: "active",
    });
    const existingPlanIds = existingSubs.map((s) => s.plan_id);
    const endDate = new Date(expiresAt);
    const created = [];
    for (const planId of PLANS) {
      if (existingPlanIds.includes(planId)) continue;
      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: email,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId],
        status: "active",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        description: `キャンペーン自動付与 (${campaign_code}) | ${benefitMonths}か月`,
      });
      created.push(planId);
    }

    console.log(`[campaignAutoGrant] campaign_link | ${email} | ${campaign_code} | count: ${currentCount + 1}/${campaign.max_participants}`);

    return Response.json({
      ok: true,
      mode: "campaign_link",
      email,
      benefit_months: benefitMonths,
      plans_granted: created,
      expires_at: expiresAt.toISOString(),
      campaign_slot: `${currentCount + 1}/${campaign.max_participants}`,
    });
  }

  // ══════════════════════════════════════════
  // 2. 管理者個別指定（12か月・300名枠外）
  // ══════════════════════════════════════════
  if (mode === "admin_designated") {
    const benefitMonths = 12;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + benefitMonths);

    // 重複チェック
    const existingGrantees = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email });
    const activeGrantee = existingGrantees.find(
      (g) => g.expires_at && new Date(g.expires_at) > now
    );
    if (activeGrantee) {
      return Response.json({ ok: true, skipped: true, reason: "already_granted", expires_at: activeGrantee.expires_at });
    }

    await base44.asServiceRole.entities.CampaignLiveGrantee.create({
      email,
      reason: "special_promotion",
      granted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      grant_source: "admin_designated",
      campaign_id: null,
      benefit_months: benefitMonths,
      notes: `管理者個別指定 by ${user.email}`,
    });

    const existingSubs = await base44.asServiceRole.entities.PlanSubscription.filter({ user_email: email, status: "active" });
    const existingPlanIds = existingSubs.map((s) => s.plan_id);
    const created = [];
    for (const planId of PLANS) {
      if (existingPlanIds.includes(planId)) continue;
      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: email,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId],
        status: "active",
        start_date: now.toISOString(),
        end_date: expiresAt.toISOString(),
        description: `管理者個別指定 | 12か月`,
      });
      created.push(planId);
    }

    console.log(`[campaignAutoGrant] admin_designated | ${email} | by ${user.email}`);
    return Response.json({ ok: true, mode: "admin_designated", email, benefit_months: benefitMonths, plans_granted: created, expires_at: expiresAt.toISOString() });
  }

  // ══════════════════════════════════════════
  // 3. 特別スカウト（24か月・300名枠外・非公開）
  // ══════════════════════════════════════════
  if (mode === "special_scout") {
    const benefitMonths = 24;
    const expiresAt = new Date(now);
    expiresAt.setMonth(expiresAt.getMonth() + benefitMonths);

    const existingGrantees = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email });
    const activeGrantee = existingGrantees.find(
      (g) => g.expires_at && new Date(g.expires_at) > now
    );
    if (activeGrantee) {
      return Response.json({ ok: true, skipped: true, reason: "already_granted", expires_at: activeGrantee.expires_at });
    }

    await base44.asServiceRole.entities.CampaignLiveGrantee.create({
      email,
      reason: "influencer_campaign",
      granted_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      grant_source: "special_scout",
      campaign_id: null,
      benefit_months: benefitMonths,
      notes: `特別スカウト24か月 by ${user.email}`,
    });

    const existingSubs = await base44.asServiceRole.entities.PlanSubscription.filter({ user_email: email, status: "active" });
    const existingPlanIds = existingSubs.map((s) => s.plan_id);
    const created = [];
    for (const planId of PLANS) {
      if (existingPlanIds.includes(planId)) continue;
      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: email,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId],
        status: "active",
        start_date: now.toISOString(),
        end_date: expiresAt.toISOString(),
        description: `特別スカウト | 24か月`,
      });
      created.push(planId);
    }

    console.log(`[campaignAutoGrant] special_scout | ${email} | by ${user.email}`);
    return Response.json({ ok: true, mode: "special_scout", email, benefit_months: benefitMonths, plans_granted: created, expires_at: expiresAt.toISOString() });
  }

  return Response.json({ error: "invalid mode" }, { status: 400 });
});