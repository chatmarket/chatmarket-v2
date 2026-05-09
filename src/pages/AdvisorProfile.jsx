import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { Twitter, Instagram, Star, Shield, Award, TrendingUp, Crown, Heart, ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

const ACHIEVEMENTS = [
  { icon: "🏆", title: "Chat Market 代表・創業者", desc: "アイドル・タレント向け収益化プラットフォームを設立" },
  { icon: "💎", title: "業界最高水準85%還元率", desc: "クリエイターファーストの収益構造を実現" },
  { icon: "🔮", title: "占い師・アイドル支援実績", desc: "多数のタレントの独立・収益化をサポート" },
  { icon: "📱", title: "SNSマーケティング専門家", desc: "インスタ・X・TikTokを活用した集客戦略" },
];

const MEDIA_QUOTE = [
  "「事務所に搾取されてきたアイドルたちに、正当な報酬を届けたい」",
  "「あなたのファンはあなたを直接応援したいと思っている。その橋渡しをするのが私の使命」",
  "「テクノロジーがアイドルを自由にする。Chat Marketはその証明だ」",
];

export default function AdvisorProfile() {
  useEffect(() => {
    // OGP設定
    document.title = "小野 賢一 | Chat Market公認アドバイザー | アイドル界の救世主";

    const setMeta = (property, content, attr = "property") => {
      let el = document.querySelector(`meta[${attr}="${property}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, property); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("og:title", "小野 賢一 | Chat Market公認アドバイザー");
    setMeta("og:description", "アイドル界の救世主。事務所なしで月20万超えを実現した配信者たちを輩出。Chat Marketが全力サポート。");
    setMeta("og:image", "https://chatmarket.info/og-image.png");
    setMeta("og:type", "profile");
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", "小野 賢一 | Chat Market公認アドバイザー", "name");
    setMeta("twitter:description", "アイドルが事務所なしで稼げる時代が来た。Chat Marketで夢を現実に。", "name");
  }, []);

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-inter">

      {/* ── HERO ── */}
      <section className="relative pt-16 pb-20 px-5 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(168,85,247,0.25) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 max-w-xl mx-auto space-y-6">
          {/* バッジ */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc" }}>
            <Shield className="w-3.5 h-3.5" />
            Chat Market 公認アドバイザー
          </div>

          {/* アバター */}
          <div className="relative inline-block">
            <div className="w-28 h-28 rounded-full mx-auto flex items-center justify-center text-4xl font-black relative z-10"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", boxShadow: "0 0 50px rgba(168,85,247,0.7)" }}>
              小野
            </div>
            {/* リング */}
            <div className="absolute inset-0 rounded-full animate-ping"
              style={{ background: "rgba(168,85,247,0.2)", animationDuration: "2s" }} />
          </div>

          <div>
            <h1 className="text-4xl sm:text-5xl font-black">小野 賢一</h1>
            <p className="text-white/50 text-base mt-2">Chat Market 代表 / アイドル界の救世主</p>
          </div>

          {/* タグライン */}
          <p className="text-lg sm:text-xl font-black leading-relaxed"
            style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            「事務所なしでもアイドルは輝ける」
          </p>

          {/* SNSリンク */}
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <a href="https://twitter.com/chatmarket_jp" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
              <Twitter className="w-4 h-4" /> X (@chatmarket_jp)
            </a>
            <a href="https://instagram.com/chatmarket_jp" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
              style={{ background: "rgba(236,72,153,0.15)", border: "1px solid rgba(236,72,153,0.4)", color: "#f9a8d4" }}>
              <Instagram className="w-4 h-4" /> Instagram
            </a>
            <Link to="/idol-lp">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)" }}>
                <Crown className="w-4 h-4" /> アイドルLP
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── MISSION ── */}
      <section className="py-16 px-5" style={{ background: "#0d001a" }}>
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-black text-center">ミッション</h2>
          <div className="p-7 rounded-2xl space-y-5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(168,85,247,0.2)" }}>
            <p className="text-white/80 text-base leading-[1.9] whitespace-pre-line">
{`アイドルやタレントが「事務所」「レコード会社」「投資家」に頼らなくても
自分の力で生計を立てられる社会を作ること。

それが Chat Market を作った理由です。

才能がある子が、お金がないから諦める。
輝いているのに、搾取され続ける。
そんな理不尽な現実を、テクノロジーで変えたい。

一人でも多くのアイドルが、
自分のペースで、自分らしく、
ファンと直接つながって輝き続けられる世界へ。`}
            </p>
          </div>
        </div>
      </section>

      {/* ── ACHIEVEMENTS ── */}
      <section className="py-16 px-5" style={{ background: "#1a0033" }}>
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-black text-center">実績・専門領域</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ACHIEVEMENTS.map((a) => (
              <div key={a.title} className="flex gap-4 p-5 rounded-2xl"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.2)" }}>
                <div className="text-2xl shrink-0">{a.icon}</div>
                <div>
                  <p className="font-black text-sm">{a.title}</p>
                  <p className="text-white/55 text-xs mt-0.5">{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── QUOTES ── */}
      <section className="py-16 px-5" style={{ background: "#0d001a" }}>
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-black text-center">メディアでの発言</h2>
          {MEDIA_QUOTE.map((q, i) => (
            <div key={i} className="flex gap-4 p-5 rounded-2xl" style={{ background: "rgba(236,72,153,0.08)", border: "1px solid rgba(236,72,153,0.2)" }}>
              <div className="text-pink-400 text-4xl font-black leading-none shrink-0 mt-1">"</div>
              <p className="text-white/80 text-sm leading-relaxed italic">{q}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM FEATURES ── */}
      <section className="py-16 px-5" style={{ background: "#1a0033" }}>
        <div className="max-w-2xl mx-auto space-y-8">
          <h2 className="text-2xl font-black text-center">Chat Market で実現できること</h2>
          <div className="space-y-3">
            {[
              "初期費用ゼロ・審査なしで今日から配信できる",
              "売上の85%があなたの手元に届く（業界最高水準）",
              "ライブ配信・動画販売・1on1通話・ファンクラブを一括管理",
              "ファンと直接つながる本物のコミュニティ",
              "小野アドバイザーによる個別サポート対応",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3 px-5 py-3.5 rounded-xl"
                style={{ background: "rgba(168,85,247,0.08)", border: "1px solid rgba(168,85,247,0.15)" }}>
                <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: "#c084fc" }} />
                <p className="text-sm text-white/80">{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-5 text-center" style={{ background: "#000" }}>
        <div className="max-w-md mx-auto space-y-6">
          <h2 className="text-3xl font-black">アイドルとして<br />輝きたいあなたへ</h2>
          <p className="text-white/50 text-sm">一緒に夢を現実にしましょう。</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/idol-lp">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-105"
                style={{ background: "linear-gradient(135deg, #f0abfc, #ec4899)", boxShadow: "0 0 40px rgba(236,72,153,0.4)" }}>
                <span className="flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5" /> 詳しく見る
                </span>
              </button>
            </Link>
            <Link to="/recruit">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-white transition-all"
                style={{ border: "1px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}>
                無料で登録する
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}