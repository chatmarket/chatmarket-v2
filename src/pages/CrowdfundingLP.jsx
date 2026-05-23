import React from "react";
import { Link } from "react-router-dom";
import { Heart, Shield, CheckCircle2, TrendingUp, Building2, Users, FileText, Phone, ChevronRight, Star, Zap, Globe } from "lucide-react";
import ProgressiveIncentiveChart from "@/components/plan/ProgressiveIncentiveChart";

const FEATURES = [
  {
    icon: "💰",
    title: "業界最高水準の還元率95%",
    desc: "集まった支援金のうち95%が団体に直接届きます。プラットフォーム手数料は業界最低水準の5%のみ。",
    color: "#10b981",
  },
  {
    icon: "🔒",
    title: "厳正な本人・団体審査",
    desc: "法人番号・政治団体届出番号・書類審査により、信頼性の高い団体のみが掲載されます。",
    color: "#6366f1",
  },
  {
    icon: "📋",
    title: "完全法令対応",
    desc: "政治資金規正法・NPO法に完全準拠。献金上限の自動チェック機能も搭載。",
    color: "#f59e0b",
  },
  {
    icon: "📣",
    title: "拡散・認知向上サポート",
    desc: "Chat Marketのライブ配信・動画機能と連携し、プロジェクトの認知を大きく広げられます。",
    color: "#ec4899",
  },
];

const STEPS = [
  { num: "01", title: "審査申請フォームに記入", desc: "団体情報・担当者情報・必要書類をオンラインで提出。" },
  { num: "02", title: "書類審査＋電話確認", desc: "担当者へ後日確認のお電話をさしあげます（平日10〜18時）。" },
  { num: "03", title: "審査完了・掲載開始", desc: "審査通過後、プロジェクトページが公開されます（通常3〜5営業日）。" },
  { num: "04", title: "支援金の受取", desc: "毎月末締め・翌月末払いで指定口座へ振込。" },
];

const TARGETS = [
  { icon: "🏛️", label: "NPO法人・一般社団法人" },
  { icon: "🌱", label: "市民活動・ボランティア団体" },
  { icon: "🎓", label: "学術・文化・教育団体" },
  { icon: "❤️", label: "公益・福祉・環境団体" },
];

export default function CrowdfundingLP() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ── HERO ── */}
      <section className="relative py-24 px-5 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(99,102,241,0.25) 0%, transparent 70%)" }} />
        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border"
            style={{ background: "rgba(99,102,241,0.15)", borderColor: "rgba(99,102,241,0.4)", color: "#a5b4fc" }}>
            <Heart className="w-3.5 h-3.5 fill-current" />
            NPO・市民活動団体向けクラウドファンディング
          </div>

          <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight">
            社会を変える活動を<br />
            <span style={{ background: "linear-gradient(135deg, #a5b4fc, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              確かな資金で支える
            </span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Chat Marketのクラウドファンディングは、<strong className="text-foreground">NPO法人・市民活動団体専用</strong>の<br className="hidden sm:block" />
            厳格審査つき資金調達プラットフォームです。<br />
            還元率<strong className="text-primary">業界最高水準95%</strong>で、支援が直接届きます。
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/crowdfunding/apply">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-white transition-all hover:scale-105 active:scale-95 shadow-2xl"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 30px rgba(99,102,241,0.4)" }}>
                <span className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5" />
                  審査申請する（無料）
                </span>
              </button>
            </Link>
            <Link to="/crowdfunding">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-muted-foreground hover:text-foreground transition-all border border-border/50 hover:border-primary/40">
                <span className="flex items-center justify-center gap-2">
                  <Globe className="w-4 h-4" />
                  掲載プロジェクトを見る
                </span>
              </button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2">
            <Shield className="w-4 h-4 text-green-400" />
            <span className="text-xs text-muted-foreground">NPO法に完全準拠・厳正審査制</span>
          </div>
        </div>
      </section>

      {/* ── HERO IMAGE ── */}
      <section className="px-4 sm:px-8 py-8">
        <div className="max-w-4xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
          <img
            src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/44f967cf9_generated_image.png"
            alt="NPO・市民活動団体向けクラウドファンディング — 社会貢献活動を支える仲間たち"
            className="w-full h-auto block"
          />
        </div>
      </section>

      {/* ── 対象団体 ── */}
      <section className="py-16 px-5 border-y border-border/30">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">対象団体</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TARGETS.map(t => (
              <div key={t.label} className="p-4 rounded-2xl bg-card border border-border/40 text-center space-y-2">
                <div className="text-2xl">{t.icon}</div>
                <p className="text-xs font-bold text-foreground">{t.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">FEATURES</p>
            <h2 className="text-3xl font-black">選ばれる4つの理由</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl space-y-3"
                style={{ background: `${f.color}10`, border: `1px solid ${f.color}25` }}>
                <div className="text-3xl">{f.icon}</div>
                <h3 className="font-black text-base" style={{ color: f.color }}>{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEPS ── */}
      <section className="py-20 px-5 border-t border-border/30">
        <div className="max-w-xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">FLOW</p>
            <h2 className="text-3xl font-black">掲載までの流れ</h2>
          </div>
          <div className="relative space-y-0">
            <div className="absolute left-7 top-8 bottom-8 w-px bg-border/40" />
            {STEPS.map(s => (
              <div key={s.num} className="flex items-start gap-5 pb-8 last:pb-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-sm font-black shrink-0 z-10 text-white"
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}>
                  {s.num}
                </div>
                <div className="pt-3">
                  <p className="font-black text-base">{s.title}</p>
                  <p className="text-muted-foreground text-sm mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── プログレッシブインセンティブ ── */}
      <section className="py-20 px-5 border-t border-border/30">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">REVENUE MODEL</p>
            <h2 className="text-3xl font-black">集まるほど、還元率が上がる</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Chat Marketのクラウドファンディングには<strong className="text-foreground">プログレッシブインセンティブ</strong>が導入されています。<br />
              月間累計支援額が増えるほど自動的に還元率がアップ。申請・手続き不要です。
            </p>
          </div>
          <ProgressiveIncentiveChart />
          <div className="grid grid-cols-3 gap-3 text-center">
            {[
              { label: "スタート時", rate: "85%", sub: "〜100万円" },
              { label: "成長フェーズ", rate: "91%", sub: "600万円〜" },
              { label: "最大還元", rate: "95%", sub: "2000万円〜" },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-2xl bg-card border border-border/40 space-y-1">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-2xl font-black text-primary">{item.rate}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* ── SECURITY IMAGE ── */}
      <section className="py-12 px-4 sm:px-8 border-t border-border/30">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase text-muted-foreground">SECURITY</p>
            <h2 className="text-2xl sm:text-3xl font-black">鉄壁の資金安全管理</h2>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              支援金は当社運転資金と完全に隔離された信託口で分別管理。<br className="hidden sm:block" />
              国際基準Stripe決済により持ち逃げリスクをゼロ化しています。
            </p>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-2xl">
            <img
              src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/021f66753_generated_image.png"
              alt="信託口分別管理・セキュア資金フロー可視化"
              className="w-full h-auto object-cover"
              style={{ maxHeight: "380px", objectFit: "cover" }}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: "🔐", title: "信託口 分別管理", desc: "支援金は運転資金と完全隔離。信託口座で安全に保全。" },
              { icon: "🌐", title: "Stripe 国際基準決済", desc: "PCI DSS準拠の国際決済インフラで資金移動を直接処理。" },
              { icon: "📜", title: "NPO法・法令完全対応", desc: "厳正な審査により適切な団体のみ掲載。法令遵守を仕組みで担保。" },
            ].map(item => (
              <div key={item.title} className="p-5 rounded-2xl bg-card border border-border/40 space-y-2">
                <div className="text-2xl">{item.icon}</div>
                <p className="font-black text-sm text-foreground">{item.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMING SOON ── */}
      <section className="py-20 px-5 border-t border-border/30">
        <div className="max-w-2xl mx-auto rounded-2xl p-8 space-y-5"
          style={{ background: "rgba(99,102,241,0.07)", border: "1px solid rgba(99,102,241,0.25)" }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black"
            style={{ background: "rgba(99,102,241,0.2)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }}>
            🔔 COMING SOON
          </div>
          <h2 className="text-xl sm:text-2xl font-black leading-snug">
            【近日公開】NPO・市民活動団体特化型 審査制クラウドファンディング<br />
            <span style={{ color: "#a5b4fc" }}>（最高還元率95%・完全分別管理）</span>
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Chat Marketは、社会貢献を行うNPO法人や市民活動団体を対象とした、厳格な審査制クラウドファンディング機能を間もなくリリースします。
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            総額2,000万円を超える大型プロジェクトにおいて<strong className="text-foreground">【業界最高峰の還元率95%（手数料わずか5%）】</strong>を実現。さらに、スタートアップとしての信頼性と安全性を担保するため、お預かりする支援金は当社の運転資金とは完全に隔離された<strong className="text-foreground">【信託口での分別管理】</strong>を徹底。決済インフラは国際基準のセキュリティをクリアした大手決済機関と直接連動し、プラットフォームによる資金移動リスクをゼロ化しました。不正や持ち逃げの余地を一切排除した、日本一クリーンで安全な大型ドネーション特化型インフラです。
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {["信託口分別管理", "NPO法完全対応", "還元率最高95%", "Stripe国際基準決済", "厳格審査制"].map(tag => (
              <span key={tag} className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                ✓ {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-5 text-center border-t border-border/30">
        <div className="max-w-md mx-auto space-y-6">
          <Heart className="w-10 h-10 mx-auto text-primary" />
          <h2 className="text-3xl font-black">今すぐ審査申請する</h2>
          <p className="text-muted-foreground text-sm">申請は無料。審査通過後にプロジェクトが公開されます。</p>
          <Link to="/crowdfunding/apply">
            <button className="px-10 py-5 rounded-2xl font-black text-lg text-white w-full sm:w-auto transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", boxShadow: "0 0 40px rgba(99,102,241,0.4)" }}>
              <span className="flex items-center justify-center gap-2">
                <FileText className="w-5 h-5" />
                審査申請フォームへ
              </span>
            </button>
          </Link>
          <p className="text-xs text-muted-foreground">審査完了まで通常3〜5営業日。担当者より電話確認があります。</p>
        </div>
      </section>
    </div>
  );
}