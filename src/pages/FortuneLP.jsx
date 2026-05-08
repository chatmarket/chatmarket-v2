import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Moon, Eye, Clock, Shield, TrendingUp, ChevronDown, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── ミスティック・ラグジュアリーカラー ──
const MYSTIC = {
  gold: "#D4AF37",
  goldLight: "#F5E27A",
  purple: "#6B21A8",
  purpleLight: "#A855F7",
  deepBg: "#0D0A1A",
  cardBg: "rgba(20,12,40,0.85)",
  border: "rgba(212,175,55,0.35)",
};

// ── 鑑定師カードデータ ──
const FORTUNE_PROFILES = [
  {
    name: "星詠み・紫苑",
    specialty: "西洋占星術・タロット",
    years: 15,
    rating: 4.97,
    reviews: 1284,
    avatar: "🔮",
    badge: "殿堂入り",
    monthly: 680000,
    tagline: "星の声を、あなたの言葉に。",
    tags: ["恋愛", "仕事", "転機"],
  },
  {
    name: "月詠み・蒼月",
    specialty: "四柱推命・九星気学",
    years: 22,
    rating: 4.95,
    reviews: 3021,
    avatar: "🌙",
    badge: "トップ鑑定師",
    monthly: 1200000,
    tagline: "命式が語る、あなたの本質。",
    tags: ["結婚", "人間関係", "開運"],
  },
  {
    name: "霊視・天音",
    specialty: "霊視・前世リーディング",
    years: 8,
    rating: 4.93,
    reviews: 892,
    avatar: "✨",
    badge: "急成長中",
    monthly: 420000,
    tagline: "見えないものを、見る力。",
    tags: ["復縁", "不倫", "魂の目的"],
  },
];

// ── 残り枠ウィジェット ──
function SlotsWidget() {
  const [slots, setSlots] = useState(7);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSlots((s) => {
        const newSlot = Math.max(2, s - (Math.random() > 0.7 ? 1 : 0));
        if (newSlot !== s) setPulse(true);
        return newSlot;
      });
      setPulse(false);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  const urgency = slots <= 3 ? "text-red-400" : slots <= 5 ? "text-yellow-400" : "text-green-400";

  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.05, 1] } : {}}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full border"
      style={{ background: "rgba(212,175,55,0.08)", borderColor: MYSTIC.border }}
    >
      <span className={`w-2 h-2 rounded-full animate-pulse ${urgency.replace("text-", "bg-")}`} />
      <span className="text-xs font-bold" style={{ color: MYSTIC.gold }}>
        今月の新規受付枠
      </span>
      <span className={`text-lg font-black ${urgency}`}>{slots}</span>
      <span className="text-xs text-white/50">/ 10 枠</span>
    </motion.div>
  );
}

// ── 鑑定師プロフィールカード ──
function FortuneCard({ profile, index }) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500"
      style={{
        background: MYSTIC.cardBg,
        border: `1px solid ${hovered ? MYSTIC.gold : MYSTIC.border}`,
        boxShadow: hovered
          ? `0 0 40px rgba(212,175,55,0.25), 0 0 80px rgba(107,33,168,0.2)`
          : `0 0 20px rgba(107,33,168,0.1)`,
        backdropFilter: "blur(20px)",
      }}
    >
      {/* グラデーション背景 */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 0%, rgba(107,33,168,0.15) 0%, transparent 70%)`,
        }}
      />

      {/* バッジ */}
      <div className="absolute top-4 right-4">
        <span
          className="text-[10px] font-black px-2.5 py-1 rounded-full"
          style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)", color: "#0D0A1A" }}
        >
          {profile.badge}
        </span>
      </div>

      <div className="relative p-6 space-y-4">
        {/* Avatar + 名前 */}
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(107,33,168,0.4), rgba(212,175,55,0.2))",
              border: `1px solid ${MYSTIC.border}`,
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            {profile.avatar}
          </div>
          <div>
            <p className="font-black text-lg text-white leading-tight">{profile.name}</p>
            <p className="text-xs mt-0.5" style={{ color: MYSTIC.gold }}>{profile.specialty}</p>
            <p className="text-xs text-white/40 mt-0.5">経験 {profile.years}年</p>
          </div>
        </div>

        {/* キャッチ */}
        <p className="text-sm text-white/70 italic leading-relaxed" style={{ fontStyle: "italic" }}>
          "{ profile.tagline }"
        </p>

        {/* タグ */}
        <div className="flex flex-wrap gap-1.5">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(168,85,247,0.15)", color: "#C084FC", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* スタッツ */}
        <div className="grid grid-cols-3 gap-2 pt-2">
          <div className="text-center">
            <p className="text-lg font-black" style={{ color: MYSTIC.gold }}>
              {profile.rating}
            </p>
            <p className="text-[9px] text-white/40">評価</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black text-white">{profile.reviews.toLocaleString()}</p>
            <p className="text-[9px] text-white/40">鑑定数</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-black" style={{ color: "#34D399" }}>
              ¥{(profile.monthly / 10000).toFixed(0)}万
            </p>
            <p className="text-[9px] text-white/40">月収目安</p>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-3 rounded-2xl font-black text-sm transition-all"
          style={{
            background: hovered
              ? "linear-gradient(135deg, #D4AF37, #A0760F)"
              : "rgba(212,175,55,0.12)",
            color: hovered ? "#0D0A1A" : MYSTIC.gold,
            border: `1px solid ${MYSTIC.border}`,
          }}
        >
          {hovered ? "✨ このスタイルで始める" : "プロフィールを見る"}
        </motion.button>
      </div>
    </motion.div>
  );
}

// ── メインLP ──
export default function FortuneLP() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: MYSTIC.deepBg, color: "#fff", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
    >
      {/* 宇宙的背景エフェクト */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: "radial-gradient(ellipse, #6B21A8, transparent)", filter: "blur(80px)", animation: "float1 12s ease-in-out infinite" }} />
        <div className="absolute bottom-1/3 right-1/4 w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: "radial-gradient(ellipse, #D4AF37, transparent)", filter: "blur(60px)", animation: "float2 15s ease-in-out infinite" }} />
        {/* 星 */}
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.6 + 0.1,
              animation: `twinkle ${Math.random() * 4 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 4}s`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(40px,-30px) scale(1.1); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.08); } }
        @keyframes twinkle { 0%,100% { opacity: 0.1; } 50% { opacity: 0.7; } }
      `}</style>

      {/* ── ヘッダー ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-end justify-between px-5 pb-3 transition-all duration-300"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 12px)',
          background: scrolled ? "rgba(13,10,26,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? `1px solid ${MYSTIC.border}` : "none",
          minHeight: 'calc(env(safe-area-inset-top) + 64px)',
        }}
      >
        <div className="flex items-center gap-2">
          <Moon className="w-5 h-5" style={{ color: MYSTIC.gold }} />
          <span className="font-black text-sm tracking-widest" style={{ color: MYSTIC.gold, letterSpacing: "0.2em" }}>
            CHAT<span className="text-white">MARKET</span>
          </span>
        </div>
        <Button
          size="sm"
          onClick={() => navigate("/recruit")}
          className="font-black text-xs"
          style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)", color: "#0D0A1A", border: "none" }}
        >
          今すぐ登録 →
        </Button>
      </header>

      {/* ── ヒーロー ── */}
      <section
        className="relative flex flex-col items-center justify-center text-center px-5 pb-24 min-h-screen"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 96px)' }}
      >
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }} className="space-y-6 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-4 h-4" style={{ color: MYSTIC.gold }} />
            <span className="text-xs tracking-[0.3em] uppercase" style={{ color: MYSTIC.gold }}>
              占い師のための最高峰プラットフォーム
            </span>
            <Sparkles className="w-4 h-4" style={{ color: MYSTIC.gold }} />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight">
            あなたの
            <span
              className="block"
              style={{
                background: `linear-gradient(135deg, ${MYSTIC.goldLight}, ${MYSTIC.gold}, #A0760F)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              霊感・鑑定力を
            </span>
            収益に変えろ。
          </h1>

          <p className="text-base sm:text-lg text-white/60 leading-relaxed max-w-lg mx-auto">
            月収100万円超の鑑定師が続出。<br />
            ChatMarketが占い師の才能を、圧倒的な収益へと昇華させる。
          </p>

          <SlotsWidget />

          {/* 1年間無料バナー */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="inline-flex flex-col items-center gap-1 px-6 py-4 rounded-2xl mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(212,175,55,0.18), rgba(107,33,168,0.18))",
              border: `2px solid ${MYSTIC.gold}`,
              boxShadow: "0 0 30px rgba(212,175,55,0.25)",
            }}
          >
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: MYSTIC.gold }}>
              🎁 期間限定・特別オファー
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white leading-tight">
              登録から<span style={{ color: MYSTIC.gold }}>1年間</span>、完全無料！
            </p>
            <p className="text-sm text-white/60">
              通常月額 <span className="line-through text-white/40">¥3,300</span>
              　→　<span className="font-black text-white">¥0</span>／月（12ヶ月間）
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">※ 1年経過後は月額3,300円（税込）が発生します</p>
          </motion.div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate("/recruit")}
              className="px-8 py-4 rounded-2xl font-black text-base"
              style={{
                background: "linear-gradient(135deg, #D4AF37, #A0760F)",
                color: "#0D0A1A",
                boxShadow: "0 0 30px rgba(212,175,55,0.4)",
              }}
            >
              ✨ 無料で鑑定師登録する
            </motion.button>
            <button
              onClick={() => document.getElementById("profiles")?.scrollIntoView({ behavior: "smooth" })}
              className="px-8 py-4 rounded-2xl font-bold text-sm text-white/70 border transition-all hover:border-white/40"
              style={{ borderColor: MYSTIC.border, background: "rgba(255,255,255,0.04)" }}
            >
              活躍中の鑑定師を見る ↓
            </button>
          </div>
        </motion.div>

        {/* スクロールインジケーター */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <ChevronDown className="w-6 h-6 text-white/20" />
        </motion.div>
      </section>

      {/* ── 数字で語る ── */}
      <section className="relative px-5 py-20">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { num: "85%", label: "還元率", sub: "業界最高水準" },
            { num: "¥0", label: "初期費用", sub: "完全無料スタート" },
            { num: "24h", label: "サポート", sub: "専属チーム対応" },
            { num: "15分", label: "から稼げる", sub: "ビデオ通話鑑定" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-2xl p-5 text-center"
              style={{ background: MYSTIC.cardBg, border: `1px solid ${MYSTIC.border}`, backdropFilter: "blur(20px)" }}
            >
              <p className="text-3xl font-black" style={{ color: MYSTIC.gold }}>{stat.num}</p>
              <p className="text-sm font-bold text-white mt-1">{stat.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{stat.sub}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 活躍中の鑑定師 ── */}
      <section id="profiles" className="relative px-5 py-20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" style={{ color: MYSTIC.gold }} />
              <h2 className="text-2xl sm:text-3xl font-black">活躍中の鑑定師</h2>
              <Crown className="w-5 h-5" style={{ color: MYSTIC.gold }} />
            </div>
            <p className="text-sm text-white/50">リアルな収益・実績で選ばれ続けるトップ鑑定師たち</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FORTUNE_PROFILES.map((profile, i) => (
              <FortuneCard key={profile.name} profile={profile} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── 占い師が選ぶ理由 ── */}
      <section className="relative px-5 py-20">
        <div className="max-w-4xl mx-auto space-y-12">
          <h2 className="text-2xl sm:text-3xl font-black text-center">
            なぜ、本物の鑑定師が<br />
            <span style={{ color: MYSTIC.gold }}>ChatMarketを選ぶのか</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { icon: TrendingUp, title: "業界最高85%還元", desc: "コイン収益の85%があなたの報酬。中間業者なし、直接ファンから。" },
              { icon: Shield, title: "完全匿名・安心設計", desc: "本名・住所一切不要。プライバシーを守りながら活動できる。" },
              { icon: Clock, title: "15分単位で稼ぐ", desc: "ビデオ通話鑑定は15分から。隙間時間を完全マネタイズ。" },
              { icon: Eye, title: "霊視・タロット・四柱推命", desc: "あらゆる鑑定スタイルに対応。あなたの強みをそのまま活かせる。" },
              { icon: Star, title: "ファンクラブで月額収益", desc: "鑑定以外にも月額ファンクラブで安定した継続収益を構築。" },
              { icon: Zap, title: "開業3日で初収益", desc: "プロフィール設定後、最短3日でファンからの予約が入った実績あり。" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex gap-4 p-5 rounded-2xl"
                style={{ background: MYSTIC.cardBg, border: `1px solid ${MYSTIC.border}`, backdropFilter: "blur(16px)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "rgba(212,175,55,0.15)", border: `1px solid ${MYSTIC.border}` }}
                >
                  <Icon className="w-5 h-5" style={{ color: MYSTIC.gold }} />
                </div>
                <div>
                  <p className="font-black text-sm text-white">{title}</p>
                  <p className="text-xs text-white/50 mt-1 leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="relative px-5 py-24 text-center">
        <div
          className="max-w-2xl mx-auto rounded-3xl p-10 space-y-6"
          style={{
            background: "linear-gradient(135deg, rgba(107,33,168,0.3), rgba(212,175,55,0.1))",
            border: `1px solid ${MYSTIC.gold}`,
            boxShadow: `0 0 60px rgba(212,175,55,0.15), 0 0 120px rgba(107,33,168,0.1)`,
            backdropFilter: "blur(20px)",
          }}
        >
          <Sparkles className="w-8 h-8 mx-auto" style={{ color: MYSTIC.gold }} />
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">
            あなたの鑑定力を、<br />
            <span style={{ color: MYSTIC.gold }}>最大の価値に変える</span>
            <br />時が来た。
          </h2>
          <SlotsWidget />

          {/* 1年無料バッジ */}
          <div
            className="flex items-center justify-center gap-3 py-3 px-5 rounded-2xl"
            style={{ background: "rgba(212,175,55,0.12)", border: `1px solid ${MYSTIC.gold}` }}
          >
            <span className="text-2xl">🎁</span>
            <div className="text-left">
              <p className="font-black text-white text-sm">登録から<span style={{ color: MYSTIC.gold }}>1年間</span>サブスク無料</p>
              <p className="text-[11px] text-white/50">通常 <span className="line-through">¥3,300/月</span> → 12ヶ月間 ¥0</p>
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => navigate("/recruit")}
            className="w-full py-4 rounded-2xl font-black text-lg"
            style={{
              background: "linear-gradient(135deg, #D4AF37, #A0760F)",
              color: "#0D0A1A",
              boxShadow: "0 0 40px rgba(212,175,55,0.5)",
            }}
          >
            ✨ 今すぐ鑑定師として登録する（無料）
          </motion.button>
          <p className="text-xs text-white/30">
            審査通過後、最短当日から活動可能。1年間サブスク無料。2年目以降は月額3,300円（税込）。
          </p>
        </div>
      </section>

      {/* ご意見募集セクション */}
      <section className="relative px-5 pb-16">
        <div
          className="max-w-2xl mx-auto rounded-2xl p-6 text-center space-y-3"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", backdropFilter: "blur(16px)" }}
        >
          <p className="text-base font-black text-white">💬 ご意見・ご要望を募集しています</p>
          <p className="text-sm text-white/55 leading-relaxed">
            ChatMarketはまだ生まれたばかりのサービスです。<br />
            「こんな機能が欲しい」「ここが使いづらい」など、<br />
            鑑定師・ユーザーの皆さまの声を大切にしながら改善を続けています。<br />
            ぜひ、率直なご意見をお聞かせください。
          </p>
          <a
            href="mailto:unei@chatmarket.info?subject=ご意見・ご要望"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
          >
            📩 ご意見・ご要望を送る
          </a>
        </div>
      </section>

      {/* フッター */}
      <footer className="text-center py-8 text-white/20 text-xs" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}>
        © 2026 ChatMarket. All rights reserved.
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/terms" className="hover:text-white/50 transition-colors">利用規約</Link>
          <Link to="/privacy" className="hover:text-white/50 transition-colors">プライバシー</Link>
          <Link to="/recruit" className="hover:text-white/50 transition-colors">ライバー募集</Link>
        </div>
      </footer>
    </div>
  );
}