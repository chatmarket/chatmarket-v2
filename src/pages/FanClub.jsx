import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Sparkles, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SanctumTierCard from "../components/vault/SanctumTierCard";
import MemberGiftPanel from "../components/fanclub/MemberGiftPanel";

const TIERS = [
  {
    tier: "standard",
    price: 500,
    perks: [
      "限定投稿・写真を閲覧",
      "コミュニティ掲示板への投稿",
      "⭐ スタンダードバッジ（継続月数表示）",
      "会員限定ギフト解放",
    ],
  },
  {
    tier: "premium",
    price: 3000,
    perks: [
      "Standard の全特典",
      "FHD画質開放（対象配信）",
      "限定ライブへの招待",
      "👑 プレミアムバッジ",
      "プレミアムギフト解放",
    ],
  },
  {
    tier: "diamond",
    price: 10000,
    perks: [
      "Premium の全特典",
      "月1回の1対1ビデオ通話権",
      "💎 ダイヤモンドバッジ",
      "伝説のギフト解放",
      "ライバーからの優先返信・DM権",
    ],
  },
];

function MemberBadge({ months, tier }) {
  if (!months) return null;
  const badge =
    tier === "diamond" ? "💎" :
    tier === "premium" ? "👑" :
    months >= 12 ? "🌟" :
    months >= 6  ? "⭐" : "✨";
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
      {badge} {months}ヶ月
    </span>
  );
}

export default function FanClub() {
  const { channelId } = useParams();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["fanclub-channel", channelId],
    queryFn: () => base44.entities.Channel.filter({ id: channelId }).then((r) => r[0]),
    enabled: !!channelId,
  });

  const { data: subscription } = useQuery({
    queryKey: ["sanctum-sub-fc", channelId, user?.email],
    queryFn: () =>
      base44.entities.PlanSubscription.filter({
        user_email: user.email,
        plan_id: `sanctum_${channelId}`,
        status: "active",
      }).then((r) => r[0] || null),
    enabled: !!user?.email && !!channelId,
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["fanclub-wallet-fc", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((r) => r[0] || null),
    enabled: !!user,
  });

  const currentTierName = subscription?.plan_name?.replace("sanctum_", "") || null;
  const monthsSubscribed = subscription?.start_date
    ? Math.floor((Date.now() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const effectiveChannel = channel || { name: "サンプルチャンネル" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/30 p-6 text-center"
        style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.18) 0%, rgba(0,0,0,0) 100%)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-yellow-400" />
          <h1 className="font-black text-2xl text-yellow-400" style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}>
            FAN CLUB
          </h1>
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="text-purple-300 font-bold">{effectiveChannel.name}</span> の特別なファンコミュニティ
        </p>

        {subscription && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-2"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">メンバー加入中</span>
            <MemberBadge months={monthsSubscribed} tier={currentTierName} />
          </motion.div>
        )}
      </motion.div>

      {/* Tier cards */}
      {channelId ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TIERS.map((tier, i) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <SanctumTierCard
                {...tier}
                channelId={channelId}
                isCurrentTier={currentTierName === tier.tier}
                hasAnyTier={!!currentTierName}
                disabled={false}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/40 rounded-xl border border-border/50">
          チャンネルページからファンクラブにアクセスしてください
        </div>
      )}

      {/* Member Gift Section */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
        <MemberGiftPanel
          channelId={channelId}
          channelOwnerEmail={effectiveChannel?.owner_email}
          user={user}
          wallet={wallet}
          currentTier={currentTierName}
          onWalletUpdate={() => refetchWallet()}
        />
      </div>

      {/* Footer */}
      <div className="rounded-xl border border-purple-500/20 p-4 bg-purple-500/5 text-center space-y-1">
        <p className="text-sm font-bold text-purple-300">💜 ライバーとファンの絆を、価格で測らない</p>
        <p className="text-xs text-muted-foreground">
          会員限定の空間。本当に応援したいファンだけが集まる、質の高いコミュニティです。
        </p>
      </div>
    </div>
  );
}