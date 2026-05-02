/**
 * consumeCoinsForViewing — アトミックな有料配信視聴処理
 * 
 * 1. コイン残高チェック
 * 2. コイン消費（ウォレット更新）
 * 3. トランザクション記録
 * を必ずセットで実行。片方だけ失敗しない設計。
 */

import { createClientFromRequest } from "npm:@base44/sdk@0.8.25";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const { stream_id, price, channel_id, channel_owner_email, channel_name } = await req.json();

    // バリデーション
    if (!stream_id || !price || price <= 0 || !channel_id) {
      return Response.json({ error: "無効なリクエストパラメータ" }, { status: 400 });
    }

    // ★ Step 1: ウォレット取得＆残高確認
    const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
    const wallet = wallets[0];

    if (!wallet) {
      return Response.json({ error: "ウォレットが見つかりません" }, { status: 404 });
    }

    if (wallet.balance < price) {
      return Response.json({
        error: `コイン不足です。残高: ${wallet.balance} / 必要: ${price}`,
        balance: wallet.balance,
        shortage: price - wallet.balance,
      }, { status: 402 }); // Payment Required
    }

    // ★ Step 2: コイン消費（ウォレット更新）
    const newBalance = wallet.balance - price;
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: newBalance,
      total_sent: (wallet.total_sent || 0) + price,
    });

    // ★ Step 3: トランザクション記録（証拠保全）
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount: price,
      target_name: channel_name || "",
      target_id: channel_id,
      service_type: "live_viewing",
      service_id: stream_id,
      channel_id: channel_id,
      channel_owner_email: channel_owner_email || "",
    });

    return Response.json({
      success: true,
      new_balance: newBalance,
      transaction: {
        amount: price,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[consumeCoinsForViewing] Error:", error.message);
    return Response.json({
      error: "決済処理に失敗しました。電波の良い場所で再度お試しください。",
      details: error.message,
    }, { status: 500 });
  }
});