import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const data = payload.data || {};
    const userEmail = data.user_email;

    if (!userEmail) {
      return Response.json({ status: 'skipped', reason: 'no_user_email' });
    }

    // 管理者全員にアプリ内通知を作成
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    for (const admin of adminUsers) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: admin.email,
        type: 'new_video',
        title: '🎉 新規ユーザー登録',
        message: `${userEmail} さんが新規登録しました`,
        link: '/admin/dashboard?tab=users',
        is_read: false,
        is_broadcast: false,
      });
    }

    // 管理者へメール通知
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'unei@chatmarket.info',
      from_name: 'ChatMarket 運営通知',
      subject: `【新規登録】${userEmail} さんが登録しました`,
      body: `新しいユーザーが登録しました。\n\nメール: ${userEmail}\n登録日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n\n管理画面: https://live-chat-market.com/admin/dashboard?tab=users`,
    });

    console.log(`✓ New user notification sent for ${userEmail}`);
    return Response.json({ status: 'success', user_email: userEmail });
  } catch (error) {
    console.error('❌ notifyAdminNewUser error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});