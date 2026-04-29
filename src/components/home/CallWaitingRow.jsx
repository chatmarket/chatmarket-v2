import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle } from "lucide-react";
import ScrollRow from "./ScrollRow";
import { toast } from "sonner";

export default function CallWaitingRow({ user }) {
  const navigate = useNavigate();

  const { data: allChannels = [] } = useQuery({
    queryKey: ["call-enabled-channels"],
    queryFn: () => base44.entities.Channel.filter({ call_enabled: true }, "-updated_date", 100),
    staleTime: 30000,
    gcTime: 60000,
  });

  // ログイン中ユーザーが owner のチャンネルIDセットを作成
  const myChannelIds = new Set(
    user ? allChannels.filter(ch => ch.owner_email === user.email).map(ch => ch.id) : []
  );

  if (allChannels.length === 0) return (
    <section className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400/40 shrink-0" />
        <h2 className="text-xl font-bold">1対1ビデオ通話　待機中</h2>
      </div>
      <div className="bg-card border border-border/50 rounded-xl p-5 text-center space-y-3">
        <p className="text-sm text-muted-foreground">チャンネルデータを読み込み中...</p>
      </div>
    </section>
  );

  const handleChat = (channelId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/chat/${channelId}`);
  };

  const half = Math.ceil(allChannels.length / 2);
  const rows = allChannels.length > 0
    ? [allChannels.slice(0, half), allChannels.slice(half)].filter(r => r.length > 0)
    : [];
  const isOwnChannel = (channel) => myChannelIds.has(channel.id);

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

      {/* 全チャンネル表示（フィルタなし） */}
      {rows.map((row, idx) => (
        <ScrollRow key={idx} cardWidth={200}>
          {row.map((channel) => {
            // console.log(`[CallWaitingCard RENDER] id=${channel.id}, name=${channel.name}`);
            return (
              <CallWaitingCard
                key={channel.id}
                channel={channel}
                user={user}
                onChat={() => handleChat(channel.id)}
                isOwnChannel={isOwnChannel(channel)}
              />
            );
          })}
        </ScrollRow>
      ))}
    </section>
  );
}

function CallWaitingCard({ channel, user, onChat, isOwnChannel }) {
  const navigate = useNavigate();
  const [calling, setCalling] = useState(false);
  const cardChannelId = channel.id;
  const cardChannelName = channel.name;

  const handleInstantCall = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (calling) return;
    setCalling(true);
    try {
      // VideoCallレコードを即座に作成して通話ページへ直行
      const newCall = await base44.entities.VideoCall.create({
        caller_email: user.email,
        caller_name: user.full_name || user.email,
        callee_email: channel.owner_email,
        callee_name: channel.name,
        callee_channel_id: cardChannelId,
        status: "pending",
        is_paid: false,
        price: 0,
        coin_price_per_15min: 150,
        duration_minutes: 30,
        message: "今すぐ通話リクエスト（待機中）",
      });
      navigate(`/video-call/${newCall.id}`);
    } catch (err) {
      toast.error("通話リクエストの作成に失敗しました");
      setCalling(false);
    }
  };

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
      <div className="p-2.5 space-y-1.5">
        {/* 待機タイトル（call_theme）を最上部に大きく表示 */}
        {channel?.call_theme ? (
          <p className="text-xs font-black text-foreground line-clamp-2 leading-tight">
            {channel.call_theme}
          </p>
        ) : (
          <p className="text-xs font-black text-foreground truncate leading-tight">通話受付中</p>
        )}
        <Link to={`/channel/${cardChannelId}`}>
          <p className="text-[10px] text-muted-foreground truncate hover:text-primary transition-colors">{cardChannelName}</p>
        </Link>
        {!isOwnChannel && (
          <div className="space-y-1.5">
            <Button
              size="sm"
              className="w-full h-7 text-[11px] bg-primary hover:bg-primary/90 gap-1"
              onClick={handleInstantCall}
              disabled={calling}
            >
              <PhoneCall className="w-3 h-3" /> {calling ? "接続中..." : "今すぐ通話"}
            </Button>
            <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1" onClick={onChat}>
              <MessageCircle className="w-3 h-3" /> チャットで声をかける
            </Button>
          </div>
        )}
        {isOwnChannel && (
          <Button
            size="sm"
            className="w-full h-7 text-[11px] bg-green-600 hover:bg-green-500 gap-1"
            onClick={() => navigate('/call-waiting?autostart=1')}
          >
            <PhoneCall className="w-3 h-3" /> 通話待機画面へ
          </Button>
        )}
      </div>
    </div>
  );
}