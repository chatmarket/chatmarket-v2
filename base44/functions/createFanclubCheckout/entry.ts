import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tier, channelId, successUrl, cancelUrl } = await req.json();
    if (!tier || !channelId) {
      return Response.json({ error: 'tier and channelId are required' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY"));

    // DBからチャンネルのティア設定を取得
    const channels = await base44.asServiceRole.entities.Channel.filter({ id: channelId });
    const channel = channels[0];
    if (!channel) return Response.json({ error: 'Channel not found' }, { status: 404 });

    // DBのfanclub_tiersから対象ティアを検索、なければデフォルト価格を使用
    const tiers = channel.fanclub_tiers || [];
    const tierConfig = tiers.find(t => t.tier_id === tier);

    let priceId;

    if (tierConfig?.stripe_price_id) {
      // DBに保存済みのStripe Price IDを使用
      priceId = tierConfig.stripe_price_id;
    } else {
      // DBにPrice IDがない場合、Stripeで動的に作成して保存
      const priceYen = tierConfig?.price || getDefaultPrice(tier);
      const tierName = tierConfig?.name || getDefaultName(tier);

      const stripePrice = await stripe.prices.create({
        currency: 'jpy',
        unit_amount: priceYen,
        recurring: { interval: 'month' },
        product_data: {
          name: `${channel.name} ファンクラブ ${tierName}`,
          metadata: { channel_id: channelId, tier },
        },
      });
      priceId = stripePrice.id;

      // 作成したPrice IDをDBに保存（次回から再利用）
      const updatedTiers = tiers.filter(t => t.tier_id !== tier);
      updatedTiers.push({
        ...(tierConfig || { tier_id: tier, name: tierName, price: priceYen, perks: [], emoji: getDefaultEmoji(tier) }),
        stripe_price_id: priceId,
      });
      await base44.asServiceRole.entities.Channel.update(channelId, { fanclub_tiers: updatedTiers });
    }

    // Stripeカスタマー取得または作成
    const existing = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (existing.data.length > 0) {
      customerId = existing.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name || user.email,
        metadata: { base44_user_email: user.email },
      });
      customerId = customer.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${req.headers.get('origin')}/fanclub/${channelId}?subscribed=1`,
      cancel_url: cancelUrl || `${req.headers.get('origin')}/fanclub/${channelId}`,
      subscription_data: {
        metadata: { base44_user_email: user.email, channel_id: channelId, tier },
      },
      metadata: { base44_user_email: user.email, channel_id: channelId, tier },
      locale: 'ja',
    });

    return Response.json({ url: session.url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getDefaultPrice(tier) {
  return { standard: 500, premium: 3000, diamond: 10000 }[tier] || 500;
}
function getDefaultName(tier) {
  return { standard: 'Standard', premium: 'Premium', diamond: 'Diamond' }[tier] || tier;
}
function getDefaultEmoji(tier) {
  return { standard: '⭐', premium: '👑', diamond: '💎' }[tier] || '⭐';
}