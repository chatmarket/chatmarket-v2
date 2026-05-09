import React, { useState, useEffect } from "react";
import { Heart } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

/**
 * 推し登録ボタン
 * チャンネルをお気に入り登録し、配信開始時に通知が飛ぶようにする
 * ChannelFollow エンティティを利用（既存の仕組みを活用）
 */
export default function OshiRegisterButton({ channel, user, compact = false }) {
  const [isOshi, setIsOshi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followId, setFollowId] = useState(null);

  useEffect(() => {
    if (!user || !channel) return;
    base44.entities.ChannelFollow.filter({
      channel_id: channel.id,
      follower_email: user.email,
    }).then((res) => {
      if (res[0]) {
        setIsOshi(true);
        setFollowId(res[0].id);
      }
    }).catch(() => {});
  }, [user?.email, channel?.id]);

  const handleToggle = async () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    setLoading(true);
    try {
      if (isOshi) {
        if (followId) await base44.entities.ChannelFollow.delete(followId);
        setIsOshi(false);
        setFollowId(null);
        toast.success(`${channel.name} の推し登録を解除しました`);
      } else {
        const result = await base44.entities.ChannelFollow.create({
          channel_id: channel.id,
          channel_name: channel.name,
          follower_email: user.email,
        });
        setIsOshi(true);
        setFollowId(result.id);
        toast.success(`💖 ${channel.name} を推し登録しました！配信開始時に通知が届きます`);
      }
    } catch (e) {
      toast.error("エラーが発生しました");
    }
    setLoading(false);
  };

  if (compact) {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all"
        style={{
          background: isOshi ? "rgba(236,72,153,0.2)" : "rgba(255,255,255,0.06)",
          border: `1px solid ${isOshi ? "rgba(236,72,153,0.6)" : "rgba(255,255,255,0.15)"}`,
          color: isOshi ? "#f9a8d4" : "rgba(255,255,255,0.6)",
        }}
      >
        <Heart className="w-3 h-3" style={{ fill: isOshi ? "#ec4899" : "transparent", stroke: isOshi ? "#ec4899" : "currentColor" }} />
        {isOshi ? "推し登録中" : "推し登録"}
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-105 active:scale-95"
      style={{
        background: isOshi
          ? "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(168,85,247,0.15))"
          : "rgba(255,255,255,0.06)",
        border: `1.5px solid ${isOshi ? "rgba(236,72,153,0.6)" : "rgba(255,255,255,0.15)"}`,
        color: isOshi ? "#f9a8d4" : "rgba(255,255,255,0.7)",
        boxShadow: isOshi ? "0 0 15px rgba(236,72,153,0.2)" : "none",
      }}
    >
      <Heart
        className="w-4 h-4 transition-all"
        style={{
          fill: isOshi ? "#ec4899" : "transparent",
          stroke: isOshi ? "#ec4899" : "currentColor",
          filter: isOshi ? "drop-shadow(0 0 4px rgba(236,72,153,0.8))" : "none",
        }}
      />
      {loading ? "..." : isOshi ? "💖 推し登録中" : "推し登録する"}
    </button>
  );
}