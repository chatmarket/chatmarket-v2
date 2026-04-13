/**
 * expireYellCoins
 * 資金決済法準拠：自家型前払式支払手段（有効期限180日）
 * スケジュール実行：毎日 1回
 * 有効期限を過ぎたエールコインを自動失効させウォレット残高を減算する。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // 管理者権限で操作（スケジュール実行のためサービスロール使用）
    const now = new Date().toISOString();

    // 失効していない（is_expired=false）かつ有効期限切れのchargeトランザクションを取得
    const allCharges = await base44.asServiceRole.entities.YellCoinTransaction.filter({
      type: "charge",
      is_expired: false
    }, '-created_date', 500);

    const expiredCharges = allCharges.filter(tx => tx.expires_at && tx.expires_at < now);

    if (expiredCharges.length === 0) {
      return Response.json({ message: "No coins to expire.", expired_count: 0 });
    }

    let expiredTotal = 0;
    const processedUsers = new Map(); // user_email -> total expired amount

    for (const tx of expiredCharges) {
      // トランザクションを失効済みにマーク
      await base44.asServiceRole.entities.YellCoinTransaction.update(tx.id, {
        is_expired: true
      });

      // 失効ログを作成
      await base44.asServiceRole.entities.YellCoinTransaction.create({
        user_email: tx.user_email,
        type: "expire",
        amount: tx.amount,
        yen_amount: 0,
        is_expired: true,
        message: `有効期限切れによる失効（元チャージ日: ${new Date(tx.created_date).toLocaleDateString('ja-JP')}）`
      });

      const prev = processedUsers.get(tx.user_email) || 0;
      processedUsers.set(tx.user_email, prev + tx.amount);
      expiredTotal += tx.amount;
    }

    // 各ユーザーのウォレット残高を減算
    for (const [email, expiredAmount] of processedUsers.entries()) {
      const wallets = await base44.asServiceRole.entities.YellCoinWallet.filter({ user_email: email });
      if (wallets[0]) {
        const newBalance = Math.max(0, (wallets[0].balance || 0) - expiredAmount);
        await base44.asServiceRole.entities.YellCoinWallet.update(wallets[0].id, {
          balance: newBalance
        });
      }
    }

    return Response.json({
      message: "Expiry processed successfully.",
      expired_transactions: expiredCharges.length,
      expired_total_coins: expiredTotal,
      affected_users: processedUsers.size
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});