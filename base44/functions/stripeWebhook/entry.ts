/**
 * stripeWebhook
 * Stripe からのイベントを処理する
 *   - checkout.session.completed (video purchase)
 *   - checkout.session.completed (yell_coin_purchase) ← コイン付与ロジック追加
 *
 * ── コイン付与ルール ─────────────────────────────────────────────
 *   入金コイン (coins_purchased) と ボーナスコイン (bonus_coins) を分離して記録
 *   付与合計 = coins_purchased + bonus_coins
 *   クリエイター還元時は付与合計コインに対して還元率（85〜95%）を適用する
 * ──────────────────────────────────────────────────────────────────
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Stripe webhook 署名検証
    const encoder = new TextEncoder();
    const parts = signature.split(',');
    const timestampPart = parts[0].split('=')[1];
    const signaturePart = parts[1].split('=')[1];
    const signedData = `${timestampPart}.${body}`;

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const sigBytes = new Uint8Array(signaturePart.match(/.{1,2}/g).map(b => parseInt(b, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signedData));

    if (!isValid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};

      // ── コイン購入 ───────────────────────────────────────────
      if (meta.type === 'yell_coin_purchase' && meta.userEmail) {
        const userEmail      = meta.userEmail;
        const planId         = meta.planId;
        const basePrice      = parseInt(meta.base_price || '0');
        const chargeAmount   = parseInt(meta.charge_amount || '0');
        const coinsPurchased = parseInt(meta.coins_purchased || '0'); // 入金対応コイン
        const bonusCoins     = parseInt(meta.bonus_coins || '0');     // ボーナスコイン（別記）
        const totalCoins     = coinsPurchased + bonusCoins;           // 付与合計

        // ウォレット取得 or 作成
        const wallets = await base44.asServiceRole.entities.YellCoinWallet.filter({ user_email: userEmail });
        let wallet = wallets[0];
        if (!wallet) {
          wallet = await base44.asServiceRole.entities.YellCoinWallet.create({
            user_email: userEmail,
            balance: 0,
            total_charged: 0,
          });
        }

        // 残高加算
        await base44.asServiceRole.entities.YellCoinWallet.update(wallet.id, {
          balance: (wallet.balance || 0) + totalCoins,
          total_charged: (wallet.total_charged || 0) + coinsPurchased, // 入金分のみ累計
        });

        // トランザクション記録（入金額・付与額を明確に分離）
        await base44.asServiceRole.entities.YellCoinTransaction.create({
          user_email: userEmail,
          type: 'charge',
          amount: totalCoins,           // 付与合計コイン
          yen_amount: basePrice,        // 定価（Stripe手数料前）
          service_type: 'charge',
          message: `コイン購入: ${planId} / 入金¥${chargeAmount} / 付与${totalCoins}コイン（購入${coinsPurchased}+ボーナス${bonusCoins}）`,
          // 追加フィールド: 入金・付与の内訳
          coins_purchased: coinsPurchased,
          bonus_coins: bonusCoins,
          charge_amount_jpy: chargeAmount,
          stripe_session_id: session.id,
          terms_agreed_at: new Date().toISOString(),
          terms_version: '2026-04',
        });

        console.log(`[CoinPurchase] ${userEmail}: +${totalCoins}コイン (購入${coinsPurchased}+ボーナス${bonusCoins}) ¥${chargeAmount}課金`);
      }

      // ── 動画購入 ─────────────────────────────────────────────
      if (meta.videoId && meta.userEmail && meta.type !== 'yell_coin_purchase') {
        await base44.asServiceRole.entities.Purchase.create({
          item_type: 'video',
          item_id: meta.videoId,
          amount: session.amount_total,
          buyer_email: meta.userEmail,
          status: 'completed',
          stripe_session_id: session.id,
        });
      }

      // ── スクールチケット Stripe 決済完了 ──────────────────────
      // ❌ Red Line: 成功ページ遷移だけでactiveにしない → Webhookで確認した場合のみactive化
      if (meta.type === 'school_ticket' && meta.school_ticket_id) {
        const tickets = await base44.asServiceRole.entities.SchoolTicket.filter({ id: meta.school_ticket_id });
        const ticket = tickets[0];
        // 二重処理防止・pending_payment のみ処理
        if (ticket && ticket.status === 'pending_payment') {
          await base44.asServiceRole.entities.SchoolTicket.update(ticket.id, {
            status: 'active',
            payment_method: 'stripe',
            payment_status: 'completed',
            price_yen: session.amount_total,
            stripe_session_id: session.id,
            teacher_plan_at_purchase: meta.teacher_plan_at_purchase || 'free',
            revenue_rate_at_purchase: parseFloat(meta.revenue_rate_at_purchase || '0.70'),
            teacher_revenue_yen: parseInt(meta.teacher_revenue_yen || '0'),
            platform_revenue_yen: parseInt(meta.platform_revenue_yen || '0'),
          });
          await base44.asServiceRole.entities.Purchase.create({
            item_type: 'school_ticket',
            item_id: ticket.id,
            amount: session.amount_total,
            buyer_email: meta.student_email,
            status: 'completed',
            stripe_session_id: session.id,
          });
          console.log(`[SchoolTicket] activated: ${ticket.id} via Stripe ${session.id}`);
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[stripeWebhook] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});