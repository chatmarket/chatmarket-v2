/**
 * CreatorChat - 配信者が受信したDMに返信するためのチャット画面
 * URLパラメータ: fromEmail（メッセージ送信者のメールアドレス）
 * 配信者視点で、ファンからのメッセージに返信できる
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Coins, PhoneCall, Video, Radio } from "lucide-react";
import { toast } from "sonner";

const MAX_CHARS = 50;

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const JST = { timeZone: "Asia/Tokyo" };
  const todayJST = new Date().toLocaleDateString("ja-JP", JST);
  const msgDayJST = d.toLocaleDateString("ja-JP", JST);
  if (todayJST === msgDayJST) {
    return d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", ...JST });
  } else {
    return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", ...JST });
  }
}

export default function CreatorChat() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // URLパラメータから fromEmail を取得
  const urlParams = new URLSearchParams(window.location.search);
  const fromEmail = urlParams.get("fromEmail");

  const [user, setUser] = useState(null);
  const [fanChannel, setFanChannel] = useState(null); // ファンのチャンネル（あれば）
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  // 自分のチャンネル
  const [myChannel, setMyChannel] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      base44.entities.Channel.filter({ owner_email: u.email }).then((r) => setMyChannel(r[0] || null));
    }).catch(() => {});
  }, []);

  // ファンのチャンネルを検索（あれば）
  useEffect(() => {
    if (!fromEmail) return;
    base44.entities.Channel.filter({ owner_email: fromEmail }).then((r) => setFanChannel(r[0] || null));
  }, [fromEmail]);

  const threadId = user && fromEmail ? makeThreadId(user.email, fromEmail) : null;

  const { data: messages = [] } = useQuery({
    queryKey: ["creator-chat", threadId],
    queryFn: () => base44.entities.DirectChat.filter({ thread_id: threadId }, "created_date"),
    enabled: !!threadId,
    refetchInterval: 3000,
  });

  // リアルタイム購読
  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.DirectChat.subscribe((event) => {
      if (event.data?.thread_id === threadId) {
        queryClient.invalidateQueries({ queryKey: ["creator-chat", threadId] });
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || sending || !fromEmail) return;
    setSending(true);
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: fromEmail,
      to_channel_id: fanChannel?.id || "",
      to_channel_name: fanChannel?.name || fromEmail,
      content: input.trim(),
      yell_coin: 0,
      thread_id: threadId,
    });
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["creator-chat", threadId] });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 送信者の表示名（メッセージから取得）
  const fanName = messages.find((m) => m.from_email === fromEmail)?.from_name || fromEmail;
  const fanInitial = (fanName || "?")[0].toUpperCase();

  if (!user || !fromEmail) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-card/80 backdrop-blur shrink-0">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
          <span className="text-sm font-bold">{fanInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{fanName}</p>
          <p className="text-xs text-muted-foreground">受信DM返信チャット</p>
        </div>

        {/* ライブ配信ページへの動線 */}
        <Link to="/go-live">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10 shrink-0">
            <Radio className="w-3.5 h-3.5" />
            配信
          </Button>
        </Link>

        {/* 相手がチャンネルを持っている場合→通話申し込みページへ */}
        {fanChannel && (
          <Link to={`/call-request/${fanChannel.id}`}>
            <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 text-xs shrink-0">
              <PhoneCall className="w-3.5 h-3.5" />
              通話申し込み
            </Button>
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-2 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold">まだメッセージがありません</p>
          </div>
        )}
        {messages.map((msg) => {
          const mine = msg.from_email === user.email;
          return (
            <div key={msg.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
              {!mine && (
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-1 text-xs font-bold">
                  {fanInitial}
                </div>
              )}
              <div className={`max-w-[75%] space-y-1 ${mine ? "items-end" : "items-start"} flex flex-col`}>
                {msg.yell_coin > 0 && (
                  <div className={`flex items-center gap-1 text-xs font-bold text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-1 rounded-full ${mine ? "self-end" : "self-start"}`}>
                    <Coins className="w-3 h-3" />
                    エールコイン ×{msg.yell_coin}
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
      <div className="px-4 py-3 border-t border-border/50 bg-card/80 backdrop-blur shrink-0">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKeyDown}
              placeholder="返信メッセージを入力（最大50文字）"
              rows={2}
              className="w-full resize-none rounded-xl bg-secondary border-0 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${input.length >= MAX_CHARS ? "text-destructive font-bold" : "text-muted-foreground"}`}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
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
    </div>
  );
}