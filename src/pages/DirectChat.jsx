import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Coins, PhoneCall, Video } from "lucide-react";
import { toast } from "sonner";
import YellCoinSendModal from "../components/chat/YellCoinSendModal";

const MAX_CHARS = 50;

// threadIdを一意に生成（2メールをソートして結合）
function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}

export default function DirectChat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showYellModal, setShowYellModal] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!channelId) return;
    base44.entities.Channel.filter({ id: channelId }).then((res) => setChannel(res[0]));
  }, [channelId]);

  const threadId = user && channel ? makeThreadId(user.email, channel.owner_email) : null;

  const { data: messages = [] } = useQuery({
    queryKey: ["direct-chat", threadId],
    queryFn: () => base44.entities.DirectChat.filter({ thread_id: threadId }, "created_date"),
    enabled: !!threadId,
    refetchInterval: 3000,
  });

  // リアルタイム購読
  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.DirectChat.subscribe((event) => {
      if (event.data?.thread_id === threadId) {
        queryClient.invalidateQueries({ queryKey: ["direct-chat", threadId] });
      }
    });
    return unsub;
  }, [threadId, queryClient]);

  // 既読処理
  useEffect(() => {
    if (!user || messages.length === 0) return;
    const unread = messages.filter((m) => m.to_channel_owner_email === user.email && !m.is_read);
    unread.forEach((m) => base44.entities.DirectChat.update(m.id, { is_read: true }));
  }, [messages, user]);

  // 最下部へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || !channel || sending) return;
    if (input.length > MAX_CHARS) return;
    setSending(true);
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: channel.owner_email,
      to_channel_id: channel.id,
      to_channel_name: channel.name,
      content: input.trim(),
      yell_coin: 0,
      thread_id: threadId,
    });
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["direct-chat", threadId] });
  };

  const handleYellSent = () => {
    queryClient.invalidateQueries({ queryKey: ["direct-chat", threadId] });
    setShowYellModal(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!channel) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const isMyMessage = (msg) => msg.from_email === user?.email;

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur shrink-0">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
          {channel.avatar_url
            ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            : <span className="text-sm font-bold">{channel.name?.[0]}</span>}
        </div>
        <div className="flex-1">
          <p className="font-bold text-sm">{channel.name}</p>
          <p className="text-xs text-muted-foreground">1対1ビデオ通話前のお問い合わせチャット</p>
        </div>
        {/* ビデオ通話ボタン */}
        <Link to={`/channel/${channelId}`}>
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-xs">
            <PhoneCall className="w-3.5 h-3.5" />
            通話へ
          </Button>
        </Link>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-2 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold">まだメッセージがありません</p>
            <p className="text-xs">1対1ビデオ通話の前に質問してみましょう！</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = isMyMessage(msg);
          return (
            <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 mt-1">
                  {channel.avatar_url
                    ? <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold">{channel.name?.[0]}</span>}
                </div>
              )}
              <div className={`max-w-[75%] space-y-1 ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {msg.yell_coin > 0 && (
                  <div className={`flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded-full ${mine ? "self-end" : "self-start"}`}>
                    <Coins className="w-3 h-3" />
                    エールコイン ×{msg.yell_coin} を送りました！
                  </div>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-card border border-border/50 text-foreground rounded-tl-sm"}`}>
                  {msg.content}
                </div>
                <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_date)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-border/50 bg-card/80 backdrop-blur shrink-0 space-y-2">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="今から対応可能でしょうか？（最大50文字）"
              rows={2}
              className="w-full resize-none rounded-xl bg-secondary border-0 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${input.length >= MAX_CHARS ? "text-destructive font-bold" : "text-muted-foreground"}`}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              size="icon"
              variant="outline"
              className="w-9 h-9 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10"
              onClick={() => setShowYellModal(true)}
              title="エールコインを送る"
            >
              <Coins className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-9 h-9 bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground text-center">
          ビデオ通話をご希望の場合は上部の「通話へ」ボタンからお進みください
        </p>
      </div>

      {/* Yell Coin Modal */}
      {showYellModal && user && channel && (
        <YellCoinSendModal
          user={user}
          channel={channel}
          threadId={threadId}
          onSent={handleYellSent}
          onClose={() => setShowYellModal(false)}
        />
      )}
    </div>
  );
}