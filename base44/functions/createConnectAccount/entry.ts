/**
 * createConnectAccount
 * NPO団体のStripe Connect Expressアカウントを作成し、
 * オンボーディングURLを返す。
 * 既にアカウントがある場合はアカウントリンクを再発行する。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { project_id } = await req.json();
    if (!project_id) return Response.json({ error: 'project_id required' }, { status: 400 });

    // プロジェクト取得（オーナー確認）
    const projects = await base44.asServiceRole.entities.CrowdfundingProject.filter({ id: project_id });
    const project = projects[0];
    if (!project) return Response.json({ error: 'プロジェクトが見つかりません' }, { status: 404 });
    if (project.owner_email !== user.email) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 審査通過済みのみ許可
    if (!['approved', 'active'].includes(project.status)) {
      return Response.json({ error: '審査承認済みのプロジェクトのみConnectアカウントを作成できます' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://live-chat-market.com';

    let accountId = project.stripe_connect_account_id;

    if (!accountId) {
      // 新規Expressアカウント作成
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'JP',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'company',
        business_profile: {
          name: project.organization_name,
          url: project.hp_url || undefined,
        },
        metadata: {
          project_id,
          owner_email: user.email,
          organization_name: project.organization_name,
        },
      });

      accountId = account.id;

      // プロジェクトにアカウントIDを保存
      await base44.asServiceRole.entities.CrowdfundingProject.update(project_id, {
        stripe_connect_account_id: accountId,
        stripe_connect_status: 'pending_onboarding',
      });
    }

    // オンボーディングリンク発行
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/crowdfunding/manage?connect_refresh=1`,
      return_url: `${origin}/crowdfunding/manage?connect_success=1`,
      type: 'account_onboarding',
    });

    return Response.json({ onboarding_url: accountLink.url, account_id: accountId });
  } catch (err) {
    console.error('[createConnectAccount]', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});