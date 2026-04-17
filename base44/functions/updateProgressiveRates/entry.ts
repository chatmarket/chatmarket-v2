/**
 * updateProgressiveRates
 * 毎月1日 0:00 JST に実行するバッチ。
 * 前月の実績に基づき、各チャンネルの当月適用還元率を自動更新する。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// デフォルトの還元率テーブル（マスタDBが空の場合のフォールバック）
const DEFAULT_TIERS = [
  { threshold_yen: 0,          rate_percent: 85 },
  { threshold_yen: 1000000,    rate_percent: 86 },
  { threshold_yen: 3000000,    rate_percent: 87 },
  { threshold_yen: 6000000,    rate_percent: 88 },
  { threshold_yen: 9000000,    rate_percent: 89 },
  { threshold_yen: 12000000,   rate_percent: 90 },
  { threshold_yen: 15000000,   rate_percent: 91 },
  { threshold_yen: 16500000,   rate_percent: 92 },
  { threshold_yen: 18000000,   rate_percent: 93 },
  { threshold_yen: 19500000,   rate_percent: 94 },
  { threshold_yen: 20000000,   rate_percent: 95 },
];

function getRateForRevenue(tiers, revenueYen) {
  const sorted = [...tiers].sort((a, b) => b.threshold_yen - a.threshold_yen);
  const matched = sorted.find(t => revenueYen > t.threshold_yen);
  return matched ? matched.rate_percent : tiers[0].rate_percent;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // 認証チェック（スケジューラー or admin のみ許可）
  const user = await base44.auth.me().catch(() => null);
  if (user && user.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 先月の期間を算出
  const now = new Date();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStr = `${lastMonthStart.getFullYear()}-${String(lastMonthStart.getMonth() + 1).padStart(2, '0')}`;

  // マスタティアを取得（なければデフォルト使用）
  const masterTiers = await base44.asServiceRole.entities.ProgressiveRateMaster.filter({ is_active: true });
  const tiers = masterTiers.length > 0 ? masterTiers : DEFAULT_TIERS;

  // 全チャンネルを取得
  const channels = await base44.asServiceRole.entities.Channel.list();

  let updatedCount = 0;
  const errors = [];

  for (const channel of channels) {
    try {
      // 先月の CreatorEarning を集計（コイン × 1.1 = 円換算）
      const earnings = await base44.asServiceRole.entities.CreatorEarning.filter({
        channel_id: channel.id,
      });

      const lastMonthEarnings = earnings.filter(e => {
        const d = new Date(e.created_date);
        return d >= lastMonthStart && d < lastMonthEnd;
      });

      const totalYen = lastMonthEarnings.reduce((sum, e) => sum + (e.yen_equivalent || (e.coin_amount * 1.1)), 0);

      const newRate = getRateForRevenue(tiers, totalYen);

      // チャンネルの還元率を更新
      await base44.asServiceRole.entities.Channel.update(channel.id, {
        progressive_rate: newRate / 100,
        monthly_revenue_coins: Math.floor(totalYen / 1.1),
        rate_applied_month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      });

      updatedCount++;
    } catch (err) {
      errors.push({ channelId: channel.id, error: err.message });
    }
  }

  return Response.json({
    success: true,
    applied_month: lastMonthStr,
    updated_channels: updatedCount,
    total_channels: channels.length,
    errors,
    timestamp: new Date().toISOString(),
  });
});