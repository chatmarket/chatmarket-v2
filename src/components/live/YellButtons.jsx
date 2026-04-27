import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Coins } from "lucide-react";
import YellMessageModal from "./YellMessageModal";

const FEE_RATE = 0.036; // 手数料 3.6%

const YELL_AMOUNTS = [
  { coins: 10,  gradient: "from-amber-700 to-yellow-500",  glow: "rgba(217,119,6,0.6)" },
  { coins: 50,  gradient: "from-yellow-500 to-amber-400",  glow: "rgba(251,191,36,0.6)" },
  { coins: 100, gradient: "from-yellow-400 to-amber-300",  glow: "rgba(252,211,77,0.7)" },
  { coins: 500, gradient: "from-amber-300 to-yellow-100",  glow: "rgba(254,240,138,0.8)" },
];

// 手数料込みの実際の引き落とし額
function calcTotal(coins) {
  return Math.ceil(coins * (1 + FEE_RATE));
}

// コイン数に応じたSuperChatカラー
function chatColor(coins) {
  if (coins >= 500) return "red";
  if (coins >= 100) return "orange";
  if (coins >= 50)  return "yellow";
  return "green";
}

// チャット欄に流すメッセージ
function chatMessage(coins) {
  if (coins >= 500) return `👑 ${coins}コインの大エール！ありがとうございます！`;
  if (coins >= 100) return `🔥 ${coins}コインのエール！`;
  if (coins >= 50)  return `💛 ${coins}コインのエール！`;
  return `🪙 ${coins}コインのエール！`;
}

export default function YellButtons({ streamId, user, channelId }) {
  const [bursting, setBursting] = useState(null);
  const [particles, setParticles] = useState([]);
  const [hoveredCoins, setHoveredCoins] = useState(null);
  const [modalCoins, setModalCoins] = useState(null);

  const handleYell = (coins) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    
    // バースト演出
    setBursting(coins);
    setParticles(Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * 360,
      emoji: ["🪙","✨","💛","⭐","🔥","💰","🎉","👑"][i],
    })));
    setTimeout(() => { setBursting(null); setParticles([]); }, 900);

    // モーダル表示
    setModalCoins(coins);
  };

  return (
    <>
      <div className="relative flex items-center gap-1.5">
        {/* パーティクルエフェクト */}
        <AnimatePresence>
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              animate={{
                opacity: 0,
                scale: 0.4,
                x: Math.cos((p.angle * Math.PI) / 180) * 55,
                y: Math.sin((p.angle * Math.PI) / 180) * 55,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="pointer-events-none absolute text-base z-50"
              style={{ left: "50%", top: "50%", marginLeft: -8, marginTop: -8 }}
            >
              {p.emoji}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* エールボタン */}
        {YELL_AMOUNTS.map(({ coins, gradient, glow }) => (
          <motion.button
            key={coins}
            onClick={() => handleYell(coins)}
            onMouseEnter={() => setHoveredCoins(coins)}
            onMouseLeave={() => setHoveredCoins(null)}
            whileTap={{ scale: 0.82 }}
            animate={bursting === coins ? { scale: [1, 1.25, 1] } : hoveredCoins === coins ? { scale: 1.1 } : {}}
            transition={{ duration: 0.3 }}
            className={`
              relative flex flex-col items-center justify-center
              w-16 h-16 rounded-2xl
              bg-gradient-to-b ${gradient}
              text-black font-black
              transition-all duration-150
            `}
            style={{
              boxShadow: bursting === coins
                ? `0 0 32px 12px ${glow}, inset 0 1px 12px rgba(255,255,255,0.4)`
                : hoveredCoins === coins
                ? `0 8px 24px ${glow}, inset 0 1px 8px rgba(255,255,255,0.35)`
                : `0 4px 12px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.3)`,
              border: `2px solid ${hoveredCoins === coins ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}`,
            }}
          >
            <Coins className="w-3.5 h-3.5 mb-0.5" />
            <span className="text-xs leading-none">{coins}</span>
            <span className="text-[9px] leading-none opacity-70 mt-0.5">コイン</span>
            <span className="text-[8px] leading-none opacity-50">({calcTotal(coins)})</span>
          </motion.button>
        ))}
      </div>

      {/* メッセージモーダル */}
      <AnimatePresence>
        {modalCoins !== null && (
          <YellMessageModal
            coins={modalCoins}
            user={user}
            streamId={streamId}
            channelId={channelId}
            onClose={() => setModalCoins(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}