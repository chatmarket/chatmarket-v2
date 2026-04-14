/**
 * videoCallBilling
 *
 * ステップアップ課金:
 *   第1ユニット (0〜15分):   150コイン  ← 新規獲得特別価格
 *   第2ユニット以降 (16分〜): 500コイン / 15分
 *
 * 経済定義（確定版）:
 *   1エールコイン       = 1円
 *   ライバー報酬        消費コインの creator_share_rate (85〜95%)
 *   運営収益            消費コインの (1 - creator_share_rate)
 *   Chime通信実費       4円 / 分（双方向）
 *   録画費              2円 / 分
 *
 * POST body: { call_id: string, action: "tick" | "end" | "check_next" }
 *   check_next: 12分経過時点で次ユニット残高チェックのみ行う（課金なし）
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const FIRST_UNIT_COINS  = 150;   // 第1ユニット特別価格
const NORMAL_COINS      = 500;   // 第2ユニット以降の通常価格
const COMM_COST_PER_MIN = 4;     // Chime通信実費（円/分）
const REC_COST_PER_MIN  = 2;     // 録画費（円/分）
const COIN_TO_YEN       = 1;     // 確定: 1コイン = 1円

function getCreatorShareRate(call) {
  // VideoCallレコードに保存されている還元率を使用（なければ0.85）
  return call.creator_share_rate || 0.85;
}

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
    const creatorShareRate = getCreatorShareRate(call);
    const platformFeeRate  = 1 - creatorShareRate;

    // ── action: check_next ── 12分経過時点の残高警告チェック（課金なし）
    if (action === 'check_next') {
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];
      const balance = wallet?.balance || 0;
      const isFirstUnit = (call.billing_interval_count || 0) === 0;
      // 次ユニットのコスト（第1ユニット後なら500、それ以降も500）
      const nextUnitCost = NORMAL_COINS;
      const hasEnough = balance >= nextUnitCost;
      return Response.json({
        success: true,
        balance,
        next_unit_cost: nextUnitCost,
        has_enough: hasEnough,
        is_first_unit: isFirstUnit,
      });
    }

    // ── action: end ── 通話終了時の精算
    if (action === 'end') {
      const billingStart = call.billing_started_at ? new Date(call.billing_started_at) : now;
      const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
      const recordingMinutes = call.recording_minutes || 0;

      const commCost    = actualMinutes * COMM_COST_PER_MIN;
      const recCost     = recordingMinutes * REC_COST_PER_MIN;
      const totalCost   = commCost + recCost;

      const consumedCoins        = call.coins_consumed || 0;
      const platformRevenueCoins = Math.floor(consumedCoins * platformFeeRate);
      const creatorRevenueCoins  = Math.floor(consumedCoins * creatorShareRate);
      const platformRevenueYen   = platformRevenueCoins * COIN_TO_YEN;
      const platformProfit       = platformRevenueYen - totalCost;

      await base44.entities.VideoCall.update(call_id, {
        status:                  'ended',
        actual_duration_minutes: actualMinutes,
        comm_cost_yen:           commCost,
        platform_revenue_coins:  platformRevenueCoins,
        creator_revenue_coins:   creatorRevenueCoins,
        platform_profit_yen:     platformProfit,
      });

      return Response.json({
        success: true,
        actual_minutes:          actualMinutes,
        coins_consumed:          consumedCoins,
        comm_cost_yen:           commCost,
        rec_cost_yen:            recCost,
        platform_revenue_coins:  platformRevenueCoins,
        platform_profit_yen:     platformProfit,
      });
    }

    // ── action: tick ── 課金タイマー（毎分フロントから呼ぶ）
    if (action === 'tick') {

      // 課金開始していない → 第1ユニット（150コイン）を即時消費
      if (!call.billing_started_at) {
        const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
        const wallet = wallets[0];

        if (!wallet || wallet.balance < FIRST_UNIT_COINS) {
          await base44.entities.VideoCall.update(call_id, { auto_disconnected: true, status: 'ended' });
          return Response.json({
            success: false, reason: 'insufficient_balance',
            required: FIRST_UNIT_COINS, balance: wallet?.balance || 0, auto_disconnected: true,
          });
        }

        const nextBillingAt = new Date(now.getTime() + 15 * 60 * 1000);
        await base44.entities.YellCoinWallet.update(wallet.id, {
          balance:    wallet.balance - FIRST_UNIT_COINS,
          total_sent: (wallet.total_sent || 0) + FIRST_UNIT_COINS,
        });
        await base44.entities.YellCoinTransaction.create({
          user_email:          call.caller_email,
          type:                'send',
          service_type:        'direct_chat',
          service_id:          call_id,
          amount:              FIRST_UNIT_COINS,
          target_name:         call.callee_name,
          target_id:           call.callee_channel_id,
          channel_id:          call.callee_channel_id,
          channel_owner_email: call.callee_email,
          message:             `1対1ビデオ通話（第1ユニット・特別価格）`,
        });
        // ミリオネア・チャレンジ集計: チャンネルの月間収益コインに加算
        if (call.callee_channel_id) {
          const channels = await base44.entities.Channel.filter({ id: call.callee_channel_id });
          const ch = channels[0];
          if (ch) {
            await base44.entities.Channel.update(call.callee_channel_id, {
              monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + FIRST_UNIT_COINS,
            });
          }
        }
        await base44.entities.VideoCall.update(call_id, {
          billing_started_at:     now.toISOString(),
          next_billing_at:        nextBillingAt.toISOString(),
          billing_interval_count: 1,
          coins_consumed:         FIRST_UNIT_COINS,
        });

        return Response.json({
          success: true, billed: true,
          coins_billed:    FIRST_UNIT_COINS,
          unit:            1,
          unit_label:      '第1ユニット（特別価格）',
          next_billing_at: nextBillingAt.toISOString(),
          balance_after:   wallet.balance - FIRST_UNIT_COINS,
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

      // 15分インターバル → 第2ユニット以降（500コイン）を課金
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];

      if (!wallet || wallet.balance < NORMAL_COINS) {
        const billingStart  = new Date(call.billing_started_at);
        const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
        const commCost      = actualMinutes * COMM_COST_PER_MIN;
        const consumedCoins = call.coins_consumed || 0;
        const platRevCoins  = Math.floor(consumedCoins * platformFeeRate);
        const creatRevCoins = Math.floor(consumedCoins * creatorShareRate);
        const platProfit    = platRevCoins * COIN_TO_YEN - commCost;

        await base44.entities.VideoCall.update(call_id, {
          auto_disconnected:       true,
          status:                  'ended',
          actual_duration_minutes: actualMinutes,
          comm_cost_yen:           commCost,
          platform_revenue_coins:  platRevCoins,
          creator_revenue_coins:   creatRevCoins,
          platform_profit_yen:     platProfit,
        });
        return Response.json({
          success: false, reason: 'insufficient_balance', auto_disconnected: true,
          required: NORMAL_COINS, balance: wallet?.balance || 0,
        });
      }

      const unitNumber      = (call.billing_interval_count || 0) + 1;
      const newNextBillingAt = new Date(nextBillingAt.getTime() + 15 * 60 * 1000);
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance:    wallet.balance - NORMAL_COINS,
        total_sent: (wallet.total_sent || 0) + NORMAL_COINS,
      });
      await base44.entities.YellCoinTransaction.create({
        user_email:          call.caller_email,
        type:                'send',
        service_type:        'direct_chat',
        service_id:          call_id,
        amount:              NORMAL_COINS,
        target_name:         call.callee_name,
        target_id:           call.callee_channel_id,
        channel_id:          call.callee_channel_id,
        channel_owner_email: call.callee_email,
        message:             `1対1ビデオ通話（第${unitNumber}ユニット）`,
      });
      // ミリオネア・チャレンジ集計: チャンネルの月間収益コインに加算
      if (call.callee_channel_id) {
        const channels = await base44.entities.Channel.filter({ id: call.callee_channel_id });
        const ch = channels[0];
        if (ch) {
          await base44.entities.Channel.update(call.callee_channel_id, {
            monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + NORMAL_COINS,
          });
        }
      }

      const newConsumed = (call.coins_consumed || 0) + NORMAL_COINS;
      await base44.entities.VideoCall.update(call_id, {
        next_billing_at:        newNextBillingAt.toISOString(),
        billing_interval_count: unitNumber,
        coins_consumed:         newConsumed,
      });

      return Response.json({
        success: true, billed: true,
        coins_billed:         NORMAL_COINS,
        unit:                 unitNumber,
        unit_label:           `第${unitNumber}ユニット（通常価格）`,
        coins_consumed_total: newConsumed,
        next_billing_at:      newNextBillingAt.toISOString(),
        balance_after:        wallet.balance - NORMAL_COINS,
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('videoCallBilling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});