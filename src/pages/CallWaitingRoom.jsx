import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import CallWaitingWidget from "../components/dashboard/CallWaitingWidget";
import AcceptedCallsList from "../components/dashboard/AcceptedCallsList";
import { PhoneCall, Send, Camera, CameraOff, Mic, MicOff, MessageCircle, Video, X } from "lucide-react";
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

// カメラプレビューコンポーネント
function CameraPreview({ thumbnailUrl }) {
  const videoRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCamOn(true);
    } catch {
      toast.error("カメラにアクセスできません");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCamOn(false);
  };

  const toggleMic = () => {
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  useEffect(() => () => streamRef.current?.getTracks().forEach((t) => t.stop()), []);

  return (
    <div className="bg-black rounded-2xl overflow-hidden aspect-video relative">
      {/* カメラ映像 */}
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ display: camOn ? "block" : "none" }} />

      {/* カメラOFF時: サムネイルor待機画面 */}
      {!camOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
          {thumbnailUrl
            ? <img src={thumbnailUrl} alt="thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-60" />
            : null}
          <div className="relative z-10 text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <PhoneCall className="w-8 h-8 text-primary" />
            </div>
            <p className="text-white font-bold text-sm">待機中</p>
            <p className="text-white/60 text-xs">カメラをオンにして顔出し待機</p>
          </div>
        </div>
      )}

      {/* コントロール */}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
        <button
          onClick={camOn ? stopCamera : startCamera}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-white ${camOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"}`}
        >
          {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        </button>
        {camOn && (
          <button
            onClick={toggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors text-white ${micOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500"}`}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}
      </div>

      {camOn && (
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1 text-xs bg-black/60 text-white px-2 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> カメラON
          </span>
        </div>
      )}
    </div>
  );
}

// インラインチャットパネル
function InlineChatPanel({ user, fromEmail, fromName, onStartCall }) {
  const queryClient = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [startingCall, setStartingCall] = useState(false);
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

  // 既読
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

  // ビデオ通話を即開始
  const handleStartCall = async () => {
    setStartingCall(true);
    // 既存のpendingコールを探す
    const existing = await base44.entities.VideoCall.filter({
      caller_email: fromEmail,
      callee_email: user.email,
      status: "pending",
    });
    if (existing.length > 0) {
      await base44.entities.VideoCall.update(existing[0].id, { status: "accepted" });
      onStartCall(existing[0].id);
    } else {
      // 新規通話レコードを作成して即accepted
      const call = await base44.entities.VideoCall.create({
        caller_email: user.email,
        caller_name: user.full_name || user.email,
        callee_email: fromEmail,
        callee_name: fromName || fromEmail,
        status: "accepted",
        duration_minutes: 30,
        is_paid: false,
        price: 0,
        thread_id: threadId,
      });
      onStartCall(call.id);
    }
    setStartingCall(false);
    setShowCallConfirm(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* チャットヘッダー */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
            {(fromName || fromEmail || "?")[0].toUpperCase()}
          </div>
          <p className="font-bold text-sm">{fromName || fromEmail}</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCallConfirm(true)}
          className="gap-1.5 bg-primary hover:bg-primary/90 text-xs h-8"
        >
          <Video className="w-3.5 h-3.5" /> 通話開始
        </Button>
      </div>

      {/* メッセージ */}
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

      {/* 入力欄 */}
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

      {/* 通話確認ポップアップ */}
      <AnimatePresence>
        {showCallConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              className="bg-card border border-primary/40 rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4 shadow-2xl"
            >
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-black text-lg">{fromName || fromEmail} さんと</p>
                <p className="text-muted-foreground text-sm mt-1">ビデオ通話を開始しますか？</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCallConfirm(false)}>
                  <X className="w-4 h-4 mr-1" /> キャンセル
                </Button>
                <Button onClick={handleStartCall} disabled={startingCall} className="flex-1 bg-primary hover:bg-primary/90 font-bold">
                  {startingCall ? "接続中..." : <><Video className="w-4 h-4 mr-1" /> 通話開始</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CallWaitingRoom() {
  const [user, setUser] = useState(null);
  const [selectedThread, setSelectedThread] = useState(null); // { fromEmail, fromName }
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // 受信DM一覧
  const { data: allMessages = [] } = useQuery({
    queryKey: ["waiting-room-dms", user?.email],
    queryFn: () => base44.entities.DirectChat.filter({ to_channel_owner_email: user.email }, "-created_date", 100),
    enabled: !!user,
    refetchInterval: 5000,
  });

  // リアルタイム購読
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.DirectChat.subscribe((e) => {
      if (e.data?.to_channel_owner_email === user.email) {
        queryClient.invalidateQueries({ queryKey: ["waiting-room-dms", user.email] });
      }
    });
    return unsub;
  }, [user, queryClient]);

  // スレッドごとに最新メッセージをグループ化
  const threadMap = new Map();
  for (const msg of allMessages) {
    const tid = msg.thread_id || msg.from_email;
    if (!threadMap.has(tid)) threadMap.set(tid, msg);
  }
  const threads = Array.from(threadMap.values());
  const unreadCount = allMessages.filter((m) => !m.is_read).length;

  const handleStartCall = (callId) => {
    navigate(`/video-call/${callId}`);
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <PhoneCall className="w-6 h-6 text-primary" />
        <h1 className="text-xl font-black">1対1ビデオ通話</h1>
      </div>

      {/* 承認済み通話のみ表示（待機ウィジェット削除） */}
      <AcceptedCallsList userEmail={user?.email} />

      {/* メインエリア: カメラ + チャット */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 左: カメラプレビュー */}
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">あなたのカメラ映像</p>
          <CameraPreview thumbnailUrl={channel?.avatar_url} />
        </div>

        {/* 右: チャット */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "400px" }}>
          {/* チャット一覧 */}
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
            /* 選択したスレッドのチャット */
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
                  onStartCall={handleStartCall}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}