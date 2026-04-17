import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, ArrowRight } from "lucide-react";

// デフォルトの還元率テーブル（マスタDBが空の場合のフォールバック）
const DEFAULT_TIERS = [
  { threshold_yen: 0,          rate_percent: 85, label: "基本" },
  { threshold_yen: 1000000,    rate_percent: 86, label: "STEP 2" },
  { threshold_yen: 3000000,    rate_percent: 87, label: "STEP 3" },
  { threshold_yen: 6000000,    rate_percent: 88, label: "STEP 4" },
  { threshold_yen: 9000000,    rate_percent: 89, label: "STEP 5" },
  { threshold_yen: 12000000,   rate_percent: 90, label: "STEP 6" },
  { threshold_yen: 15000000,   rate_percent: 91, label: "STEP 7" },
  { threshold_yen: 16500000,   rate_percent: 92, label: "STEP 8" },
  { threshold_yen: 18000000,   rate_percent: 93, label: "STEP 9" },
  { threshold_yen: 19500000,   rate_percent: 94, label: "STEP 10" },
  { threshold_yen: 20000000,   rate_percent: 95, label: "MAX" },
];

function getRateForRevenue(tiers, revenueYen) {
  const sorted = [...tiers].sort((a, b) => b.threshold_yen - a.threshold_yen);
  const matched = sorted.find(t => revenueYen > t.threshold_yen);
  return matched || tiers[0];
}

function getNextTier(tiers, revenueYen) {
  const sorted = [...tiers].sort((a, b) => a.threshold_yen - b.threshold_yen);
  return sorted.find(t => t.threshold_yen > revenueYen) || null;
}

export default function ProgressiveRateStatus({ channelId, currentMonthRevenueYen = 0 }) {
  const { data: masterTiers = [] } = useQuery({
    queryKey: ["progressive-rate-master"],
    queryFn: () => base44.entities.ProgressiveRateMaster.filter({ is_active: true }, "sort_order"),
  });

  const tiers = masterTiers.length > 0 ? masterTiers : DEFAULT_TIERS;
  const currentTier = getRateForRevenue(tiers, currentMonthRevenueYen);
  const nextTier = getNextTier(tiers, currentMonthRevenueYen);
  const remaining = nextTier ? nextTier.threshold_yen - currentMonthRevenueYen : 0;

  return (
    <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm">プログレッシブ・インセンティブ</p>
      </div>

      {/* 今月の累計 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">今月の累計収益</p>
          <p className="text-2xl font-black text-foreground">
            ¥{currentMonthRevenueYen.toLocaleString()}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">来月の予定還元率</p>
          <p className="text-3xl font-black text-primary">{currentTier.rate_percent}%</p>
        </div>
      </div>

      {/* 次のティアまで */}
      {nextTier ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-sm">
            <ArrowRight className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-amber-300 font-bold">
              あと <span className="text-xl font-black text-amber-400">¥{remaining.toLocaleString()}</span> で来月の還元率が{" "}
              <span className="text-amber-400 font-black">+1%（{nextTier.rate_percent}%）</span> にアップ！
            </p>
          </div>
          {/* プログレスバー */}
          <div className="mt-3 h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
              style={{
                width: `${Math.min(100, (currentMonthRevenueYen / nextTier.threshold_yen) * 100)}%`,
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>¥{currentTier.threshold_yen.toLocaleString()}</span>
            <span>¥{nextTier.threshold_yen.toLocaleString()}</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-center">
          <p className="text-amber-400 font-black">👑 最高ティア（95%）達成中！</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        ※ 毎月末日の月間収益に基づき、翌月の還元率が自動更新されます
      </p>
    </div>
  );
}