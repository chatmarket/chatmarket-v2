import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Globe, Phone, Star, CheckCircle2, ArrowRight, Zap, Users, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capturePromoFromUrl } from "@/lib/promoCode";

const STATS = [
  { value: "85%", label: "収益還元率", sub: "業界最高水準" },
  { value: "12ヶ月", label: "初年度無料", sub: "キャンペーン中" },
  { value: "0円", label: "初期費用", sub: "完全無料スタート" },
  { value: "1対1", label: "ビデオレッスン", sub: "専用インフラ完備" },
];

const FEATURES = [
  { icon: "🎙", title: "1対1英会話レッスン", desc: "ビデオ通話で本格レッスン。15分単位で料金設定でき、生徒が即座に予約・支払い。" },
  { icon: "📹", title: "レッスン動画販売", desc: "録画した教材をPPV販売。寝ている間も収益が入るパッシブインカムを実現。" },
  { icon: "🌍", title: "グローバル生徒獲得", desc: "多言語対応のプロフィールで海外在住・帰国子女の生徒にもリーチ可能。" },
  { icon: "📅", title: "スケジュール自動管理", desc: "週次カレンダーで空き枠を設定。生徒がセルフで予約するから管理不要。" },
];

const COMPARISON = [
  { label: "Chat Market", highlight: true, items: ["✓ 還元率85%（手数料15%のみ）", "✓ アプリ不要・ブラウザだけで完結", "✓ 生徒がコインで即座に支払い", "✓ レッスン録画・動画販売も一元管理", "✓ 12ヶ月無料キャンペーン実施中"] },
  { label: "ストアカ・Preply等", highlight: false, items: ["✗ 手数料20〜50%を徴収", "✗ プラットフォーム依存で価格競争", "✗ 独自ブランド構築が困難", "✗ 収益化に複数ツールが必要", "✗ 無料期間なし・審査あり"] },
];

export default function EnglishLP() {
  const navigate = useNavigate();
  const [promoApplied, setPromoApplied] = useState(null);

  useEffect(() => {
    document.title = "英会話・語学講師向けプラットフォーム | Chat Market";
    const promo = capturePromoFromUrl();
    if (promo) setPromoApplied(promo);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-950 via-blue-950 to-slate-950 text-white overflow-x-hidden font-inter">

      {/* プロモコードバナー */}
      {promoApplied && (
        <div className="sticky top-14 z-50 bg-gradient-to-r from-green-500 to-emerald-600 text-black text-center py-2 px-4 font-black text-sm shadow-lg">
          🎁 プロモコード「{promoApplied.code}」適用済み — 還元率85% × 12ヶ月無料が確定！登録するだけで自動適用されます
        </div>
      )}

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{ background: "rgba(56,189,248,0.15)", border: "1px solid rgba(56,189,248,0.5)", color: "#38bdf8" }}>
            <Globe className="w-3.5 h-3.5" /> 語学講師・英会話コーチ専用プラットフォーム
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight">
            英語力を、<br />
            <span style={{ background: "linear-gradient(135deg, #38bdf8, #00ff9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              収入に変えよう
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-lg text-sky-100 max-w-2xl mx-auto leading-relaxed">
            1対1ビデオレッスン・動画教材販売・定期購読 — すべてが還元率85%。<br />
            ストアカやPreplyに払っていた手数料をそのまま手取りに。
          </motion.p>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link to="/recruit">
              <Button size="lg" className="bg-sky-500 hover:bg-sky-600 text-white font-black text-lg h-14 px-10 gap-2 shadow-2xl"
                style={{ boxShadow: "0 0 40px rgba(56,189,248,0.4)" }}>
                <Zap className="w-5 h-5" /> 無料で講師登録する
              </Button>
            </Link>
          </motion.div>
          <p className="text-sm text-sky-200">セットアップ3分 • クレジットカード不要</p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center p-6 rounded-2xl border border-sky-500/30" style={{ background: "rgba(56,189,248,0.08)" }}>
              <p className="text-3xl font-black text-sky-400">{s.value}</p>
              <p className="text-sm font-bold text-white mt-1">{s.label}</p>
              <p className="text-xs text-sky-200 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-10">
          <h2 className="text-3xl font-black text-center">講師に必要なすべてが揃っている</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-sky-500/30 space-y-3 hover:border-sky-400/60 transition-all"
                style={{ background: "rgba(56,189,248,0.05)" }}>
                <div className="text-4xl">{f.icon}</div>
                <h3 className="font-black text-lg text-white">{f.title}</h3>
                <p className="text-sm text-sky-100 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-black text-center">他プラットフォームとの比較</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {COMPARISON.map(comp => (
              <div key={comp.label} className={`p-8 rounded-2xl border-2 space-y-4 ${comp.highlight ? "border-sky-500/60 bg-sky-500/10" : "border-slate-700/50 bg-slate-900/50"}`}>
                <p className={`text-lg font-black ${comp.highlight ? "text-sky-400" : "text-slate-400"}`}>{comp.label}</p>
                <ul className="space-y-2">
                  {comp.items.map((item, i) => <li key={i} className="text-sm text-sky-100">{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center space-y-8">
        <Globe className="w-12 h-12 mx-auto text-sky-400" />
        <h2 className="text-3xl md:text-4xl font-black">あなたのレッスンに値段をつけよう</h2>
        <Link to="/recruit">
          <Button size="lg" className="bg-sky-500 hover:bg-sky-400 text-white font-black text-lg h-14 px-10 gap-2"
            style={{ boxShadow: "0 0 50px rgba(56,189,248,0.5)" }}>
            今すぐ無料で始める <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <p className="text-xs text-sky-300">登録無料 • 即日開始可能 • 12ヶ月キャンペーン適用</p>
      </section>

      <footer className="text-center py-8 text-sky-300/30 text-xs border-t border-sky-500/10">
        © 2026 ChatMarket. For Language Teachers & Coaches.
      </footer>
    </div>
  );
}