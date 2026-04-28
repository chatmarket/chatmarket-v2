/**
 * IncomingCallScreen
 * ライバー（callee）向け着信画面 — デザイン最終版
 */
import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function IncomingCallScreen({ call, onAccept, onDecline }) {
  const callerName = call?.caller_name || call?.caller_email || "発信者";

  // 着信音（Web Audio API）
  const ringTimerRef = useRef(null);
  useEffect(() => {
    let stopped = false;
    const ring = () => {
      if (stopped) return;
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
        ctx.close();
      } catch {}
    };
    ring();
    ringTimerRef.current = setInterval(ring, 1800);
    return () => {
      stopped = true;
      clearInterval(ringTimerRef.current);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-lg">
      <motion.div
        initial={{ scale: 0.85, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm mx-4"
      >
        {/* カード */}
        <div className="bg-card border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6 overflow-hidden">

          {/* 背景グロー */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          </div>

          {/* アバターリング */}
          <div className="relative flex justify-center">
            {/* 外側パルスリング */}
            <motion.div
              className="absolute inset-0 m-auto w-24 h-24 rounded-full border-2 border-primary/40"
              animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute inset-0 m-auto w-24 h-24 rounded-full border-2 border-primary/20"
              animate={{ scale: [1, 1.7, 1], opacity: [0.4, 0, 0.4] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />
            {/* アバター本体 */}
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-primary/30 to-primary/10 border-2 border-primary flex items-center justify-center shadow-lg shadow-primary/30 z-10">
              <span className="text-4xl font-black text-primary">
                {callerName[0]?.toUpperCase()}
              </span>
            </div>
          </div>

          {/* テキスト */}
          <div className="space-y-1 relative z-10">
            <p className="text-xs text-muted-foreground tracking-widest uppercase">着信中</p>
            <p className="text-2xl font-black text-white">{callerName}</p>
            <p className="text-sm text-muted-foreground">ビデオ通話のリクエストです</p>
          </div>

          {/* カメラ確認バッジ */}
          <div className="relative z-10 flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-3 py-2.5 text-left">
            <span className="text-base shrink-0">📷</span>
            <p className="text-yellow-300 text-xs font-bold leading-relaxed">
              通話前にカメラ・マイクがONになっているか確認してください
            </p>
          </div>

          {/* ボタン */}
          <div className="relative z-10 flex gap-4">
            {/* 拒否 */}
            <button
              onClick={onDecline}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <div className="w-16 h-16 rounded-full bg-red-500/20 border-2 border-red-500/60 flex items-center justify-center group-hover:bg-red-500/40 transition-all">
                <PhoneOff className="w-7 h-7 text-red-400" />
              </div>
              <span className="text-xs text-red-400 font-semibold">拒否</span>
            </button>

            {/* 応答 */}
            <button
              onClick={onAccept}
              className="flex-1 flex flex-col items-center gap-2 group"
            >
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-full flex items-center justify-center border-2 border-primary"
                style={{
                  background: "linear-gradient(135deg, hsl(160 84% 39%), hsl(160 84% 28%))",
                  boxShadow: "0 0 24px hsl(160 84% 39% / 0.6)",
                }}
              >
                <Phone className="w-7 h-7 text-black" />
              </motion.div>
              <span className="text-xs text-primary font-semibold">応答</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}