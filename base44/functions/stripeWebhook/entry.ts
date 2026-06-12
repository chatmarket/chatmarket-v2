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
        const userEmail = meta.userEmail;
        const planId    = meta.planId;

        // ── 冪等性チェック（重複Webhook防止） ──
        // 同一stripe_session_idでの二重付与を防止
        const existingTx = await base44.asServiceRole.entities.YellCoinTransaction.filter({
          stripe_session_id: session.id,
        });
        if (existingTx.length > 0) {
          console.log(`[CoinPurchase] duplicate session skipped: ${session.id}`);
          return Response.json({ ok: true, skipped: 'duplicate_session' });
        }

        // ── 2026-06-04確定仕様フィールドを優先、旧フィールドにフォールバック ──
        const coinBaseAmountYen    = parseInt(meta.coin_base_amount_yen   || meta.base_price        || '0');
        const coinPurchaseFeeRate  = parseFloat(meta.coin_purchase_fee_rate || '0.05');
        const coinPurchaseFeeYen   = parseInt(meta.coin_purchase_fee_yen  || '0');
        const viewerTotalYen       = parseInt(meta.viewer_total_yen       || meta.charge_amount     || '0');
        // granted_coins: 手数料分は付与しない（ボーナス廃止）
        const grantedCoins         = parseInt(meta.granted_coins          || meta.coins_purchased   || '0');

        if (grantedCoins <= 0) {
          console.warn(`[CoinPurchase] granted_coins=0, skipping: ${session.id}`);
          return Response.json({ ok: true, skipped: 'no_coins' });
        }

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

        // 残高加算（手数料分は付与しない: balance += grantedCoins のみ）
        await base44.asServiceRole.entities.YellCoinWallet.update(wallet.id, {
          balance:       (wallet.balance       || 0) + grantedCoins,
          total_charged: (wallet.total_charged || 0) + grantedCoins, // 付与コインのみ累計
        });

        // トランザクション記録（2026-06-04確定仕様）
        await base44.asServiceRole.entities.YellCoinTransaction.create({
          user_email:            userEmail,
          type:                  'charge',
          amount:                grantedCoins,       // 付与コイン数
          yen_amount:            coinBaseAmountYen,  // コイン本体価格
          service_type:          'charge',
          message:               `エールコイン購入: ${planId} / コイン本体¥${coinBaseAmountYen} / 購入手数料¥${coinPurchaseFeeYen}(${Math.round(coinPurchaseFeeRate * 100)}%) / 支払総額¥${viewerTotalYen} / 付与${grantedCoins}コイン`,
          // 2026-06-04確定仕様フィールド
          coins_purchased:       grantedCoins,       // 付与コイン数（手数料分は含まない）
          bonus_coins:           0,                  // ボーナス廃止
          charge_amount_jpy:     viewerTotalYen,     // 視聴者支払総額
          stripe_session_id:     session.id,
          terms_agreed_at:       new Date().toISOString(),
          terms_version:         '2026-06',
        });

        console.log(`[CoinPurchase] ${userEmail}: +${grantedCoins}コイン / 本体¥${coinBaseAmountYen} + 手数料¥${coinPurchaseFeeYen} = ¥${viewerTotalYen} / session:${session.id}`);
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

      // ── チャット鑑定 決済完了 ──────────────────────────────────
      if (meta.type === 'chat_reading' && meta.order_id) {
        const orders = await base44.asServiceRole.entities.ChatReadingOrder.filter({ id: meta.order_id });
        const order = orders[0];
        if (order && order.payment_status !== 'paid') {
          // 冪等性: stripe_event_id チェック
          if (order.stripe_event_id && order.stripe_event_id === event.id) {
            console.log(`[ChatReading] duplicate event skipped: ${event.id}`);
          } else {
            const priceYen = parseInt(meta.price_yen || '0');
            const creatorRate = parseFloat(meta.creator_rate || '0.85');
            const creatorRevenueYen = parseInt(meta.creator_revenue_yen || String(Math.floor(priceYen * creatorRate)));

            await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
              status: 'in_progress',
              payment_status: 'paid',
              stripe_payment_intent_id: session.payment_intent || '',
              stripe_event_id: event.id,
              paid_at: new Date().toISOString(),
            });

            // ── CreatorEarning 作成（冪等性: stripe_session_id で重複チェック） ──
            try {
              const existingEarning = await base44.asServiceRole.entities.CreatorEarning.filter({
                service_type: 'chat_reading',
                service_id: order.id,
              });
              if (existingEarning.length === 0) {
                const platformAmountYen = priceYen - creatorRevenueYen;
                await base44.asServiceRole.entities.CreatorEarning.create({
                  creator_email: meta.creator_email || order.creator_email,
                  channel_id: order.channel_id || '',
                  channel_name: order.channel_name || '',
                  sender_email: meta.buyer_email || order.buyer_email,
                  sender_name: order.buyer_name || '',
                  coin_amount: 0,
                  yen_equivalent: priceYen,
                  service_type: 'chat_reading',
                  service_id: order.id,
                  gross_amount_yen: priceYen,
                  creator_rate: creatorRate,
                  creator_amount_yen: creatorRevenueYen,
                  platform_amount_yen: platformAmountYen,
                  payment_provider: 'stripe',
                  stripe_session_id: session.id,
                  stripe_payment_intent_id: session.payment_intent || '',
                  status: 'confirmed',
                  is_settled: false,
                });
                console.log(`[ChatReading] CreatorEarning created: order=${order.id} creator=${meta.creator_email} amount=${creatorRevenueYen}yen`);
              } else {
                console.log(`[ChatReading] CreatorEarning already exists for order ${order.id}, skipped`);
              }
            } catch (earningErr) {
              console.error('[ChatReading] CreatorEarning creation failed:', earningErr.message);
            }

            // 通知用Notification作成（占い師へ）
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_email: meta.creator_email,
                type: 'chat_reading_new',
                title: '新しいチャット鑑定依頼が届きました',
                message: `${order.buyer_name || meta.buyer_email}さんから「${order.menu_title}」の依頼が届きました`,
                link: '/chat-reading-dashboard',
                is_read: false,
              });
            } catch (_) {}
            // 相談者へも通知
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_email: meta.buyer_email,
                type: 'chat_reading_accepted',
                title: 'チャット鑑定の受付が完了しました',
                message: `「${order.menu_title}」の鑑定依頼を受け付けました。鑑定結果をお待ちください。`,
                link: '/chat-readings',
                is_read: false,
              });
            } catch (_) {}

            console.log(`[ChatReading] order ${order.id} paid. creator=${meta.creator_email} revenue=${creatorRevenueYen}yen`);
          }
        }
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