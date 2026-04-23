import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { PhoneCall, Send, Camera, CameraOff, MessageCircle, X, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

function makeThreadId(emailA, emailB) {
  return [emailA, emailB].sort().join("__");
}

function formatTime(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const JST = { timeZone: "Asia/Tokyo" };
  const today = new Date().toLocaleDateString("ja-JP", JST);
  const msgDay = d.toLocaleDateString("ja-JP", JST);
  return today === msgDay
    ? d.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", ...JST })
    : d.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", ...JST });
}

// インラインチャットパネル
function InlineChatPanel({ user, fromEmail, fromName, onStartCall }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const threadId = user && fromEmail ? makeThreadId(user.email, fromEmail) : null;

  const { data: messages = [] } = useQuery({
    queryKey: ["waiting-inline-chat", threadId],
    queryFn: () => base44.entities.DirectChat.filter({ thread_id: threadId }, "created_date"),
    enabled: !!threadId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.DirectChat.subscribe((e) => {
      if (e.data?.thread_id === threadId) queryClient.invalidateQueries({ queryKey: ["waiting-inline-chat", threadId] });
    });
    return unsub;
  }, [threadId, queryClient]);

  useEffect(() => {
    if (!user || !messages.length) return;
    messages.filter((m) => m.to_channel_owner_email === user.email && !m.is_read)
      .forEach((m) => base44.entities.DirectChat.update(m.id, { is_read: true }));
  }, [messages, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !user || !fromEmail || sending) return;
    setSending(true);
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: fromEmail,
      to_channel_id: "",
      to_channel_name: fromName || fromEmail,
      content: input.trim().slice(0, 50),
      yell_coin: 0,
      thread_id: threadId,
    });
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["waiting-inline-chat", threadId] });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
            {(fromName || fromEmail || "?")[0].toUpperCase()}
          </div>
          <p className="font-bold text-sm">{fromName || fromEmail}</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">まだメッセージがありません</p>
        )}
        {messages.map((msg) => {
          const mine = msg.from_email === user.email;
          return (
            <div key={msg.id} className={`flex gap-1.5 ${mine ? "flex-row-reverse" : "flex-row"}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-border/50 flex gap-2 items-end shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 50))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="メッセージを入力..."
          rows={1}
          className="flex-1 resize-none rounded-lg bg-secondary border-0 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
        />
        <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="w-8 h-8 shrink-0 bg-primary hover:bg-primary/90">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}

export default function CallWaitingRoom() {
  const [user, setUser] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null);
  const [showCameraWipe, setShowCameraWipe] = useState(false);
  const [camStream, setCamStream] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const wipeVideoRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const seenCallIds = useRef(new Set());

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["waiting-room-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  // ★ pending コールを3秒ごとにポーリング（callee_email ベース、常時監視）
  const initialDoneRef = useRef(false);
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["waiting-room-pending-calls-v2", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.VideoCall.filter(
        { callee_email: user.email, status: "pending" },
        "-created_date",
        5
      );
      console.log(`[CallWaitingRoom] 📞 Polled:`, results.length, 'pending calls for', user.email);
      return results;
    },
    enabled: !!user?.email,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // ★ リアルタイム購読も併用
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      const data = event.data;
      if (data?.callee_email === user.email && data?.status === 'pending') {
        console.log('[CallWaitingRoom] 🔔 Real-time incoming call:', data.id);
        queryClient.invalidateQueries({ queryKey: ["waiting-room-pending-calls-v2", user.email] });
      }
    });
    return () => unsub();
  }, [user?.email, queryClient]);

  // ★ 新着着信検出（初回ロード後の新着のみ表示）
  useEffect(() => {
    if (!initialDoneRef.current) {
      pendingCalls.forEach((c) => seenCallIds.current.add(c.id));
      initialDoneRef.current = true;
      return;
    }
    const newCalls = pendingCalls.filter((c) => !seenCallIds.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      console.log('[CallWaitingRoom] 🚨 Showing incoming call modal for:', newCalls[0].id);
      setIncomingCall(newCalls[0]);
      newCalls.forEach((c) => seenCallIds.current.add(c.id));
    }
  }, [pendingCalls]);

  // 受信DM一覧
  const { data: allMessages = [] } = useQuery({
    queryKey: ["waiting-room-dms", user?.email],
    queryFn: () => base44.entities.DirectChat.filter({ to_channel_owner_email: user.email }, "-created_date", 100),
    enabled: !!user,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.DirectChat.subscribe((e) => {
      if (e.data?.to_channel_owner_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ["waiting-room-dms", user.email] });
      }
    });
    return unsub;
  }, [user, queryClient]);

  // カメラワイプ開始/停止
  const toggleCameraWipe = async () => {
    if (showCameraWipe) {
      camStream?.getTracks().forEach((t) => t.stop());
      setCamStream(null);
      setShowCameraWipe(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        setCamStream(stream);
        setShowCameraWipe(true);
        setTimeout(() => {
          if (wipeVideoRef.current) wipeVideoRef.current.srcObject = stream;
        }, 100);
      } catch {
        toast.error("カメラにアクセスできません");
      }
    }
  };

  useEffect(() => () => camStream?.getTracks().forEach((t) => t.stop()), [camStream]);

  // 着信承認
  const handleAccept = async () => {
    if (!incomingCall) return;
    setAccepting(true);
    await base44.entities.VideoCall.update(incomingCall.id, { status: "accepted" });
    setIncomingCall(null);
    navigate(`/video-call/${incomingCall.id}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    await base44.entities.VideoCall.update(incomingCall.id, { status: "declined" });
    seenCallIds.current.delete(incomingCall.id);
    setIncomingCall(null);
    toast.info("通話を断りました");
  };

  const threadMap = new Map();
  for (const msg of allMessages) {
    const tid = msg.thread_id || msg.from_email;
    if (!threadMap.has(tid)) threadMap.set(tid, msg);
  }
  const threads = Array.from(threadMap.values());
  const unreadCount = allMessages.filter((m) => !m.is_read).length;

  if (!user) return null;

  const avatarUrl = channel?.avatar_url;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <PhoneCall className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-black">1対1ビデオ通話 待機室</h1>
        <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" /> 待機中
        </span>
      </div>

      {/* メインエリア */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* 左: サムネイル表示エリア */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">待機中の表示（ファンには見えません）</p>
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            {/* プロフィール画像サムネイル（デフォルト） */}
            {avatarUrl ? (
              <img src={avatarUrl} alt="プロフィール" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-card">
                <Radio className="w-16 h-16 text-primary/30" />
              </div>
            )}
            {/* 待機中オーバーレイ */}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3">
              {avatarUrl && (
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary/60 shadow-2xl">
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 border border-primary/40">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                <span className="text-white font-bold text-sm">待機中 — ファンからの着信を待っています</span>
              </div>
            </div>

            {/* カメラワイプ（右下） */}
            {showCameraWipe && (
              <div className="absolute bottom-3 right-3 w-28 h-20 rounded-xl overflow-hidden border-2 border-white/40 shadow-2xl bg-black">
                <video ref={wipeVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                <div className="absolute top-1 left-1 text-[9px] text-white/70 bg-black/50 px-1 rounded">自分</div>
              </div>
            )}

            {/* カメラ確認ボタン（右下コーナー） */}
            <button
              onClick={toggleCameraWipe}
              className={`absolute bottom-3 ${showCameraWipe ? "right-36" : "right-3"} flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                showCameraWipe
                  ? "bg-red-500/20 border-red-500/60 text-red-300 hover:bg-red-500/30"
                  : "bg-black/60 border-white/20 text-white/70 hover:border-white/40 hover:text-white"
              }`}
            >
              {showCameraWipe ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
              {showCameraWipe ? "カメラOFF" : "自分を確認"}
            </button>
          </div>
        </div>

        {/* 右: チャット */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "400px" }}>
          {!selectedThread ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  <h3 className="font-bold text-sm">受信チャット</h3>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                  )}
                </div>
              </div>
              {threads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-center py-12 text-muted-foreground">
                  <div>
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">まだメッセージがありません</p>
                    <p className="text-xs mt-1 opacity-60">ファンからの連絡が届くとここに表示されます</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                  {threads.map((msg) => {
                    const isUnread = !msg.is_read;
                    return (
                      <button
                        key={msg.id}
                        onClick={() => setSelectedThread({ fromEmail: msg.from_email, fromName: msg.from_name })}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${isUnread ? "bg-primary/5" : ""}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                          {(msg.from_name || msg.from_email || "?")[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-semibold truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
                              {msg.from_name || msg.from_email}
                            </p>
                            <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(msg.created_date)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.content}</p>
                        </div>
                        {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50 shrink-0">
                <button onClick={() => setSelectedThread(null)} className="text-muted-foreground hover:text-foreground text-xs flex items-center gap-1">
                  ← 一覧に戻る
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <InlineChatPanel
                  user={user}
                  fromEmail={selectedThread.fromEmail}
                  fromName={selectedThread.fromName}
                  onStartCall={(callId) => navigate(`/video-call/${callId}`)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ★ 着信モーダル — ライバーが承認するまで通話は始まらない */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-card border-2 border-primary rounded-3xl p-10 max-w-md w-full mx-4 text-center space-y-6 shadow-2xl"
              style={{ boxShadow: "0 0 80px rgba(0,255,157,0.4)" }}
            >
              {/* アニメーションアイコン */}
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center border-2 border-primary">
                  <PhoneCall className="w-11 h-11 text-primary" />
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">着信！</p>
                <p className="text-2xl font-black text-white">{incomingCall.caller_name || incomingCall.caller_email}</p>
                <p className="text-base text-white/70">さんからの通話リクエスト</p>
                {incomingCall.message && (
                  <p className="text-sm text-white/50 bg-secondary rounded-xl px-4 py-2 mt-2 text-left">
                    {incomingCall.message}
                  </p>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={handleDecline}
                  variant="outline"
                  className="flex-1 h-14 text-base gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                  <X className="w-5 h-5" /> 断る
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1 h-14 text-base font-black gap-2 bg-primary hover:bg-primary/90 text-black"
                  style={{ boxShadow: "0 0 30px rgba(0,255,157,0.5)" }}
                >
                  <PhoneCall className="w-5 h-5" />
                  {accepting ? "接続中..." : "通話を開始する"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}