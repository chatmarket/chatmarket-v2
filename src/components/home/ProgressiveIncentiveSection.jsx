import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp, CreditCard, Percent, CalendarClock, Calculator } from "lucide-react";
import { PROGRESSIVE_TIERS, PLAN_REVENUE_SHARE, STRIPE_FEE_RATE } from "@/lib/pricing";

const PLAN_ROWS = [
  { label: "FREEプラン",                     rate: PLAN_REVENUE_SHARE.free,          note: "" },
  { label: "BASIC / VOD / PPV プラン",       rate: PLAN_REVENUE_SHARE.basic,         note: "プログレッシブ対象", highlight: true },
  { label: "CALL & ANSWER プラン",           rate: 0.85,                             note: "85%～", highlight: true },
  { label: "ミニスクール / エンタープライズ", rate: PLAN_REVENUE_SHARE["mini-school"], note: "", comingSoon: true },
  { label: "クラウドファンディング（特例）",  rate: PLAN_REVENUE_SHARE.crowdfunding,   note: "NPO・政治政党 一律", comingSoon: true },
];

const TIER_LABELS = [
  "100万円超", "300万円超", "600万円超", "900万円超",
  "1,200万円超", "1,500万円超", "1,650万円超",
  "1,800万円超", "1,950万円超", "2,000万円以上",
];

export default function ProgressiveIncentiveSection() {
  return (
    <section className="max-w-4xl mx-auto px-4 py-8 mb-4">
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-1">
        <Accordion type="single" collapsible>
          <AccordionItem value="progressive-incentive" className="border-0">
            <AccordionTrigger className="hover:no-underline px-5 py-5">
              <div className="flex items-center gap-3 text-left">
                <TrendingUp className="w-6 h-6 text-primary shrink-0" />
                <div className="space-y-0.5">
                  <div className="text-base font-black text-primary" style={{ textShadow: "0 0 10px hsl(var(--primary)/0.6)" }}>
                    配信者の収益還元率UPの仕組み（70%〜最大95％）
                  </div>
                  <div className="text-xs font-semibold text-muted-foreground">
                    視聴者の決済内訳詳細
                  </div>
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-5 pb-6 space-y-6 text-sm">

              {/* 1. 視聴者決済 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <CreditCard className="w-4 h-4 text-blue-400" />
                  <span>1. 視聴者（支払い側）の決済</span>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-blue-200 leading-relaxed">
                    全決済（エール・チケット・VOD・通話）において、購入希望額にプラットフォーム手数料として
                    <span className="font-black text-blue-300"> {(STRIPE_FEE_RATE * 100).toFixed(1)}%</span>加算して請求いたします。
                  </p>
                  <div className="bg-blue-900/30 rounded-lg px-3 py-2 font-mono text-xs text-blue-300">
                    例: 1,000円分 → カード請求 <span className="font-black text-white">1,036円</span>
                  </div>
                  <p className="text-xs text-blue-300 font-semibold">🔒 世界標準のエスクロー決済Stripeを利用し安心なお取引が出来ます</p>
                  <p className="text-xs text-blue-300/70">プラットホーム手数料を頂く理由としまして、配信者への還元率を最大化する為になります、予めご理解ご了承の程よろしくお願いいたします。</p>
                </div>
              </div>

              {/* 2. プラン別基本還元率 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <Percent className="w-4 h-4 text-primary" />
                  <span>2. プラン別・基本還元率</span>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/60 text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-semibold">プラン</th>
                        <th className="text-right px-4 py-2.5 font-semibold">還元率</th>
                        <th className="px-4 py-2.5 font-semibold text-center">備考</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {PLAN_ROWS.map((row) => (
                        <tr key={row.label} className={row.comingSoon ? "opacity-50" : row.highlight ? "bg-primary/5" : ""}>
                          <td className="px-4 py-2.5 font-medium">{row.label}</td>
                          <td className="px-4 py-2.5 text-right font-black text-sm">
                            {row.comingSoon ? (
                              <span className="text-[11px] font-bold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">準備中</span>
                            ) : (
                              <span className="text-primary">{(row.rate * 100).toFixed(0)}%</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center text-muted-foreground">
                            {!row.comingSoon && row.note && (
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${row.highlight ? "bg-primary/20 text-primary" : "bg-secondary"}`}>
                                {row.note}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. プログレッシブ */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>3. プログレッシブ・インセンティブ（BASIC以上）</span>
                </div>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  月間総売上（エール＋チケット＋動画＋通話）に基づき、翌月の還元率を自動で最大<span className="font-black text-primary">95%</span>まで引き上げます。毎月1日 0:00に自動更新。
                </p>
                <div className="overflow-x-auto rounded-xl border border-border/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-secondary/60 text-muted-foreground">
                        <th className="text-left px-4 py-2 font-semibold">月間売上</th>
                        <th className="text-right px-4 py-2 font-semibold">翌月還元率</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {PROGRESSIVE_TIERS.map((tier, i) => (
                        <tr key={i} className={i % 2 === 0 ? "bg-primary/5" : ""}>
                          <td className="px-4 py-2 font-medium text-muted-foreground">{TIER_LABELS[i]}</td>
                          <td className={`px-4 py-2 text-right font-black text-sm ${tier.rate >= 0.94 ? "text-yellow-400" : "text-primary"}`}>
                            {(tier.rate * 100).toFixed(0)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground">※ 基本還元率85%（100万円未満）。翌月に反映されます。</p>
              </div>

              {/* 4. 最終報酬計算式 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <Calculator className="w-4 h-4 text-orange-400" />
                  <span>4. 最終振込額の計算式</span>
                </div>
                <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 space-y-2">
                  <p className="font-mono text-xs text-orange-200 leading-relaxed">
                    最終振込額 = ( 売上総額 − AWS等インフラ実費 ) × 適用還元率 − 銀行振込手数料（実費）
                  </p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside mt-2">
                    <li>売上総額: 3.6%を引く前の面額金額</li>
                    <li>銀行振込手数料: 受け取り側（配信者・団体）の負担</li>
                  </ul>
                </div>
              </div>

              {/* 5. 振込スケジュール */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 font-bold text-base">
                  <CalendarClock className="w-4 h-4 text-green-400" />
                  <span>5. 振込スケジュール</span>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-xs text-green-200 leading-relaxed">
                  入金確認後、イベント終了または月締めから<span className="font-black text-white"> 最短1週間以内 </span>に振り込みを完了。自動送金準備フローにより迅速に処理されます。
                </div>
              </div>

            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </section>
  );
}