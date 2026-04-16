import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Zap } from "lucide-react";

// ── ネオングロー CSS ──
const NEON_GREEN = "#00ff9d";
const NEON_CYAN  = "#00e5ff";
const NEON_GOLD  = "#ffd700";

function NeonText({ children, color = NEON_GREEN, size = "inherit", bold = false, className = "" }) {
  return (
    <span
      className={className}
      style={{
        color,
        fontSize: size,
        fontWeight: bold ? 900 : undefined,
        textShadow: `0 0 8px ${color}, 0 0 20px ${color}, 0 0 40px ${color}`,
      }}
    >
      {children}
    </span>
  );
}

function NeonBorder({ children, color = NEON_GREEN, className = "" }) {
  return (
    <div
      className={`relative rounded-2xl p-px ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}, transparent, ${color})`,
        boxShadow: `0 0 12px ${color}44, inset 0 0 12px ${color}11`,
      }}
    >
      <div className="rounded-2xl bg-black/90 w-full h-full">
        {children}
      </div>
    </div>
  );
}

// ── スライド1: タイトル ──
function Slide1() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 80);
    return () => clearInterval(t);
  }, []);
  const flicker = [0,3,7,10,14].includes(tick % 18);

  return (
    <div className="relative flex flex-col items-center justify-center h-full text-center px-6 space-y-8 overflow-hidden">
      {/* 背景回路線 */}
      <CircuitBackground />

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="space-y-4 relative z-10"
      >
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: NEON_CYAN }}>Infrastructure Report 2026</p>
        <h1
          className="text-4xl md:text-6xl font-black leading-tight"
          style={{
            color: "#fff",
            textShadow: `0 0 30px ${NEON_GREEN}88`,
          }}
        >
          世界最強の<br />
          <NeonText color={NEON_GREEN} bold>インフラ戦略</NeonText>
        </h1>
        <p className="text-sm md:text-base text-white/50 max-w-lg mx-auto">
          Amazon AWSが支える世界最高水準インフラで<br />
          「15分¥150」を実現する仕組み
        </p>
      </motion.div>

      {/* Powered by Agora badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="relative z-10"
      >
        <NeonBorder color={NEON_GREEN}>
          <div className="px-6 py-3 flex items-center gap-3">
            <Zap size={16} style={{ color: NEON_GREEN, filter: `drop-shadow(0 0 6px ${NEON_GREEN})` }} />
            <span
              className="text-sm font-black tracking-widest uppercase"
              style={{
                color: NEON_GREEN,
                opacity: flicker ? 0.4 : 1,
                textShadow: `0 0 10px ${NEON_GREEN}`,
                transition: "opacity 0.05s",
              }}
            >
              Powered by ChatMarket
            </span>
            <Zap size={16} style={{ color: NEON_GREEN, filter: `drop-shadow(0 0 6px ${NEON_GREEN})` }} />
          </div>
        </NeonBorder>
      </motion.div>
    </div>
  );
}

// ── スライド2: Agora権威付け ──
function Slide2() {
  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-8 relative overflow-hidden">
      <CircuitBackground />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-2xl space-y-6 z-10"
      >
        <p className="text-xs tracking-[0.3em] uppercase text-center" style={{ color: NEON_CYAN }}>World Standard</p>

        <NeonBorder color={NEON_GREEN} className="w-full">
          <div className="p-6 md:p-8 text-center space-y-3">
            <div className="text-3xl mb-2">🌐</div>
            <h2 className="text-xl md:text-3xl font-black text-white leading-tight">
              Amazon AWS を支える<br />
              <NeonText color={NEON_GREEN} size="inherit" bold>世界最高水準インフラ</NeonText><br />
              <span className="text-white">ChatMarket に完全搭載</span>
            </h2>
          </div>
        </NeonBorder>

        <div className="grid grid-cols-3 gap-3">
          {[
            { val: "200+", label: "国・地域でサービス中" },
            { val: "200億+", label: "月間接続分数" },
            { val: "10ms", label: "最短遅延（AWS Chime）" },
          ].map((item) => (
            <NeonBorder key={item.label} color={NEON_CYAN}>
              <div className="p-3 text-center">
                <p className="font-black text-lg md:text-2xl" style={{ color: NEON_CYAN, textShadow: `0 0 10px ${NEON_CYAN}` }}>
                  {item.val}
                </p>
                <p className="text-[10px] text-white/50 mt-1">{item.label}</p>
              </div>
            </NeonBorder>
          ))}
        </div>

        <p className="text-xs text-white/30 text-center italic">
          「将来ロードマップ」：日本最高峰の通信品質（NTTグループ協力）— Phase 3 (100K回/月〜)
        </p>
      </motion.div>
    </div>
  );
}

// ── スライド3: パケットロスメーター ──
function Slide3() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const targetDeg = 180 * (1 - 0.005); // 0.5% = 針が右端付近
  const needleDeg = animated ? targetDeg * 0.97 : 0; // 0.5%なので右端近く

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-6 relative overflow-hidden">
      <CircuitBackground />
      <div className="z-10 text-center space-y-2">
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: NEON_CYAN }}>Stability</p>
        <h2 className="text-2xl md:text-4xl font-black text-white">最強の安定性</h2>
      </div>

      {/* レーシングメーター */}
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="z-10 relative"
        style={{ width: 280, height: 160 }}
      >
        {/* メーター背景SVG */}
        <svg width="280" height="160" viewBox="0 0 280 160" className="absolute inset-0">
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* 背景半円 */}
          <path d="M 20 150 A 120 120 0 0 1 260 150" fill="none" stroke="#ffffff11" strokeWidth="24" strokeLinecap="round" />
          {/* 赤ゾーン（悪い = 左） */}
          <path d="M 20 150 A 120 120 0 0 1 80 43" fill="none" stroke="#ff003388" strokeWidth="24" strokeLinecap="round" />
          {/* 黄ゾーン */}
          <path d="M 80 43 A 120 120 0 0 1 170 20" fill="none" stroke="#ffd70088" strokeWidth="24" strokeLinecap="round" />
          {/* 緑ゾーン（最高 = 右） */}
          <path d="M 170 20 A 120 120 0 0 1 260 150" fill="none" stroke="#00ff9d88" strokeWidth="24" strokeLinecap="round" />
          {/* 目盛り */}
          {[0, 25, 50, 75, 100].map((pct, i) => {
            const angle = (-180 + (180 * pct / 100)) * (Math.PI / 180);
            const r = 120;
            const cx = 140 + r * Math.cos(angle);
            const cy = 150 + r * Math.sin(angle);
            return (
              <circle key={i} cx={cx} cy={cy} r="2" fill="#ffffff44" />
            );
          })}
          {/* 針 */}
          <motion.line
            x1="140" y1="150"
            initial={{ x2: 20, y2: 150 }}
            animate={{
              x2: 140 + 100 * Math.cos(((-180 + needleDeg) * Math.PI) / 180),
              y2: 150 + 100 * Math.sin(((-180 + needleDeg) * Math.PI) / 180),
            }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            stroke={NEON_GREEN}
            strokeWidth="3"
            strokeLinecap="round"
            filter="url(#glow)"
          />
          {/* 中心 */}
          <circle cx="140" cy="150" r="8" fill={NEON_GREEN} filter="url(#glow)" />
          {/* ラベル */}
          <text x="22" y="175" fill="#ff3333" fontSize="9" textAnchor="middle">高</text>
          <text x="140" y="10" fill={NEON_GOLD} fontSize="9" textAnchor="middle">中</text>
          <text x="258" y="175" fill={NEON_GREEN} fontSize="9" textAnchor="middle">低</text>
        </svg>

        {/* 数値表示 */}
        <div className="absolute bottom-0 left-0 right-0 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="font-black"
            style={{ fontSize: 36, color: NEON_GREEN, textShadow: `0 0 20px ${NEON_GREEN}` }}
          >
            0.5%<span style={{ fontSize: 16 }}>未満</span>
          </motion.p>
          <p className="text-xs text-white/50">パケットロス率（SD-RTN™）</p>
        </div>
      </motion.div>

      <div className="z-10 grid grid-cols-2 gap-3 w-full max-w-md">
        {[
          { label: "公衆インターネット（東アジア）", val: "最大51分/日で損失", bad: true },
          { label: "AWS Chime SDK（東アジア）", val: "ほぼ0（測定外）", bad: false },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 border text-center"
            style={{
              borderColor: item.bad ? "#ff333344" : `${NEON_GREEN}44`,
              background: item.bad ? "#ff333308" : `${NEON_GREEN}08`,
            }}
          >
            <p className="text-[10px] text-white/40 mb-1">{item.label}</p>
            <p className="font-bold text-xs" style={{ color: item.bad ? "#ff5555" : NEON_GREEN }}>
              {item.val}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── スライド4: 回路図インフォグラフィック ──
function Slide4() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(v => (v + 1) % 5), 700);
    return () => clearInterval(t);
  }, []);

  const nodes = [
    { x: 60,  y: 100, label: "ユーザー", icon: "👤", color: NEON_CYAN },
    { x: 190, y: 40,  label: "AWS Chime SDK", icon: "🌐", color: NEON_GREEN },
    { x: 320, y: 100, label: "ライバー", icon: "🎤", color: NEON_GOLD },
    { x: 190, y: 160, label: "150円/15分", icon: "💰", color: "#ff88ff" },
  ];
  const edges = [
    { from: 0, to: 1 }, { from: 1, to: 2 }, { from: 0, to: 3 }, { from: 2, to: 3 },
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-6 relative overflow-hidden">
      <CircuitBackground />
      <div className="z-10 text-center space-y-1">
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: NEON_CYAN }}>Revenue Architecture</p>
        <h2 className="text-2xl md:text-3xl font-black text-white">
          収益構造の<NeonText color={NEON_GREEN}> 可視化</NeonText>
        </h2>
        <p className="text-xs text-white/40">インフラコスト削減が「150円」を実現</p>
      </div>

      {/* 回路図 */}
      <div className="z-10 relative w-full max-w-sm" style={{ height: 220 }}>
        <svg width="100%" height="220" viewBox="0 0 380 220" className="absolute inset-0">
          <defs>
            <filter id="glow2">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          {/* エッジ */}
          {edges.map((e, i) => {
            const from = nodes[e.from];
            const to   = nodes[e.to];
            const active = i === step % edges.length;
            return (
              <motion.line
                key={i}
                x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={active ? NEON_GREEN : "#ffffff22"}
                strokeWidth={active ? 2.5 : 1}
                filter={active ? "url(#glow2)" : undefined}
                animate={{ opacity: active ? 1 : 0.3 }}
                strokeDasharray={active ? "6 3" : "none"}
              />
            );
          })}
          {/* ノード */}
          {nodes.map((n, i) => (
            <g key={i}>
              <circle cx={n.x} cy={n.y} r={28} fill="#0a0a0a" stroke={n.color} strokeWidth="1.5"
                style={{ filter: `drop-shadow(0 0 8px ${n.color})` }} />
              <text x={n.x} y={n.y + 5} textAnchor="middle" fontSize="18">{n.icon}</text>
              <text x={n.x} y={n.y + 46} textAnchor="middle" fontSize="9" fill={n.color}
                style={{ textShadow: `0 0 6px ${n.color}` }}>
                {n.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* コスト削減説明 */}
      <div className="z-10 grid grid-cols-3 gap-2 w-full max-w-md text-center">
        {[
          { label: "従来TURN原価", val: "¥30/15分", color: "#ff5555" },
          { label: "P2P削減率", val: "▼ 80%", color: NEON_GOLD },
          { label: "実効コスト", val: "¥6/15分", color: NEON_GREEN },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border border-white/10 p-2 bg-white/5">
            <p className="text-[10px] text-white/40">{item.label}</p>
            <p className="font-black text-sm" style={{ color: item.color }}>{item.val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── スライド5: 150円強調 ──
function Slide5() {
  const [pulse, setPulse] = useState(false);
  const [coins, setCoins] = useState([]);
  useEffect(() => {
    const t = setInterval(() => setPulse(v => !v), 600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => {
      setCoins(prev => {
        const next = [...prev, { id: Date.now(), x: Math.random() * 80 + 10 }];
        return next.slice(-8);
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 space-y-6 relative overflow-hidden">
      <CircuitBackground />

      {/* コイン雨アニメーション */}
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        <AnimatePresence>
          {coins.map(c => (
            <motion.div
              key={c.id}
              className="absolute text-2xl"
              style={{ left: `${c.x}%`, top: -30 }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: 600, opacity: 0 }}
              exit={{}}
              transition={{ duration: 2.5, ease: "linear" }}
            >
              💰
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <div className="z-10 text-center space-y-2">
        <p className="text-xs tracking-[0.3em] uppercase" style={{ color: NEON_GOLD }}>World Lowest Price</p>
        <h2 className="text-2xl md:text-3xl font-black text-white">これが<NeonText color={NEON_GOLD}> 世界最安値</NeonText> だ</h2>
      </div>

      {/* メイン価格 */}
      <motion.div
        className="z-10 text-center"
        animate={{ scale: pulse ? 1.06 : 1 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className="rounded-2xl px-8 py-6 border-2"
          style={{
            borderColor: NEON_GOLD,
            boxShadow: `0 0 ${pulse ? 40 : 20}px ${NEON_GOLD}66, inset 0 0 ${pulse ? 20 : 8}px ${NEON_GOLD}22`,
            background: "#0a0600",
          }}
        >
          <p className="text-sm text-white/50 mb-1">15分ビデオ通話</p>
          <p
            className="font-black"
            style={{
              fontSize: 72,
              color: NEON_GOLD,
              textShadow: `0 0 ${pulse ? 50 : 20}px ${NEON_GOLD}, 0 0 ${pulse ? 100 : 40}px ${NEON_GOLD}88`,
              lineHeight: 1,
            }}
          >
            ¥150
          </p>
          <p className="text-xs text-white/30 mt-1">AWS Chime SDK × P2P最適化</p>
        </div>
      </motion.div>

      {/* 比較表 */}
      <div className="z-10 grid grid-cols-3 gap-2 w-full max-w-md text-center">
        {[
          { label: "一般的なWebRTC", val: "¥300〜500", sub: "TURN固定費込み", dim: true },
          { label: "Zoom API", val: "¥200〜", sub: "最低月額あり", dim: true },
          { label: "本サービス", val: "¥150", sub: "業界最安値", dim: false },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 border"
            style={{
              borderColor: item.dim ? "#ffffff22" : NEON_GOLD,
              background: item.dim ? "#ffffff05" : `${NEON_GOLD}0a`,
              boxShadow: item.dim ? "none" : `0 0 12px ${NEON_GOLD}33`,
            }}
          >
            <p className="text-[10px] text-white/40 mb-1">{item.label}</p>
            <p className="font-black text-sm" style={{ color: item.dim ? "#ffffff44" : NEON_GOLD }}>{item.val}</p>
            <p className="text-[9px]" style={{ color: item.dim ? "#ffffff22" : `${NEON_GOLD}aa` }}>{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ロードマップテキスト */}
      <p className="z-10 text-[10px] text-white/20 text-center italic">
        将来ロードマップ: Amazon IVS との更なる統合で、100K回/月超のコスト最適化を予定
      </p>
    </div>
  );
}

// ── 背景回路線 ──
function CircuitBackground() {
  return (
    <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <pattern id="circuit" width="80" height="80" patternUnits="userSpaceOnUse">
          <path d="M 0 40 L 20 40 M 20 40 L 20 20 M 20 20 L 60 20 M 60 20 L 60 40 M 60 40 L 80 40"
            fill="none" stroke={NEON_GREEN} strokeWidth="0.8" />
          <path d="M 40 0 L 40 20 M 40 60 L 40 80"
            fill="none" stroke={NEON_CYAN} strokeWidth="0.8" />
          <circle cx="20" cy="40" r="2" fill={NEON_GREEN} />
          <circle cx="60" cy="20" r="2" fill={NEON_CYAN} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#circuit)" />
    </svg>
  );
}

// ── メインコンポーネント ──
const SLIDES = [
  { id: 1, title: "タイトル", component: Slide1 },
  { id: 2, title: "インフラ実績", component: Slide2 },
  { id: 3, title: "安定性メーター", component: Slide3 },
  { id: 4, title: "収益構造", component: Slide4 },
  { id: 5, title: "150円強調", component: Slide5 },
];

export default function InfraSlide() {
  const [current, setCurrent] = useState(0);
  const [dir, setDir] = useState(1);

  const go = (delta) => {
    setDir(delta);
    setCurrent(v => Math.max(0, Math.min(SLIDES.length - 1, v + delta)));
  };

  const SlideComponent = SLIDES[current].component;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#060606" }}>
      {/* ナビゲーションバー */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 z-50">
        <Link to="/" className="text-white/40 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-2">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => { setDir(i > current ? 1 : -1); setCurrent(i); }}
              className="w-2 h-2 rounded-full transition-all"
              style={{
                background: i === current ? NEON_GREEN : "#ffffff22",
                boxShadow: i === current ? `0 0 8px ${NEON_GREEN}` : "none",
                width: i === current ? 24 : 8,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/30">{current + 1} / {SLIDES.length}</span>
        </div>
      </div>

      {/* スライドエリア */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={current}
            custom={dir}
            initial={{ x: dir * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: dir * -60, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <SlideComponent />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 下部コントロール */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-white/10">
        <button
          onClick={() => go(-1)}
          disabled={current === 0}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border border-white/10 disabled:opacity-20 hover:border-white/30 transition-all text-white/60"
        >
          <ArrowLeft className="w-4 h-4" /> 前へ
        </button>
        <p className="text-xs text-white/30">{SLIDES[current].title}</p>
        <button
          onClick={() => go(1)}
          disabled={current === SLIDES.length - 1}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-xl border disabled:opacity-20 hover:opacity-90 transition-all text-black font-bold"
          style={{
            background: NEON_GREEN,
            borderColor: NEON_GREEN,
            boxShadow: `0 0 12px ${NEON_GREEN}88`,
          }}
        >
          次へ <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}