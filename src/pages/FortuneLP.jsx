import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Sparkles, Moon, Eye, Clock, Shield, TrendingUp, ChevronDown, Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetaHelmet from "@/components/layout/MetaHelmet";

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

      <div className="relative p-5 space-y-3">
        {/* バッジ（カード内上部に移動・絶対配置廃止） */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(107,33,168,0.4), rgba(212,175,55,0.2))",
              border: `1px solid ${MYSTIC.border}`,
              boxShadow: "0 0 20px rgba(212,175,55,0.15)",
            }}
          >
            {profile.avatar}
          </div>
          {/* 名前・専門 */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="font-black text-base text-white leading-tight break-all">{profile.name}</p>
              <span
                className="text-[9px] font-black px-2 py-0.5 rounded-full shrink-0"
                style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)", color: "#0D0A1A" }}
              >
                {profile.badge}
              </span>
            </div>
            <p className="text-xs mt-0.5 leading-snug" style={{ color: MYSTIC.gold }}>{profile.specialty}</p>
            <p className="text-[11px] text-white/40 mt-0.5">経験 {profile.years}年</p>
          </div>
        </div>

        {/* キャッチ */}
        <p className="text-sm text-white/65 leading-relaxed" style={{ fontStyle: "italic" }}>
          "{profile.tagline}"
        </p>

        {/* タグ */}
        <div className="flex flex-wrap gap-1">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "rgba(168,85,247,0.15)", color: "#C084FC", border: "1px solid rgba(168,85,247,0.3)" }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* スタッツ */}
        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-white/5">
          <div className="text-center py-1">
            <p className="text-base font-black" style={{ color: MYSTIC.gold }}>{profile.rating}</p>
            <p className="text-[9px] text-white/40">評価</p>
          </div>
          <div className="text-center py-1">
            <p className="text-base font-black text-white">{profile.reviews.toLocaleString()}</p>
            <p className="text-[9px] text-white/40">鑑定数</p>
          </div>
          <div className="text-center py-1">
            <p className="text-base font-black" style={{ color: "#34D399" }}>¥{(profile.monthly / 10000).toFixed(0)}万</p>
            <p className="text-[9px] text-white/40">月収目安</p>
          </div>
        </div>

        {/* CTA */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="w-full py-2.5 rounded-2xl font-black text-sm transition-all"
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

// ── お問い合わせフォーム ──
function ContactForm() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !message) return;
    setSending(true);
    try {
      const { base44 } = await import("@/api/base44Client");
      await base44.integrations.Core.SendEmail({
        to: "unei@chatmarket.info",
        from_name: name || "匿名",
        subject: `【ご意見・ご要望】${name || "匿名"} より`,
        body: `送信者名: ${name || "匿名"}\nメール: ${email}\n\n${message}`,
      });
      setSent(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-80"
        style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }}
      >
        📩 ご意見・ご要望を送る
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: "#1a1030", border: `1px solid ${MYSTIC.border}` }}>
            {sent ? (
              <div className="text-center py-6 space-y-3">
                <p className="text-3xl">✨</p>
                <p className="font-black text-white text-lg">送信完了しました！</p>
                <p className="text-sm text-white/60">ご意見ありがとうございます。</p>
                <button onClick={() => { setOpen(false); setSent(false); setName(""); setEmail(""); setMessage(""); }}
                  className="mt-2 px-6 py-2 rounded-xl text-sm font-bold text-white/70 border border-white/20 hover:border-white/40 transition-all">
                  閉じる
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="font-black text-white text-base">💬 ご意見・ご要望</p>
                  <button type="button" onClick={() => setOpen(false)} className="text-white/40 hover:text-white text-xl leading-none">✕</button>
                </div>
                <input
                  type="text"
                  placeholder="お名前（任意）"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                />
                <input
                  type="email"
                  placeholder="メールアドレス *"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 placeholder:text-white/30"
                />
                <textarea
                  placeholder="ご意見・ご要望をお書きください *"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  rows={5}
                  className="w-full px-4 py-2.5 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:outline-none focus:border-white/30 placeholder:text-white/30 resize-none"
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setOpen(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white/60 border border-white/10 hover:border-white/30 transition-all">
                    キャンセル
                  </button>
                  <button type="submit" disabled={sending || !email || !message}
                    className="flex-1 py-2.5 rounded-xl text-sm font-black transition-all disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)", color: "#0D0A1A" }}>
                    {sending ? "送信中..." : "送信する"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ── メインLP ──
export default function FortuneLP() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: MYSTIC.deepBg, color: "#fff", fontFamily: "'M PLUS Rounded 1c', sans-serif" }}
    >
      <MetaHelmet
        title="占い師向けプラットフォーム | ChatMarket（チャットマーケット）"
        description="占い師・タロット・霊視・四柱推命の鑑定師向け最高峰プラットフォーム。ビデオ通話・チャット鑑定・ライブ配信で月収100万円超の実績。1年間Basicプラン無料。今すぐ無料登録。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/27cf5990b_generated_image.png"
      />
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
              <span style={{ color: MYSTIC.gold }}>Basicプラン</span>が<br />登録から<span style={{ color: MYSTIC.gold }}>1年間</span>、完全無料！
            </p>
            <p className="text-sm text-white/60">
              通常月額 <span className="line-through text-white/40">¥3,300</span>
              　→　<span className="font-black text-white">¥0</span>／月（12ヶ月間）
            </p>
            <p className="text-[10px] text-white/35 mt-0.5">※ Basicプランのみ対象。1年経過後は月額3,300円（税込）が発生します</p>
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

      {/* ── オンライン占いシーン ── */}
      <section className="relative px-5 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* 画像（レスポンシブ） */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-3xl overflow-hidden shadow-2xl order-2 md:order-1"
              style={{
                boxShadow: `0 0 60px rgba(212,175,55,0.25), 0 0 120px rgba(107,33,168,0.15)`,
              }}
            >
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/27cf5990b_generated_image.png"
                alt="女性占い師がオンラインで鑑定中"
                className="w-full h-auto object-cover aspect-[4/3] md:aspect-auto"
              />
            </motion.div>

            {/* テキストセクション */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6 order-1 md:order-2"
            >
              <div className="space-y-2">
                <p className="text-sm font-bold tracking-widest uppercase" style={{ color: MYSTIC.gold }}>
                  ✨ あなたのスタイルで稼ぐ
                </p>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight text-white">
                  自宅でも、カフェでも。<br />
                  <span style={{ color: MYSTIC.gold }}>どこからでも鑑定できる</span>
                </h2>
              </div>

              <p className="text-base text-white/60 leading-relaxed">
                ChatMarketはビデオ通話中心の鑑定プラットフォーム。スマートフォン1台あれば、いつでもどこからでも鑑定活動をスタートできます。移動時間ゼロ、装置費用ゼロ。あなたの時間を、最大限に活用してください。
              </p>

              <ul className="space-y-3">
                {[
                  "スマホ1台でいますぐ始める",
                  "移動時間ゼロで効率最大化",
                  "24時間・365日、好きな時間に配信",
                  "ファンは世界135カ国以上から訪問",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-black"
                      style={{ background: MYSTIC.gold }}>✓</span>
                    <span className="text-sm text-white/75">{item}</span>
                  </li>
                ))}
              </ul>

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => document.querySelector("header")?.scrollIntoView({ behavior: "smooth" })}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base transition-all hover:scale-105"
                style={{
                  background: "linear-gradient(135deg, #D4AF37, #A0760F)",
                  color: "#0D0A1A",
                  boxShadow: "0 0 30px rgba(212,175,55,0.4)",
                }}
              >
                今すぐ始める →
              </motion.button>
            </motion.div>
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
              { icon: Star, title: "チャット鑑定で非同期収益", desc: "ビデオ通話が難しいお客様にも対応。テキストで鑑定し、空き時間に返信するだけ。" },
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

      {/* ── チャット鑑定セクション ── */}
      <section className="relative px-5 py-20">
        <div className="max-w-4xl mx-auto space-y-10">
          {/* タイトル */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center space-y-3"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.4)", color: "#C084FC" }}>
              💬 NEW FEATURE
            </div>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              チャット鑑定で、<br />
              <span style={{ color: MYSTIC.gold }}>場所・時間を選ばずに稼ぐ</span>
            </h2>
            <p className="text-sm text-white/55 max-w-xl mx-auto leading-relaxed">
              ビデオ通話が難しいお客様にも対応できる非同期テキスト鑑定。相談文を受け取り、空き時間に返信するだけ。ライブ配信・通話と組み合わせて収益の幅を広げましょう。
            </p>
          </motion.div>

          {/* 仕組み */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "01", icon: "📩", title: "相談を受け取る", desc: "相談者がテキストで質問を送信します（無料お試し：冒頭60文字）" },
              { step: "02", icon: "🔮", title: "鑑定を返信する", desc: "空き時間に鑑定内容を入力。最大1,000文字まで丁寧に回答できます" },
              { step: "03", icon: "💰", title: "チケット収益を受け取る", desc: "相談者がチケットを購入すると即座にコインが振り込まれます（85%還元）" },
            ].map(({ step, icon, title, desc }) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative rounded-2xl p-5 space-y-3"
                style={{ background: MYSTIC.cardBg, border: `1px solid ${MYSTIC.border}`, backdropFilter: "blur(20px)" }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-black tracking-widest" style={{ color: MYSTIC.gold }}>STEP {step}</span>
                </div>
                <p className="font-black text-sm text-white">{title}</p>
                <p className="text-xs text-white/50 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>

          {/* 価格設定の自由度 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-3xl p-7 space-y-6"
            style={{
              background: "linear-gradient(135deg, rgba(107,33,168,0.25), rgba(212,175,55,0.08))",
              border: `1px solid ${MYSTIC.gold}`,
              boxShadow: `0 0 40px rgba(212,175,55,0.1)`,
              backdropFilter: "blur(20px)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎯</span>
              <div>
                <p className="font-black text-white text-lg">チケット価格は自由に設定できる</p>
                <p className="text-xs text-white/50 mt-0.5">最低500円（コイン換算500コイン）以上で、自分の鑑定スタイルに合わせて自由に設定</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { price: "500コイン", yen: "≒ ¥500〜", label: "ライト相談", desc: "恋愛・仕事の気軽な相談", color: "#A855F7" },
                { price: "1,000コイン", yen: "≒ ¥1,000〜", label: "スタンダード", desc: "1〜2テーマの詳細鑑定", color: "#D4AF37" },
                { price: "3,000コイン", yen: "≒ ¥3,000〜", label: "プレミアム", desc: "複数テーマの深掘り鑑定", color: "#F59E0B" },
                { price: "自由設定", yen: "上限なし", label: "カスタム", desc: "実力に見合った価格設定", color: "#34D399" },
              ].map(({ price, yen, label, desc, color }) => (
                <div key={label} className="rounded-2xl p-4 text-center space-y-1.5"
                  style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${color}44` }}>
                  <p className="font-black text-sm" style={{ color }}>{price}</p>
                  <p className="text-[10px] text-white/40">{yen}</p>
                  <p className="font-bold text-xs text-white">{label}</p>
                  <p className="text-[10px] text-white/40 leading-snug">{desc}</p>
                </div>
              ))}
            </div>

            <div className="bg-white/5 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-white/80">💡 収益シミュレーション（例：1,000コイン設定の場合）</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-black" style={{ color: MYSTIC.gold }}>¥850</p>
                  <p className="text-[10px] text-white/40">1件の手取り（85%還元）</p>
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: "#A855F7" }}>¥4,250</p>
                  <p className="text-[10px] text-white/40">5件 / 日</p>
                </div>
                <div>
                  <p className="text-lg font-black" style={{ color: "#34D399" }}>¥127,500</p>
                  <p className="text-[10px] text-white/40">30日継続</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 flex items-start gap-2 text-xs text-white/50">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>2往復（計4通）の往復鑑定が1チケットで完結
              </div>
              <div className="flex-1 flex items-start gap-2 text-xs text-white/50">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>冒頭60文字は無料プレビューで購入率アップ
              </div>
              <div className="flex-1 flex items-start gap-2 text-xs text-white/50">
                <span className="text-green-400 mt-0.5 shrink-0">✓</span>最低価格500コイン（約500円）以上で自由設定
              </div>
            </div>
          </motion.div>
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
              <p className="font-black text-white text-sm"><span style={{ color: MYSTIC.gold }}>Basicプラン</span>が登録から<span style={{ color: MYSTIC.gold }}>1年間</span>無料</p>
              <p className="text-[11px] text-white/50">通常 <span className="line-through">¥3,300/月</span> → 12ヶ月間 ¥0（Basic限定）</p>
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
            審査通過後、最短当日から活動可能。Basicプランのみ登録から1年間無料。2年目以降は月額3,300円（税込）。
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
          <ContactForm />
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