/**
 * GiantKillingBanner
 * ランキング下剋上（ジャイアント・キリング）発生時に全画面上部に表示する速報テロップ。
 * broadcast通知の最新のgiant_killingイベントをリアルタイム購読して表示。
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, X, Crown } from "lucide-react";

// ファンファーレ音（Web Audio API で生成）
function playFanfare() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.3, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    // ドラ音（低音ゴング）
    const gong = ctx.createOscillator();
    const gongGain = ctx.createGain();
    gong.connect(gongGain);
    gongGain.connect(ctx.destination);
    gong.type = "sine";
    gong.frequency.setValueAtTime(80, ctx.currentTime);
    gong.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 1.5);
    gongGain.gain.setValueAtTime(0.6, ctx.currentTime);
    gongGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.8);
    gong.start(ctx.currentTime);
    gong.stop(ctx.currentTime + 2);
  } catch (e) {}
}

export default function GiantKillingBanner() {
  const [notification, setNotification] = useState(null);
  const [visible, setVisible] = useState(false);
  const shownIds = useRef(new Set());
  const navigate = useNavigate();

  const showBanner = useCallback((notif) => {
    if (shownIds.current.has(notif.id)) return;
    shownIds.current.add(notif.id);
    setNotification(notif);
    setVisible(true);
    playFanfare();
    // 12秒後に自動消去
    setTimeout(() => setVisible(false), 12000);
  }, []);

  useEffect(() => {
    // リアルタイム購読
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (
        event.type === "create" &&
        event.data?.type === "giant_killing" &&
        event.data?.is_broadcast
      ) {
        showBanner(event.data);
      }
    });

    // 直近30分以内の未表示通知を初期ロード
    base44.entities.Notification.filter({ type: "giant_killing", is_broadcast: true }, "-created_date", 1)
      .then((items) => {
        const recent = items[0];
        if (!recent) return;
        const age = Date.now() - new Date(recent.created_date).getTime();
        if (age < 30 * 60 * 1000) showBanner(recent);
      })
      .catch(() => {});

    return unsub;
  }, [showBanner]);

  const handleClick = () => {
    if (notification?.channel_id) {
      navigate(`/channel/${notification.channel_id}`);
    } else if (notification?.link) {
      navigate(notification.link);
    }
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && notification && (
        <motion.div
          key={notification.id}
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="fixed top-0 left-0 right-0 z-[9999] mx-auto max-w-2xl px-3 pt-2"
        >
          <button
            onClick={handleClick}
            className="w-full relative overflow-hidden rounded-2xl border-2 border-yellow-400/80 shadow-2xl shadow-yellow-500/30 text-left cursor-pointer group"
            style={{
              background: "linear-gradient(135deg, #1a0a00 0%, #2d1a00 50%, #1a0a00 100%)",
            }}
          >
            {/* アニメーション背景 */}
            <div
              className="absolute inset-0 opacity-20"
              style={{
                background: "repeating-linear-gradient(45deg, #f59e0b 0px, #f59e0b 2px, transparent 2px, transparent 20px)",
                animation: "none",
              }}
            />
            {/* グロー */}
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "inset 0 0 30px rgba(251,191,36,0.2)" }} />

            <div className="relative z-10 flex items-center gap-3 px-4 py-3">
              {/* アイコン */}
              <div className="w-10 h-10 rounded-full bg-yellow-500/20 border-2 border-yellow-400 flex items-center justify-center shrink-0 animate-pulse">
                <Crown className="w-5 h-5 text-yellow-400" />
              </div>

              {/* テキスト */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-black text-yellow-400 bg-yellow-400/20 border border-yellow-400/40 px-2 py-0.5 rounded-full tracking-widest">
                    ⚡ 速報 ⚡
                  </span>
                  <span className="text-[10px] text-yellow-300/70">ジャイアント・キリング発生</span>
                </div>
                <p className="font-black text-sm text-white leading-tight truncate">
                  🎺 {notification.title}
                </p>
                <p className="text-xs text-yellow-200/70 truncate mt-0.5">{notification.message}</p>
              </div>

              {/* CTA */}
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-3 py-1.5 rounded-full group-hover:bg-yellow-400/20 transition-colors whitespace-nowrap">
                  今すぐ見る →
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setVisible(false); }}
                  className="text-white/40 hover:text-white/80 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* スクロールテロップ */}
            <div className="relative bg-yellow-500/10 border-t border-yellow-500/20 overflow-hidden h-6">
              <div
                className="absolute whitespace-nowrap text-[11px] font-bold text-yellow-400/80 flex items-center h-full gap-8"
                style={{ animation: "marquee 12s linear infinite" }}
              >
                {Array.from({ length: 6 }).map((_, i) => (
                  <span key={i}>🎺 {notification.title} 🎺 歴史が動いた！</span>
                ))}
              </div>
            </div>
          </button>

          <style>{`
            @keyframes marquee { from { transform: translateX(100vw); } to { transform: translateX(-200%); } }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}