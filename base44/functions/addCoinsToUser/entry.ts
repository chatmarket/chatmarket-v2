import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // 管理者のみ実行可
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { user_email, coins_amount } = await req.json();

    if (!user_email || !coins_amount) {
      return Response.json({ error: 'user_email と coins_amount が必要です' }, { status: 400 });
    }

    // YellCoinWallet を取得
    const wallets = await base44.entities.YellCoinWallet.filter({ user_email });
    
    if (wallets.length === 0) {
      // ウォレットが存在しない場合は新規作成
      await base44.entities.YellCoinWallet.create({
        user_email,
        balance: coins_amount,
        total_charged: coins_amount,
        total_sent: 0,
      });
      console.log(`✅ Created wallet for ${user_email} with ${coins_amount} coins`);
    } else {
      // 既存ウォレットを更新
      const wallet = wallets[0];
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance: (wallet.balance || 0) + coins_amount,
        total_charged: (wallet.total_charged || 0) + coins_amount,
      });
      console.log(`✅ Added ${coins_amount} coins to ${user_email}. New balance: ${(wallet.balance || 0) + coins_amount}`);
    }

    return Response.json({ 
      success: true, 
      message: `${user_email} に ${coins_amount} コイン付与しました` 
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});