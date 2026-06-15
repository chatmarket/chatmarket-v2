import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const results = {};

  try {
    const payload = await req.json();
    const data = payload.data || {};
    const userEmail = data.email;

    if (!userEmail) {
      console.warn('[onUserRegistered] No email in user data, skipping');
      return Response.json({ status: 'skipped', reason: 'no_email' });
    }

    console.log(`[onUserRegistered] Processing new user: ${userEmail}`);

    // 新規ユーザーに onboarding_required フラグを付与（プロフィール必須誘導用）
    // data.id → data.user_id → emailで検索 の順で対象ユーザーを特定
    try {
      const userId = data.id || data.user_id;
      if (userId) {
        await base44.asServiceRole.entities.User.update(userId, { onboarding_required: true });
        console.log(`✓ onboarding_required set for ${userEmail} (id: ${userId})`);
      } else {
        // IDが取れない場合はemailで検索して更新
        const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
        if (users[0]) {
          await base44.asServiceRole.entities.User.update(users[0].id, { onboarding_required: true });
          console.log(`✓ onboarding_required set for ${userEmail} (found by email)`);
        } else {
          console.warn(`⚠️ User not found for onboarding_required: ${userEmail}`);
        }
      }
    } catch (flagErr) {
      console.warn(`⚠️ onboarding_required flag failed for ${userEmail}:`, flagErr.message);
    }

    // 1. PlanSubscription (call-anser) 作成 — 重複チェック付き
    try {
      const existing = await base44.asServiceRole.entities.PlanSubscription.filter({
        user_email: userEmail,
        plan_id: 'call-anser',
      });
      if (existing.length === 0) {
        await base44.asServiceRole.entities.PlanSubscription.create({
          user_email: userEmail,
          plan_id: 'call-anser',
          plan_name: 'CALL&ANSERプラン',
          status: 'active',
        });
        console.log(`✓ PlanSubscription created for ${userEmail}`);
        results.plan = 'created';
      } else {
        console.log(`[onUserRegistered] PlanSubscription already exists for ${userEmail}`);
        results.plan = 'already_exists';
      }
    } catch (planErr) {
      console.error(`❌ PlanSubscription failed for ${userEmail}:`, planErr.message);
      results.plan = 'error: ' + planErr.message;
    }

    // 2. YellCoinWallet 作成 — 重複チェック付き
    try {
      const existingWallet = await base44.asServiceRole.entities.YellCoinWallet.filter({
        user_email: userEmail,
      });
      if (existingWallet.length === 0) {
        await base44.asServiceRole.entities.YellCoinWallet.create({
          user_email: userEmail,
          balance: 500,
          total_charged: 500,
          total_sent: 0,
        });
        console.log(`✓ YellCoinWallet created for ${userEmail} with 500 coins`);
        results.wallet = 'created';
      } else {
        console.log(`[onUserRegistered] YellCoinWallet already exists for ${userEmail}`);
        results.wallet = 'already_exists';
      }
    } catch (walletErr) {
      console.error(`❌ YellCoinWallet failed for ${userEmail}:`, walletErr.message);
      results.wallet = 'error: ' + walletErr.message;
    }

    // 3. 管理者向けアプリ内通知
    try {
      const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
      for (const admin of adminUsers) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: admin.email,
          type: 'new_video',
          title: '🎉 新規ユーザー登録',
          message: `${data.full_name || userEmail} さんが新規登録しました`,
          link: '/admin/dashboard?tab=users',
          is_read: false,
          is_broadcast: false,
        });
      }
      console.log(`✓ Admin notifications created for ${userEmail}`);
      results.notifications = 'sent';
    } catch (notifyErr) {
      console.error(`❌ Admin notification failed for ${userEmail}:`, notifyErr.message);
      results.notifications = 'error: ' + notifyErr.message;
    }

    // 4. 管理者へメール通知
    try {
      const adminEmail = Deno.env.get('ADMIN_NOTIFY_EMAIL') || 'unei@chatmarket.info';
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: adminEmail,
        from_name: 'ChatMarket 運営通知',
        subject: `【新規登録】${data.full_name || userEmail} さんが登録しました`,
        body: `新しいユーザーが登録しました。\n\n名前: ${data.full_name || '未設定'}\nメール: ${userEmail}\n登録日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n\n管理画面: https://live-chat-market.com/admin/dashboard?tab=users`,
      });
      console.log(`✓ Admin email sent for ${userEmail}`);
      results.email = 'sent';
    } catch (emailErr) {
      // メール失敗はユーザー登録を止めない
      console.warn(`⚠️ Admin email failed for ${userEmail}:`, emailErr.message);
      results.email = 'error: ' + emailErr.message;
    }

    // 5. IVSチャンネルのプロビジョニング（チャンネルが存在する場合のみ）
    try {
      const existingChannels = await base44.asServiceRole.entities.Channel.filter({ owner_email: userEmail });
      const channel = existingChannels[0];
      if (channel && !channel.ivs_stream_key) {
        const provisionRes = await base44.asServiceRole.functions.invoke('provisionChannelStreamKey', {
          channel_id: channel.id,
        });
        if (provisionRes?.success) {
          console.log(`✓ IVS channel auto-provisioned for ${userEmail}`);
          results.ivs = 'provisioned';
        }
      } else {
        results.ivs = 'skipped';
      }
    } catch (ivsErr) {
      console.warn(`⚠️ IVS provisioning skipped for ${userEmail}:`, ivsErr.message);
      results.ivs = 'error: ' + ivsErr.message;
    }

    console.log(`[onUserRegistered] Done for ${userEmail}:`, JSON.stringify(results));
    return Response.json({ status: 'success', user_email: userEmail, results });

  } catch (error) {
    console.error('❌ onUserRegistered fatal error:', error);
    return Response.json({ error: error.message, results }, { status: 500 });
  }
});