import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId } = await req.json();
    if (!callId) return Response.json({ error: 'Missing callId' }, { status: 400 });

    // 通話を取得
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: callId });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    // 視聴者（caller）のみが受諾可能
    if (user.email !== call.caller_email) {
      return Response.json({ error: 'Only caller can accept extension' }, { status: 403 });
    }

    // 延長申請ステータスが pending であることを確認
    if (call.extension_request_status !== 'pending') {
      return Response.json({ error: 'No pending extension request' }, { status: 400 });
    }

    const extensionCoins = call.extension_request_coins;
    if (!extensionCoins || extensionCoins <= 0) {
      return Response.json({ error: 'Invalid extension coins' }, { status: 400 });
    }

    // 1. 視聴者のウォレットから コイン減算
    const wallets = await base44.asServiceRole.entities.YellCoinWallet.filter({ user_email: user.email });
    const wallet = wallets[0];
    if (!wallet || wallet.balance < extensionCoins) {
      return Response.json({ error: 'Insufficient coins', balance: wallet?.balance || 0 }, { status: 402 });
    }

    await base44.asServiceRole.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - extensionCoins,
      total_sent: (wallet.total_sent || 0) + extensionCoins,
    });

    // 2. ライバーのウォレットに 85% を加算
    const creatorCoins = Math.floor(extensionCoins * 0.85);
    const creatorWallets = await base44.asServiceRole.entities.YellCoinWallet.filter({ user_email: call.callee_email });
    if (creatorWallets[0]) {
      await base44.asServiceRole.entities.YellCoinWallet.update(creatorWallets[0].id, {
        balance: (creatorWallets[0].balance || 0) + creatorCoins,
      });
    }

    // 3. ロスタイムバッファを 30秒間セット（決済完了まで時間切れを遅延）
    const lossTimeBufferUntil = new Date(Date.now() + 30000);

    // 4. 通話レコードの延長ステータスを accepted に更新（ロスタイムバッファ付き）
    await base44.asServiceRole.entities.VideoCall.update(callId, {
      extension_request_status: 'accepted',
      extension_accepted_at: new Date().toISOString(),
      loss_time_buffer_until: lossTimeBufferUntil.toISOString(),
      coins_consumed: (call.coins_consumed || 0) + extensionCoins,
      creator_revenue_coins: (call.creator_revenue_coins || 0) + creatorCoins,
      platform_revenue_coins: (call.platform_revenue_coins || 0) + (extensionCoins - creatorCoins),
    });

    console.log(`[Extension] Caller ${user.email} accepted extension: ${extensionCoins} coins`);

    return Response.json({ 
      success: true, 
      lossTimeBufferUntil: lossTimeBufferUntil.toISOString(),
      creatorCoins 
    });
  } catch (error) {
    console.error('[Extension] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});