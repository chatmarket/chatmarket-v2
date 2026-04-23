import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Send, Coins, Video, PhoneCall, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import YellCoinSendModal from "../components/chat/YellCoinSendModal";

const MAX_CHARS = 200;

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

export default function DirectChat() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showYellModal, setShowYellModal] = useState(false);
  const [callModal, setCallModal] = useState(null);
  const [startingCall, setStartingCall] = useState(false);
  const bottomRef = useRef(null);
  const lastMsgCountRef = useRef(0);
  const redirectedRef = useRef(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!channelId) return;
    base44.entities.Channel.filter({ id: channelId }).then((res) => setChannel(res[0]));
  }, [channelId]);

  const threadId = user && channel ? makeThreadId(user.email, channel.owner_email) : null;
  const isCreator = user && channel && user.email === channel.owner_email;

  // ★ アクティブ/pending な通話を監視 → 自動リダイレクト
  const { data: activeCall } = useQuery({
    queryKey: ["direct-chat-active-call", user?.email, channel?.owner_email],
    queryFn: async () => {
      if (!user?.email || !channel?.owner_email) return null;
      const calls = await base44.entities.VideoCall.filter(
        { caller_email: user.email, callee_email: channel.owner_email },
        "-created_date",
        5
      );
      return calls.find((c) => ["pending", "accepted", "active"].includes(c.status)) || null;
    },
    enabled: !!user?.email && !!channel?.owner_email,
    refetchInterval: 3000,
  });

  // アクティブ通話がある場合は通話ページへリダイレクト
  useEffect(() => {
    if (activeCall && ["accepted", "active"].includes(activeCall.status) && !redirectedRef.current) {
      redirectedRef.current = true;
      navigate(`/video-call/${activeCall.id}`);
    }
  }, [activeCall?.id, activeCall?.status]);

  const { data: messages = [] } = useQuery({
    queryKey: ["direct-chat", threadId],
    queryFn: () => base44.entities.DirectChat.filter({ thread_id: threadId }, "created_date"),
    enabled: !!threadId,
    refetchInterval: 2000,
  });

  // ★ 通話モーダルの「通話を開始」は status:"pending" でCallを作成し、ライバー側ウィジェットへ着信させる
  const createAndStartCall = async () => {
    if (!user || !channel) return;
    setStartingCall(true);
    // 既存pending確認（重複防止）
    const existing = await base44.entities.VideoCall.filter({
      caller_email: user.email,
      callee_email: channel.owner_email,
      status: "pending",
    });
    let callId;
    if (existing.length > 0) {
      callId = existing[0].id;
    } else {
      const call = await base44.entities.VideoCall.create({
        caller_email: user.email,
        caller_name: user.full_name || user.email,
        callee_email: channel.owner_email,
        callee_name: channel.name,
        callee_channel_id: channel.id,
        status: "pending",
        duration_minutes: 30,
        is_paid: false,
        price: 0,
        thread_id: threadId,
        message: "",
      });
      callId = call.id;
    }
    console.log('[DirectChat] ✅ VideoCall created with status=pending, id:', callId);
    // 視聴者はそのまま通話ルームへ飛んでライバーの承認を待つ
    navigate(`/video-call/${callId}`);
  };

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

  // クリエイターからのメッセージ増加を追跡（通話誘導メッセージ表示用）
  useEffect(() => {
    lastMsgCountRef.current = messages.length;
  }, [messages.length]);

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

    // クリエイターが返信したら通話モーダルを表示
    if (isCreator && !callModal) {
      setCallModal({ otherName: channel?.name });
    }
  };

  const handleDeclineCall = () => {
    setCallModal(null);
  };

  const handleYellSent = () => {
    queryClient.invalidateQueries({ queryKey: ["direct-chat", threadId] });
    setShowYellModal(false);
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
          <p className="text-xs text-muted-foreground">
            {channel.call_enabled
              ? <span className="text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />今すぐ通話可能</span>
              : "メッセージでやりとりできます"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-2 text-muted-foreground">
            <Video className="w-10 h-10 mx-auto opacity-30" />
            <p className="text-sm font-semibold">まだメッセージがありません</p>
            <p className="text-xs">気軽に声をかけてみましょう！</p>
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
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="メッセージを入力..."
              rows={2}
              className="w-full resize-none rounded-xl bg-secondary border-0 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <span className={`absolute bottom-2 right-3 text-[10px] ${input.length >= MAX_CHARS ? "text-destructive font-bold" : "text-muted-foreground"}`}>
              {input.length}/{MAX_CHARS}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button size="icon" variant="outline" className="w-9 h-9 text-yellow-400 border-yellow-400/30 hover:bg-yellow-400/10" onClick={() => setShowYellModal(true)} title="エールコインを送る">
              <Coins className="w-4 h-4" />
            </Button>
            <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="w-9 h-9 bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {/* ビデオ通話ボタン（視聴者のみ・ライバー本人には非表示） */}
        {!isCreator && !activeCall && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => setCallModal({ otherName: channel.name })}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-black"
            style={{ background: "linear-gradient(135deg, #00ff9d, #00d4aa)", boxShadow: "0 0 20px rgba(0,255,157,0.5)" }}
          >
            <PhoneCall className="w-5 h-5" />
            {channel.name} さんにビデオ通話を申し込む
          </motion.button>
        )}
        {!isCreator && activeCall?.status === "pending" && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/video-call/${activeCall.id}`)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-black animate-pulse"
            style={{ background: "linear-gradient(135deg, #00ff9d, #00d4aa)", boxShadow: "0 0 30px rgba(0,255,157,0.7)" }}
          >
            <span className="w-2 h-2 rounded-full bg-black animate-ping inline-block" />
            通話申込中 — タップして通話画面へ
          </motion.button>
        )}
      </div>

      {/* Yell Coin Modal */}
      {showYellModal && user && channel && (
        <YellCoinSendModal user={user} channel={channel} threadId={threadId} onSent={handleYellSent} onClose={() => setShowYellModal(false)} />
      )}

      {/* 通話確認モーダル */}
      <AnimatePresence>
        {callModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85 }}
              className="bg-card border-2 border-primary/50 rounded-2xl p-7 max-w-sm w-full mx-4 text-center space-y-5 shadow-2xl"
              style={{ boxShadow: "0 0 50px rgba(0,255,157,0.25)" }}>
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-16 h-16 rounded-full bg-primary/30 flex items-center justify-center">
                  <Video className="w-8 h-8 text-primary" />
                </div>
              </div>
              <div>
                <p className="font-black text-xl">{callModal.otherName} さんと</p>
                <p className="text-muted-foreground text-sm mt-1">ビデオ通話を開始しますか？</p>
                <p className="text-xs text-muted-foreground mt-2 opacity-70">ライバーに着信が届き、承認後に繋がります</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={handleDeclineCall}>
                  <X className="w-4 h-4 mr-1" /> キャンセル
                </Button>
                <Button onClick={createAndStartCall} disabled={startingCall} className="flex-1 bg-primary hover:bg-primary/90 font-black">
                  {startingCall ? "接続中..." : <><Video className="w-4 h-4 mr-1" />通話を開始</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}