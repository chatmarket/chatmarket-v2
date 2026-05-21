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

      // 商品の sold_count をインクリメント
      if (product_id) {
        const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
        const product = products[0];
        if (product) {
          await base44.asServiceRole.entities.Product.update(product_id, {
            sold_count: (product.sold_count || 0) + 1,
          });
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