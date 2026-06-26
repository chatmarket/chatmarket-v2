/**
 * videoCallBilling
 *
 * 収益還元率・通話料金はすべて callee（占い師・クリエイター）側の有効プランで決定する。
 * caller（相談者）はコイン残高・支払い可能額の確認にのみ使用する。
 *
 * プラン別マトリックス（callee側で判定）:
 *
 *   85%プラン（basic / call-anser / mini-school / CampaignLiveGrantee有効期間内）:
 *     最低価格: 150エールコイン / 15分
 *     ライバー還元: 85% (127コイン)
 *     Admin手数料: 15% (23コイン)
 *
 *   FREE（上記以外・期限切れPlanSubscription・期限切れCampaignLiveGrantee）:
 *     最低価格: 200エールコイン / 15分
 *     ライバー還元: 70% (140コイン)
 *     Admin手数料: 30% (60コイン)
 *
 *   ※ +3.6%手数料はエールコイン「購入時」のみ発生（クレカ決済）
 *      コイン使用時（通話課金）には手数料は発生しない
 *
 * POST body: { call_id: string, action: "tick" | "end" | "check_next" }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── プラン別定数 ──
const PLAN_CONFIG = {
  free: {
    min_coins:      200,   // 最低価格 200コイン/15分
    creator_rate:   0.70,  // ライバー70%
    platform_rate:  0.30,  // Admin30%
  },
  basic: {
    min_coins:      150,   // 最低価格 150コイン/15分
    creator_rate:   0.85,  // ライバー85%
    platform_rate:  0.15,  // Admin15%
  },
};

/**
 * callee（占い師・クリエイター側）の有効プランを判定する。
 * 判定優先順位:
 *   1. CampaignLiveGrantee — expires_at が未来 → 85%
 *   2. PlanSubscription — status=active かつ end_date が null または未来
 *      plan_id が basic / call-anser / mini-school → 85%
 *   3. 上記以外 → 70%
 */
async function getCalleePlanConfig(base44, calleeEmail) {
  const now = new Date();

  // 1. CampaignLiveGrantee チェック
  try {
    const grants = await base44.asServiceRole.entities.CampaignLiveGrantee.filter({ email: calleeEmail });
    const activeGrant = grants.find(g => {
      if (!g.expires_at) return false;
      const exp = new Date(g.expires_at);
      return !isNaN(exp.getTime()) && exp > now;
    });
    if (activeGrant) {
      return { plan: 'campaign', ...PLAN_CONFIG.basic };
    }
  } catch (e) {
    console.warn('[getCalleePlanConfig] CampaignLiveGrantee check failed:', e.message);
  }

  // 2. PlanSubscription チェック
  try {
    const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
      user_email: calleeEmail,
      status: 'active',
    });
    const PAID_PLAN_IDS = ['basic', 'call-anser', 'mini-school'];
    const validSub = subs.find(s => {
      if (!PAID_PLAN_IDS.includes(s.plan_id)) return false;
      if (!s.end_date) return true;                      // end_date=null → 常時有効
      const end = new Date(s.end_date);
      if (isNaN(end.getTime())) return false;            // 不正値 → 無効
      return end > now;                                  // 未来のみ有効
    });
    if (validSub) {
      return { plan: validSub.plan_id, ...PLAN_CONFIG.basic };
    }
  } catch (e) {
    console.warn('[getCalleePlanConfig] PlanSubscription check failed:', e.message);
  }

  // 3. FREE フォールバック
  return { plan: 'free', ...PLAN_CONFIG.free };
}

// 1ユニット課金処理（共通）
async function chargeOneUnit(base44, call, wallet, unitNumber, now, planCfg) {
  const coinsToCharge = planCfg.min_coins;
  const creatorCoins  = Math.floor(coinsToCharge * planCfg.creator_rate);
  const platformCoins = coinsToCharge - creatorCoins;

  const nextBillingAt = new Date(now.getTime() + 15 * 60 * 1000);

  await base44.entities.YellCoinWallet.update(wallet.id, {
    balance:    wallet.balance - coinsToCharge,
    total_sent: (wallet.total_sent || 0) + coinsToCharge,
  });

  await base44.entities.YellCoinTransaction.create({
    user_email:          call.caller_email,
    type:                'send',
    service_type:        'direct_chat',
    service_id:          call.id,
    amount:              coinsToCharge,
    target_name:         call.callee_name,
    target_id:           call.callee_channel_id,
    channel_id:          call.callee_channel_id,
    channel_owner_email: call.callee_email,
    message:             `1対1ビデオ通話（第${unitNumber}ユニット）ライバー${Math.round(planCfg.creator_rate*100)}% / Admin${Math.round(planCfg.platform_rate*100)}% [${planCfg.plan}プラン]`,
  });

  console.log(`[chargeOneUnit] unit=${unitNumber} coins=${coinsToCharge} creator=${creatorCoins} platform=${platformCoins} plan=${planCfg.plan}`);

  // ミリオネア・チャレンジ集計
  if (call.callee_channel_id) {
    const channels = await base44.entities.Channel.filter({ id: call.callee_channel_id });
    const ch = channels[0];
    if (ch) {
      await base44.entities.Channel.update(call.callee_channel_id, {
        monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + coinsToCharge,
      });
    }
  }

  return { coinsToCharge, creatorCoins, platformCoins, nextBillingAt };
}

const TURN_COST_PER_MIN   = 2;
const P2P_SUCCESS_RATE    = 0.80;
const RECORDING_COST_FLAT = 100;  // 録画オプション追加料金: 100コイン/通話（固定）

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { call_id, action } = body;
    if (!call_id || !action) return Response.json({ error: 'call_id and action are required' }, { status: 400 });

    const calls = await base44.entities.VideoCall.filter({ id: call_id });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    if (call.caller_email !== user.email && call.callee_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date();

    // ── action: check_next ── 次ユニット残高確認（課金なし）
    // 必要コイン数は callee（占い師）側プランから取得、残高確認は caller（相談者）のウォレット
    if (action === 'check_next') {
      const planCfg = await getCalleePlanConfig(base44, call.callee_email);
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];
      const balance = wallet?.balance || 0;
      return Response.json({
        success:        true,
        balance,
        plan:           planCfg.plan,
        next_unit_cost: planCfg.min_coins,
        has_enough:     balance >= planCfg.min_coins,
      });
    }

    // ── action: end ── 通話終了・精算
    if (action === 'end') {
      const billingStart = call.billing_started_at ? new Date(call.billing_started_at) : now;
      const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
      let consumedCoins = call.coins_consumed || 0;

      // 終了時点の callee（占い師）側プランで分配比率を確定
      const planCfg = await getCalleePlanConfig(base44, call.callee_email);

      // ── 録画オプション追加課金 ──
      let recordingOptionCost = 0;
      if (call.recording_option) {
        recordingOptionCost = RECORDING_COST_FLAT;
        const callerWallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
        const callerWallet = callerWallets[0];
        if (callerWallet && callerWallet.balance >= recordingOptionCost) {
          await base44.entities.YellCoinWallet.update(callerWallet.id, {
            balance:    callerWallet.balance - recordingOptionCost,
            total_sent: (callerWallet.total_sent || 0) + recordingOptionCost,
          });
          consumedCoins += recordingOptionCost;
          await base44.entities.YellCoinTransaction.create({
            user_email:          call.caller_email,
            type:                'send',
            service_type:        'direct_chat',
            service_id:          call.id,
            amount:              recordingOptionCost,
            target_name:         call.callee_name,
            target_id:           call.callee_channel_id,
            channel_id:          call.callee_channel_id,
            channel_owner_email: call.callee_email,
            message:             `録画オプション追加料金: ${recordingOptionCost}コイン`,
          });
          console.log(`[videoCallBilling/end] recording_option charge: ${recordingOptionCost}コイン from ${call.caller_email}`);
        } else {
          console.warn(`[videoCallBilling/end] recording_option: 残高不足のためスキップ (balance: ${callerWallet?.balance})`);
        }
        await base44.entities.VideoCall.update(call_id, {
          recording_infra_cost_yen: recordingOptionCost,
          recording_option_price:   recordingOptionCost,
        });
      }

      // callee 側プランで最終分配を確定
      const creatorRevenueCoins  = Math.floor(consumedCoins * planCfg.creator_rate);
      const platformRevenueCoins = consumedCoins - creatorRevenueCoins;

      const commCostYen    = Math.round(actualMinutes * TURN_COST_PER_MIN * (1 - P2P_SUCCESS_RATE));
      const platformRevYen = platformRevenueCoins;
      const profitYen      = platformRevYen - commCostYen;

      console.log(`[videoCallBilling/end] call=${call_id} callee_plan=${planCfg.plan} consumed=${consumedCoins} creator=${creatorRevenueCoins}(${Math.round(planCfg.creator_rate*100)}%) platform=${platformRevenueCoins} recording=${recordingOptionCost} profit_yen=${profitYen}`);

      await base44.entities.VideoCall.update(call_id, {
        status:                  'ended',
        actual_duration_minutes: actualMinutes,
        comm_cost_yen:           commCostYen,
        platform_revenue_coins:  platformRevenueCoins,
        creator_revenue_coins:   creatorRevenueCoins,
        platform_profit_yen:     profitYen,
        coins_consumed:          consumedCoins,
      });

      return Response.json({
        success:                true,
        actual_minutes:         actualMinutes,
        plan:                   planCfg.plan,
        creator_rate:           planCfg.creator_rate,
        coins_consumed:         consumedCoins,
        recording_option_cost:  recordingOptionCost,
        creator_revenue_coins:  creatorRevenueCoins,
        platform_revenue_coins: platformRevenueCoins,
        platform_profit_yen:    profitYen,
      });
    }

    // ── action: tick ── 毎分フロントから呼ぶ課金タイマー
    // 通話料金・分配率は callee（占い師）側プランで決定する
    if (action === 'tick') {
      const planCfg = await getCalleePlanConfig(base44, call.callee_email);

      // ── 最初のユニット（課金開始）──
      if (!call.billing_started_at) {
        // 残高確認は caller（相談者）のウォレット
        const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
        const wallet = wallets[0];

        if (!wallet || wallet.balance < planCfg.min_coins) {
          await base44.entities.VideoCall.update(call_id, { auto_disconnected: true, status: 'ended' });
          return Response.json({
            success: false, reason: 'insufficient_balance',
            required: planCfg.min_coins, balance: wallet?.balance || 0,
            plan: planCfg.plan, auto_disconnected: true,
          });
        }

        const { coinsToCharge, creatorCoins, platformCoins, nextBillingAt } =
          await chargeOneUnit(base44, call, wallet, 1, now, planCfg);

        await base44.entities.VideoCall.update(call_id, {
          billing_started_at:     now.toISOString(),
          next_billing_at:        nextBillingAt.toISOString(),
          billing_interval_count: 1,
          coins_consumed:         coinsToCharge,
          platform_revenue_coins: platformCoins,
          creator_revenue_coins:  creatorCoins,
        });

        return Response.json({
          success: true, billed: true,
          plan:            planCfg.plan,
          coins_billed:    coinsToCharge,
          creator_coins:   creatorCoins,
          platform_coins:  platformCoins,
          unit:            1,
          next_billing_at: nextBillingAt.toISOString(),
          balance_after:   wallet.balance - coinsToCharge,
          coins_consumed_total: coinsToCharge,
        });
      }

      // ── 次回課金タイムチェック ──
      const nextBillingAt = call.next_billing_at ? new Date(call.next_billing_at) : null;
      if (!nextBillingAt || now < nextBillingAt) {
        return Response.json({
          success: true, billed: false,
          plan: planCfg.plan,
          seconds_until_next_billing: nextBillingAt
            ? Math.max(0, Math.ceil((nextBillingAt - now) / 1000))
            : 900,
          coins_consumed_total: call.coins_consumed || 0,
          unit: call.billing_interval_count || 1,
        });
      }

      // ── 15分経過 → 次ユニット課金（callee 側プランで料金・分配率を確定）──
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];

      if (!wallet || wallet.balance < planCfg.min_coins) {
        const billingStart  = new Date(call.billing_started_at);
        const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
        const consumedCoins = call.coins_consumed || 0;
        const creatorCoins  = Math.floor(consumedCoins * planCfg.creator_rate);
        const platformCoins = consumedCoins - creatorCoins;
        const commCostYen   = Math.round(actualMinutes * TURN_COST_PER_MIN * (1 - P2P_SUCCESS_RATE));

        await base44.entities.VideoCall.update(call_id, {
          auto_disconnected:       true,
          status:                  'ended',
          actual_duration_minutes: actualMinutes,
          comm_cost_yen:           commCostYen,
          platform_revenue_coins:  platformCoins,
          creator_revenue_coins:   creatorCoins,
          platform_profit_yen:     platformCoins - commCostYen,
        });

        return Response.json({
          success: false, reason: 'insufficient_balance', auto_disconnected: true,
          plan: planCfg.plan,
          required: planCfg.min_coins, balance: wallet?.balance || 0,
        });
      }

      const unitNumber = (call.billing_interval_count || 0) + 1;
      const { coinsToCharge, creatorCoins, platformCoins, nextBillingAt: newNextBillingAt } =
        await chargeOneUnit(base44, call, wallet, unitNumber, now, planCfg);

      const newConsumed      = (call.coins_consumed || 0) + coinsToCharge;
      const newCreatorTotal  = (call.creator_revenue_coins || 0) + creatorCoins;
      const newPlatformTotal = (call.platform_revenue_coins || 0) + platformCoins;

      await base44.entities.VideoCall.update(call_id, {
        next_billing_at:        newNextBillingAt.toISOString(),
        billing_interval_count: unitNumber,
        coins_consumed:         newConsumed,
        creator_revenue_coins:  newCreatorTotal,
        platform_revenue_coins: newPlatformTotal,
      });

      return Response.json({
        success: true, billed: true,
        plan:                 planCfg.plan,
        coins_billed:         coinsToCharge,
        creator_coins:        creatorCoins,
        platform_coins:       platformCoins,
        unit:                 unitNumber,
        coins_consumed_total: newConsumed,
        next_billing_at:      newNextBillingAt.toISOString(),
        balance_after:        wallet.balance - coinsToCharge,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('videoCallBilling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});