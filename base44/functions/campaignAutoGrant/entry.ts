/**
 * campaignAutoGrant
 * 
 * Recruit申請時に全4プランを自動付与する。
 * Pro（1万フォロワー超）: 3ヶ月間
 * Standard（その他）: 1ヶ月間
 * 
 * POST body: { email: string, followers: number, name: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const PLANS = ["basic", "call-anser", "vod", "ppv"];
const PLAN_NAMES = {
  "basic":      "BASICプラン",
  "call-anser": "CALL&ANSERプラン",
  "vod":        "VODプラン",
  "ppv":        "PPVプラン",
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { email, followers, name } = await req.json();

    if (!email) {
      return Response.json({ error: "email is required" }, { status: 400 });
    }

    const followerCount = parseInt(followers, 10) || 0;
    const isPro = followerCount >= 10000;
    const months = isPro ? 3 : 1;

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + months);

    // 既存のアクティブなキャンペーンサブスクリプションを確認（二重付与防止）
    const existing = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: email,
      status: "active",
    });
    const existingPlanIds = existing.map(s => s.plan_id);

    const created = [];
    for (const planId of PLANS) {
      if (existingPlanIds.includes(planId)) continue; // 既加入はスキップ

      await base44.asServiceRole.entities.PlanSubscription.create({
        user_email: email,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId],
        status: "active",
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
      });
      created.push(planId);
    }

    console.log(`[campaignAutoGrant] ${email} | isPro=${isPro} | months=${months} | plans=${created.join(",")}`);

    return Response.json({
      success: true,
      email,
      is_pro: isPro,
      months,
      plans_granted: created,
      plans_skipped: PLANS.filter(p => existingPlanIds.includes(p)),
      end_date: endDate.toISOString(),
    });
  } catch (error) {
    console.error("[campaignAutoGrant] error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});