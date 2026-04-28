/**
 * OutgoingCallScreen
 * 発信側（caller）向け呼び出し中画面 — リッチデザイン版
 */
import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PhoneOff } from "lucide-react";

export default function OutgoingCallScreen({ call, localVideoRef, onCancel }) {
  const calleeName = call?.callee_name || call?.callee_email || "ライバー";
  const calleeAvatar = call?.callee_avatar_url || null;

  // 呼び出し時間カウントアップ
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // 呼び出し音（Web Audio）
  const stopRingRef = useRef(false);
  useEffect(() => {
    stopRingRef.current = false;
    const ring = () => {
      if (stopRingRef.current) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [0, 0.3].forEach(offset => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(440, ctx.currentTime + offset);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + 0.25);
          osc.start(ctx.currentTime + offset);
          osc.stop(ctx.currentTime + offset + 0.25);
        });
        setTimeout(() => ctx.close(), 800);
      } catch {}
    };
    ring();
    const interval = setInterval(ring, 2500);
    return () => { stopRingRef.current = true; clearInterval(interval); };
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-between overflow-hidden">

      {/* ── 背景: ライバー画像 + グラデーション ── */}
      <div className="absolute inset-0">
        {calleeAvatar ? (
          <img
            src={calleeAvatar}
            alt=""
            className="w-full h-full object-cover scale-110"
            style={{ filter: "blur(18px) brightness(0.45)" }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#0a1a0f] via-[#071510] to-[#030d08]" />
        )}
        {/* グラデーションオーバーレイ */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90" />
        {/* グリーングロー */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse 60% 50% at 50% 40%, hsl(160 84% 39% / 0.12) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* ── 上部: ステータステキスト ── */}
      <div className="relative z-10 pt-16 text-center space-y-1">
        <p className="text-xs text-primary/80 tracking-[0.3em] uppercase font-semibold">呼び出し中</p>
        <motion.div
          className="flex items-center justify-center gap-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {[0, 1, 2].map(i => (
            <motion.span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-primary"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
            />
          ))}
        </motion.div>
      </div>

      {/* ── 中央: アバター + パルスリング ── */}
      <div className="relative z-10 flex flex-col items-center gap-6">

        {/* パルスリング群 */}
        <div className="relative flex items-center justify-center w-44 h-44">
          {[1, 1.5, 2.0].map((scale, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border border-primary/30"
              style={{ width: "100px", height: "100px" }}
              animate={{ scale: [1, scale + 0.3], opacity: [0.5, 0] }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                delay: i * 0.55,
                ease: "easeOut",
              }}
            />
          ))}

          {/* アバター本体 */}
          <motion.div
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-28 h-28 rounded-full overflow-hidden border-4 shadow-2xl z-10"
            style={{
              borderColor: "hsl(160 84% 39%)",
              boxShadow: "0 0 40px hsl(160 84% 39% / 0.5), 0 0 80px hsl(160 84% 39% / 0.2)",
            }}
          >
            {calleeAvatar ? (
              <img src={calleeAvatar} alt={calleeName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center">
                <span className="text-5xl font-black text-primary">
                  {calleeName[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </motion.div>
        </div>

        {/* ライバー名 */}
        <div className="text-center space-y-1">
          <p className="text-3xl font-black text-white tracking-tight">{calleeName}</p>
          <p className="text-sm text-white/50">承認されると通話が始まります</p>
        </div>

        {/* カウントアップタイマー */}
        <div
          className="px-5 py-2 rounded-full border font-mono text-lg font-bold tracking-widest"
          style={{
            borderColor: "hsl(160 84% 39% / 0.4)",
            background: "hsl(160 84% 39% / 0.08)",
            color: "hsl(160 84% 60%)",
          }}
        >
          {formatTime(elapsed)}
        </div>
      </div>

      {/* ── 自分のカメラプレビュー（右下PiP） ── */}
      <div className="absolute bottom-36 right-5 w-24 h-32 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl bg-black/80 z-20">
        <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        <div className="absolute bottom-1 inset-x-0 text-center">
          <span className="text-[9px] text-white/60 bg-black/50 px-2 py-0.5 rounded-full">あなた</span>
        </div>
      </div>

      {/* ── 注意書き ── */}
      <div className="relative z-10 px-6 w-full max-w-sm mb-2">
        <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2.5">
          <span className="text-base shrink-0">📷</span>
          <p className="text-yellow-300/80 text-xs font-medium leading-relaxed">
            カメラ・マイクがONになっているか確認してください
          </p>
        </div>
      </div>

      {/* ── キャンセルボタン ── */}
      <div className="relative z-10 pb-14 flex flex-col items-center gap-2">
        <motion.button
          onClick={onCancel}
          whileTap={{ scale: 0.93 }}
          className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
          style={{
            background: "linear-gradient(135deg, #ef4444, #b91c1c)",
            boxShadow: "0 0 24px rgba(239,68,68,0.5)",
          }}
        >
          <PhoneOff className="w-7 h-7 text-white" />
        </motion.button>
        <p className="text-xs text-white/40">キャンセル</p>
      </div>
    </div>
  );
}