import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star, Heart, Sparkles, ChevronRight, Play, Shield, TrendingUp, Coins, Radio, Phone, Crown, Instagram, Twitter, ArrowRight, CheckCircle2, Zap, Send } from "lucide-react";
import IdolApplicationForm from "../components/recruit/IdolApplicationForm";
import MetaHelmet from "@/components/layout/MetaHelmet";
import ActiveCreatorsSection from "@/components/lp/ActiveCreatorsSection";

const STATS = [
  { value: "85%", label: "収益還元率", sub: "業界最高水準" },
  { value: "0円", label: "初期費用", sub: "完全無料スタート" },
  { value: "24h", label: "サポート体制", sub: "いつでも相談OK" },
  { value: "3分", label: "セットアップ", sub: "すぐ配信開始" },
];

const FEATURES = [
  {
    icon: "💎",
    title: "PPVライブ配信",
    desc: "ファンが課金して視聴する有料ライブ。歌・ダンス・トーク何でもOK。視聴者数無制限。",
    color: "#a855f7",
  },
  {
    icon: "📱",
    title: "1対1ビデオ通話",
    desc: "ファンと直接つながる個別通話。あなたのスケジュールで受付でき、15分から設定可能。",
    color: "#ec4899",
  },
  {
    icon: "🎬",
    title: "動画販売",
    desc: "撮りためた動画を繰り返し販売。寝ている間も稼げる不労所得型コンテンツ。",
    color: "#f59e0b",
  },
  {
    icon: "👑",
    title: "ファンクラブ",
    desc: "月額課金型のオフィシャルファンクラブ。限定コンテンツで熱狂的なファンを育てる。",
    color: "#10b981",
  },
];

const STEPS = [
  { num: "01", title: "無料登録", desc: "メールアドレスだけで30秒登録完了。クレカ不要。" },
  { num: "02", title: "チャンネル作成", desc: "プロフィール写真とひとこと紹介を設定するだけ。" },
  { num: "03", title: "配信 or 動画公開", desc: "スマホ1台でライブ開始。動画もそのままアップ。" },
  { num: "04", title: "収益受取", desc: "売上は毎月振込。稼いだ分だけ確実に手元に届く。" },
];

const VOICES = [
  { name: "Rena（21）", tag: "元地下アイドル", quote: "事務所なしで月20万超えました。自分のペースで活動できるのが最高です！", color: "#ec4899" },
  { name: "Miu（19）", tag: "活動中アイドル", quote: "副業として始めたら本業より稼げるようになりました。ファンとの距離が近くて楽しい！", color: "#a855f7" },
  { name: "Hana（23）", tag: "引退後に再開", quote: "引退してたけどここで復活。顔出しなしの音声配信から始めて今は月15万円！", color: "#f59e0b" },
];

export default function IdolLP() {
  const [scrollY, setScrollY] = useState(0);
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  useEffect(() => {
    document.title = "アイドル・タレント専用 | Chat Market";
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-inter">
      <MetaHelmet
        title="アイドル・タレント向け収益化プラットフォーム | ChatMarket（チャットマーケット）"
        description="アイドル・タレント・インフルエンサー向けライブ配信・動画販売プラットフォーム。事務所不要・初期費用0円。1対1ビデオ通話・PPVライブ・ファンクラブで還元率85%の収益化。登録から1年間Basicプラン無料。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/e8cd1b6f2_generated_image.png"
      />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(168,85,247,0.35) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
          {/* 光の粒子 */}
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute rounded-full" style={{
              width: Math.random() * 4 + 1,
              height: Math.random() * 4 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: i % 3 === 0 ? "#a855f7" : i % 3 === 1 ? "#ec4899" : "#fff",
              opacity: Math.random() * 0.6 + 0.2,
              animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 3}s`,
            }} />
          ))}
        </div>

        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          {/* ブランドラベル */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc" }}>
            <Star className="w-3.5 h-3.5 fill-current" />
            Chat Market × アイドル
          </div>

          {/* メインコピー */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
            あなたの輝きを<br />
            <span style={{
              background: "linear-gradient(135deg, #f0abfc, #c084fc, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              収益に変えよう
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-md mx-auto">
            事務所いらず、初期費用ゼロ。<br />
            あなたのファンが<strong className="text-white">直接あなたを応援</strong>できるプラットフォーム。
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <button
              onClick={() => setShowApplicationForm(true)}
              className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-105 active:scale-95 shadow-2xl"
              style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", boxShadow: "0 0 40px rgba(236,72,153,0.5)" }}>
              <span className="flex items-center justify-center gap-2">
                <Send className="w-5 h-5" />
                スカウト応募する
              </span>
            </button>
            <Link to="/recruit">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-white/80 hover:text-white transition-all border"
                style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}>
                <span className="flex items-center justify-center gap-2">
                  <Crown className="w-4 h-4" />
                  無料でデビューする
                </span>
              </button>
            </Link>
          </div>

          {/* ミニ信頼バッジ */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/50">Chat Market公認アドバイザー 小野が直接サポート</span>
          </div>
        </div>

        {/* スクロール矢印 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-white/30 rotate-90" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-5" style={{ background: "linear-gradient(180deg, #000 0%, #0d001a 100%)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <p className="text-3xl sm:text-4xl font-black" style={{ background: "linear-gradient(135deg, #f0abfc, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </p>
              <p className="text-sm font-bold text-white mt-1">{s.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── GROUP LIVE IMAGE ── */}
      <section className="py-16 sm:py-20 px-5" style={{ background: "linear-gradient(180deg, #0d001a 0%, #1a0033 100%)" }}>
       <div className="max-w-4xl mx-auto">
         <div className="rounded-2xl overflow-hidden shadow-2xl">
           <img 
             src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/e8cd1b6f2_generated_image.png"
             alt="女性アイドルグループのオンラインライブ配信"
             className="w-full h-auto object-cover"
           />
         </div>
       </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-5" style={{ background: "#0d001a" }}>
       <div className="max-w-3xl mx-auto space-y-10">
         <div className="text-center space-y-3">
           <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#c084fc" }}>FEATURES</p>
           <h2 className="text-3xl sm:text-4xl font-black">4つの収益化ルート</h2>
           <p className="text-white/50 text-sm">あなたのスタイルに合わせて選べる</p>
         </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl space-y-3 hover:scale-[1.02] transition-transform"
                style={{ background: `${f.color}10`, border: `1px solid ${f.color}30` }}>
                <div className="text-3xl">{f.icon}</div>
                <h3 className="font-black text-lg" style={{ color: f.color }}>{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ONE-ON-ONE CALL IMAGE ── */}
      <section className="py-16 sm:py-20 px-5" style={{ background: "#0d001a" }}>
       <div className="max-w-4xl mx-auto">
         <div className="rounded-2xl overflow-hidden shadow-2xl">
           <img 
             src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/27cf5990b_generated_image.png"
             alt="1対1オンラインビデオ通話"
             className="w-full h-auto object-cover"
           />
         </div>
       </div>
      </section>

      {/* ── 収益シミュレーター（簡易） ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #0d001a 0%, #1a0033 100%)" }}>
       <div className="max-w-md mx-auto text-center space-y-8">
         <div className="space-y-2">
           <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#ec4899" }}>REVENUE</p>
           <h2 className="text-3xl font-black">こんなに稼げる</h2>
         </div>
          <div className="space-y-3">
            {[
              { scenario: "週2回ライブ配信 (50人視聴)", monthly: "約¥40,000〜" },
              { scenario: "1on1通話 月20件 (30分¥3,000)", monthly: "約¥51,000〜" },
              { scenario: "動画販売 月30本 (¥1,000/本)", monthly: "約¥25,500〜" },
              { scenario: "ファンクラブ 50人 (月¥1,000)", monthly: "約¥42,500〜" },
            ].map((row) => (
              <div key={row.scenario} className="flex items-center justify-between px-5 py-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <p className="text-sm text-white/70 text-left flex-1">{row.scenario}</p>
                <p className="text-base font-black shrink-0 ml-3" style={{ color: "#f0abfc" }}>{row.monthly}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-white/30">※還元率85%で計算。実際の収益は活動状況により異なります。</p>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="py-20 px-5" style={{ background: "#1a0033" }}>
        <div className="max-w-xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#c084fc" }}>HOW TO START</p>
            <h2 className="text-3xl font-black">始め方はたった4ステップ</h2>
          </div>
          <div className="relative space-y-0">
            {/* 縦ライン */}
            <div className="absolute left-7 top-8 bottom-8 w-px" style={{ background: "linear-gradient(to bottom, #a855f7, #ec4899)" }} />
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex items-start gap-5 pb-8 last:pb-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-black shrink-0 z-10"
                  style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", boxShadow: "0 0 20px rgba(168,85,247,0.5)" }}>
                  {s.num}
                </div>
                <div className="pt-3">
                  <p className="font-black text-base">{s.title}</p>
                  <p className="text-white/55 text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VOICES ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #1a0033 0%, #0d001a 100%)" }}>
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#f59e0b" }}>VOICES</p>
            <h2 className="text-3xl font-black">活躍中のメンバーの声</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VOICES.map((v) => (
              <div key={v.name} className="p-5 rounded-2xl space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${v.color}30` }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
                  style={{ background: `${v.color}20`, border: `2px solid ${v.color}50` }}>
                  ✨
                </div>
                <p className="text-xs font-bold" style={{ color: v.color }}>{v.name} · {v.tag}</p>
                <p className="text-white/70 text-sm leading-relaxed">「{v.quote}」</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── SCOUT APPLICATION CTA ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #0d001a 0%, #1a0008 100%)" }}>
        <div className="max-w-md mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "rgba(236,72,153,0.2)", border: "1px solid rgba(236,72,153,0.5)", color: "#f9a8d4" }}>
            🌟 SCOUT APPLICATION
          </div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight">
            スカウトに<br />
            <span style={{ background: "linear-gradient(135deg, #f9a8d4, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              応募する
            </span>
          </h2>
          <p className="text-white/55 text-sm leading-relaxed">
            Chat Market公認アドバイザー 小野が直接審査。<br />
            写真・SNSアカウントを送るだけで簡単応募！
          </p>
          <button
            onClick={() => setShowApplicationForm(true)}
            className="w-full px-8 py-5 rounded-2xl font-black text-base text-black transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", boxShadow: "0 0 40px rgba(236,72,153,0.5)" }}>
            <span className="flex items-center justify-center gap-2">
              <Send className="w-5 h-5" />
              今すぐ応募フォームを開く
            </span>
          </button>
          <p className="text-xs text-white/30">※応募は無料です。選考結果はメールでお知らせします。</p>
        </div>
      </section>

      {/* ── 実際に活躍中のアイドル ── */}
      <section className="py-16 px-5" style={{ background: "linear-gradient(180deg, #0d001a 0%, #000 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <ActiveCreatorsSection
            serviceCategory="other"
            title="実際に活躍中のクリエイター"
            accentColor="#ec4899"
            theme="dark"
          />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-5 text-center" style={{ background: "linear-gradient(180deg, #000 0%, #0d001a 50%, #000 100%)" }}>
        <div className="max-w-md mx-auto space-y-6">
          <Sparkles className="w-10 h-10 mx-auto" style={{ color: "#f0abfc" }} />
          <h2 className="text-3xl sm:text-4xl font-black leading-tight">
            今すぐ<br />
            <span style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              あなたの時代
            </span>
            を始めよう
          </h2>
          <p className="text-white/50 text-sm">初期費用ゼロ・審査なし・今日から配信できます</p>
          <Link to="/recruit">
            <button className="px-10 py-5 rounded-2xl font-black text-lg text-black w-full sm:w-auto transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", boxShadow: "0 0 50px rgba(236,72,153,0.5)" }}>
              <span className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5" />
                無料デビュー登録
              </span>
            </button>
          </Link>
          <p className="text-xs text-white/30">登録はメールアドレスだけ。クレカ不要。いつでも退会できます。</p>
        </div>
      </section>

      {/* 応募フォームモーダル */}
      {showApplicationForm && (
        <IdolApplicationForm open={showApplicationForm} onClose={() => setShowApplicationForm(false)} />
      )}

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}