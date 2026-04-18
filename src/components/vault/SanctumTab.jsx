import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Star, Crown, Gem, Sparkles, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import SanctumTierCard from "./SanctumTierCard";

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

// 継続月数 → バッジ
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

export default function SanctumTab({ channel, currentUser }) {
  const queryClient = useQueryClient();
  const [joining, setJoining] = useState(null);

  const { data: subscription } = useQuery({
    queryKey: ["sanctum-sub", channel?.id, currentUser?.email],
    queryFn: () =>
      base44.entities.PlanSubscription.filter({
        user_email: currentUser.email,
        plan_id: `sanctum_${channel.id}`,
        status: "active",
      }).then((r) => r[0] || null),
    enabled: !!currentUser?.email && !!channel?.id,
  });

  const currentTierName = subscription?.plan_name?.toLowerCase().replace("sanctum_", "") || null;

  // 継続月数を計算
  const monthsSubscribed = subscription?.start_date
    ? Math.floor((Date.now() - new Date(subscription.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 0;

  const handleJoin = async (tier) => {
    if (!currentUser) { base44.auth.redirectToLogin(); return; }
    setJoining(tier.tier);
    try {
      // 既存サブスクをキャンセル
      if (subscription) {
        await base44.entities.PlanSubscription.update(subscription.id, { status: "cancelled" });
      }
      await base44.entities.PlanSubscription.create({
        user_email: currentUser.email,
        plan_id: `sanctum_${channel.id}`,
        plan_name: `sanctum_${tier.tier}`,
        status: "active",
        start_date: new Date().toISOString(),
      });
      queryClient.invalidateQueries({ queryKey: ["sanctum-sub", channel?.id, currentUser?.email] });
      toast.success(`${tier.tier.toUpperCase()} メンバーシップへようこそ！`);
    } catch (err) {
      toast.error("加入に失敗しました: " + err.message);
    } finally {
      setJoining(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 p-6 text-center"
        style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.15) 0%, rgba(0,0,0,0) 100%)" }}>
        <div className="absolute inset-0 pointer-events-none" style={{ boxShadow: "inset 0 0 60px rgba(139,92,246,0.05)" }} />
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-6 h-6 text-purple-400" />
          <h2 className="font-black text-2xl text-purple-300">The Sanctum</h2>
        </div>
        <p className="text-muted-foreground text-sm max-w-md mx-auto">
          {channel?.name} の秘密のコミュニティ。コアなファンだけが入れる、特別な空間です。
        </p>

        {/* 現在のメンバーシップ状態 */}
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
              isCurrentTier={currentTierName === tier.tier}
              onJoin={() => handleJoin(tier)}
              disabled={joining !== null}
            />
          </motion.div>
        ))}
      </div>

      {/* 「自尊心の循環」メッセージ */}
      <div className="rounded-xl border border-purple-500/20 p-4 bg-purple-500/5 text-center space-y-1">
        <p className="text-sm font-bold text-purple-300">💜 ライバーとファンの絆を、価格で測らない</p>
        <p className="text-xs text-muted-foreground">
          Sanctumは「安売り」のない空間。本当に応援したいファンだけが集まる、質の高いコミュニティです。
        </p>
      </div>
    </div>
  );
}