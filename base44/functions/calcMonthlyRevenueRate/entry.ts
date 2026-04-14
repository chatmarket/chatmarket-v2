/**
 * calcMonthlyRevenueRate
 *
 * 月間売上を集計し、翌月の還元率フラグ（progressive_rate）をチャンネルに保存する。
 * action="calc"  → 当月の売上を集計してチャンネルに月間実績を保存
 * action="apply" → 集計済みの月間売上に基づき翌月の還元率を一斉適用
 *
 * 集計対象: YellCoinTransaction (type="send") の当月分合計
 * 最低料金ガード:
 *   還元率 >= 90%: ライブ最低価格 15分175コイン以上を強制
 *   還元率 = 95%:  ライブ最低価格 15分200コイン以上を強制
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const TIERS = [
  { threshold: 20000000, rate: 0.95 },
  { threshold: 19500000, rate: 0.94 },
  { threshold: 18000000, rate: 0.93 },
  { threshold: 16500000, rate: 0.92 },
  { threshold: 15000000, rate: 0.91 },
  { threshold: 12000000, rate: 0.90 },
  { threshold:  9000000, rate: 0.89 },
  { threshold:  6000000, rate: 0.88 },
  { threshold:  3000000, rate: 0.87 },
  { threshold:  1000000, rate: 0.86 },
];
const BASE_RATE = 0.85;

function getRate(monthlyCoins) {
  for (const tier of TIERS) {
    if (monthlyCoins >= tier.threshold) return tier.rate;
  }
  return BASE_RATE;
}

/** 還元率に応じたライブ最低価格（15分あたりコイン）*/
function minLivePer15(rate) {
  if (rate >= 0.95) return 200;
  if (rate >= 0.90) return 175;
  return 150;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'calc';

    const now = new Date();

    // ── action: calc ── 当月売上を集計して各チャンネルに保存
    if (action === 'calc') {
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();

      // 全チャンネルを取得
      const channels = await base44.asServiceRole.entities.Channel.list();

      let updated = 0;
      for (const ch of channels) {
        if (!ch.owner_email) continue;

        // このチャンネルオーナーの当月消費コイン（channel_owner_email で絞り込み）
        const txns = await base44.asServiceRole.entities.YellCoinTransaction.filter({
          channel_owner_email: ch.owner_email,
          type: 'send',
        });

        const monthlyCoins = txns
          .filter(t => t.created_date >= monthStart && t.created_date <= monthEnd)
          .reduce((s, t) => s + (t.amount || 0), 0);

        const rate         = getRate(monthlyCoins);
        const minLive      = minLivePer15(rate);

        await base44.asServiceRole.entities.Channel.update(ch.id, {
          monthly_revenue_coins: monthlyCoins,
          progressive_rate:      rate,
          live_min_per_15min:    minLive,
        });
        updated++;
      }

      return Response.json({ success: true, action: 'calc', channels_updated: updated, month: monthStart.slice(0, 7) });
    }

    // ── action: apply ── 翌月の還元率を一斉適用（calcの直後に呼ぶ）
    if (action === 'apply') {
      const channels = await base44.asServiceRole.entities.Channel.list();
      let applied = 0;
      for (const ch of channels) {
        if (ch.progressive_rate == null) continue;
        // progressive_rate はすでにcalcで最新値に更新済み
        // 翌月適用済みフラグを立てる
        await base44.asServiceRole.entities.Channel.update(ch.id, {
          rate_applied_month: now.toISOString().slice(0, 7),
        });
        applied++;
      }
      return Response.json({ success: true, action: 'apply', applied });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('calcMonthlyRevenueRate error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});