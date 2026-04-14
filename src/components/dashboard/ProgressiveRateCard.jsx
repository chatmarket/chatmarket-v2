/**
 * ProgressiveRateCard
 * 配信者ダッシュボード用: 現在の還元率・月間売上・次ランクまでのプログレスバー
 */
import React from "react";
import { TrendingUp, Zap, Crown } from "lucide-react";

const TIERS = [
  { threshold:        0, rate: 0.85, label: "85%（基本）" },
  { threshold:  1000000, rate: 0.86, label: "86%" },
  { threshold:  3000000, rate: 0.87, label: "87%" },
  { threshold:  6000000, rate: 0.88, label: "88%" },
  { threshold:  9000000, rate: 0.89, label: "89%" },
  { threshold: 12000000, rate: 0.90, label: "90%" },
  { threshold: 15000000, rate: 0.91, label: "91%" },
  { threshold: 16500000, rate: 0.92, label: "92%" },
  { threshold: 18000000, rate: 0.93, label: "93%" },
  { threshold: 19500000, rate: 0.94, label: "94%" },
  { threshold: 20000000, rate: 0.95, label: "95%（最高）" },
];

function getCurrentTierIndex(coins) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (coins >= TIERS[i].threshold) return i;
  }
  return 0;
}

function minLivePer15(rate) {
  if (rate >= 0.95) return 200;
  if (rate >= 0.90) return 175;
  return 150;
}

export default function ProgressiveRateCard({ channel }) {
  const monthlyCoins = channel?.monthly_revenue_coins || 0;
  const currentIdx   = getCurrentTierIndex(monthlyCoins);
  const currentTier  = TIERS[currentIdx];
  const nextTier     = TIERS[currentIdx + 1] || null;
  const isMax        = currentIdx === TIERS.length - 1;
  const rate         = channel?.progressive_rate || currentTier.rate;
  const minLive      = minLivePer15(rate);

  // プログレス計算
  const from     = currentTier.threshold;
  const to       = nextTier?.threshold || from;
  const progress = isMax ? 100 : Math.min(100, Math.floor(((monthlyCoins - from) / (to - from)) * 100));
  const remaining = isMax ? 0 : to - monthlyCoins;

  const rateColor =
    rate >= 0.95 ? "text-yellow-400" :
    rate >= 0.90 ? "text-orange-400" :
    rate >= 0.86 ? "text-blue-400"   : "text-primary";

  const barColor =
    rate >= 0.95 ? "bg-yellow-400" :
    rate >= 0.90 ? "bg-orange-400" :
    rate >= 0.86 ? "bg-blue-400"   : "bg-primary";

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {rate >= 0.90 ? <Crown className="w-5 h-5 text-yellow-400" /> : <TrendingUp className="w-5 h-5 text-primary" />}
          <h3 className="font-bold text-sm">プログレッシブ還元率</h3>
        </div>
        <span className={`text-2xl font-black ${rateColor}`}>{Math.round(rate * 100)}%</span>
      </div>

      {/* 月間売上 */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>当月コイン消費合計</span>
        <span className="font-bold text-foreground">{monthlyCoins.toLocaleString()} コイン</span>
      </div>

      {/* プログレスバー */}
      {!isMax && nextTier && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>現在: {currentTier.label}</span>
            <span>次: {nextTier.label}（あと {remaining.toLocaleString()} コイン）</span>
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-right">{progress}% 達成</p>
        </div>
      )}

      {isMax && (
        <div className="flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2 text-xs text-yellow-400">
          <Crown className="w-4 h-4 shrink-0" />
          最高還元率 95%（トップライバー）達成中！
        </div>
      )}

      {/* 最低価格ガード情報 */}
      <div className={`rounded-lg px-3 py-2 text-[11px] space-y-0.5 ${rate >= 0.90 ? "bg-orange-500/10 border border-orange-500/20 text-orange-300" : "bg-secondary text-muted-foreground"}`}>
        <p className="flex items-center gap-1">
          <Zap className="w-3 h-3 shrink-0" />
          <span className="font-semibold">還元率連動・最低ライブ価格:</span>
          {" "}<span className="font-bold">{minLive}コイン / 15分</span>
          {rate >= 0.90 && <span className="text-orange-400 font-bold ml-1">（高還元率ガード適用中）</span>}
        </p>
        <p>翌月1日に当月実績を基に自動更新されます。</p>
      </div>

      {/* 全ティア一覧（小さく） */}
      <div className="grid grid-cols-5 gap-1">
        {TIERS.map((t, i) => (
          <div
            key={t.rate}
            className={`text-center rounded-lg py-1 text-[10px] font-bold ${
              i === currentIdx
                ? `${barColor} text-white`
                : i < currentIdx
                ? "bg-secondary/80 text-primary/60"
                : "bg-secondary text-muted-foreground/50"
            }`}
          >
            {Math.round(t.rate * 100)}%
          </div>
        ))}
      </div>
    </div>
  );
}