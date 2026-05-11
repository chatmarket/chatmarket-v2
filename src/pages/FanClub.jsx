import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Crown, Sparkles, Shield, CalendarClock } from "lucide-react";
import { base44 } from "@/api/base44Client";
import MemberGiftPanel from "../components/fanclub/MemberGiftPanel";
import FanclubSubscribeButton from "../components/vault/FanclubSubscribeButton";

export default function FanClub() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (!channelId && u?.email) {
            base44.entities.Channel.filter({ owner_email: u.email })
              .then((channels) => {
                if (channels.length > 0) navigate(`/fanclub/${channels[0].id}`);
              })
              .catch(() => {});
          }
        }).catch(() => {});
      }
    });
  }, [channelId, navigate]);

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

  const isMember = !!subscription;
  // 単一プランの価格を取得（fanclub_tiers[0] または fanclub_monthly_price）
  const monthlyPrice = channel?.fanclub_tiers?.[0]?.price || channel?.fanclub_monthly_price || 500;
  const effectiveChannel = channel || { name: "サンプルチャンネル" };

  return (
    <div className="max-w-lg mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-purple-500/30 p-6 text-center"
        style={{ background: "linear-gradient(135deg, rgba(88,28,135,0.18) 0%, rgba(0,0,0,0) 100%)" }}
      >
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-6 h-6 text-yellow-400" />
          <h1 className="font-black text-2xl text-yellow-400">FAN CLUB</h1>
          <Shield className="w-5 h-5 text-purple-400" />
        </div>
        <p className="text-sm text-muted-foreground">
          <span className="text-purple-300 font-bold">{effectiveChannel.name}</span> の公式ファンクラブ
        </p>

        {isMember && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-4 inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 rounded-full px-4 py-2"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm font-bold text-purple-300">メンバー加入中</span>
          </motion.div>
        )}
      </motion.div>

      {/* 単一入会カード */}
      {channelId ? (
        <div className="bg-card rounded-2xl border-2 border-primary/40 p-6 space-y-5">
          {/* 先行予約権バッジ */}
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
            <CalendarClock className="w-5 h-5 text-primary shrink-0" />
            <p className="text-sm font-bold text-primary">1対1通話の先行予約権つき</p>
          </div>

          {/* 価格 */}
          <div className="text-center space-y-1">
            <p className="text-4xl font-black text-foreground">
              ¥{monthlyPrice.toLocaleString()}
              <span className="text-base font-normal text-muted-foreground ml-1">/月</span>
            </p>
            <p className="text-xs text-muted-foreground">一般公開の24時間前から通話予約が可能になります</p>
          </div>

          {/* 特典リスト */}
          <ul className="space-y-2 text-sm text-foreground/80">
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> 1対1通話 先行予約権（24時間前解放）
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> 限定投稿・写真を閲覧
            </li>
            <li className="flex items-center gap-2">
              <span className="text-primary">✓</span> メンバー限定ギフト解放
            </li>
            {channel?.fanclub_description && (
              <li className="flex items-start gap-2 text-muted-foreground text-xs mt-1">
                <span>＋</span>{channel.fanclub_description}
              </li>
            )}
          </ul>

          {/* 入会ボタン */}
          <FanclubSubscribeButton
            tier="member"
            channelId={channelId}
            isCurrentTier={isMember}
            hasAnyTier={isMember}
            disabled={false}
            label={isMember ? "加入中" : `月額 ¥${monthlyPrice.toLocaleString()} で先行予約権をゲット`}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-muted-foreground text-sm bg-secondary/40 rounded-xl border border-border/50">
          チャンネルページからファンクラブにアクセスしてください
        </div>
      )}

      {/* Member Gift Section */}
      {isMember && (
        <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
          <MemberGiftPanel
            channelId={channelId}
            channelOwnerEmail={effectiveChannel?.owner_email}
            user={user}
            wallet={wallet}
            currentTier="member"
            onWalletUpdate={() => refetchWallet()}
          />
        </div>
      )}
    </div>
  );
}