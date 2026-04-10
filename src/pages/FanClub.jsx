import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MembershipCard from "../components/fanclub/MembershipCard";
import ExclusiveContent from "../components/fanclub/ExclusiveContent";
import EventBooking from "../components/fanclub/EventBooking";
import FanClubTipping from "../components/fanclub/FanClubTipping";

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

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["fanclub-sub", channelId, user?.email],
    queryFn: () => base44.entities.PlanSubscription.filter({ user_email: user.email, plan_id: `fanclub_${channelId}`, status: "active" }),
    enabled: !!user && !!channelId,
  });

  const { data: wallet, refetch: refetchWallet } = useQuery({
    queryKey: ["fanclub-wallet", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((r) => r[0] || null),
    enabled: !!user,
  });

  const isMember = subscriptions.length > 0;
  const handleJoin = () => queryClient.invalidateQueries({ queryKey: ["fanclub-sub", channelId, user?.email] });

  // channelIdなしはデモモード
  const [demoMember, setDemoMember] = useState(false);
  const effectiveMember = channelId ? isMember : demoMember;
  const effectiveChannel = channel || { name: "サンプルチャンネル", fanclub_monthly_price: 500 };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-10">
      {/* ヘッダー */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/20 border border-yellow-500/40 flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-black text-yellow-400" style={{ textShadow: "0 0 30px rgba(255,215,0,0.3)" }}>
            Fan Club
          </h1>
        </div>
        <p className="text-muted-foreground text-sm">
          プレミアム会員だけが楽しめる特別なコンテンツ・体験を提供します
        </p>
        {/* デモ切り替えボタン（channelIdなし時のみ表示） */}
        {!channelId && (
          <div className="inline-flex items-center gap-2 bg-secondary rounded-lg px-4 py-2 text-xs text-muted-foreground mt-2">
            <span>デモ状態:</span>
            <button
              onClick={() => setDemoMember((v) => !v)}
              className={`px-3 py-1 rounded-md font-semibold transition-colors ${
                demoMember ? "bg-yellow-500 text-black" : "bg-card text-muted-foreground border border-border"
              }`}
            >
              {demoMember ? "✓ 会員加入済み" : "未加入（クリックで切替）"}
            </button>
          </div>
        )}
      </motion.div>

      {/* 会員証 / 加入カード */}
      <MembershipCard
        isMember={effectiveMember}
        onJoin={channelId ? handleJoin : () => setDemoMember(true)}
        channel={effectiveChannel}
        user={user}
      />

      {/* 投げ錢（会員限定） */}
      {effectiveMember && (
        <div className="bg-card border border-border/50 rounded-xl p-5">
          <FanClubTipping
            channel={effectiveChannel}
            user={user || { email: "demo@example.com", nickname: "デモユーザー" }}
            wallet={wallet || { balance: 10000 }}
            onWalletUpdate={() => queryClient.invalidateQueries({ queryKey: ["fanclub-wallet"] })}
          />
        </div>
      )}

      {/* 限定コンテンツ */}
      <ExclusiveContent isMember={effectiveMember} />

      {/* イベント予約 */}
      <EventBooking isMember={effectiveMember} />
    </div>
  );
}