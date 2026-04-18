import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle, Phone, Radio } from "lucide-react";
import ScrollRow from "./ScrollRow";
import MessageModal from "../chat/MessageModal";

export default function CallWaitingRow({ user }) {
  const navigate = useNavigate();
  const [messageTarget, setMessageTarget] = useState(null);

  // フリートライアルメール
  const FREE_TRIAL_EMAILS = ["haru.24@icloud.com"];

  // call_enabled=true のチャンネル一覧取得
  const { data: callChannels = [] } = useQuery({
    queryKey: ["call-waiting-channels"],
    queryFn: () => base44.entities.Channel.filter({ call_enabled: true }, "-updated_date", 12),
    staleTime: 300000,
    gcTime: 600000,
  });

  // フリートライアルメールのチャンネル取得
  const { data: trialChannels = [] } = useQuery({
    queryKey: ["trial-channels"],
    queryFn: async () => {
      const channels = await Promise.all(
        FREE_TRIAL_EMAILS.map((email) =>
          base44.entities.Channel.filter({ owner_email: email }).then((r) => r[0])
        )
      );
      return channels.filter(Boolean);
    },
    staleTime: 300000,
    gcTime: 600000,
  });

  // 待機中のVideoCall取得（ポーリング少なめ）
  const { data: waitingCalls = [] } = useQuery({
    queryKey: ["waiting-video-calls"],
    queryFn: () => base44.entities.VideoCall.filter({ status: "waiting" }, "-created_date", 20),
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 60000,
  });

  // 待機中のチャンネルを取得（VideoCallのcallee_emailから）
  const { data: waitingChannels = [] } = useQuery({
    queryKey: ["waiting-channels", waitingCalls.length],
    queryFn: async () => {
      if (waitingCalls.length === 0) return [];
      const uniqueEmails = [...new Set(waitingCalls.map((c) => c.callee_email))].slice(0, 10);
      const channels = await Promise.all(
        uniqueEmails.map((email) =>
          base44.entities.Channel.filter({ owner_email: email }).then((r) => r[0])
        )
      );
      return channels.filter(Boolean);
    },
    enabled: waitingCalls.length > 0,
    staleTime: 30000,
    gcTime: 60000,
  });

  // 待機中のチャンネルと通常のチャンネルとフリートライアルをマージ（重複排除）
  const allChannels = [...waitingChannels, ...trialChannels, ...callChannels];
  const uniqueChannels = Array.from(
    new Map(allChannels.map((c) => [c.id, c])).values()
  );

  if (uniqueChannels.length === 0) return null;

  const handleMessage = (channel) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setMessageTarget({ channel, video: null });
  };

  const handleCallRequest = (channelId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/call-request/${channelId}`);
  };

  const handleGoLive = () => {
    navigate("/go-live");
  };

  // 待機中のVideoCallマップを作成（channel_idで検索可能に）
  const waitingCallMap = new Map(waitingCalls.map((c) => [c.callee_channel_id, c]));

  // 全件を最大2段に分割して表示
  const half = Math.ceil(uniqueChannels.length / 2);
  const rows = uniqueChannels.length > 0
    ? [uniqueChannels.slice(0, half), uniqueChannels.slice(half)].filter(r => r.length > 0)
    : [];

    const isOwnChannel = (channel) => user && channel.owner_email === user.email;

    return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        <h2 className="text-xl font-bold">1対1ビデオ通話　待機中</h2>
        <div className="flex gap-1.5 flex-wrap">
          <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2 py-0.5 rounded-full font-semibold">FREE 💬📞</span>
          <span className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-semibold">BASIC 📞</span>
          <span className="text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-semibold">CALL&ANSER 📞</span>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="text-green-400 font-semibold">FREE</span>：💬メッセージ＋📞通話申し込み可（収益率70%） ／ 
        <span className="text-blue-300 font-semibold"> BASIC・CALL&ANSER</span>：💬メッセージ＋📞通話申し込み可（収益率85%）
      </p>

      {/* 複数段の横スクロール（6列×2段） */}
      {rows.map((row, idx) => (
        <ScrollRow key={idx} cardWidth={200}>
          {row.map((channel) => {
            const isWaiting = waitingCallMap.has(channel.id);
            return (
              <CallWaitingCard
                key={channel.id}
                channel={channel}
                onMessage={() => handleMessage(channel)}
                onCallRequest={() => handleCallRequest(channel.id)}
                onGoLive={isOwnChannel(channel) ? handleGoLive : null}
                isWaiting={isWaiting}
              />
            );
          })}
        </ScrollRow>
      ))}

      {messageTarget && (
        <MessageModal
          channel={messageTarget.channel}
          video={null}
          user={user}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </section>
  );
}

function CallWaitingCard({ channel, onMessage, onCallRequest, onGoLive, isWaiting = false }) {
  return (
    <div className={`w-[200px] shrink-0 rounded-xl overflow-hidden hover:border-primary/40 transition-all border ${isWaiting ? "bg-green-500/10 border-green-500/40" : "bg-card border-border/50"}`}>
      {/* Avatar */}
      <div className="relative h-24 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
          </div>
        )}
        {/* バッジ */}
        <div className={`absolute top-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isWaiting ? "bg-green-600/90" : "bg-green-500/90"}`}>
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          {isWaiting ? "📹 配信待機中" : "待機中"}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-2">
        <Link to={`/channel/${channel.id}`}>
          <p className="font-bold text-xs truncate hover:text-primary transition-colors">{channel.name}</p>
        </Link>

        {/* Theme */}
        {channel.call_theme && (
          <p className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded line-clamp-2">
            {channel.call_theme}
          </p>
        )}

        <div className="text-[11px] text-muted-foreground space-y-0.5">
          {channel.call_price_30min > 0 && (
            <p>30分 ¥{channel.call_price_30min.toLocaleString()}</p>
          )}
          {channel.call_price_60min > 0 && (
            <p>60分 ¥{channel.call_price_60min.toLocaleString()}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-1 pt-1">
          {onGoLive ? (
            <Button
              size="sm"
              className="flex-1 h-6 text-[11px] bg-red-500 hover:bg-red-600 gap-0.5 px-2"
              onClick={onGoLive}
            >
              <Radio className="w-2.5 h-2.5" />
              配信開始
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 h-6 text-[11px] bg-primary hover:bg-primary/90 gap-0.5 px-2"
              onClick={onCallRequest}
            >
              <PhoneCall className="w-2.5 h-2.5" />
              申し込む
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-6 w-6 p-0"
            onClick={onMessage}
            title="メッセージを送る"
          >
            <MessageCircle className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}