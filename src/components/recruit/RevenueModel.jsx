import React from "react";
import { TrendingUp, Zap, CreditCard, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

// ===== 定数（A/Bテスト・微調整はここだけ変更 =====
export const REVENUE_CONFIG = {
  baseRate: 85,         // 基本還元率(%)
  maxRate: 95,          // 最大還元率(%)
  platformFee: 15,      // 基本プラットフォーム手数料(%)
  steps: [
    { label: "STEP 1", threshold: "月間売上 〜¥29,999", rate: 85, color: "#00ff9d", desc: "BASICプラン加入でスタート" },
    { label: "STEP 2", threshold: "月間売上 ¥30,000〜", rate: 88, color: "#00d4ff", desc: "月3万超えで自動アップ" },
    { label: "STEP 3", threshold: "月間売上 ¥50,000〜", rate: 90, color: "#f59e0b", desc: "月5万超えでさらに優遇" },
    { label: "STEP 4", threshold: "月間売上 ¥100,000〜", rate: 93, color: "#ff6b6b", desc: "月10万プレイヤー" },
    { label: "MAX",    threshold: "月間売上 ¥300,000〜", rate: 95, color: "#fbbf24", desc: "トップクリエイター限定" },
  ],
  competitors: [
    { name: "他社A", rate: 50, color: "#666" },
    { name: "他社B", rate: 60, color: "#888" },
    { name: "他社C", rate: 70, color: "#aaa" },
    { name: "ChatMarket", rate: 85, color: "#00ff9d", highlight: true },
  ],
  stripeFeatures: [
    { icon: "⚡", title: "売上はリアルタイム反映", desc: "配信終了の瞬間に収益がダッシュボードに表示。どの配信が稼げたか一目瞭然。" },
    { icon: "🏦", title: "最短翌営業日振込", desc: "申請から最短翌営業日に銀行口座に振込。月末まとめ払いの不安なし。" },
    { icon: "🔍", title: "明細は全件透明公開", desc: "コイン消費・還元率計算・プラットフォーム手数料。すべての内訳が確認可能。" },
  ],
};
// =============================================

function CompetitorBar({ name, rate, color, highlight }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-sm">
        <span className={`font-bold ${highlight ? "text-primary" : "text-muted-foreground"}`}>{name}</span>
        <span className={`font-black ${highlight ? "text-primary text-base" : "text-muted-foreground"}`}>{rate}%</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${rate}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: highlight
              ? `linear-gradient(90deg, ${color}, #00d4ff)`
              : color,
            boxShadow: highlight ? `0 0 10px ${color}88` : "none",
          }}
        />
      </div>
    </div>
  );
}

function StepCard({ step, index }) {
  const isMax = step.label === "MAX";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.08 }}
      className="relative rounded-2xl border p-5 space-y-3 flex-1 min-w-0"
      style={{
        borderColor: step.color + "55",
        background: `${step.color}0d`,
        boxShadow: isMax ? `0 0 20px ${step.color}44` : "none",
      }}
    >
      {isMax && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-3 py-0.5 rounded-full text-[10px] font-black whitespace-nowrap">
          👑 トップクリエイター
        </div>
      )}
      <div className="text-center pt-1">
        <span
          className="text-xs font-black px-2 py-0.5 rounded-full"
          style={{ background: step.color + "33", color: step.color }}
        >
          {step.label}
        </span>
      </div>
      <div className="text-center">
        <p className="text-4xl font-black" style={{ color: step.color }}>{step.rate}%</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">還元率</p>
      </div>
      <div className="text-center space-y-1">
        <p className="text-xs font-bold text-foreground/80">{step.threshold}</p>
        <p className="text-[11px] text-muted-foreground">{step.desc}</p>
      </div>
      {index < REVENUE_CONFIG.steps.length - 1 && (
        <div className="hidden sm:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10">
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </motion.div>
  );
}

export default function RevenueModel() {
  const { baseRate, maxRate, steps, competitors, stripeFeatures } = REVENUE_CONFIG;

  return (
    <div className="w-full space-y-16 py-16 px-4 sm:px-6">

      {/* ===== 1. 業界最高水準の還元率 ===== */}
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <span className="bg-primary/20 text-primary border border-primary/40 rounded-full px-4 py-1 text-xs font-bold">
            💰 収益還元モデル
          </span>
          <h2 className="text-3xl sm:text-4xl font-black">
            業界最高水準
            <span className="text-primary"> {baseRate}〜{maxRate}%</span>
            還元
          </h2>
          <p className="text-muted-foreground text-sm">Apple・Google手数料ゼロのPWA直営だから実現できる高還元。</p>
        </div>

        {/* 大きな数字強調 */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10"
        >
          <div
            className="rounded-3xl p-8 text-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,157,0.15), rgba(0,212,255,0.08))",
              border: "2px solid rgba(0,255,157,0.5)",
              boxShadow: "0 0 50px rgba(0,255,157,0.2)",
            }}
          >
            <p className="text-xs font-bold text-primary/60 tracking-widest mb-1">基本還元率</p>
            <p className="text-8xl sm:text-9xl font-black text-primary leading-none" style={{ textShadow: "0 0 30px rgba(0,255,157,0.5)" }}>
              {baseRate}%
            </p>
            <p className="text-sm text-muted-foreground mt-2">BASICプラン加入から即適用</p>
          </div>
          <div className="text-center sm:text-left space-y-2">
            <p className="text-muted-foreground text-sm">さらに売上に応じて</p>
            <p className="text-5xl font-black text-amber-400">最大<br /><span style={{ textShadow: "0 0 20px rgba(251,191,36,0.5)" }}>{maxRate}%</span></p>
            <p className="text-xs text-muted-foreground">まで自動でアップ</p>
          </div>
        </motion.div>

        {/* 他社比較バー */}
        <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">他社との還元率比較</p>
          {competitors.map((c, i) => (
            <CompetitorBar key={i} {...c} />
          ))}
          <p className="text-[10px] text-muted-foreground pt-2">※ 各社の公開情報をもとにした概算比較</p>
        </div>
      </section>

      {/* ===== 2. プログレッシブインセンティブ ===== */}
      <section className="max-w-5xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full px-4 py-1 text-xs font-bold">
            📈 プログレッシブ・インセンティブ
          </span>
          <h2 className="text-3xl sm:text-4xl font-black">
            稼げば稼ぐほど<span className="text-amber-400">還元率が上がる</span>
          </h2>
          <p className="text-muted-foreground text-sm">月間売上に応じて還元率が段階的に自動アップ。手続き不要。</p>
        </div>

        {/* STEPカード */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 relative mb-6">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>

        {/* 説明 */}
        <div className="bg-secondary/50 border border-border/40 rounded-2xl p-5 space-y-3 text-sm">
          <p className="font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            仕組みについて
          </p>
          <ul className="text-muted-foreground space-y-1.5 text-xs">
            <li>• 還元率は<strong className="text-foreground">毎月自動で再計算</strong>され、翌月から適用されます</li>
            <li>• 申請・手続き一切不要。ダッシュボードで現在の還元率をいつでも確認可能</li>
            <li>• コイン消費の<strong className="text-foreground">{baseRate}%〜{maxRate}%</strong>がそのまま振込可能な報酬コインとして積算</li>
            <li>• 複数の収益源（通話・ライブ・VOD・チャット）を合算して判定</li>
          </ul>
        </div>
      </section>

      {/* ===== 3. Stripe決済の透明性 ===== */}
      <section className="max-w-4xl mx-auto">
        <div className="text-center mb-10 space-y-2">
          <span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 rounded-full px-4 py-1 text-xs font-bold">
            💳 Stripe決済 × 完全透明
          </span>
          <h2 className="text-3xl sm:text-4xl font-black">
            売上はリアルタイム。<br className="hidden sm:block" />
            <span className="text-blue-400">振込は最短翌営業日。</span>
          </h2>
          <p className="text-muted-foreground text-sm">業界標準のStripe決済だから、安心・安全・明快。</p>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            世界標準の決済インフラ『Stripe』を採用。クレジットカードはもちろん、Apple PayやGoogle Payにも対応し、リスナーの離脱を防ぎます。ライバーへの報酬支払いはクリーンかつスピーディーです。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {stripeFeatures.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-blue-500/20 rounded-2xl p-5 space-y-3 hover:border-blue-500/40 transition-all"
            >
              <span className="text-3xl">{f.icon}</span>
              <p className="font-bold text-sm">{f.title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* 収益フロー図 */}
        <div className="bg-card border border-border/50 rounded-2xl p-6">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">収益の流れ</p>
          <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-center">
            {[
              { icon: "🎙️", label: "配信・通話" },
              { icon: "→", label: null },
              { icon: "🪙", label: "コイン消費" },
              { icon: "→", label: null },
              { icon: "📊", label: `${baseRate}%が即積算` },
              { icon: "→", label: null },
              { icon: "🏦", label: "振込申請" },
              { icon: "→", label: null },
              { icon: "✅", label: "最短翌営業日着金" },
            ].map((item, i) => (
              item.label === null
                ? <span key={i} className="text-muted-foreground text-xl hidden sm:block">→</span>
                : (
                  <div key={i} className="flex-1 min-w-0 bg-secondary/60 rounded-xl px-3 py-3 space-y-1">
                    <p className="text-xl">{item.icon}</p>
                    <p className="text-[11px] font-semibold">{item.label}</p>
                  </div>
                )
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}