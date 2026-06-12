import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

async function sendLineNotify(message) {
  const token = Deno.env.get('LINE_NOTIFY_TOKEN');
  if (!token) { console.warn('[LineNotify] LINE_NOTIFY_TOKEN未設定。スキップ。'); return; }
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ message }),
  });
  if (!res.ok) console.error(`[LineNotify] 失敗 ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    const body = await req.text();
    const sig = req.headers.get('stripe-signature');

    let event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch (err) {
      return Response.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { order_id, product_id, buyer_email, is_digital, delivery_mode } = session.metadata || {};

      if (!order_id) return Response.json({ received: true });

      const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1年

      // delivery_mode に応じて delivery_status をセット
      // instant: ファイルURLは既にOrderに入っているのでDL可能
      // custom_order: 販売者が手動納品するまで pending_delivery
      const deliveryStatus =
        is_digital !== '1' ? 'not_applicable' :
        delivery_mode === 'custom_order' ? 'pending_delivery' : 'not_applicable';

      await base44.asServiceRole.entities.ProductOrder.update(order_id, {
        status: 'completed',
        delivery_status: deliveryStatus,
        download_expires_at: (is_digital === '1' && delivery_mode !== 'custom_order') ? expiresAt : null,
      });

      // 商品の sold_count をインクリメント + CreatorEarning 記録
      if (product_id) {
        const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        const product = products[0];
        if (product) {
          await base44.asServiceRole.entities.Product.update(product_id, {
            sold_count: (product.sold_count || 0) + 1,
          });
        }

        // CreatorEarning を記録（音源販売対象のみ手数料計算・記録）
        const grossYen = Math.round((session.amount_total || 0) / 100);
        if (grossYen > 0 && product) {
          const AUDIO_SELLER_SERVICE_CATS = ["musician", "idol", "singer", "voice_actor", "voice_creator"];
          const AUDIO_SELLER_CAT_IDS = ["music", "idol", "voice"];

          // チャンネルが音源販売対象カテゴリか判定
          const channels = await base44.asServiceRole.entities.Channel.filter({ id: product.channel_id });
          const channel = channels[0];
          const isAudioChannel = channel && (
            AUDIO_SELLER_SERVICE_CATS.includes(channel.service_category) ||
            AUDIO_SELLER_CAT_IDS.includes(channel.category_id)
          );

          // 商品が音源商品か判定（file_type mp3/zip、または音源メタ情報があるもの）
          const isAudioFile = ["mp3", "zip"].includes(product.file_type);
          const hasAudioMeta = !!(product.music_release_type || product.audio_format_label);
          const hasRightsConfirmation = product.rights_confirmation_type === "original_music_only";
          const isAudioProduct = isAudioChannel && (isAudioFile || hasAudioMeta || hasRightsConfirmation);

          if (isAudioProduct) {
            // 音源販売のみ：運営10% + 決済3.6%
            const platformFeeRate = 0.10;
            const paymentFeeRate = 0.036;
            const platformFeeYen = Math.floor(grossYen * platformFeeRate);
            const paymentFeeYen = Math.floor(grossYen * paymentFeeRate);
            const creatorAmountYen = grossYen - platformFeeYen - paymentFeeYen;

            await base44.asServiceRole.entities.CreatorEarning.create({
              creator_email: product.owner_email,
              channel_id: product.channel_id,
              channel_name: product.channel_name || '',
              sender_email: session.customer_details?.email || buyer_email || '',
              service_type: 'product',
              service_id: order_id,
              payment_provider: 'stripe',
              gross_amount_yen: grossYen,
              creator_rate: 1 - platformFeeRate - paymentFeeRate,
              creator_amount_yen: creatorAmountYen,
              platform_amount_yen: platformFeeYen,
              yen_equivalent: grossYen,
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent || '',
              status: 'confirmed',
              message: `[audio_product] 音源販売: ${product.title} (運営${Math.round(platformFeeRate * 100)}%+決済${paymentFeeRate * 100}%)`,
            });
          } else {
            // 通常デジタル商品（占い師の鑑定書・教材PDF等）：手数料率未定義のため gross のみ記録
            // creator_amount_yen は暫定 gross のままとし、管理者が後から精算可能にする
            await base44.asServiceRole.entities.CreatorEarning.create({
              creator_email: product.owner_email,
              channel_id: product.channel_id,
              channel_name: product.channel_name || '',
              sender_email: session.customer_details?.email || buyer_email || '',
              service_type: 'product',
              service_id: order_id,
              payment_provider: 'stripe',
              gross_amount_yen: grossYen,
              creator_rate: null,
              creator_amount_yen: grossYen,
              platform_amount_yen: 0,
              yen_equivalent: grossYen,
              stripe_session_id: session.id,
              stripe_payment_intent_id: session.payment_intent || '',
              status: 'confirmed',
              message: `[digital_product] デジタル販売: ${product.title} (手数料率未確定)`,
            });
          }
        }

        // LINE Notify 通知
        const totalYen = Math.round((session.amount_total || 0) / 100);
        const isDigitalFlag = is_digital === '1';
        const lineMsg = [
          '',
          `🛍️ グッズ${isDigitalFlag ? '(デジタル)' : ''}購入通知`,
          `商品: ${product ? product.title : product_id}`,
          `金額: ¥${totalYen.toLocaleString()}`,
          `購入者: ${session.customer_details?.email || buyer_email || '不明'}`,
          `納品方式: ${delivery_mode === 'custom_order' ? '手動納品(要対応)' : '即時DL'}`,
        ].join('\n');
        await sendLineNotify(lineMsg);
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});