import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, Zap, Crown, Gem, Star } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const GIFTS = [
  {
    id: "heart",
    emoji: "❤️",
    name: "ハート",
    coins: 100,
    minTier: "standard",
    color: "from-pink-500/20 to-rose-600/10",
    border: "border-pink-500/40",
    effect: "💗💗💗",
  },
  {
    id: "star",
    emoji: "⭐",
    name: "スター",
    coins: 300,
    minTier: "standard",
    color: "from-yellow-500/20 to-amber-600/10",
    border: "border-yellow-500/40",
    effect: "✨⭐✨",
  },
  {
    id: "rocket",
    emoji: "🚀",
    name: "ロケット",
    coins: 500,
    minTier: "premium",
    color: "from-blue-500/20 to-indigo-600/10",
    border: "border-blue-500/40",
    effect: "🚀🚀🚀",
  },
  {
    id: "crown",
    emoji: "👑",
    name: "クラウン",
    coins: 1000,
    minTier: "premium",
    color: "from-purple-500/20 to-violet-600/10",
    border: "border-purple-500/40",
    effect: "👑✨👑",
  },
  {
    id: "legend",
    emoji: "💎",
    name: "伝説のギフト",
    coins: 10000,
    minTier: "diamond",
    color: "from-amber-400/30 to-yellow-600/20",
    border: "border-amber-400/60",
    effect: "💎🌟💎🌟💎",
    isLegend: true,
  },
  {
    id: "god",
    emoji: "🔥",
    name: "ゴッドフレイム",
    coins: 50000,
    minTier: "diamond",
    color: "from-red-500/30 to-orange-600/20",
    border: "border-red-400/60",
    effect: "🔥💥🔥💥🔥",
    isLegend: true,
  },
];

const TIER_RANK = { standard: 1, premium: 2, diamond: 3 };

function GiftEffect({ effect, onDone }) {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onAnimationComplete={onDone}
    >
      <motion.div
        className="text-6xl"
        initial={{ scale: 0.5, y: 0 }}
        animate={{ scale: [0.5, 1.8, 1.4], y: [-20, -120, -200], opacity: [1, 1, 0] }}
        transition={{ duration: 1.5 }}
      >
        {effect}
      </motion.div>
    </motion.div>
  );
}

export default function MemberGiftPanel({ channelId, channelOwnerEmail, user, wallet, currentTier, onWalletUpdate }) {
  const [sending, setSending] = useState(null);
  const [activeEffect, setActiveEffect] = useState(null);

  const userRank = TIER_RANK[currentTier] || 0;

  const handleSendGift = async (gift) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (userRank < TIER_RANK[gift.minTier]) return;
    if ((wallet?.balance || 0) < gift.coins) {
      toast.error("エールコインが不足しています");
      return;
    }

    setSending(gift.id);
    try {
      // コイン消費
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance: wallet.balance - gift.coins,
        total_sent: (wallet.total_sent || 0) + gift.coins,
      });
      // トランザクション記録
      await base44.entities.YellCoinTransaction.create({
        user_email: user.email,
        type: "send",
        amount: gift.coins,
        target_name: gift.name,
        message: `${gift.emoji} ${gift.name}ギフト`,
        service_type: "superchat",
        channel_id: channelId,
        channel_owner_email: channelOwnerEmail,
      });

      setActiveEffect(gift.effect);
      toast.success(`${gift.emoji} ${gift.name}を送りました！`);
      onWalletUpdate?.();
    } catch (err) {
      toast.error("送信に失敗しました: " + err.message);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {activeEffect && (
          <GiftEffect effect={activeEffect} onDone={() => setActiveEffect(null)} />
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2">
        <Gem className="w-4 h-4 text-amber-400" />
        <h3 className="font-black text-sm text-amber-300">会員限定ギフト</h3>
        <span className="text-[10px] text-muted-foreground">（会員ランクで解放）</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {GIFTS.map((gift) => {
          const unlocked = userRank >= TIER_RANK[gift.minTier];
          const canAfford = (wallet?.balance || 0) >= gift.coins;
          const isSending = sending === gift.id;

          return (
            <motion.button
              key={gift.id}
              onClick={() => unlocked && handleSendGift(gift)}
              disabled={!unlocked || isSending}
              whileHover={unlocked ? { scale: 1.04 } : {}}
              whileTap={unlocked ? { scale: 0.97 } : {}}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all text-center
                ${unlocked
                  ? `bg-gradient-to-br ${gift.color} ${gift.border} cursor-pointer hover:shadow-lg`
                  : "bg-secondary/40 border-border/30 cursor-not-allowed opacity-60"
                }
                ${gift.isLegend && unlocked ? "shadow-lg shadow-amber-500/20" : ""}
              `}
            >
              {/* ロックオーバーレイ */}
              {!unlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-black/40 backdrop-blur-[1px] z-10">
                  <Lock className="w-5 h-5 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground font-bold capitalize">
                    {gift.minTier === "diamond" ? "💎 Diamond限定" : "⭐ Standard以上"}
                  </span>
                </div>
              )}

              {/* 伝説バッジ */}
              {gift.isLegend && unlocked && (
                <div className="absolute -top-2 -right-2 bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full z-10">
                  LEGEND
                </div>
              )}

              <span className={`${gift.isLegend ? "text-4xl" : "text-3xl"} transition-transform`}>
                {gift.emoji}
              </span>
              <div>
                <p className={`text-xs font-black ${gift.isLegend ? "text-amber-300" : "text-foreground"}`}>
                  {gift.name}
                </p>
                <p className="text-[10px] text-muted-foreground">🪙 {gift.coins.toLocaleString()}</p>
              </div>

              {unlocked && !canAfford && (
                <span className="text-[9px] text-destructive font-bold">コイン不足</span>
              )}

              {isSending && (
                <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/50 z-20">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* コイン残高 */}
      {wallet && (
        <div className="text-right text-xs text-muted-foreground">
          所持コイン: <span className="text-primary font-bold">🪙 {wallet.balance?.toLocaleString()}</span>
        </div>
      )}

      {/* ティア案内 */}
      {userRank === 0 && (
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center text-xs text-purple-300">
          💜 ギフトを送るにはSanctumメンバーへの加入が必要です
        </div>
      )}
    </div>
  );
}