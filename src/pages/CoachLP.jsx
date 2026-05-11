import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, Zap, ArrowRight, Star, TrendingUp, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { capturePromoFromUrl } from "@/lib/promoCode";

const STATS = [
  { value: "85%", label: "収益還元率", sub: "プラットフォーム最高" },
  { value: "12ヶ月", label: "初年度無料", sub: "今だけキャンペーン" },
  { value: "0円", label: "月額費用", sub: "まず無料で試す" },
  { value: "15分", label: "最小セッション", sub: "スキマ時間で収益化" },
];

const FEATURES = [
  { icon: "🧠", title: "1対1ライフコーチング", desc: "ビデオ通話でパーソナルセッション。15分〜120分まで自由に料金設定。" },
  { icon: "📊", title: "目標管理ダッシュボード", desc: "クライアントの進捗や通話履歴を一元管理。コーチング品質を可視化。" },
  { icon: "📚", title: "コーチング教材の販売", desc: "ワークシートや録画セッションをPPV販売。あなたの知識を資産化。" },
  { icon: "💬", title: "ファンクラブ＆月額サポート", desc: "継続クライアントに月額メンバーシップを提供。安定収益を構築。" },
];

const VOICES = [
  { name: "田中コーチ（キャリア）", text: "ストアカでは手数料が重かった。Chat Marketに移行してから手取りが1.5倍になりました。" },
  { name: "山本コーチ（メンタル）", text: "予約から支払いまで全自動。クライアントとのセッションに集中できるようになった。" },
  { name: "鈴木コーチ（ビジネス）", text: "動画教材とライブセッションを組み合わせて月収が安定しました。" },
];

export default function CoachLP() {
  const [promoApplied, setPromoApplied] = useState(null);

  useEffect(() => {
    document.title = "コーチ・コンサルタント向けプラットフォーム | Chat Market";
    const promo = capturePromoFromUrl();
    if (promo) setPromoApplied(promo);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-950 via-purple-950 to-slate-950 text-white overflow-x-hidden font-inter">

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
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.5)", color: "#a78bfa" }}>
            <Heart className="w-3.5 h-3.5" /> コーチ・コンサルタント・カウンセラー専用
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight">
            人を変える力を、<br />
            <span style={{ background: "linear-gradient(135deg, #a78bfa, #00ff9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              ビジネスにしよう
            </span>
          </motion.h1>

          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
            className="text-lg text-violet-100 max-w-2xl mx-auto leading-relaxed">
            1対1セッション・グループコーチング・教材販売 — 還元率85%で<br />
            あなたのコーチング収益を最大化する唯一のプラットフォーム。
          </motion.p>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
            <Link to="/recruit">
              <Button size="lg" className="bg-violet-500 hover:bg-violet-400 text-white font-black text-lg h-14 px-10 gap-2"
                style={{ boxShadow: "0 0 40px rgba(167,139,250,0.5)" }}>
                <Zap className="w-5 h-5" /> 無料でコーチ登録する
              </Button>
            </Link>
          </motion.div>
          <p className="text-sm text-violet-200">登録無料 • 即日開始 • 12ヶ月キャンペーン中</p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map(s => (
            <div key={s.label} className="text-center p-6 rounded-2xl border border-violet-500/30" style={{ background: "rgba(167,139,250,0.08)" }}>
              <p className="text-3xl font-black text-violet-400">{s.value}</p>
              <p className="text-sm font-bold text-white mt-1">{s.label}</p>
              <p className="text-xs text-violet-200 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-10">
          <h2 className="text-3xl font-black text-center">コーチに必要なすべてが揃っている</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl border border-violet-500/30 space-y-3 hover:border-violet-400/60 transition-all"
                style={{ background: "rgba(167,139,250,0.05)" }}>
                <div className="text-4xl">{f.icon}</div>
                <h3 className="font-black text-lg">{f.title}</h3>
                <p className="text-sm text-violet-100 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VOICES */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto space-y-8">
          <h2 className="text-3xl font-black text-center">コーチの声</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {VOICES.map(v => (
              <div key={v.name} className="p-6 rounded-2xl border border-violet-500/20 space-y-3" style={{ background: "rgba(167,139,250,0.06)" }}>
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />)}
                </div>
                <p className="text-sm text-violet-100 leading-relaxed">「{v.text}」</p>
                <p className="text-xs font-bold text-violet-300">— {v.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-24 px-6 text-center space-y-8">
        <TrendingUp className="w-12 h-12 mx-auto text-violet-400" />
        <h2 className="text-3xl md:text-4xl font-black">あなたのコーチングを、もっと多くの人に届けよう</h2>
        <Link to="/recruit">
          <Button size="lg" className="bg-violet-500 hover:bg-violet-400 text-white font-black text-lg h-14 px-10 gap-2"
            style={{ boxShadow: "0 0 50px rgba(167,139,250,0.5)" }}>
            今すぐ無料で始める <ArrowRight className="w-5 h-5" />
          </Button>
        </Link>
        <p className="text-xs text-violet-300">登録無料 • 12ヶ月キャンペーン • 即日収益化</p>
      </section>

      <footer className="text-center py-8 text-violet-300/30 text-xs border-t border-violet-500/10">
        © 2026 ChatMarket. For Coaches & Consultants.
      </footer>
    </div>
  );
}