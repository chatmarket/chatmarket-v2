import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * チャンネルの stream_category が "fortune" に設定された場合、
 * そのオーナーに Basic プランを自動付与する。
 * - 既に active な basic プランがあればスキップ
 * - Entity automation (Channel create/update) から呼び出される
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const data = payload.data || {};
    const ownerEmail = data.owner_email;
    const streamCategory = data.stream_category;

    if (!ownerEmail) {
      return Response.json({ status: 'skipped', reason: 'no_owner_email' });
    }

    if (streamCategory !== 'fortune') {
      return Response.json({ status: 'skipped', reason: 'not_fortune_category' });
    }

    // 既存の active な basic プランを確認
    const existing = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: ownerEmail,
      plan_id: 'basic',
      status: 'active',
    });

    if (existing.length > 0) {
      console.log(`[grantBasicPlan] Already has basic plan: ${ownerEmail}`);
      return Response.json({ status: 'already_exists', user_email: ownerEmail });
    }

    // Basic プランを付与（1年間無料）
    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    await base44.asServiceRole.entities.PlanSubscription.create({
      user_email: ownerEmail,
      plan_id: 'basic',
      plan_name: 'Basicプラン（占い師1年無料）',
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      description: '占いカテゴリ選択による自動付与。登録から1年間無料。',
    });

    console.log(`[grantBasicPlan] ✓ Basic plan granted to ${ownerEmail}`);

    return Response.json({
      status: 'success',
      user_email: ownerEmail,
      plan: 'basic',
      valid_until: endDate.toISOString(),
    });
  } catch (error) {
    console.error('[grantBasicPlan] ❌ Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});