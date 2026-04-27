import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Coins } from "lucide-react";

const YELL_AMOUNTS = [
  { coins: 10,  label: "10",  gradient: "from-amber-600 to-yellow-500",  glow: "shadow-amber-500/40" },
  { coins: 50,  label: "50",  gradient: "from-yellow-500 to-amber-400",  glow: "shadow-yellow-400/50" },
  { coins: 100, label: "100", gradient: "from-yellow-400 to-amber-300",  glow: "shadow-yellow-300/60" },
  { coins: 500, label: "500", gradient: "from-amber-300 to-yellow-200",  glow: "shadow-yellow-200/70" },
];

export default function YellButtons({ streamId, user, channelId }) {
  const [bursting, setBursting] = useState(null);
  const [particles, setParticles] = useState([]);

  const handleYell = async (amount) => {
    if (!user) { base44.auth.redirectToLogin(); return; }

    // ウォレット確認
    const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
    const wallet = wallets[0];
    if (!wallet || wallet.balance < amount) {
      toast.error(`コインが不足しています（残高: ${wallet?.balance || 0}コイン）`);
      return;
    }

    // バースト演出
    setBursting(amount);
    const pts = Array.from({ length: 8 }, (_, i) => ({
      id: i,
      angle: (i / 8) * 360,
      emoji: ["🪙","✨","💛","⭐"][i % 4],
    }));
    setParticles(pts);
    setTimeout(() => { setBursting(null); setParticles([]); }, 1000);

    // コイン消費
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - amount,
      total_sent: (wallet.total_sent || 0) + amount,
    });

    // トランザクション記録
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount,
      target_id: streamId,
      service_type: "superchat",
      service_id: streamId,
      channel_id: channelId,
    });

    // チャット欄に表示
    await base44.entities.SuperChat.create({
      livestream_id: streamId,
      user_email: user.email,
      user_name: user.full_name || "匿名",
      amount,
      message: `🪙 ${amount}コインのエールを送りました！`,
      color: amount >= 500 ? "red" : amount >= 100 ? "orange" : amount >= 50 ? "yellow" : "green",
    });

    toast.success(`🎉 ${amount.toLocaleString()}コインのエールを送りました！`);
  };

  return (
    <div className="relative flex items-center gap-2">
      {/* パーティクル */}
      <AnimatePresence>
        {particles.map((p) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            animate={{
              opacity: 0,
              scale: 0.5,
              x: Math.cos((p.angle * Math.PI) / 180) * 60,
              y: Math.sin((p.angle * Math.PI) / 180) * 60,
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="pointer-events-none absolute text-lg z-50"
            style={{ left: "50%", top: "50%", marginLeft: -8, marginTop: -8 }}
          >
            {p.emoji}
          </motion.div>
        ))}
      </AnimatePresence>

      {/* エールボタン */}
      {YELL_AMOUNTS.map(({ coins, label, gradient, glow }) => (
        <motion.button
          key={coins}
          onClick={() => handleYell(coins)}
          whileTap={{ scale: 0.85 }}
          animate={bursting === coins ? { scale: [1, 1.3, 1] } : {}}
          transition={{ duration: 0.3 }}
          className={`
            relative flex flex-col items-center justify-center
            w-14 h-14 rounded-2xl
            bg-gradient-to-b ${gradient}
            shadow-lg ${glow}
            border border-yellow-300/30
            text-black font-black
            hover:brightness-110 active:brightness-90
            transition-all duration-150
          `}
          style={{
            boxShadow: bursting === coins
              ? `0 0 20px 6px rgba(251,191,36,0.8)`
              : `0 4px 15px rgba(0,0,0,0.4)`,
          }}
        >
          <Coins className="w-4 h-4 mb-0.5" />
          <span className="text-xs leading-none">{label}</span>
          <span className="text-[9px] leading-none opacity-70">コイン</span>
        </motion.button>
      ))}
    </div>
  );
}