/**
 * videoCallBilling
 *
 * 1対1ビデオ通話の15分インターバル課金（前払い）を処理するバックエンド関数。
 *
 * 経済定義（確定版）:
 *   1エールコイン       = 1円
 *   最低料金            500コイン / 15分
 *   ライバー報酬        消費コインの 85%
 *   運営収益            消費コインの 15%
 *   Chime通信実費       4円 / 分（双方向）
 *   録画費              2円 / 分
 *   運営純利益          運営収益(円) − 通信実費 − 録画費
 *
 * POST body: { call_id: string, action: "tick" | "end" }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COINS_PER_15MIN   = 500;   // 最低設定（15分）
const COMM_COST_PER_MIN = 4;     // Chime通信実費（円/分）
const REC_COST_PER_MIN  = 2;     // 録画費（円/分）
const PLATFORM_FEE_RATE = 0.15;
const CREATOR_SHARE_RATE = 0.85;
const COIN_TO_YEN       = 1;     // 確定: 1コイン = 1円

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

    // ── action: end ── 通話終了時の精算
    if (action === 'end') {
      const billingStart = call.billing_started_at ? new Date(call.billing_started_at) : now;
      const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
      const recordingMinutes = call.recording_minutes || 0;

      const commCost    = actualMinutes * COMM_COST_PER_MIN;
      const recCost     = recordingMinutes * REC_COST_PER_MIN;
      const totalCost   = commCost + recCost;

      const consumedCoins          = call.coins_consumed || 0;
      const platformRevenueCoins   = Math.floor(consumedCoins * PLATFORM_FEE_RATE);
      const creatorRevenueCoins    = Math.floor(consumedCoins * CREATOR_SHARE_RATE);
      const platformRevenueYen     = platformRevenueCoins * COIN_TO_YEN;
      const platformProfit         = platformRevenueYen - totalCost;

      await base44.entities.VideoCall.update(call_id, {
        status:                   'ended',
        actual_duration_minutes:  actualMinutes,
        comm_cost_yen:            commCost,
        platform_revenue_coins:   platformRevenueCoins,
        creator_revenue_coins:    creatorRevenueCoins,
        platform_profit_yen:      platformProfit,
      });

      return Response.json({
        success: true,
        actual_minutes:           actualMinutes,
        coins_consumed:           consumedCoins,
        comm_cost_yen:            commCost,
        rec_cost_yen:             recCost,
        platform_revenue_coins:   platformRevenueCoins,
        platform_profit_yen:      platformProfit,
      });
    }

    // ── action: tick ── 課金タイマー（毎分フロントから呼ぶ）
    if (action === 'tick') {
      const coinPer15 = Math.max(call.coin_price_per_15min || COINS_PER_15MIN, COINS_PER_15MIN);

      // 課金開始していない → 最初の15分を即時消費
      if (!call.billing_started_at) {
        const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
        const wallet = wallets[0];

        if (!wallet || wallet.balance < coinPer15) {
          await base44.entities.VideoCall.update(call_id, { auto_disconnected: true, status: 'ended' });
          return Response.json({
            success: false, reason: 'insufficient_balance',
            required: coinPer15, balance: wallet?.balance || 0, auto_disconnected: true,
          });
        }

        const nextBillingAt = new Date(now.getTime() + 15 * 60 * 1000);
        await base44.entities.YellCoinWallet.update(wallet.id, {
          balance:    wallet.balance - coinPer15,
          total_sent: (wallet.total_sent || 0) + coinPer15,
        });
        await base44.entities.YellCoinTransaction.create({
          user_email:           call.caller_email,
          type:                 'send',
          service_type:         'direct_chat',
          service_id:           call_id,
          amount:               coinPer15,
          target_name:          call.callee_name,
          target_id:            call.callee_channel_id,
          channel_id:           call.callee_channel_id,
          channel_owner_email:  call.callee_email,
          message:              `1対1ビデオ通話（最初の15分）`,
        });
        await base44.entities.VideoCall.update(call_id, {
          billing_started_at:     now.toISOString(),
          next_billing_at:        nextBillingAt.toISOString(),
          billing_interval_count: 1,
          coins_consumed:         coinPer15,
        });

        return Response.json({
          success: true, billed: true, coins_billed: coinPer15,
          next_billing_at: nextBillingAt.toISOString(),
          balance_after: wallet.balance - coinPer15,
        });
      }

      // 次回課金タイムチェック
      const nextBillingAt = call.next_billing_at ? new Date(call.next_billing_at) : null;
      if (!nextBillingAt || now < nextBillingAt) {
        const secondsUntilBilling = Math.max(0, Math.ceil((nextBillingAt - now) / 1000));
        return Response.json({
          success: true, billed: false,
          seconds_until_next_billing: secondsUntilBilling,
          coins_consumed_total: call.coins_consumed || 0,
        });
      }

      // 15分インターバル → 次の15分分を課金
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];

      if (!wallet || wallet.balance < coinPer15) {
        const billingStart   = new Date(call.billing_started_at);
        const actualMinutes  = Math.ceil((now - billingStart) / 1000 / 60);
        const recMin         = call.recording_minutes || 0;
        const commCost       = actualMinutes * COMM_COST_PER_MIN;
        const recCost        = recMin * REC_COST_PER_MIN;
        const consumedCoins  = call.coins_consumed || 0;
        const platRevCoins   = Math.floor(consumedCoins * PLATFORM_FEE_RATE);
        const creatRevCoins  = Math.floor(consumedCoins * CREATOR_SHARE_RATE);
        const platProfit     = platRevCoins * COIN_TO_YEN - commCost - recCost;

        await base44.entities.VideoCall.update(call_id, {
          auto_disconnected:        true,
          status:                   'ended',
          actual_duration_minutes:  actualMinutes,
          comm_cost_yen:            commCost,
          platform_revenue_coins:   platRevCoins,
          creator_revenue_coins:    creatRevCoins,
          platform_profit_yen:      platProfit,
        });
        return Response.json({
          success: false, reason: 'insufficient_balance', auto_disconnected: true,
          required: coinPer15, balance: wallet?.balance || 0,
        });
      }

      const newNextBillingAt = new Date(nextBillingAt.getTime() + 15 * 60 * 1000);
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance:    wallet.balance - coinPer15,
        total_sent: (wallet.total_sent || 0) + coinPer15,
      });
      await base44.entities.YellCoinTransaction.create({
        user_email:           call.caller_email,
        type:                 'send',
        service_type:         'direct_chat',
        service_id:           call_id,
        amount:               coinPer15,
        target_name:          call.callee_name,
        target_id:            call.callee_channel_id,
        channel_id:           call.callee_channel_id,
        channel_owner_email:  call.callee_email,
        message:              `1対1ビデオ通話（${(call.billing_interval_count || 0) + 1}回目の15分）`,
      });

      const newConsumed = (call.coins_consumed || 0) + coinPer15;
      await base44.entities.VideoCall.update(call_id, {
        next_billing_at:        newNextBillingAt.toISOString(),
        billing_interval_count: (call.billing_interval_count || 0) + 1,
        coins_consumed:         newConsumed,
      });

      return Response.json({
        success: true, billed: true, coins_billed: coinPer15,
        coins_consumed_total: newConsumed,
        next_billing_at: newNextBillingAt.toISOString(),
        balance_after: wallet.balance - coinPer15,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('videoCallBilling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});