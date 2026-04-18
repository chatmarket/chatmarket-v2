import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Shield, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import SanctumTierCard from "../components/vault/SanctumTierCard";

const TIERS = [
  {
    tier: "standard",
    price: 500,
    perks: [
      "限定投稿・写真を閲覧",
      "コミュニティ掲示板への投稿",
      "⭐ スタンダードバッジ（継続月数表示）",
      "SD/HD画質での限定ライブ優先参加",
    ],
  },
  {
    tier: "premium",
    price: 3000,
    perks: [
      "Standard の全特典",
      "FHD画質開放（対象配信）",
      "限定ライブへの招待",
      "👑 プレミアムバッジ（名前横に表示）",
      "エール送信時の特別エフェクト",
      "メンバー限定コンテンツ全解放",
    ],
  },
  {
    tier: "diamond",
    price: 10000,
    perks: [
      "Premium の全特典",
      "月1回の1対1ビデオ通話権（自動付与）",
      "💎 ダイヤモンドバッジ（最高格）",
      "コミュニティ限定ギフト送信権",
      "配信中チャットでの優先表示",
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
    queryKey: ["sanctum-sub", channelId, user?.email],
    queryFn: () =>
      base44.entities.PlanSubscription.filter({
        user_email: user.email,
        plan_id: `sanctum_${channelId}`,
        status: "active",
      }).then((r) => r[0] || null),
    enabled: !!user?.email && !!channelId,
  });

  const currentTierName = subscription?.plan_name?.toLowerCase().replace("sanctum_", "") || null;
  const monthsSubscribed = subscription?.start_date
    ? Math.floor((Date.now() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const effectiveChannel = channel || { name: "サンプルチャンネル" };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div
        className="relative overflow-hidden rounded-2xl border border-purple-500/30 p-6 text-center"
        style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.15) 0%, rgba(0,0,0,0) 100%)" }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px rgba(139,92,246,0.05)" }} />
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-purple-400" />
          <h1 className="font-black text-2xl text-purple-300">The Sanctum</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {effectiveChannel.name} の秘密のコミュニティ。コアなファンだけが入れる、特別な空間です。
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
      </div>

      {/* Tier cards */}
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

      {/* Footer message */}
      <div className="rounded-xl border border-purple-500/20 p-4 bg-purple-500/5 text-center space-y-1">
        <p className="text-sm font-bold text-purple-300">💜 ライバーとファンの絆を、価格で測らない</p>
        <p className="text-xs text-muted-foreground">
          Sanctumは「安売り」のない空間。本当に応援したいファンだけが集まる、質の高いコミュニティです。
        </p>
      </div>
    </div>
  );
}