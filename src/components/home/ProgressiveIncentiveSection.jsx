import React, { useState } from "react";
import { TrendingUp, ChevronDown, ChevronUp, Zap, DollarSign, Award } from "lucide-react";

const tiers = [
  { revenue: "〜200万円", rate: "85%", color: "from-gray-500 to-gray-600", textColor: "text-gray-300" },
  { revenue: "200万円超", rate: "86%", color: "from-blue-600 to-blue-700", textColor: "text-blue-300" },
  { revenue: "300万円超", rate: "87%", color: "from-blue-500 to-blue-600", textColor: "text-blue-200" },
  { revenue: "600万円超", rate: "88%", color: "from-cyan-500 to-cyan-600", textColor: "text-cyan-300" },
  { revenue: "900万円超", rate: "89%", color: "from-teal-500 to-teal-600", textColor: "text-teal-300" },
  { revenue: "1,200万円超", rate: "90%", color: "from-primary to-emerald-600", textColor: "text-primary" },
  { revenue: "1,500万円超", rate: "91%", color: "from-emerald-400 to-green-500", textColor: "text-emerald-300" },
  { revenue: "1,650万円超", rate: "92%", color: "from-yellow-400 to-amber-500", textColor: "text-yellow-300" },
  { revenue: "1,800万円超", rate: "93%", color: "from-orange-400 to-orange-500", textColor: "text-orange-300" },
  { revenue: "1,950万円超", rate: "94%", color: "from-red-400 to-red-500", textColor: "text-red-300" },
  { revenue: "2,000万円超", rate: "95%", color: "from-pink-400 to-rose-500", textColor: "text-pink-300", top: true },
];

const feeItems = [
  { label: "動画・ライブチケット売上", fee: "15%" },
  { label: "エールコイン（スパチャ）", fee: "10%" },
];

export default function ProgressiveIncentiveSection() {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="py-4">
      <div
        className="bg-card border border-border/50 rounded-2xl overflow-hidden cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                プログレッシブ・インセンティブって何？
                <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">自動適用</span>
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">売上が上がるほど還元率もアップ！最大95%を実現</p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
          )}
        </div>
      </div>

      {expanded && (
        <div className="border border-t-0 border-border/50 rounded-b-2xl bg-card/50 p-6 space-y-8">

          {/* Hero explanation */}
          <div className="rounded-2xl bg-gradient-to-br from-primary/25 via-primary/10 to-secondary border border-primary/40 p-6 text-center space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-black">売上が増えるほど<br />あなたへの還元率が上がる！</h3>
            <p className="text-sm font-semibold text-primary">BASICプランのサブスクに加入して収益最大化の鍵を手に入れてください！</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              ChatMarketでは、月間の売上金額に応じて自動的に収益還元率が引き上げられます。
              頑張れば頑張るほど、受け取れる金額が増える仕組みです。
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-secondary/60 rounded-xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto">
                <DollarSign className="w-5 h-5 text-blue-400" />
              </div>
              <p className="font-bold text-sm">①まず手数料を差し引き</p>
              <p className="text-xs text-muted-foreground">動画・ライブ売上から15%、エールコインから10%のプラットフォーム手数料を差し引きます。</p>
            </div>
            <div className="bg-secondary/60 rounded-xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="font-bold text-sm">②月間総売上で還元率決定</p>
              <p className="text-xs text-muted-foreground">手数料控除後の月間合計売上に応じて、還元率（85%〜95%）が自動で決まります。</p>
            </div>
            <div className="bg-secondary/60 rounded-xl p-4 text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mx-auto">
                <Award className="w-5 h-5 text-yellow-400" />
              </div>
              <p className="font-bold text-sm">③還元率を掛けて振込</p>
              <p className="text-xs text-muted-foreground">手数料控除後の金額に還元率を掛けた金額があなたへ振り込まれます。</p>
            </div>
          </div>

          {/* Fee table */}
          <div className="space-y-2">
            <h4 className="font-bold text-sm flex items-center gap-1.5"><Zap className="w-4 h-4 text-primary" />プラットフォーム手数料</h4>
            <div className="rounded-xl overflow-hidden border border-border/50">
              {feeItems.map((item, i) => (
                <div key={i} className={`flex items-center justify-between px-4 py-3 text-sm ${i % 2 === 0 ? "bg-secondary/40" : "bg-secondary/20"}`}>
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-bold text-foreground">{item.fee}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tier table */}
          <div className="space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-primary" />還元率テーブル（月間売上別）</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {tiers.map((tier, i) => (
                <div
                  key={i}
                  className={`rounded-xl bg-gradient-to-br ${tier.color} p-3 text-center relative ${tier.top ? "ring-2 ring-yellow-400" : ""}`}
                >
                  {tier.top && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] font-black bg-yellow-400 text-black px-2 py-0.5 rounded-full whitespace-nowrap">MAX</span>
                  )}
                  <p className="text-xs text-white/70 mt-1">{tier.revenue}</p>
                  <p className="text-2xl font-black text-white">{tier.rate}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Example calculation */}
          <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 space-y-3">
            <h4 className="font-bold text-sm flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-primary" />計算例</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">動画売上（月間）</span>
                <span className="font-semibold">¥1,000,000</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground ml-2">→ 手数料 15% 差し引き</span>
                <span className="text-destructive">- ¥150,000</span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2">
                <span className="text-muted-foreground">手数料控除後</span>
                <span className="font-semibold">¥850,000</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground ml-2">→ 売上85万円なので還元率 <span className="text-primary font-bold">85%</span></span>
                <span></span>
              </div>
              <div className="flex justify-between items-center border-t border-border/50 pt-2 font-black text-base">
                <span>振込金額</span>
                <span className="text-primary">¥722,500</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            ※ 還元率は毎月の売上実績に応じて自動的に適用されます。翌月繰り越しはありません。
          </p>
        </div>
      )}
    </section>
  );
}