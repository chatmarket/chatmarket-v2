import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const targetEmail = 'kimurayasunari5@gmail.com';

    // ユーザーに全プランのサブスクリプションを付与
    const PLANS = ['basic', 'vod', 'ppv', 'call-anser'];
    const PLAN_NAMES = {
      basic: 'BASICプラン',
      vod: 'VODプラン',
      ppv: 'PPVプラン',
      'call-anser': 'CALL&ANSERプラン'
    };

    // 既存のサブスクリプションを確認
    const existingSubscriptions = await base44.entities.PlanSubscription.filter({
      user_email: targetEmail
    });

    const existingPlanIds = existingSubscriptions.map(s => s.plan_id);

    // 不足しているプランのみ追加
    const plansToAdd = PLANS.filter(planId => !existingPlanIds.includes(planId));

    if (plansToAdd.length > 0) {
      const subscriptionsToCreate = plansToAdd.map(planId => ({
        user_email: targetEmail,
        plan_id: planId,
        plan_name: PLAN_NAMES[planId],
        status: 'active',
        start_date: new Date().toISOString(),
      }));

      await base44.entities.PlanSubscription.bulkCreate(subscriptionsToCreate);
    }

    return Response.json({
      success: true,
      message: `${targetEmail}に全プランアクセスを付与しました`,
      plansGranted: plansToAdd,
      totalPlans: PLANS.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});