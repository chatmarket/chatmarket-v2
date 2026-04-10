import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Gift } from "lucide-react";

function getTierStyle(amount) {
  if (amount >= 5000) return { bg: "from-yellow-400 to-pink-500", border: "border-yellow-300", emoji: "🌟", label: "LEGENDARY" };
  if (amount >= 2000) return { bg: "from-yellow-500 to-orange-400", border: "border-yellow-400", emoji: "🏆", label: "GOLD" };
  if (amount >= 500) return { bg: "from-blue-400 to-cyan-400", border: "border-blue-300", emoji: "🥈", label: "SUPER" };
  return { bg: "from-amber-600 to-yellow-500", border: "border-amber-400", emoji: "☕", label: "TIP" };
}

export default function TipBroadcasterAlert({ channelId, ownerEmail, currentUserEmail }) {
  const [alerts, setAlerts] = useState([]);
  const lastIdRef = useRef(null);

  useEffect(() => {
    if (!channelId) return;
    // 5秒ごとにポーリング
    const poll = async () => {
      const tips = await base44.entities.SuperChat.filter(
        { channel_id: channelId, type: "fanclub_tip" },
        "-created_date",
        5
      ).catch(() => []);
      if (tips.length === 0) return;
      const latest = tips[0];
      if (lastIdRef.current && latest.id !== lastIdRef.current) {
        const style = getTierStyle(latest.amount);
        const alertId = Date.now();
        setAlerts((prev) => [...prev, { ...latest, alertId, style }]);
        setTimeout(() => setAlerts((prev) => prev.filter((a) => a.alertId !== alertId)), 6000);
      }
      lastIdRef.current = lastIdRef.current || latest.id;
      lastIdRef.current = latest.id;
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [channelId]);

  // 配信者のみに表示（ownerEmailと一致する場合）
  if (currentUserEmail !== ownerEmail) return null;

  return (
    <div className="fixed top-20 right-4 z-[150] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => {
          const { style } = alert;
          return (
            <motion.div
              key={alert.alertId}
              initial={{ opacity: 0, x: 120, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={`bg-gradient-to-r ${style.bg} rounded-2xl p-4 shadow-2xl border-2 ${style.border} max-w-xs`}
              style={{ boxShadow: "0 0 30px rgba(255,200,0,0.5)" }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  className="text-3xl"
                  animate={{ rotate: [0, -15, 15, 0], scale: [1, 1.3, 1] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                >
                  {style.emoji}
                </motion.div>
                <div className="text-black">
                  <p className="text-xs font-black opacity-70">{style.label} 投げ銭が届きました！</p>
                  <p className="font-bold text-sm">{alert.user_name} さんから</p>
                  <p className="text-2xl font-black">¥{alert.amount?.toLocaleString()}</p>
                  {alert.message && (
                    <p className="text-xs mt-1 opacity-80 bg-black/10 rounded-lg px-2 py-1">"{alert.message}"</p>
                  )}
                </div>
                <Gift className="w-5 h-5 text-black/50 shrink-0" />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}