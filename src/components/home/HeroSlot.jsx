/**
 * HeroSlot
 * TOPページ最上部：1位ライバー（またはLIVE中）を「伝説」として表示するファーストビュー枠。
 * 非ログインユーザーにも表示し、クリックで配信ルームへ誘導。
 */
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Crown, Radio, Zap } from "lucide-react";

export default function HeroSlot() {
  const { data: channels = [] } = useQuery({
    queryKey: ["hero-slot-channels"],
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 5),
    enabled: false,
    staleTime: 600000,
    gcTime: 1200000,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["hero-slot-lives"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "live" }, "-viewer_count", 3),
    enabled: false,
    staleTime: 120000,
    gcTime: 240000,
  });

  // 優先度: 当月売上1位でLIVE中 > 当月売上1位 > LIVE中で視聴者最多
  const top1Channel = channels[0];
  const liveMegaStream = liveStreams.find(
    (s) => top1Channel && s.channel_id === top1Channel.id
  ) || liveStreams[0];

  const heroChannel = top1Channel || null;
  if (!heroChannel) return null;

  // is_live フラグは古いデータが残ることがあるため、
  // 実際のLiveStreamデータ（status:"live"）のみで判定する
  const isLive = !!liveMegaStream;
  const liveStream = liveMegaStream;
  const href = liveStream ? `/live/${liveStream.id}` : `/channel/${heroChannel.id}`;
  const thumbnail = liveStream?.thumbnail_url || heroChannel.avatar_url;
  const rate = heroChannel.progressive_rate ? Math.round(heroChannel.progressive_rate * 100) : 85;
  const monthlyCoins = heroChannel.monthly_revenue_coins || 0;

  return (
    <Link to={href}>
      <div
        className="relative w-full rounded-2xl overflow-hidden border-2 border-yellow-400/60 shadow-2xl shadow-yellow-500/20 group cursor-pointer"
        style={{ minHeight: "200px" }}
      >
        {/* 背景 */}
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={heroChannel.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/60 to-black" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />

        {/* グロー枠 */}
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{ boxShadow: "inset 0 0 60px rgba(251,191,36,0.15)" }}
        />

        {/* コンテンツ */}
        <div className="relative z-10 flex flex-col justify-end h-full p-5 sm:p-6 space-y-3" style={{ minHeight: "200px" }}>
          {/* バッジ */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-black text-yellow-400 bg-yellow-500/20 border border-yellow-400/50 px-3 py-1 rounded-full">
              <Crown className="w-3.5 h-3.5" /> プラットフォームの伝説
            </span>
            {isLive ? (
              <span className="flex items-center gap-1.5 text-[11px] font-black text-white bg-red-500 border border-red-400 px-3 py-1 rounded-full animate-pulse">
                <Radio className="w-3 h-3" /> LIVE NOW：伝説が更新中
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-primary bg-primary/10 border border-primary/30 px-3 py-1 rounded-full">
                <Zap className="w-3 h-3" /> ランキング 1位
              </span>
            )}
          </div>

          {/* チャンネル情報 */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-yellow-400/60 overflow-hidden bg-secondary shrink-0">
              {heroChannel.avatar_url ? (
                <img src={heroChannel.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-lg font-black text-yellow-400">
                  {heroChannel.name?.[0]}
                </div>
              )}
            </div>
            <div>
              <p className="text-white font-black text-lg sm:text-xl leading-tight group-hover:text-yellow-300 transition-colors">
                {heroChannel.name}
              </p>
              <p className="text-yellow-300/70 text-xs">
                当月 {monthlyCoins.toLocaleString()} コイン · 還元率 {rate}%
              </p>
            </div>
          </div>

          {/* CTA */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-300 px-4 py-1.5 rounded-full transition-colors">
              {isLive ? "今すぐ視聴する →" : "チャンネルを見る →"}
            </span>
            {liveStream && (
              <span className="text-xs text-white/60">
                視聴者 {liveStream.viewer_count || 0}人
              </span>
            )}
          </div>
        </div>

        {/* ランキングNo.1 角バッジ */}
        <div className="absolute top-3 right-3 z-10 bg-yellow-400 text-black font-black text-xs px-2 py-1 rounded-lg shadow-lg flex items-center gap-1">
          <Crown className="w-3.5 h-3.5" /> No.1
        </div>
      </div>
    </Link>
  );
}