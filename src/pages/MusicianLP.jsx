import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Music, Mic2, Radio, Phone, TrendingUp, Zap, Crown, Send, Star, CheckCircle2, DollarSign, Award, Sparkles, ChevronRight, Monitor, Settings, SlidersHorizontal } from "lucide-react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import ActiveCreatorsSection from "@/components/lp/ActiveCreatorsSection";
import EarlyCreatorSection from "@/components/lp/EarlyCreatorSection";
import { Button } from "@/components/ui/button";

const STATS = [
  { value: "85%", label: "還元率", sub: "業界最高水準" },
  { value: "0円", label: "初期費用", sub: "完全無料" },
  { value: "24h", label: "サポート", sub: "24時間対応" },
  { value: "3分", label: "セットアップ", sub: "即日開始" },
];

const FEATURES = [
  {
    icon: "🎸",
    title: "ライブ配信",
    desc: "ギター、ボーカル、バンド、DTM—あなたの音を世界へ。課金ライブで無制限に視聴者とつながる。",
    color: "#a855f7",
  },
  {
    icon: "📱",
    title: "1対1レッスン",
    desc: "ファンとの個別セッション。あなたのスケジュールで受付。15分から設定可能。",
    color: "#ec4899",
  },
  {
    icon: "🎵",
    title: "音源販売（完全オリジナルのみ）",
    desc: "ご自身が権利を持つオリジナル楽曲・BGM・インスト・サンプルパックを繰り返し販売。カバー曲・歌ってみた・演奏してみたは販売対象外です。",
    color: "#f59e0b",
  },
  {
    icon: "👑",
    title: "ファンクラブ",
    desc: "月額課金型の専属コミュニティ。限定楽曲・メイキング映像・先行販売で熱狂的なファンを育てる。",
    color: "#10b981",
  },
];

const STEPS = [
  { num: "01", title: "無料登録", desc: "30秒で完了。クレカ不要。" },
  { num: "02", title: "チャンネル作成", desc: "プロフィール・バイオを設定。" },
  { num: "03", title: "配信開始", desc: "スマホ1台でライブ。最高品質で配信。" },
  { num: "04", title: "収益受取", desc: "毎月自動振込。稼いだ分は確実に。" },
];

const VOICES = [
  { name: "Taiga（22）", tag: "シンガーソングライター", quote: "月30万超え。事務所より遥かに自由で稼げます。ファンとの距離が最高。", color: "#a855f7" },
  { name: "Yuki（20）", tag: "ギタリスト", quote: "バンド活動しながら副業で月20万。レッスンだけで15万稼げる。", color: "#ec4899" },
  { name: "Ren（25）", tag: "ビートメーカー", quote: "トラック販売とライブで月50万。制作活動の資金化が最高に効率的。", color: "#f59e0b" },
];

export default function MusicianLP() {
  const [scrollY, setScrollY] = useState(0);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [user, setUser] = useState(null);
  const [ticketSales, setTicketSales] = useState(0);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    document.title = "ミュージシャン専用 | Chat Market";
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    
    // ユーザー認証確認
    const init = async () => {
      try {
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const me = await base44.auth.me();
          setUser(me);
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    };
    init();
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // PPVライブチケット購入
  const handleTicketPurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin("/musician");
      return;
    }

    setPurchasing(true);
    try {
      const response = await base44.functions.invoke("createLiveTicketCheckout", {
        event_id: "musician_demo_live",
        event_name: "プロ配信デモ・ライブイベント",
        ticket_price: 2000,
        ticket_type: "musician_demo",
        buyer_email: user.email,
        buyer_name: user.full_name || user.email,
      });

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error("チケット購入ページの取得に失敗しました");
      }
    } catch (err) {
      console.error("Ticket error:", err);
      toast.error("購入処理に失敗しました");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden font-inter">
      <MetaHelmet
        title="ミュージシャン・シンガーソングライター・バンド向けプラットフォーム | ChatMarket（チャットマーケット）"
        description="ミュージシャン・シンガーソングライター・バンド・ビートメーカー向け収益化プラットフォーム。楽曲販売・1対1レッスン・ライブ配信で還元率85%。OBS対応プロ配信環境・初期費用0円で今すぐデビュー。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/34a7860b4_generated_image.png"
      />
      {/* ── HERO ── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-5 overflow-hidden">
        {/* 背景グラデーション */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 100% 80% at 50% 0%, rgba(168,85,247,0.4) 0%, transparent 70%)" }} />
          <div className="absolute bottom-0 left-0 right-0 h-64" style={{ background: "linear-gradient(to top, #000, transparent)" }} />
          {/* 音符パーティクル */}
          {[...Array(25)].map((_, i) => (
            <div key={i} className="absolute rounded-full" style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
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
            <Music className="w-3.5 h-3.5" />
            Chat Market × Musician
          </div>

          {/* メインコピー */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-[1.1] tracking-tight">
            あなたの音を<br />
            <span style={{
              background: "linear-gradient(135deg, #a855f7, #ec4899, #f59e0b)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              最高にカッコよく売ろう
            </span>
          </h1>

          <p className="text-base sm:text-lg text-white/70 leading-relaxed max-w-md mx-auto">
            事務所いらず、初期費用ゼロ。<br />
            あなたの音を愛するファンが<strong className="text-white">直接応援</strong>できるステージ。
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/recruit">
              <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-105 active:scale-95 shadow-2xl"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", boxShadow: "0 0 40px rgba(168,85,247,0.5)" }}>
                <span className="flex items-center justify-center gap-2">
                  <Send className="w-5 h-5" />
                  無料でデビュー
                </span>
              </button>
            </Link>
            <button className="w-full sm:w-auto px-8 py-4 rounded-2xl font-black text-base text-white/80 hover:text-white transition-all border"
              style={{ borderColor: "rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.05)" }}>
              <span className="flex items-center justify-center gap-2">
                <Crown className="w-4 h-4" />
                詳しく知る
              </span>
            </button>
          </div>

          {/* ミニ信頼バッジ */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-white/50">Chat Market 創業者が直接サポート</span>
          </div>
        </div>

        {/* スクロール矢印 */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronRight className="w-6 h-6 text-white/30 rotate-90" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-5" style={{ background: "linear-gradient(180deg, #000 0%, #0d0a1a 100%)" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.25)" }}>
              <p className="text-3xl sm:text-4xl font-black" style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {s.value}
              </p>
              <p className="text-sm font-bold text-white mt-1">{s.label}</p>
              <p className="text-[10px] text-white/40 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-5" style={{ background: "#0a0510" }}>
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#c084fc" }}>FEATURES</p>
            <h2 className="text-3xl sm:text-4xl font-black">4つの稼ぎ方</h2>
            <p className="text-white/50 text-sm">あなたのスタイルに合わせて選べる</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-6 rounded-2xl space-y-3 hover:scale-[1.02] transition-transform"
                style={{ background: `${f.color}10`, border: `1px solid ${f.color}30` }}>
                <div className="text-4xl">{f.icon}</div>
                <h3 className="font-black text-lg" style={{ color: f.color }}>{f.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── バンドステージシーン ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #0a0510 0%, #1a0033 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <div className="rounded-3xl overflow-hidden shadow-2xl mb-8"
            style={{ boxShadow: "0 0 60px rgba(168,85,247,0.3), 0 0 120px rgba(236,72,153,0.15)" }}>
            <img
              src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/34a7860b4_generated_image.png"
              alt="日本のバンドがステージで演奏している風景"
              className="w-full h-auto object-cover aspect-video"
            />
          </div>
          <div className="text-center space-y-3 mb-16">
            <h3 className="text-2xl font-black">バンドもソロも、思いのままに</h3>
            <p className="text-white/60 text-sm max-w-2xl mx-auto">
              ChatMarketはあらゆる音楽スタイルに対応。バンド演奏、ソロアーティスト、DTM制作者—誰もが自分のペースで活動できます。
            </p>
          </div>
        </div>
      </section>

      {/* ── ソロギタリスト ── */}
      <section className="py-20 px-5" style={{ background: "#0a0510" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="rounded-3xl overflow-hidden shadow-2xl order-2 md:order-1"
              style={{ boxShadow: "0 0 60px rgba(168,85,247,0.3), 0 0 120px rgba(236,72,153,0.15)" }}>
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/14564601f_generated_image.png"
                alt="ギターを持って歌う日本人女性アーティスト"
                className="w-full h-auto object-cover aspect-square md:aspect-auto"
              />
            </div>
            <div className="space-y-6 order-1 md:order-2">
              <div className="space-y-2">
                <p className="text-sm font-bold tracking-widest uppercase" style={{ color: "#ec4899" }}>
                  🎸 あなたの世界観を伝える
                </p>
                <h2 className="text-3xl sm:text-4xl font-black leading-tight text-white">
                  COVER曲ではなく、<br />
                  <span style={{ color: "#a855f7" }}>自分の音を売る</span>
                </h2>
              </div>

              <p className="text-base text-white/60 leading-relaxed">
                ChatMarketなら、あなたのオリジナル楽曲・世界観・個性がそのまま商品になります。カバー曲に頼る必要はありません。
              </p>

              {/* 音源販売ルール注意 */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2">
                <p className="text-xs font-black text-amber-300 flex items-center gap-1.5">⚠️ 音源販売について</p>
                <p className="text-xs text-amber-200/80 leading-relaxed">
                  販売可能な音源は、ご自身が権利を持つ<strong className="text-white">完全オリジナル音源のみ</strong>です。カバー曲・歌ってみた・演奏してみた・既存曲のアレンジ・カラオケ音源を使用した録音は販売できません。
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">オリジナル楽曲販売</p>
                    <p className="text-xs text-white/50 mt-0.5">制作した楽曲を何度でも販売。寝ながら稼ぐ</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">PV・メイキング映像販売</p>
                    <p className="text-xs text-white/50 mt-0.5">制作風景・音楽PV・プロモーション動画も販売可能</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-sm">ライブ・限定コンテンツ</p>
                    <p className="text-xs text-white/50 mt-0.5">課金ライブ配信で世界観をダイレクト配信</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 収益シミュレーター ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #0a0510 0%, #1a0033 100%)" }}>
        <div className="max-w-md mx-auto text-center space-y-8">
          <div className="space-y-2">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#ec4899" }}>REVENUE</p>
            <h2 className="text-3xl font-black">こんなに稼げる</h2>
          </div>
          <div className="space-y-3">
            {[
              { scenario: "週2回ライブ配信 (100人視聴)", monthly: "約¥80,000〜" },
              { scenario: "1on1レッスン 月30件 (30分¥3,000)", monthly: "約¥76,500〜" },
              { scenario: "楽曲販売 月20曲 (¥1,500/曲)", monthly: "約¥25,500〜" },
              { scenario: "ファンクラブ 100人 (月¥1,000)", monthly: "約¥85,000〜" },
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
            {STEPS.map((s) => (
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

      {/* ── OBS配信ガイド ── */}
      <section className="py-20 px-5" style={{ background: "#0a0510" }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#a855f7" }}>🎬 PRO配信セットアップ</p>
            <h2 className="text-3xl md:text-4xl font-black">OBSでプロ品質のライブ配信</h2>
            <p className="text-white/50 text-sm">PC/Mac完全対応。機材から設定まで完全ガイド。</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* 必須機材 */}
            <div className="rounded-2xl border border-purple-500/30 p-6 space-y-4" style={{ background: "rgba(168,85,247,0.1)" }}>
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: "#a855f7" }}>
                <Monitor className="w-5 h-5" /> 必須機材
              </h3>
              <ul className="text-sm text-white/70 space-y-2">
                <li>✓ PC/Mac（Intel i7以上推奨）</li>
                <li>✓ オーディオインターフェース（Focusrite, Roland等）</li>
                <li>✓ マイク（Shure SM7B等）</li>
                <li>✓ ウェブカメラ 1080p@60fps</li>
                <li>✓ インターネット速度 25Mbps以上</li>
                <li>✓ ヘッドフォン（モニター用）</li>
              </ul>
            </div>

            {/* OBS設定 */}
            <div className="rounded-2xl border border-pink-500/30 p-6 space-y-4" style={{ background: "rgba(236,72,153,0.1)" }}>
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: "#ec4899" }}>
                <Settings className="w-5 h-5" /> 推奨OBS設定
              </h3>
              <ul className="text-sm text-white/70 space-y-2">
                <li>• 解像度: 1920×1080</li>
                <li>• フレームレート: 60fps</li>
                <li>• ビットレート: 6000-8000 kbps</li>
                <li>• エンコーダ: H.264（ハード加速推奨）</li>
                <li>• オーディオ: 128kbps AAC</li>
                <li>• サンプリング: 48kHz（CDクオリティ）</li>
              </ul>
            </div>

            {/* クイック設定 */}
            <div className="rounded-2xl border border-amber-500/30 p-6 space-y-4" style={{ background: "rgba(245,158,11,0.1)" }}>
              <h3 className="font-black text-lg flex items-center gap-2" style={{ color: "#f59e0b" }}>
                <SlidersHorizontal className="w-5 h-5" /> 初心者向け簡単設定
              </h3>
              <ul className="text-sm text-white/70 space-y-2">
                <li>1. OBS無料ダウンロード</li>
                <li>2. Chat Market RTMPサーバー設定</li>
                <li>3. シーン作成（カメラ+音声）</li>
                <li>4. オーディオレベル調整</li>
                <li>5. テスト配信で動作確認</li>
                <li>6. 配信開始→ファン拡大</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-2xl p-6 text-center space-y-3">
            <p className="text-white font-bold">📺 ガイド動画で詳細に解説</p>
            <p className="text-sm text-white/70">
              OBS完全セットアップ講座・ライブ配信トラブル対応・音声調整テクニック・視聴者獲得戦略など、
              <br />
              プロミュージシャンの配信ノウハウを動画チュートリアルで提供。
            </p>
            <Button className="bg-purple-600 hover:bg-purple-700 text-white font-black">
              OBSガイド動画を見る →
            </Button>
          </div>
        </div>
      </section>

      {/* ── チケット販売＆売上ダッシュボード ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #0a0510 0%, #1a0033 100%)" }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#ec4899" }}>💰 PPV配信チケット販売</p>
            <h2 className="text-3xl md:text-4xl font-black">配信前から売上をリアルタイム確認</h2>
            <p className="text-white/50 text-sm">チケット販売状況をダッシュボードで即座監視。配信品質を最適化。</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* チケット販売カード */}
            <div className="rounded-2xl border-2 border-pink-500/60 p-8 space-y-6" style={{ background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(168,85,247,0.05))" }}>
              <h3 className="font-black text-2xl text-white">デモ・ライブイベント</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">チケット価格</span>
                  <span className="font-black text-2xl text-pink-400">¥2,000</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">あなたの手取り（85%）</span>
                  <span className="font-black text-2xl text-green-400">¥1,700</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">プラットフォーム手数料</span>
                  <span className="font-black text-lg text-white/50">¥300</span>
                </div>
              </div>

              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-2">
                <p className="text-xs font-bold text-purple-300">✓ チケット購入者特典</p>
                <ul className="text-xs text-white/60 space-y-1">
                  <li>• ライブ配信HD 1080p視聴</li>
                  <li>• チャット機能で質問・応援</li>
                  <li>• アーカイブ動画30日間視聴権</li>
                  <li>• シークレット楽曲先行販売</li>
                </ul>
              </div>

              <button
                onClick={handleTicketPurchase}
                disabled={purchasing}
                className="w-full py-4 rounded-xl font-black text-base transition-all hover:scale-105 disabled:opacity-50"
                style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", color: "#000" }}
              >
                {purchasing ? "処理中..." : "今すぐチケット購入"}
              </button>
            </div>

            {/* リアルタイムダッシュボード */}
            <div className="rounded-2xl border-2 border-amber-500/60 p-8 space-y-6" style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(168,85,247,0.05))" }}>
              <h3 className="font-black text-2xl text-white">リアルタイム売上ダッシュボード</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">売上チケット数</span>
                  <span className="font-black text-2xl text-amber-400">342枚</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">売上金額合計</span>
                  <span className="font-black text-2xl text-amber-400">¥684,000</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">あなたの収益</span>
                  <span className="font-black text-2xl text-green-400">¥581,400</span>
                </div>
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5">
                  <span className="text-white/70">配信開始までの時間</span>
                  <span className="font-black text-2xl text-cyan-400">2h 34m</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 w-[68%] transition-all"></div>
                </div>
                <p className="text-xs text-white/50">収容人数の68%の購入達成 → 配信品質を1080p 60fpsで維持可能</p>
              </div>

              <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
                <p className="text-sm font-black text-green-300">🚀 推奨アクション</p>
                <p className="text-xs text-white/70">
                  売上が目標達成。配信品質をフル仕様で実施可能。SNSで最終リマインダーを発信して追加購入を促進しましょう。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center space-y-3">
            <p className="text-white font-bold">📊 ダッシュボード機能</p>
            <p className="text-sm text-white/70">
              配信前から売上をリアルタイムで監視。購入数に応じた配信品質の自動調整提案。<br />
              SNS連携で不足分の追加販売促進までサポート。
            </p>
          </div>
        </div>
      </section>

      {/* ── VOICES ── */}
      <section className="py-20 px-5" style={{ background: "linear-gradient(180deg, #1a0033 0%, #0a0510 100%)" }}>
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs font-black tracking-widest uppercase" style={{ color: "#f59e0b" }}>VOICES</p>
            <h2 className="text-3xl font-black">活躍中のミュージシャン</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {VOICES.map((v) => (
              <div key={v.name} className="p-5 rounded-2xl space-y-3" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${v.color}30` }}>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black"
                  style={{ background: `${v.color}20`, border: `2px solid ${v.color}50` }}>
                  🎸
                </div>
                <p className="text-xs font-bold" style={{ color: v.color }}>{v.name} · {v.tag}</p>
                <p className="text-white/70 text-sm leading-relaxed">「{v.quote}」</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 実際に活躍中のミュージシャン ── */}
      <section className="py-16 px-5" style={{ background: "linear-gradient(180deg, #1a0033 0%, #0a0510 100%)" }}>
        <div className="max-w-5xl mx-auto">
          <ActiveCreatorsSection
            serviceCategory="other"
            title="実際に活躍中のミュージシャン"
            accentColor="#a855f7"
            theme="dark"
          />
        </div>
      </section>

      {/* ── 初期クリエイター募集 ── */}
      <section className="py-8 px-5" style={{ background: "linear-gradient(180deg, #0a0510 0%, #000 100%)" }}>
        <div className="max-w-4xl mx-auto">
          <EarlyCreatorSection />
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-5 text-center" style={{ background: "linear-gradient(180deg, #000 0%, #0a0510 50%, #000 100%)" }}>
        <div className="max-w-md mx-auto space-y-6">
          <Sparkles className="w-10 h-10 mx-auto" style={{ color: "#a855f7" }} />
          <h2 className="text-3xl sm:text-4xl font-black leading-tight">
            今すぐ<br />
            <span style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              あなたの音をリリース
            </span>
          </h2>
          <p className="text-white/50 text-sm">初期費用ゼロ・審査なし・今日から配信できます</p>
          <Link to="/recruit">
            <button className="px-10 py-5 rounded-2xl font-black text-lg text-black w-full sm:w-auto transition-all hover:scale-105"
              style={{ background: "linear-gradient(135deg, #a855f7, #ec4899)", boxShadow: "0 0 50px rgba(168,85,247,0.5)" }}>
              <span className="flex items-center justify-center gap-2">
                <Crown className="w-5 h-5" />
                無料デビュー登録
              </span>
            </button>
          </Link>
          <p className="text-xs text-white/30">登録はメールアドレスだけ。クレカ不要。いつでも退会できます。</p>
        </div>
      </section>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}