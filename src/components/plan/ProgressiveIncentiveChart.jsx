import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { TrendingUp, Zap, ChevronDown, ChevronUp } from "lucide-react";

const TIERS = [
  { threshold: "〜100万", revenue: 100, rate: 85, label: "85%", color: "#10b981" },
  { threshold: "100万〜", revenue: 300, rate: 87, label: "87%", color: "#22d3ee" },
  { threshold: "300万〜", revenue: 600, rate: 89, label: "89%", color: "#60a5fa" },
  { threshold: "600万〜", revenue: 1000, rate: 91, label: "91%", color: "#a78bfa" },
  { threshold: "1000万〜", revenue: 2000, rate: 93, label: "93%", color: "#f59e0b" },
  { threshold: "2000万〜", revenue: 3000, rate: 95, label: "95%", color: "#ef4444" },
];

const CHART_DATA = TIERS.map((t) => ({
  name: t.threshold,
  rate: t.rate,
  color: t.color,
}));

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: "#0d1117", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 14px" }}>
        <p style={{ color: "#fff", fontWeight: 900, fontSize: 13 }}>{label}</p>
        <p style={{ color: payload[0].fill, fontWeight: 700, fontSize: 16 }}>還元率 {payload[0].value}%</p>
      </div>
    );
  }
  return null;
};

export default function ProgressiveIncentiveChart() {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #0a0e18 0%, #0d1a12 50%, #0a1628 100%)",
        border: "1px solid rgba(16,185,129,0.25)",
        borderRadius: 20,
        overflow: "hidden",
        boxShadow: "0 0 40px rgba(16,185,129,0.06)",
      }}
    >
      {/* ヘッダー（タップで開閉） */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.35)" }}>
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-black text-sm text-white flex items-center gap-2">
              プログレッシブ・インセンティブ
              <span style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.4)", color: "#10b981", fontSize: 10, fontWeight: 900, padding: "1px 6px", borderRadius: 99 }}>
                自動適用
              </span>
            </p>
            <p className="text-xs text-muted-foreground">売れば売るほど還元率が上がる — 最大 95%</p>
          </div>
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
        }
      </button>

      {/* 展開コンテンツ */}
      {open && (
        <div className="px-5 pb-6 space-y-5 border-t border-white/5">

          {/* リード文 */}
          <p className="text-sm text-white/70 leading-relaxed pt-4">
            ChatMarketでは、月間累計売上が増えるほど<span className="text-primary font-bold">収益還元率が自動でアップ</span>します。
            申請不要・計算不要。システムが毎月自動で最適な還元率を適用します。
          </p>

          {/* グラフ */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-widest">月間売上 vs 還元率</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={CHART_DATA} barCategoryGap="30%">
                <XAxis
                  dataKey="name"
                  tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[82, 96]}
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                  width={36}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <ReferenceLine y={85} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <Bar dataKey="rate" radius={[6, 6, 0, 0]} label={{ position: "top", fill: "#fff", fontSize: 11, fontWeight: 900, formatter: (v) => `${v}%` }}>
                  {CHART_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* ティアテーブル */}
          <div className="space-y-2">
            {TIERS.map((tier, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: tier.color }} />
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs text-white/60">月間売上 {tier.threshold}円</span>
                  <span className="text-xs font-black" style={{ color: tier.color }}>還元率 {tier.label}</span>
                </div>
                <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${((tier.rate - 84) / 11) * 100}%`, background: tier.color, transition: "width 0.5s" }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* 注意書き */}
          <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-xs text-white/40 leading-relaxed"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <Zap className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/50" />
            毎月1日に前月の累計売上を集計し、翌月の還元率を自動更新。手数料3.6%・インフラコスト控除後の金額が対象です。
          </div>
        </div>
      )}
    </div>
  );
}