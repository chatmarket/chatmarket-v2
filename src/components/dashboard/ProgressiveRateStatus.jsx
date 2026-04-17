import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp, ArrowRight } from "lucide-react";
import { getLang, translations } from "@/lib/i18n";

// ─── 共通ロジック（Single Source of Truth）──────────────────────────────────
// しきい値はすべてJPY基準。海外ライバーの収益も決済時にJPY換算済みで渡すこと。
const DEFAULT_TIERS = [
  { threshold_yen: 0,          rate_percent: 85, label: "STEP 1" },
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

export function getRateForRevenue(tiers, revenueYen) {
  const sorted = [...tiers].sort((a, b) => b.threshold_yen - a.threshold_yen);
  return sorted.find(t => revenueYen > t.threshold_yen) || tiers[0];
}

export function getNextTier(tiers, revenueYen) {
  const sorted = [...tiers].sort((a, b) => a.threshold_yen - b.threshold_yen);
  return sorted.find(t => t.threshold_yen > revenueYen) || null;
}
// ────────────────────────────────────────────────────────────────────────────

// 動的文言を組み立てるヘルパー（{remaining}・{nextRate} をプログラムから注入）
function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
}

// JPY金額を現在の言語に合わせてフォーマット
function formatAmount(amountJpy, lang) {
  if (lang === "en") {
    // 表示は JPY のまま（換算レート未設定のため固定表示）
    return `¥${amountJpy.toLocaleString()} JPY`;
  }
  if (lang === "ko") {
    return `¥${amountJpy.toLocaleString()} JPY`;
  }
  return `¥${amountJpy.toLocaleString()}`;
}

export default function ProgressiveRateStatus({ currentMonthRevenueYen = 0 }) {
  const lang = getLang();
  const tr = translations[lang] || translations["ja"];

  const { data: masterTiers = [] } = useQuery({
    queryKey: ["progressive-rate-master"],
    queryFn: () => base44.entities.ProgressiveRateMaster.filter({ is_active: true }, "sort_order"),
  });

  const tiers = masterTiers.length > 0 ? masterTiers : DEFAULT_TIERS;
  const currentTier = getRateForRevenue(tiers, currentMonthRevenueYen);
  const nextTier = getNextTier(tiers, currentMonthRevenueYen);
  const remaining = nextTier ? nextTier.threshold_yen - currentMonthRevenueYen : 0;

  // 動的メッセージ（言語ファイルのテンプレートに数値を注入）
  const nextTierMsg = nextTier
    ? interpolate(tr.progressive_next_tier_msg || "あと {remaining} で {nextRate}% にアップ！", {
        remaining: formatAmount(remaining, lang),
        nextRate: nextTier.rate_percent,
      })
    : null;

  return (
    <div className="bg-card border border-primary/30 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-4 h-4 text-primary" />
        <p className="font-bold text-sm">{tr.progressive_title || "プログレッシブ・インセンティブ"}</p>
      </div>

      {/* 今月の累計 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {tr.progressive_monthly_revenue || "今月の累計収益"}
          </p>
          <p className="text-2xl font-black text-foreground">
            {formatAmount(currentMonthRevenueYen, lang)}
          </p>
        </div>
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">
            {tr.progressive_next_rate || "来月の予定還元率"}
          </p>
          <p className="text-3xl font-black text-primary">{currentTier.rate_percent}%</p>
        </div>
      </div>

      {/* 次のティアまで */}
      {nextTier ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-start gap-2 text-sm">
            <ArrowRight className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300 font-bold">{nextTierMsg}</p>
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
            <span>{formatAmount(currentTier.threshold_yen, lang)}</span>
            <span>{formatAmount(nextTier.threshold_yen, lang)}</span>
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4 text-center">
          <p className="text-amber-400 font-black">
            {tr.progressive_max_tier || "👑 最高ティア（95%）達成中！"}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          {tr.progressive_note || "※ 毎月末日の月間収益に基づき、翌月の還元率が自動更新されます"}
        </p>
        {lang !== "ja" && (
          <p className="text-xs text-muted-foreground">
            {tr.progressive_currency_note}
          </p>
        )}
      </div>
    </div>
  );
}