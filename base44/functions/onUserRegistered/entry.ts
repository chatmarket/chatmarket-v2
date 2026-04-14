import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const event = payload.event || {};
    const data = payload.data || {};
    const userEmail = data.email;

    if (!userEmail) {
      console.warn('No email in user data');
      return Response.json({ status: 'skipped', reason: 'no_email' });
    }

    // call-anser プランを登録
    await base44.asServiceRole.entities.PlanSubscription.create({
      user_email: userEmail,
      plan_id: 'call-anser',
      status: 'active',
    });
    console.log(`✓ PlanSubscription created for ${userEmail}`);

    // YellCoinWallet に初期残高500コインを付与
    await base44.asServiceRole.entities.YellCoinWallet.create({
      user_email: userEmail,
      balance: 500,
      total_charged: 500,
      total_sent: 0,
    });
    console.log(`✓ YellCoinWallet created for ${userEmail} with 500 coins`);

    return Response.json({
      status: 'success',
      user_email: userEmail,
      plan: 'call-anser',
      initial_coins: 500,
    });
  } catch (error) {
    console.error('❌ onUserRegistered error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});