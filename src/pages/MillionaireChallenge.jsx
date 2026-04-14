import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, TrendingUp, Video, Phone, Archive, Star, ChevronLeft, ChevronRight, Award, Shield, Radio } from "lucide-react";

/* ─── カラーパレット ─── */
const G = "#F5C518"; // ゴールド
const GD = "#C9A227"; // ダークゴールド
const EM = "#00FF88"; // エメラルド
const BG = "#050508"; // 漆黒

/* ─── スライド数 ─── */
const TOTAL = 6;

/* ─── アニメーション variants ─── */
const slideIn = {
  initial: { opacity: 0, x: 80 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.55, ease: "easeOut" } },
  exit: { opacity: 0, x: -80, transition: { duration: 0.3 } },
};

/* ─── 共通ユーティリティ ─── */
const GoldText = ({ children, className = "" }) => (
  <span className={`font-black ${className}`} style={{ color: G, textShadow: `0 0 20px ${G}80, 0 0 40px ${G}40` }}>
    {children}
  </span>
);

const EmeraldText = ({ children }) => (
  <span className="font-black" style={{ color: EM, textShadow: `0 0 15px ${EM}80` }}>{children}</span>
);

const GlassCard = ({ children, className = "", gold = false }) => (
  <div
    className={`rounded-2xl p-5 ${className}`}
    style={{
      background: gold
        ? "linear-gradient(135deg, rgba(245,197,24,0.12) 0%, rgba(201,162,39,0.06) 100%)"
        : "rgba(255,255,255,0.04)",
      border: `1px solid ${gold ? G + "50" : "rgba(255,255,255,0.08)"}`,
      backdropFilter: "blur(12px)",
      boxShadow: gold ? `0 0 30px ${G}20, inset 0 0 20px ${G}08` : "none",
    }}
  >
    {children}
  </div>
);

/* ─── 収益率比較グラフ ─── */
const RevenueBar = ({ label, pct, color, delay = 0, logo }) => {
  const [width, setWidth] = useState(0);
  useEffect(() => { const t = setTimeout(() => setWidth(pct), 300 + delay); return () => clearTimeout(t); }, [pct, delay]);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-white/70 text-xs">{label}</span>
        <span className="font-black text-base" style={{ color }}>{pct}%</span>
      </div>
      <div className="h-4 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="h-full rounded-full transition-all duration-1500"
          style={{
            width: `${width}%`,
            background: color === G
              ? `linear-gradient(90deg, ${GD}, ${G}, #FFE066)`
              : `linear-gradient(90deg, #7f1d1d, #ef4444)`,
            boxShadow: color === G ? `0 0 20px ${G}80` : "none",
            transitionDuration: "1.5s",
          }}
        />
      </div>
    </div>
  );
};

/* ─── プログレスゲージ（加熱演出） ─── */
const HeatGauge = () => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let v = 0;
    const iv = setInterval(() => {
      v += 1;
      setVal(v);
      if (v >= 95) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, []);

  const heat = val / 95;
  const barColor =
    heat < 0.4
      ? `hsl(${120 - heat * 80}, 100%, 50%)`
      : heat < 0.75
      ? `hsl(${50 - heat * 30}, 100%, 50%)`
      : `hsl(${20 - heat * 15}, 100%, ${50 + heat * 10}%)`;

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-white/50 text-xs">還元率</span>
        <span className="font-black text-5xl" style={{ color: G, textShadow: `0 0 30px ${G}` }}>{val}%</span>
      </div>
      <div className="relative h-6 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.07)" }}>
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-none"
          style={{
            width: `${val}%`,
            background: `linear-gradient(90deg, #22c55e, ${barColor})`,
            boxShadow: `0 0 ${heat * 30}px ${barColor}, 0 0 ${heat * 60}px ${barColor}50`,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white/90">
          {val < 5 ? "" : `${val}% → あなたの口座へ`}
        </div>
      </div>
      <div className="flex justify-between text-[10px] text-white/30">
        <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>95%</span>
      </div>
    </div>
  );
};

/* ─── GiantKilling速報バナー ─── */
const GiantKillingMockBanner = () => (
  <div
    className="rounded-2xl overflow-hidden border-2"
    style={{ borderColor: G + "80", background: "linear-gradient(135deg,#1a0a00,#2d1a00,#1a0a00)", boxShadow: `0 0 40px ${G}30` }}
  >
    <div className="flex items-center gap-3 px-5 py-4">
      <div className="w-11 h-11 rounded-full border-2 flex items-center justify-center animate-pulse shrink-0" style={{ borderColor: G, background: G + "20" }}>
        <Crown className="w-5 h-5" style={{ color: G }} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full border" style={{ color: G, background: G + "20", borderColor: G + "50" }}>⚡ 速報 ⚡</span>
          <span className="text-[10px]" style={{ color: G + "aa" }}>ジャイアント・キリング発生</span>
        </div>
        <p className="font-black text-sm text-white">🎺 歴史が動いた！ あなたがTOP1に躍り出た！</p>
        <p className="text-xs mt-0.5" style={{ color: G + "aa" }}>15分以内に2,000万コイン突破！ 全ユーザーに速報通知中…</p>
      </div>
      <span className="text-xs font-bold px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0" style={{ color: G, borderColor: G + "40", background: G + "10" }}>
        今すぐ見る →
      </span>
    </div>
    <div className="overflow-hidden h-6" style={{ background: G + "15", borderTop: `1px solid ${G}30` }}>
      <div className="whitespace-nowrap text-[11px] font-bold h-full flex items-center" style={{ color: G + "bb", animation: "marquee 10s linear infinite" }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <span key={i} className="mx-8">🎺 歴史が動いた！ あなたがTOP1に躍り出た！ 🎺 全ユーザーへ速報通知完了</span>
        ))}
      </div>
    </div>
  </div>
);

/* ─── 純金メダル（CSSのみ3D風） ─── */
const GoldMedal = () => (
  <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
    {/* 外リング */}
    <div className="absolute inset-0 rounded-full" style={{
      background: `conic-gradient(${G}, ${GD}, #FFE066, ${GD}, ${G})`,
      boxShadow: `0 0 40px ${G}80, 0 0 80px ${G}40, inset 0 2px 4px rgba(255,255,255,0.4)`,
    }} />
    {/* 内円 */}
    <div className="absolute inset-2 rounded-full flex items-center justify-center" style={{
      background: `radial-gradient(circle at 35% 35%, #FFE066, ${GD} 60%, #8B6914)`,
    }}>
      <div className="text-center">
        <div className="text-2xl font-black" style={{ color: "#1a0a00", textShadow: "0 1px 2px rgba(255,255,255,0.3)" }}>No.1</div>
        <div className="text-[9px] font-black" style={{ color: "#3d1f00" }}>MILLIONAIRE</div>
      </div>
    </div>
    {/* リボン */}
    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5">
      <div className="w-5 h-10 rounded-b-full" style={{ background: `linear-gradient(180deg, #ef4444, #991b1b)` }} />
      <div className="w-5 h-10 rounded-b-full" style={{ background: `linear-gradient(180deg, ${G}, ${GD})` }} />
    </div>
  </div>
);

/* ─── スライドコンポーネント群 ─── */
const slides = [
  /* Slide 1 */
  () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-8 px-4">
      {/* 黄金の扉 */}
      <div className="relative w-48 h-60 mx-auto">
        <div className="absolute inset-0 rounded-xl" style={{ background: `linear-gradient(180deg, #1a0a00 0%, #2d1a00 100%)`, border: `3px solid ${G}`, boxShadow: `0 0 60px ${G}60, 0 0 120px ${G}20` }} />
        {/* 光の爆発 */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 60%, ${G}40 0%, transparent 70%)` }} />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full" style={{ background: `linear-gradient(180deg, ${G}, transparent)`, boxShadow: `0 0 20px ${G}` }} />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute left-1/2 top-1/2 w-0.5 h-20 origin-bottom"
              style={{ transform: `translateX(-50%) rotate(${i * 60}deg) translateY(-100%)`, background: `linear-gradient(0deg, ${G}80, transparent)`, boxShadow: `0 0 8px ${G}` }} />
          ))}
        </div>
        {/* 扉の取っ手 */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-8 rounded-full" style={{ background: G, boxShadow: `0 0 10px ${G}` }} />
        {/* ロゴ */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
          <Crown className="w-8 h-8" style={{ color: G, filter: `drop-shadow(0 0 10px ${G})` }} />
          <p className="text-[10px] font-black tracking-widest" style={{ color: G }}>OPEN</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-sm font-bold tracking-[0.3em] uppercase" style={{ color: EM }}>THE MILLIONAIRE CHALLENGE</p>
        <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          まだ「<GoldText>半分</GoldText>」しか<br />受け取っていないのですか？
        </h1>
        <p className="text-white/60 text-sm max-w-md mx-auto leading-relaxed">
          大手プラットフォームの平均還元率は<span className="text-red-400 font-bold">30〜50%</span>。<br />
          あなたの努力の半分以上が、運営に吸い取られていませんか？
        </p>
      </div>

      {/* 比較グラフ */}
      <div className="w-full max-w-md space-y-3">
        <RevenueBar label="YouTube / TikTok Live" pct={30} color="#ef4444" delay={0} />
        <RevenueBar label="既存ライブ配信アプリ" pct={45} color="#f97316" delay={200} />
        <RevenueBar label="ChatMarket（最大）" pct={95} color={G} delay={400} />
      </div>
    </div>
  ),

  /* Slide 2 */
  () => (
    <div className="flex flex-col h-full space-y-6 px-2">
      <div className="text-center space-y-2">
        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: EM }}>Progressive Incentive</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
          衝撃の「<GoldText>最大95%還元</GoldText>」
        </h2>
        <p className="text-white/60 text-xs">稼ぐ人ほど、手元に残る。</p>
      </div>

      {/* 加熱ゲージ */}
      <GlassCard gold>
        <HeatGauge />
      </GlassCard>

      {/* ティア一覧 */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "スタート", threshold: "〜499万", rate: "85%", color: EM },
          { label: "シルバー", threshold: "500〜999万", rate: "90%", color: "#94a3b8" },
          { label: "ゴールド", threshold: "1,000〜1,999万", rate: "92%", color: G },
          { label: "プラチナ", threshold: "1,500〜1,999万", rate: "93%", color: "#e2e8f0" },
          { label: "ダイヤ", threshold: "2,000万+", rate: "95%", color: "#67e8f9" },
          { label: "伝説", threshold: "継続達成", rate: "95%+特典", color: G },
        ].map((t, i) => (
          <GlassCard key={i} gold={t.color === G} className="text-center py-3 px-2">
            <p className="text-[9px] text-white/50 mb-0.5">{t.label}</p>
            <p className="text-lg font-black" style={{ color: t.color, textShadow: `0 0 10px ${t.color}60` }}>{t.rate}</p>
            <p className="text-[8px] text-white/40 mt-0.5">{t.threshold}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard gold>
        <p className="text-center text-sm text-white/80 leading-relaxed">
          1,000円のギフトのうち、<GoldText className="text-xl">950円</GoldText>があなたの銀行口座へ
        </p>
      </GlassCard>
    </div>
  ),

  /* Slide 3 */
  () => (
    <div className="flex flex-col h-full space-y-5 px-2">
      <div className="text-center space-y-2">
        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: EM }}>Multi Revenue Streams</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          「<GoldText>多角的な収益</GoldText>」の柱
        </h2>
        <p className="text-white/50 text-xs">ライブ配信だけで疲弊するのはもう終わりです。</p>
      </div>

      <div className="space-y-3 flex-1">
        {/* 1対1 */}
        <GlassCard gold className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${G}30, ${G}10)`, border: `1px solid ${G}50` }}>
            <Phone className="w-6 h-6" style={{ color: G }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-white">1対1 ビデオ通話</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: G + "20", color: G }}>VIP</span>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">15分500コイン〜。「ホテルのVIPルームでの対話」。あなたの時間を安売りさせない最低価格保証。</p>
          </div>
        </GlassCard>

        {/* VOD */}
        <GlassCard className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,255,136,0.1)", border: `1px solid ${EM}40` }}>
            <Video className="w-6 h-6" style={{ color: EM }} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-white">VOD 動画販売</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: EM + "20", color: EM }}>ASSET</span>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">金箔でコーティングされた映画フィルム。ライブの裏側・限定動画が、<EmeraldText>寝ている間も収益を生む</EmeraldText>。</p>
          </div>
        </GlassCard>

        {/* アーカイブ */}
        <GlassCard className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.4)" }}>
            <Archive className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-white">アーカイブ販売</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400">LEGACY</span>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">「あの時の感動」を合意の上で有料販売。過去の配信が未来の資産へ。</p>
          </div>
        </GlassCard>

        {/* ライブ */}
        <GlassCard className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.4)" }}>
            <Radio className="w-6 h-6 text-red-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-black text-white">PPV ライブ配信</p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 animate-pulse">LIVE</span>
            </div>
            <p className="text-white/60 text-xs leading-relaxed">チケット制の有料ライブ。最低単価設定でコインの価値を守りながら爆発的な収益へ。</p>
          </div>
        </GlassCard>
      </div>
    </div>
  ),

  /* Slide 4 */
  () => (
    <div className="flex flex-col h-full space-y-5 px-2">
      <div className="text-center space-y-2">
        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: EM }}>Millionaire Challenge</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
          あなたは「<GoldText>ChatMarketの伝説</GoldText>」になる
        </h2>
      </div>

      <div className="flex justify-center">
        <GoldMedal />
      </div>

      <div className="space-y-3 mt-6">
        <GlassCard gold className="flex items-center gap-3">
          <Crown className="w-8 h-8 shrink-0" style={{ color: G }} />
          <div>
            <p className="font-black text-white text-sm">TOPページ独占</p>
            <p className="text-xs text-white/50">新規ユーザーの流入をすべてあなたに集中。何万人もの視線があなたへ。</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-3">
          <Zap className="w-8 h-8 shrink-0" style={{ color: G }} />
          <div>
            <p className="font-black text-white text-sm">ジャイアント・キリング通知</p>
            <p className="text-xs text-white/50">あなたの躍進を全ユーザーに速報。一瞬でプラットフォームの話題の中心へ。</p>
          </div>
        </GlassCard>

        <GlassCard className="flex items-center gap-3">
          <Award className="w-8 h-8 text-yellow-300 shrink-0" />
          <div>
            <p className="font-black text-white text-sm">純金メダル贈呈</p>
            <p className="text-xs text-white/50">物理的なステータスとしての栄誉。あなたの挑戦の証を、永遠に手元に。</p>
          </div>
        </GlassCard>
      </div>

      {/* GKバナーデモ */}
      <div className="mt-2">
        <p className="text-[10px] text-white/30 mb-2 text-center">▼ このような速報が全ユーザーに届きます</p>
        <GiantKillingMockBanner />
      </div>
    </div>
  ),

  /* Slide 5 */
  () => (
    <div className="flex flex-col h-full space-y-5 px-2">
      <div className="text-center space-y-2">
        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: EM }}>Why 95% Is Possible</p>
        <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
          なぜ「<GoldText>95%</GoldText>」が可能なのか？
        </h2>
        <p className="text-white/50 text-xs">根拠のない数字ではありません。</p>
      </div>

      <div className="space-y-3 flex-1">
        <GlassCard gold>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl" style={{ background: G + "20" }}>☁️</div>
            <div>
              <p className="font-black text-white text-sm">Amazon AWS インフラの採用</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">圧倒的な安定性と、クラウド最適化によるインフラコスト削減。省いたコストを、そのままライバーへ還元します。</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl" style={{ background: EM + "20" }}>⚖️</div>
            <div>
              <p className="font-black text-white text-sm">適正な「最低単価」設計</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">最低価格を設けることでライバーの価値を守り、プラットフォームも持続可能に。搾取ではなく共存の設計です。</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl" style={{ background: "#60a5fa20" }}>📊</div>
            <div>
              <p className="font-black text-white text-sm">エールコイン「1コイン＝1円」固定経済</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">為替リスクなし。複雑な換算なし。1コインが常に1円として機能し、収益が透明に管理されます。</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xl" style={{ background: "#a78bfa20" }}>🔒</div>
            <div>
              <p className="font-black text-white text-sm">Stripeによる安全決済</p>
              <p className="text-xs text-white/60 mt-1 leading-relaxed">業界標準の決済セキュリティ。手数料はユーザー負担（外乗せ方式）のため、ライバー取り分は変動しません。</p>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  ),

  /* Slide 6 */
  () => (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-7 px-4">
      {/* 光のエフェクト */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full blur-3xl" style={{ background: G + "40", transform: "scale(2)" }} />
        <div className="relative w-20 h-20 rounded-full flex items-center justify-center" style={{ background: `conic-gradient(${G}, ${GD}, #FFE066, ${GD}, ${G})`, boxShadow: `0 0 60px ${G}80` }}>
          <Star className="w-9 h-9" style={{ color: "#1a0a00" }} />
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-[11px] font-black tracking-widest uppercase" style={{ color: EM }}>Your Turn</p>
        <h2 className="text-3xl sm:text-4xl font-black text-white leading-tight">
          次はあなたが、<br /><GoldText>ミリオネア</GoldText>になる番です。
        </h2>
        <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
          チャレンジの火蓋は切られました。<br />今、この瞬間にChatMarketの頂点を目指しませんか？
        </p>
      </div>

      {/* アクション */}
      <div className="space-y-3 w-full max-w-xs">
        <Link to="/plan-select">
          <button className="w-full py-3.5 rounded-2xl font-black text-sm text-black transition-transform hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${G}, #FFE066, ${GD})`, boxShadow: `0 0 30px ${G}60` }}>
            🏆 今すぐチャレンジを開始する
          </button>
        </Link>
        <Link to="/go-live">
          <button className="w-full py-3 rounded-2xl font-bold text-sm border transition-all hover:bg-white/5"
            style={{ borderColor: EM + "50", color: EM }}>
            <Radio className="inline w-4 h-4 mr-1" />ライブ配信を始める
          </button>
        </Link>
        <Link to="/">
          <button className="w-full py-3 rounded-2xl font-bold text-sm border border-white/10 text-white/50 hover:text-white/80 transition-colors text-xs">
            プラットフォームを見る →
          </button>
        </Link>
      </div>

      {/* プラン一覧 */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-xs">
        {[
          { name: "Basic", desc: "ライブ配信", color: EM },
          { name: "VOD", desc: "動画販売", color: G },
          { name: "PPV", desc: "有料配信", color: "#f97316" },
        ].map((p) => (
          <GlassCard key={p.name} className="text-center py-2 px-1">
            <p className="font-black text-sm" style={{ color: p.color }}>{p.name}</p>
            <p className="text-[9px] text-white/40 mt-0.5">{p.desc}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  ),
];

/* ─── メインページ ─── */
export default function MillionaireChallenge() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);
  const timerRef = useRef(null);

  const goto = (idx) => {
    setDir(idx > current ? 1 : -1);
    setCurrent(idx);
  };

  const next = () => goto(Math.min(current + 1, TOTAL - 1));
  const prev = () => goto(Math.max(current - 1, 0));

  // キーボード操作
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") next();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prev();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [current]);

  const SlideContent = slides[current];
  const slideVariants = {
    initial: { opacity: 0, x: dir > 0 ? 80 : -80 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: "easeOut" } },
    exit: { opacity: 0, x: dir > 0 ? -80 : 80, transition: { duration: 0.25 } },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-3 py-6" style={{ background: BG }}>
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
      `}</style>

      {/* デッキ本体 */}
      <div
        className="relative w-full max-w-lg rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #0d0d14 0%, #080810 100%)",
          border: `1px solid ${G}25`,
          boxShadow: `0 0 80px ${G}15, 0 25px 60px rgba(0,0,0,0.8)`,
          minHeight: 560,
        }}
      >
        {/* 上部ゴールドライン */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${G}, transparent)` }} />

        {/* スライドタイトルバー */}
        <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4" style={{ color: G }} />
            <span className="text-xs font-black tracking-widest uppercase" style={{ color: G }}>ChatMarket</span>
            <span className="text-[10px] text-white/30 ml-1">Millionaire Challenge</span>
          </div>
          <div className="flex items-center gap-1.5">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goto(i)}
                className="transition-all rounded-full"
                style={{
                  width: i === current ? 16 : 6,
                  height: 6,
                  background: i === current ? G : "rgba(255,255,255,0.2)",
                  boxShadow: i === current ? `0 0 8px ${G}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        {/* スライドコンテンツ */}
        <div className="relative overflow-hidden" style={{ minHeight: 460 }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current}
              variants={slideVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="absolute inset-0 px-5 py-6 overflow-y-auto"
              style={{ scrollbarWidth: "none" }}
            >
              <SlideContent />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* 下部コントロール */}
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          <button
            onClick={prev}
            disabled={current === 0}
            className="flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-20"
            style={{ color: current === 0 ? "rgba(255,255,255,0.2)" : G }}
          >
            <ChevronLeft className="w-4 h-4" /> 前へ
          </button>

          <span className="text-[10px] text-white/30">
            {current + 1} / {TOTAL}
          </span>

          <button
            onClick={next}
            disabled={current === TOTAL - 1}
            className="flex items-center gap-1.5 text-xs font-bold transition-all disabled:opacity-20"
            style={{ color: current === TOTAL - 1 ? "rgba(255,255,255,0.2)" : G }}
          >
            次へ <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* 下部ゴールドライン */}
        <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, transparent, ${G}, transparent)` }} />
      </div>

      {/* スライドサムネイルナビ */}
      <div className="flex gap-2 mt-5 flex-wrap justify-center">
        {[
          "01. 導入", "02. 95%還元", "03. 収益の柱", "04. 伝説特典", "05. 信頼の根拠", "06. チャレンジ",
        ].map((label, i) => (
          <button
            key={i}
            onClick={() => goto(i)}
            className="text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all"
            style={{
              borderColor: i === current ? G : "rgba(255,255,255,0.1)",
              color: i === current ? G : "rgba(255,255,255,0.4)",
              background: i === current ? G + "10" : "transparent",
              boxShadow: i === current ? `0 0 10px ${G}30` : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-white/20 mt-3">← → キーボードでも操作できます</p>
    </div>
  );
}