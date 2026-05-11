import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

// コイン額に応じた色・アイコン定義
const YELL_TIERS = {
  green: { min: 0, max: 99, emoji: "🟢", bg: "from-emerald-500/30 to-emerald-600/20", border: "border-emerald-500/50", text: "text-emerald-300", accent: "text-emerald-400", glow: "shadow-emerald-500/50" },
  yellow: { min: 100, max: 499, emoji: "🟡", bg: "from-yellow-500/30 to-yellow-600/20", border: "border-yellow-500/50", text: "text-yellow-300", accent: "text-yellow-400", glow: "shadow-yellow-500/50" },
  gold: { min: 500, max: 4999, emoji: "🟠", bg: "from-amber-500/35 to-orange-600/25", border: "border-amber-500/60", text: "text-amber-200", accent: "text-amber-300", glow: "shadow-amber-500/60" },
  diamond: { min: 5000, max: Infinity, emoji: "💎", bg: "from-purple-500/40 to-pink-600/30", border: "border-purple-500/70 animate-pulse", text: "text-purple-200", accent: "text-pink-300", glow: "shadow-purple-600/80" },
};

function getTierByAmount(amount) {
  if (amount <= 99) return YELL_TIERS.green;
  if (amount <= 499) return YELL_TIERS.yellow;
  if (amount <= 4999) return YELL_TIERS.gold;
  return YELL_TIERS.diamond;
}

export default function LiveYellDisplay({ streamId, latestYell }) {
  const [superChats, setSuperChats] = useState([]);

  // props で受け取った latestYell を画面に反映（log付き）
  useEffect(() => {
    if (latestYell) {
      console.log(`[LiveYellDisplay] 🎯 latestYell props received:`, latestYell);
    }
  }, [latestYell]);

  useEffect(() => {
    if (!streamId) return;
    
    console.log(`[LiveYellDisplay] 📡 Subscribing to エールコイン on stream: ${streamId}`);
    
    // 初回ロード
    const fetchSuperChats = async () => {
      try {
        const data = await base44.entities.SuperChat.filter(
          { livestream_id: streamId },
          "-created_date",
          20
        );
        console.log(`[LiveYellDisplay] 📥 Initial エールコイン loaded: ${data.length} items`);
        setSuperChats(data);
      } catch (err) {
        console.error('[LiveYellDisplay] Failed to fetch エールコイン:', err);
      }
    };

    fetchSuperChats();

    // リアルタイム購読
    const unsubscribe = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.livestream_id !== streamId) return;
      console.log(`[LiveYellDisplay] ✅ エールコイン受信: ${event.data?.user_name} - ${event.data?.amount}コイン`);
      setSuperChats((prev) => [event.data, ...prev.slice(0, 19)]);
    });

    return unsubscribe;
  }, [streamId]);

  const tier = latestYell ? getTierByAmount(latestYell.amount) : null;

  return (
    <>
      <AnimatePresence>
        {latestYell && tier ? (
          <motion.div
            key={latestYell.id}
            initial={{ opacity: 0, y: 40, scale: 0.5, rotate: -5 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              rotate: 0,
              x: [0, -8, 8, -8, 8, 0],
            }}
            exit={{ opacity: 0, y: -20, scale: 0.3 }}
            transition={{
              duration: 0.6,
              x: { duration: 0.5, delay: 0.1 },
              ease: "easeOut"
            }}
            className={`bg-gradient-to-r ${tier.bg} border-2 ${tier.border} rounded-2xl p-6 ring-2 ${tier.glow} shadow-2xl`}
          >
            {/* 背景グロー */}
            <div className={`absolute inset-0 rounded-2xl blur-2xl opacity-40 ${tier.glow}`} style={{ zIndex: -1 }} />
            
            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-4xl animate-bounce">{tier.emoji}</span>
                <p className={`text-2xl font-black ${tier.accent} tracking-widest`}>{latestYell.user_name}</p>
              </div>
              <p className={`text-5xl font-black ${tier.accent} drop-shadow-lg`}>🪙 {latestYell.amount.toLocaleString()}</p>
              <p className={`text-xs font-bold mt-2 ${tier.text} uppercase tracking-widest`}>エール受け取り！</p>
              {latestYell.message && <p className={`text-lg font-bold mt-4 ${tier.text} break-words`}>「{latestYell.message}」</p>}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {superChats.length > 0 ? (
        superChats.map((sc) => {
          const scTier = getTierByAmount(sc.amount);
          return (
            <div key={sc.id} className={`bg-gradient-to-r ${scTier.bg} rounded-xl p-3 border-2 ${scTier.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{scTier.emoji}</span>
                <p className={`text-lg font-black ${scTier.accent}`}>{sc.user_name}</p>
              </div>
              <p className={`text-2xl font-black ${scTier.accent}`}>🪙 {sc.amount.toLocaleString()}</p>
              {sc.message && <p className={`text-sm font-semibold mt-2 ${scTier.text}`}>「{sc.message}」</p>}
            </div>
          );
        })
      ) : (
        <p className="text-xs text-zinc-500 text-center py-8">応援が表示されます</p>
      )}
    </>
  );
}