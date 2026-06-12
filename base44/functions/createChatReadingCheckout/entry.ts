/**
 * createChatReadingCheckout
 * チャット鑑定（Stripe直接決済）のCheckout Session作成
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { menu_id, consultation_text, consultation_genre, buyer_name, birth_info, partner_info, additional_info } = await req.json();
    if (!menu_id) return Response.json({ error: 'menu_id required' }, { status: 400 });
    if (!consultation_text?.trim()) return Response.json({ error: '相談内容を入力してください' }, { status: 400 });

    // メニュー取得
    const menus = await base44.asServiceRole.entities.ChatReadingMenu.filter({ id: menu_id });
    const menu = menus[0];
    if (!menu) return Response.json({ error: 'メニューが見つかりません' }, { status: 404 });
    if (!menu.is_active) return Response.json({ error: '現在受付停止中のメニューです' }, { status: 400 });

    // 自分自身への申し込み不可
    if (menu.creator_email === user.email) {
      return Response.json({ error: '自分のメニューには申し込めません' }, { status: 400 });
    }

    // 価格検証
    const priceYen = Math.round(menu.price_yen);
    if (priceYen < 500 || priceYen > 50000) {
      return Response.json({ error: '価格が無効です' }, { status: 400 });
    }

    // 占い師の還元率を確認（BasicまたはCampaign → 85%、それ以外 → 70%）
    let creatorRate = 0.70;
    try {
      const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
        user_email: menu.creator_email, status: 'active'
      });
      const grants = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: menu.creator_email });
      const activeGrant = grants.find(g => g.expires_at && new Date(g.expires_at) > new Date());
      const hasBasic = subs.some(s => s.plan_id === 'basic' || s.plan_id === 'call-anser');
      if (hasBasic || activeGrant) creatorRate = 0.85;
    } catch (_) {}

    const creatorRevenueYen = Math.floor(priceYen * creatorRate);

    // ChatReadingOrder を pending_payment で先行作成
    const order = await base44.asServiceRole.entities.ChatReadingOrder.create({
      menu_id: menu.id,
      creator_email: menu.creator_email,
      channel_id: menu.channel_id,
      channel_name: menu.channel_name || '',
      buyer_email: user.email,
      buyer_name: buyer_name || user.full_name || user.email,
      menu_title: menu.title,
      consultation_genre: consultation_genre || '',
      consultation_text: consultation_text.trim(),
      birth_info: birth_info || '',
      partner_info: partner_info || '',
      additional_info: additional_info || '',
      price_yen: priceYen,
      status: 'pending_payment',
      payment_status: 'pending',
      creator_rate: creatorRate,
      creator_revenue_yen: creatorRevenueYen,
    });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const origin = req.headers.get('origin') || 'https://chatmarket.app';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'jpy',
          product_data: {
            name: `チャット鑑定：${menu.title}`,
            description: 'Chat Marketでのチャット鑑定依頼',
          },
          unit_amount: priceYen,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${origin}/chat-readings?order_id=${order.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/channel/${menu.channel_id}`,
      metadata: {
        type: 'chat_reading',
        order_id: order.id,
        menu_id: menu.id,
        creator_email: menu.creator_email,
        buyer_email: user.email,
        price_yen: String(priceYen),
        creator_rate: String(creatorRate),
        creator_revenue_yen: String(creatorRevenueYen),
      },
    });

    // stripe_session_id を保存
    await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
      stripe_session_id: session.id,
    });

    return Response.json({ checkout_url: session.url, order_id: order.id });
  } catch (error) {
    console.error('[createChatReadingCheckout]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});