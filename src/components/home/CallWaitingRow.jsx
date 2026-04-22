import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle } from "lucide-react";
import ScrollRow from "./ScrollRow";

export default function CallWaitingRow({ user }) {
  const navigate = useNavigate();

  // フリートライアルメール
  const FREE_TRIAL_EMAILS = ["haru.24@icloud.com"];

  // call_enabled=true のチャンネル一覧取得
  const { data: callChannels = [] } = useQuery({
    queryKey: ["call-waiting-channels"],
    queryFn: () => base44.entities.Channel.filter({ call_enabled: true }, "-updated_date", 20),
    staleTime: 60000,
    gcTime: 120000,
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

  // 待機中のVideoCall取得
  const { data: waitingCalls = [] } = useQuery({
    queryKey: ["waiting-video-calls"],
    queryFn: async () => {
      const result = await base44.entities.VideoCall.filter({ status: "waiting" }, "-created_date", 20);
      console.log("[CallWaitingRow DEBUG] waitingCalls response:", result.map(c => ({ id: c.id, callee_channel_id: c.callee_channel_id, callee_email: c.callee_email, callee_name: c.callee_name })));
      return result;
    },
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
  });

  // 待機中のチャンネルを取得（VideoCallのcallee_channel_idから）
  const { data: waitingChannels = [] } = useQuery({
    // ★ queryKeyを実際のcallee_channel_idで生成（同じ数でも異なるVideoCallセットはキャッシュ分離）
    queryKey: ["waiting-channels", [...new Set(waitingCalls.map(c => c.callee_channel_id).filter(Boolean))].sort().join(",")],
    queryFn: async () => {
      if (waitingCalls.length === 0) return [];
      // ★ callee_channel_id が設定されている場合はそれを優先、未設定の場合はcallee_emailから検索
      const uniqueChannelIds = [...new Set(
        waitingCalls
          .map((c) => c.callee_channel_id)
          .filter(Boolean)
      )].slice(0, 10);
      
      console.log("[CallWaitingRow DEBUG] uniqueChannelIds to fetch:", uniqueChannelIds);
      
      if (uniqueChannelIds.length === 0) return [];
      
      const channels = await Promise.all(
        uniqueChannelIds.map((channelId) =>
          base44.entities.Channel.filter({ id: channelId }).then((r) => {
            console.log(`[CallWaitingRow DEBUG] fetched channel for id ${channelId}:`, r[0]?.name, r[0]?.id);
            return r[0];
          })
        )
      );
      const filtered = channels.filter(Boolean);
      console.log("[CallWaitingRow DEBUG] final waitingChannels:", filtered.map(c => ({ id: c.id, name: c.name })));
      return filtered;
    },
    staleTime: 30000,
    gcTime: 60000,
  });

  // 待機中のチャンネルと通常のチャンネルとフリートライアルをマージ（重複排除・待機中を優先）
  const channelMap = new Map();
  // 優先順位: 待機中 > トライアル > 通常
  callChannels.forEach((c) => channelMap.set(c.id, c));
  trialChannels.forEach((c) => channelMap.set(c.id, c));
  waitingChannels.forEach((c) => channelMap.set(c.id, c));
  const uniqueChannels = Array.from(channelMap.values());

  if (uniqueChannels.length === 0) return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/40 shrink-0" />
        <h2 className="text-xl font-bold">1対1ビデオ通話　待機中</h2>
      </div>
      <div className="bg-card border border-border/50 rounded-xl p-5 text-center space-y-3">
        <p className="text-sm text-muted-foreground">現在待機中のライバーはいません</p>
      </div>
    </section>
  );

  const handleChat = (channelId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/chat/${channelId}`);
  };

  // 待機中のVideoCallマップを作成（channel_idで検索可能に）
  const waitingCallMap = new Map(waitingCalls.map((c) => [c.callee_channel_id, c]));

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
          {row.map((channel) => (
            <CallWaitingCard
              key={channel.id}
              channel={channel}
              onChat={() => handleChat(channel.id)}
              isOwnChannel={isOwnChannel(channel)}
            />
          ))}
        </ScrollRow>
      ))}
    </section>
  );
}

function CallWaitingCard({ channel, onChat, isOwnChannel }) {
  // ★ channel.id を確実に保持（クロージャ確認）
  const cardChannelId = channel.id;
  const cardChannelName = channel.name;
  
  // ★ リアルタイムレンダリングログ：各カード単位でIDを記録
  console.log(`[CallWaitingCard RENDER] rendering card for channel_id=${cardChannelId}, name=${cardChannelName}, will link to /channel/${cardChannelId}`);
  
  return (
    <div className="w-[200px] shrink-0 rounded-xl overflow-hidden hover:border-primary/40 transition-all border bg-green-500/10 border-green-500/40">
      {/* Avatar */}
      <div className="relative h-24 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-500/90">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
          今すぐ通話可能
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-2">
        <Link to={`/channel/${cardChannelId}`} onClick={() => console.log(`[CallWaitingCard CLICK] clicked channel_id=${cardChannelId}, navigating to /channel/${cardChannelId}`)}>
          <p className="font-bold text-xs truncate hover:text-primary transition-colors">{cardChannelName}</p>
        </Link>
        {channel.call_theme && (
          <p className="text-[11px] text-primary bg-primary/10 px-2 py-1 rounded line-clamp-2">
            {channel.call_theme}
          </p>
        )}
        {!isOwnChannel && (
          <Button size="sm" className="w-full h-7 text-[11px] bg-primary hover:bg-primary/90 gap-1" onClick={onChat}>
            <MessageCircle className="w-3 h-3" /> チャットで声をかける
          </Button>
        )}
        {isOwnChannel && (
          <p className="text-[11px] text-green-400 text-center font-semibold">待機中（自分）</p>
        )}
      </div>
    </div>
  );
}