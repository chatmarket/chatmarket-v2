/**
 * videoCallBilling
 *
 * 確定仕様（2026-04）:
 *   全ユニット: 150エールコイン / 15分（業界最安値・固定）
 *   ライバー還元率: 85%（127.5円相当）
 *   運営手数料（Admin）: 15%（22.5円）— 必ずシステム側で控除
 *   インフラ原価補填: 運営15%（22.5円）を上回るインフラコストはBasicプランMRRから補填
 *   通信方式: WebRTC P2P優先（コスト0）、NAT越え失敗時はTURN（約¥2/分）
 *
 * POST body: { call_id: string, action: "tick" | "end" | "check_next" }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const COINS_PER_15MIN     = 150;    // 全ユニット統一価格
const CREATOR_RATE        = 0.85;   // ライバー還元率85%
const PLATFORM_RATE       = 0.15;   // 運営手数料15%（Admin絶対確保）
const TURN_COST_PER_MIN   = 2;      // TURN fallback使用時の実費（円/分）
const P2P_SUCCESS_RATE    = 0.80;   // P2P成功率80%想定 → 実効コスト = ×0.20
// 1ユニット(15分)の期待インフラコスト = 15分 × ¥2 × 20% = ¥6
// 運営収益 = 150 × 15% = ¥22.5 → ¥22.5 - ¥6 = 約¥16.5 の純利益

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
    if (action === 'check_next') {
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];
      const balance = wallet?.balance || 0;
      return Response.json({
        success: true,
        balance,
        next_unit_cost: COINS_PER_15MIN,
        has_enough: balance >= COINS_PER_15MIN,
      });
    }

    // ── action: end ── 通話終了・精算
    if (action === 'end') {
      const billingStart = call.billing_started_at ? new Date(call.billing_started_at) : now;
      const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
      const consumedCoins = call.coins_consumed || 0;

      // 分配計算（Admin15%絶対確保）
      const creatorRevenueCoins  = Math.floor(consumedCoins * CREATOR_RATE);   // 85%
      const platformRevenueCoins = consumedCoins - creatorRevenueCoins;        // 残り15%（端数もAdminへ）

      // インフラコスト試算（P2P成功率考慮）
      const expectedCommCostYen = Math.round(actualMinutes * TURN_COST_PER_MIN * (1 - P2P_SUCCESS_RATE));
      const platformRevenueYen  = Math.round(platformRevenueCoins); // 1コイン=1円
      const platformProfitYen   = platformRevenueYen - expectedCommCostYen;

      await base44.entities.VideoCall.update(call_id, {
        status:                  'ended',
        actual_duration_minutes: actualMinutes,
        comm_cost_yen:           expectedCommCostYen,
        platform_revenue_coins:  platformRevenueCoins,
        creator_revenue_coins:   creatorRevenueCoins,
        platform_profit_yen:     platformProfitYen,
      });

      return Response.json({
        success: true,
        actual_minutes:         actualMinutes,
        coins_consumed:         consumedCoins,
        creator_revenue_coins:  creatorRevenueCoins,
        platform_revenue_coins: platformRevenueCoins,
        platform_profit_yen:    platformProfitYen,
        comm_cost_yen:          expectedCommCostYen,
      });
    }

    // ── action: tick ── 毎分フロントから呼ぶ課金タイマー
    if (action === 'tick') {

      // ── 最初のユニット（課金開始）──
      if (!call.billing_started_at) {
        const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
        const wallet = wallets[0];

        if (!wallet || wallet.balance < COINS_PER_15MIN) {
          await base44.entities.VideoCall.update(call_id, { auto_disconnected: true, status: 'ended' });
          return Response.json({
            success: false, reason: 'insufficient_balance',
            required: COINS_PER_15MIN, balance: wallet?.balance || 0, auto_disconnected: true,
          });
        }

        const nextBillingAt = new Date(now.getTime() + 15 * 60 * 1000);

        // コイン消費（発信者ウォレット）
        await base44.entities.YellCoinWallet.update(wallet.id, {
          balance:    wallet.balance - COINS_PER_15MIN,
          total_sent: (wallet.total_sent || 0) + COINS_PER_15MIN,
        });

        // トランザクション記録
        await base44.entities.YellCoinTransaction.create({
          user_email:          call.caller_email,
          type:                'send',
          service_type:        'direct_chat',
          service_id:          call_id,
          amount:              COINS_PER_15MIN,
          target_name:         call.callee_name,
          target_id:           call.callee_channel_id,
          channel_id:          call.callee_channel_id,
          channel_owner_email: call.callee_email,
          message:             '1対1ビデオ通話（第1ユニット）ライバー85% / Admin15%',
        });

        // ミリオネア・チャレンジ集計（全額を月間集計に加算）
        if (call.callee_channel_id) {
          const channels = await base44.entities.Channel.filter({ id: call.callee_channel_id });
          const ch = channels[0];
          if (ch) {
            await base44.entities.Channel.update(call.callee_channel_id, {
              monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + COINS_PER_15MIN,
            });
          }
        }

        await base44.entities.VideoCall.update(call_id, {
          billing_started_at:     now.toISOString(),
          next_billing_at:        nextBillingAt.toISOString(),
          billing_interval_count: 1,
          coins_consumed:         COINS_PER_15MIN,
        });

        return Response.json({
          success: true, billed: true,
          coins_billed:         COINS_PER_15MIN,
          unit:                 1,
          next_billing_at:      nextBillingAt.toISOString(),
          balance_after:        wallet.balance - COINS_PER_15MIN,
          coins_consumed_total: COINS_PER_15MIN,
          creator_coins:        Math.floor(COINS_PER_15MIN * CREATOR_RATE),
          platform_coins:       COINS_PER_15MIN - Math.floor(COINS_PER_15MIN * CREATOR_RATE),
        });
      }

      // ── 次回課金タイムチェック ──
      const nextBillingAt = call.next_billing_at ? new Date(call.next_billing_at) : null;
      if (!nextBillingAt || now < nextBillingAt) {
        return Response.json({
          success: true, billed: false,
          seconds_until_next_billing: nextBillingAt ? Math.max(0, Math.ceil((nextBillingAt - now) / 1000)) : 900,
          coins_consumed_total: call.coins_consumed || 0,
          unit: call.billing_interval_count || 1,
        });
      }

      // ── 15分経過 → 次ユニット課金 ──
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: call.caller_email });
      const wallet = wallets[0];

      if (!wallet || wallet.balance < COINS_PER_15MIN) {
        const billingStart  = new Date(call.billing_started_at);
        const actualMinutes = Math.ceil((now - billingStart) / 1000 / 60);
        const consumedCoins = call.coins_consumed || 0;
        const creatorCoins  = Math.floor(consumedCoins * CREATOR_RATE);
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
          required: COINS_PER_15MIN, balance: wallet?.balance || 0,
        });
      }

      const unitNumber       = (call.billing_interval_count || 0) + 1;
      const newNextBillingAt = new Date(nextBillingAt.getTime() + 15 * 60 * 1000);

      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance:    wallet.balance - COINS_PER_15MIN,
        total_sent: (wallet.total_sent || 0) + COINS_PER_15MIN,
      });

      await base44.entities.YellCoinTransaction.create({
        user_email:          call.caller_email,
        type:                'send',
        service_type:        'direct_chat',
        service_id:          call_id,
        amount:              COINS_PER_15MIN,
        target_name:         call.callee_name,
        target_id:           call.callee_channel_id,
        channel_id:          call.callee_channel_id,
        channel_owner_email: call.callee_email,
        message:             `1対1ビデオ通話（第${unitNumber}ユニット）ライバー85% / Admin15%`,
      });

      // ミリオネア・チャレンジ集計
      if (call.callee_channel_id) {
        const channels = await base44.entities.Channel.filter({ id: call.callee_channel_id });
        const ch = channels[0];
        if (ch) {
          await base44.entities.Channel.update(call.callee_channel_id, {
            monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + COINS_PER_15MIN,
          });
        }
      }

      const newConsumed = (call.coins_consumed || 0) + COINS_PER_15MIN;

      await base44.entities.VideoCall.update(call_id, {
        next_billing_at:        newNextBillingAt.toISOString(),
        billing_interval_count: unitNumber,
        coins_consumed:         newConsumed,
      });

      return Response.json({
        success: true, billed: true,
        coins_billed:         COINS_PER_15MIN,
        unit:                 unitNumber,
        coins_consumed_total: newConsumed,
        next_billing_at:      newNextBillingAt.toISOString(),
        balance_after:        wallet.balance - COINS_PER_15MIN,
        creator_coins:        Math.floor(COINS_PER_15MIN * CREATOR_RATE),
        platform_coins:       COINS_PER_15MIN - Math.floor(COINS_PER_15MIN * CREATOR_RATE),
      });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('videoCallBilling error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});