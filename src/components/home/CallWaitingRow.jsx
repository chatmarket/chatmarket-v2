import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle, Phone } from "lucide-react";
import ScrollRow from "./ScrollRow";
import MessageModal from "../chat/MessageModal";

export default function CallWaitingRow({ user }) {
  const navigate = useNavigate();
  const [messageTarget, setMessageTarget] = useState(null);

  // call_enabled=true のチャンネル一覧取得
  const { data: callChannels = [] } = useQuery({
    queryKey: ["call-waiting-channels"],
    queryFn: () => base44.entities.Channel.filter({ call_enabled: true }, "-updated_date", 20),
  });

  if (callChannels.length === 0) return null;

  const handleMessage = (channel) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setMessageTarget({ channel, video: null });
  };

  const handleCallRequest = (channelId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    // FREE含む全プランで通話申し込み可能
    navigate(`/call-request/${channelId}`);
  };

  // 5列でグループ化（2段で10個表示）
  const rows = [];
  for (let i = 0; i < callChannels.length; i += 5) {
    rows.push(callChannels.slice(i, i + 5));
  }

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

      {/* 複数段の横スクロール */}
      {rows.map((row, idx) => (
        <ScrollRow key={idx} cardWidth={220}>
          {row.map((channel) => (
            <CallWaitingCard
              key={channel.id}
              channel={channel}
              onMessage={() => handleMessage(channel)}
              onCallRequest={() => handleCallRequest(channel.id)}
            />
          ))}
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

function CallWaitingCard({ channel, onMessage, onCallRequest }) {
  return (
    <div className="w-[220px] shrink-0 bg-card border border-border/50 rounded-xl overflow-hidden hover:border-primary/40 transition-all">
      {/* Avatar */}
      <div className="relative h-28 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-2xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
          </div>
        )}
        {/* 待機中バッジ */}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          待機中
        </div>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <Link to={`/channel/${channel.id}`}>
          <p className="font-bold text-sm truncate hover:text-primary transition-colors">{channel.name}</p>
        </Link>
        <div className="text-xs text-muted-foreground space-y-0.5">
          {channel.call_price_30min > 0 && (
            <p>30分 ¥{channel.call_price_30min.toLocaleString()}</p>
          )}
          {channel.call_price_60min > 0 && (
            <p>60分 ¥{channel.call_price_60min.toLocaleString()}</p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-1.5 pt-1">
          <Button
            size="sm"
            className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90 gap-1"
            onClick={onCallRequest}
          >
            <PhoneCall className="w-3 h-3" />
            申し込む
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 w-7 p-0"
            onClick={onMessage}
            title="メッセージを送る"
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}