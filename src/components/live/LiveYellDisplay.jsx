import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";

export default function LiveYellDisplay({ streamId, latestYell }) {
  const [superChats, setSuperChats] = useState([]);

  useEffect(() => {
    if (!streamId) return;
    
    console.log(`[LiveYellDisplay] 📡 Subscribing to SuperChat on stream: ${streamId}`);
    
    // 初回ロード
    const fetchSuperChats = async () => {
      try {
        const data = await base44.entities.SuperChat.filter(
          { livestream_id: streamId },
          "-created_date",
          20
        );
        setSuperChats(data);
      } catch (err) {
        console.error('[LiveYellDisplay] Failed to fetch SuperChat:', err);
      }
    };

    fetchSuperChats();

    // リアルタイム購読
    const unsubscribe = base44.entities.SuperChat.subscribe((event) => {
      if (event.type !== "create") return;
      if (event.data?.livestream_id !== streamId) return;
      console.log(`[LiveYellDisplay] ✅ SuperChat added: ${event.data?.user_name} - ${event.data?.amount}コイン`);
      setSuperChats((prev) => [event.data, ...prev.slice(0, 19)]);
    });

    return unsubscribe;
  }, [streamId]);

  return (
    <>
      <AnimatePresence>
        {latestYell && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/40 rounded-lg p-3 ring-1 ring-yellow-500/30"
          >
            <p className="text-xs font-bold text-yellow-400">🎉 {latestYell.user_name}</p>
            <p className="text-sm font-black text-yellow-300 mt-1">🪙 {latestYell.amount} コイン</p>
            {latestYell.message && <p className="text-xs text-foreground/80 mt-2">「{latestYell.message}」</p>}
          </motion.div>
        )}
      </AnimatePresence>

      {superChats.length > 0 ? (
        superChats.map((sc) => (
          <div key={sc.id} className="bg-zinc-800/50 rounded-lg p-2 border border-amber-500/30">
            <p className="text-xs font-bold text-amber-400">{sc.user_name}</p>
            <p className="text-xs font-black text-yellow-300">🪙 {sc.amount} コイン</p>
            {sc.message && <p className="text-[10px] text-foreground/70 mt-1">「{sc.message}」</p>}
          </div>
        ))
      ) : (
        <p className="text-xs text-zinc-500 text-center py-8">応援が表示されます</p>
      )}
    </>
  );
}