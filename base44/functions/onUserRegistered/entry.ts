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

    // ── AWS IVS チャンネルを新規ユーザーに自動プロビジョニング ──
    // Channelが存在する場合のみ（既存ユーザー対応）
    try {
      const existingChannels = await base44.asServiceRole.entities.Channel.filter({ owner_email: userEmail });
      const channel = existingChannels[0];
      if (channel && !channel.ivs_stream_key) {
        console.log(`[onUserRegistered] Provisioning IVS channel for ${userEmail}...`);
        const provisionRes = await base44.asServiceRole.functions.invoke('provisionChannelStreamKey', {
          channel_id: channel.id,
        });
        if (provisionRes?.success) {
          console.log(`✓ IVS channel auto-provisioned for ${userEmail}`);
        }
      }
    } catch (ivsErr) {
      // IVSプロビジョニング失敗はユーザー登録を止めない
      console.warn(`[onUserRegistered] IVS provisioning skipped: ${ivsErr.message}`);
    }

    // YellCoinWallet に初期残高500コインを付与
    await base44.asServiceRole.entities.YellCoinWallet.create({
      user_email: userEmail,
      balance: 500,
      total_charged: 500,
      total_sent: 0,
    });
    console.log(`✓ YellCoinWallet created for ${userEmail} with 500 coins`);

    // 管理者向けアプリ内通知を作成
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: admin.email,
        type: 'new_video', // 汎用タイプ流用
        title: '🎉 新規ユーザー登録',
        message: `${data.full_name || userEmail} さんが新規登録しました（${userEmail}）`,
        link: '/admin/dashboard?tab=users',
        is_read: false,
        is_broadcast: false,
      });
    }
    console.log(`✓ Admin notifications sent for ${userEmail}`);

    // 管理者へメール通知
    const adminEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL') || 'unei@chatmarket.info';
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: adminEmail,
      from_name: 'ChatMarket 運営通知',
      subject: `【新規登録】${data.full_name || userEmail} さんが登録しました`,
      body: `新しいユーザーが登録しました。\n\n名前: ${data.full_name || '未設定'}\nメール: ${userEmail}\n登録日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n\n管理画面: https://live-chat-market.com/admin/dashboard?tab=users`,
    });
    console.log(`✓ Admin email sent for ${userEmail}`);

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