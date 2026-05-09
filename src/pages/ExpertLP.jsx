import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, Zap, TrendingUp, Users, Mic2, DollarSign, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const STATS = [
  { value: "85%", label: "還元率", sub: "PPV・エール共通" },
  { value: "3,000+", label: "同時視聴", sub: "インフラ完備" },
  { value: "0円", label: "初期費用", sub: "完全無料" },
  { value: "24h", label: "サポート", sub: "即座対応" },
];

const COMPARISON = [
  {
    label: "Chat Market",
    highlight: true,
    items: [
      "✓ PPV還元率 85%（プラットフォーム手数料15%）",
      "✓ エールコイン還元率 85%（同じ基準）",
      "✓ 大規模講演会対応（3,000名同時視聴可）",
      "✓ ライブ終了→1対1個別相談の自動誘導",
      "✓ キャッシング最適化＋DB保護",
    ],
  },
  {
    label: "従来型配信",
    highlight: false,
    items: [
      "✗ 30%～50%に及ぶ中間マージン",
      "✗ 大規模視聴対応の負荷テスト実績不明",
      "✗ 個別相談の自動誘導なし",
      "✗ インフラスケーリング不透明",
      "✗ 還元方式が複雑で不透明",
    ],
  },
];

const FEATURES = [
  {
    icon: "🎤",
    title: "大規模PPV講演会",
    desc: "3,000名規模の同時視聴に対応。インフラ最適化で数千人が一斉にチケット購入してもDB悲鳴ゼロ。",
  },
  {
    icon: "💬",
    title: "リアルタイムコメント制御",
    desc: "コメント殺到時もバッチ処理でフリーズなし。質問・応援・エール投げが自然に流れる。",
  },
  {
    icon: "🤝",
    title: "1対1個別相談へ自動誘導",
    desc: "ライブ終了時に『先生に直接相談』の誘導ポップアップ。割引コード付与で成約率最大化。",
  },
  {
    icon: "💰",
    title: "透明な85%還元",
    desc: "PPV・エール・チケット・1対1すべてが同じ基準。複雑な計算なし、シンプル・公明正大。",
  },
];

export default function ExpertLP() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = "有識者・著名人向け講演会プラットフォーム | Chat Market";
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white overflow-x-hidden font-inter">
      {/* ── ヘッダー ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 h-20 transition-all"
        style={{
          background: scrolled ? "rgba(15,23,42,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(147,197,253,0.2)" : "none",
        }}
      >
        <div className="flex items-center gap-2">
          <Crown className="w-6 h-6 text-amber-400" />
          <span className="font-black text-lg tracking-widest">CHATMARKET</span>
        </div>
        <Link to="/recruit">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-black"
          >
            今すぐ登録 →
          </Button>
        </Link>
      </header>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-16">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(ellipse, #3b82f6, transparent)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-40 right-1/4 w-96 h-96 rounded-full opacity-15"
            style={{
              background: "radial-gradient(ellipse, #fbbf24, transparent)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.5)",
              color: "#fbbf24",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            有識者・著名人専用プラットフォーム
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight"
          >
            知の価値を、<br />
            <span className="text-amber-400">最大限に売ろう</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed"
          >
            3,000名規模の講演会・セミナーで圧倒的な収益を実現。<br />
            PPV・エール・個別相談すべてが還元率85%。シンプルで、公明正大。<br />
            <strong>社長が「数千人を集めても、ビクともしない」と自信を持って営業できるシステムを完備。</strong>
          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4"
          >
            <Link to="/recruit">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-black font-black text-lg h-14 px-10 gap-2 shadow-2xl"
                style={{
                  boxShadow: "0 0 40px rgba(251,191,36,0.5)",
                }}
              >
                <Crown className="w-5 h-5" />
                有識者として登録する
              </Button>
            </Link>
          </motion.div>

          <p className="text-sm text-blue-200">
            セットアップ3分 • クレジットカード不要 • 24時間サポート完備
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl border border-blue-500/30"
              style={{
                background: "rgba(59,130,246,0.1)",
              }}
            >
              <p className="text-3xl md:text-4xl font-black text-amber-400">{s.value}</p>
              <p className="text-sm font-bold text-white mt-2">{s.label}</p>
              <p className="text-xs text-blue-200 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            従来型 vs Chat Market
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {COMPARISON.map((comp) => (
              <div
                key={comp.label}
                className={`p-8 rounded-2xl border-2 space-y-4 ${
                  comp.highlight
                    ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/60"
                    : "bg-slate-900/50 border-slate-700/50"
                }`}
              >
                <p
                  className={`text-lg font-black ${
                    comp.highlight ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {comp.highlight ? "✓" : "✗"} {comp.label}
                </p>
                <ul className="space-y-2.5">
                  {comp.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm text-blue-100 leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-4xl font-black text-center">
            4つの強み
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-blue-500/30 space-y-3 hover:border-amber-500/50 transition-all"
                style={{ background: "rgba(59,130,246,0.05)" }}
              >
                <div className="text-4xl">{f.icon}</div>
                <h3 className="font-black text-lg text-white">{f.title}</h3>
                <p className="text-sm text-blue-100 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE MODEL ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <h2 className="text-3xl font-black">透明な還元率ポリシー</h2>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">PPV講演会チケット</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">プラットフォーム手数料15%のみ</p>
            </div>

            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">エールコイン（投げ銭）</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">同じ基準で公明正大</p>
            </div>

            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">1対1個別相談</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">自動誘導で高成約率</p>
            </div>
          </div>

          <p className="text-sm text-blue-200 pt-4 border-t border-blue-500/20">
            <strong>複雑な計算はなし。すべてが同じ基準。</strong><br />
            「数千人が一斉にチケット購入してもシステムが悲鳴を上げない」ということを、
            <br />
            社長が営業時にプレゼンできる確実な基盤を用意しました。
          </p>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <Sparkles className="w-12 h-12 mx-auto text-amber-400" />
          <h2 className="text-3xl md:text-4xl font-black leading-tight">
            さあ、あなたの知をお金に変えよう。
          </h2>
          <p className="text-lg text-blue-100">
            社長が「3,000人を集めてもビクともしない」と営業する<br />
            エンタープライズシステムの完成。
          </p>

          <Link to="/recruit">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-black font-black text-lg h-14 px-10 gap-2 shadow-2xl"
              style={{
                boxShadow: "0 0 50px rgba(251,191,36,0.5)",
              }}
            >
              <Crown className="w-5 h-5" />
              有識者として今すぐ登録
            </Button>
          </Link>

          <p className="text-xs text-blue-300">
            セットアップ3分 • 24時間オンボーディング対応 • 本当に売上が出たら満足します
          </p>
        </div>
      </section>

      <footer className="text-center py-8 text-blue-300/40 text-xs border-t border-blue-500/10">
        © 2026 ChatMarket. The Platform for Knowledge Leaders.
      </footer>
    </div>
  );
}