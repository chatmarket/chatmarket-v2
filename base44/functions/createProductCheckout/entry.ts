import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { product_id, shipping } = await req.json();
    if (!product_id) return Response.json({ error: 'product_id required' }, { status: 400 });

    const products = await base44.asServiceRole.entities.Product.filter({ id: product_id });
    const product = products[0];
    if (!product) return Response.json({ error: 'Product not found' }, { status: 404 });
    if (!product.is_active) return Response.json({ error: 'Product is not active' }, { status: 400 });

    // 物理グッズは現在非公開（将来候補）
    if (!product.is_digital) {
      return Response.json({ error: '物理グッズ販売は現在準備中です。' }, { status: 400 });
    }

    // 在庫チェック
    if (product.stock !== -1 && product.stock <= product.sold_count) {
      return Response.json({ error: '在庫切れです' }, { status: 400 });
    }

    // 物理商品は配送先必須
    if (!product.is_digital && !shipping) {
      return Response.json({ error: '配送先情報が必要です' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://chatmarket.app';

    // 注文レコードを pending で先に作成
    const orderData = {
      product_id: product.id,
      channel_id: product.channel_id,
      channel_name: product.channel_name || '',
      owner_email: product.owner_email,
      buyer_email: user.email,
      buyer_name: user.full_name || '',
      product_title: product.title,
      price_yen: product.price,
      is_digital: product.is_digital || false,
      file_url: product.is_digital ? (product.file_url || '') : '',
      file_name: product.is_digital ? (product.file_name || '') : '',
      status: 'pending',
    };

    if (!product.is_digital && shipping) {
      orderData.shipping_name = shipping.name || '';
      orderData.shipping_postal = shipping.postal || '';
      orderData.shipping_address = shipping.address || '';
      orderData.shipping_phone = shipping.phone || '';
      orderData.shipping_status = 'waiting';
    }

    const order = await base44.asServiceRole.entities.ProductOrder.create(orderData);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: product.title,
            images: product.image_url ? [product.image_url] : [],
          },
          unit_amount: Math.round(product.price),
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/my-purchases?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
      cancel_url: `${origin}/channel/${product.channel_id}`,
      metadata: {
        order_id: order.id,
        product_id: product.id,
        buyer_email: user.email,
        is_digital: product.is_digital ? '1' : '0',
      },
    });

    await base44.asServiceRole.entities.ProductOrder.update(order.id, { stripe_session_id: session.id });

    return Response.json({ checkout_url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});