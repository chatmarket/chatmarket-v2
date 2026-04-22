import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Clock, ArrowLeft, PhoneCall, PhoneOff, Camera, CameraOff, Mic, MicOff, MessageCircle, Send, Video, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

function makeThreadId(a, b) { return [a, b].sort().join("__"); }
function formatTime(d) {
  if (!d) return "";
  const dt = new Date(d), JST = { timeZone: "Asia/Tokyo" };
  const today = new Date().toLocaleDateString("ja-JP", JST);
  return dt.toLocaleDateString("ja-JP", JST) === today
    ? dt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", ...JST })
    : dt.toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", ...JST });
}

// ── カメラプレビュー ──
function CameraPreview({ avatarUrl }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [camOn, setCamOn] = useState(false);
  const [micOn, setMicOn] = useState(true);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = s;
      if (videoRef.current) videoRef.current.srcObject = s;
      setCamOn(true);
    } catch { toast.error("カメラにアクセスできません"); }
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
      <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ display: camOn ? "block" : "none" }} />
      {!camOn && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
          {avatarUrl && <img src={avatarUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />}
          <div className="relative z-10 text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
              <PhoneCall className="w-7 h-7 text-primary" />
            </div>
            <p className="text-white font-bold text-sm">待機中</p>
            <p className="text-white/50 text-xs">カメラをONにして顔出し待機</p>
          </div>
        </div>
      )}
      <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-3">
        <button onClick={camOn ? stopCamera : startCamera}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors ${camOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"}`}>
          {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
        </button>
        {camOn && (
          <button onClick={toggleMic}
            className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${micOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500"}`}>
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
        )}
      </div>
      {camOn && (
        <div className="absolute top-3 left-3">
          <span className="text-xs bg-black/60 text-white px-2 py-1 rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> カメラON
          </span>
        </div>
      )}
    </div>
  );
}

// ── インラインチャット ──
function InlineChatPanel({ user, fromEmail, fromName, onStartCall }) {
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef(null);
  const threadId = user && fromEmail ? makeThreadId(user.email, fromEmail) : null;

  const { data: messages = [] } = useQuery({
    queryKey: ["slot-chat", threadId],
    queryFn: () => base44.entities.DirectChat.filter({ thread_id: threadId }, "created_date"),
    enabled: !!threadId,
    refetchInterval: 3000,
  });

  useEffect(() => {
    if (!threadId) return;
    const unsub = base44.entities.DirectChat.subscribe((e) => {
      if (e.data?.thread_id === threadId) qc.invalidateQueries({ queryKey: ["slot-chat", threadId] });
    });
    return unsub;
  }, [threadId, qc]);

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
      from_email: user.email, from_name: user.full_name || user.email,
      to_channel_owner_email: fromEmail, to_channel_id: "", to_channel_name: fromName || fromEmail,
      content: input.trim().slice(0, 50), yell_coin: 0, thread_id: threadId,
    });
    setInput(""); setSending(false);
    qc.invalidateQueries({ queryKey: ["slot-chat", threadId] });
  };

  const handleStartCall = async () => {
    setStarting(true);
    const existing = await base44.entities.VideoCall.filter({ caller_email: fromEmail, callee_email: user.email, status: "pending" });
    let callId;
    if (existing.length > 0) {
      await base44.entities.VideoCall.update(existing[0].id, { status: "accepted" });
      callId = existing[0].id;
    } else {
      const call = await base44.entities.VideoCall.create({
        caller_email: user.email, caller_name: user.full_name || user.email,
        callee_email: fromEmail, callee_name: fromName || fromEmail,
        status: "accepted", duration_minutes: 30, is_paid: false, price: 0, thread_id: threadId,
      });
      callId = call.id;
    }
    setStarting(false); setShowConfirm(false);
    onStartCall(callId);
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
        <Button size="sm" onClick={() => setShowConfirm(true)} className="gap-1.5 bg-primary hover:bg-primary/90 text-xs h-8">
          <Video className="w-3.5 h-3.5" /> 通話開始
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && <p className="text-center text-xs text-muted-foreground py-8">まだメッセージがありません</p>}
        {messages.map((msg) => {
          const mine = msg.from_email === user.email;
          return (
            <div key={msg.id} className={`flex ${mine ? "flex-row-reverse" : "flex-row"} gap-1.5`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-secondary text-foreground rounded-tl-sm"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-border/50 flex gap-2 items-end shrink-0">
        <textarea value={input} onChange={(e) => setInput(e.target.value.slice(0, 50))}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="メッセージを入力..." rows={1}
          className="flex-1 resize-none rounded-lg bg-secondary border-0 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
        <Button size="icon" onClick={handleSend} disabled={!input.trim() || sending} className="w-8 h-8 shrink-0 bg-primary hover:bg-primary/90">
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85 }} animate={{ scale: 1 }} exit={{ scale: 0.85 }}
              className="bg-card border border-primary/40 rounded-2xl p-6 max-w-sm w-full mx-4 text-center space-y-4 shadow-2xl">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Video className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-black text-lg">{fromName || fromEmail} さんと</p>
                <p className="text-muted-foreground text-sm mt-1">ビデオ通話を開始しますか？</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  <X className="w-4 h-4 mr-1" /> キャンセル
                </Button>
                <Button onClick={handleStartCall} disabled={starting} className="flex-1 bg-primary hover:bg-primary/90 font-bold">
                  {starting ? "接続中..." : <><Video className="w-4 h-4 mr-1" /> 通話開始</>}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CallSlotManage() {
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [form, setForm] = useState({ date: "", start_time: "", duration_minutes: 30, price: 150 });
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(async (u) => {
          setUser(u);
          const channels = await base44.entities.Channel.filter({ owner_email: u.email });
          setChannel(channels[0] || null);
        }).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: slots = [] } = useQuery({
    queryKey: ["call-slots-owner", user?.email],
    queryFn: () => base44.entities.CallSlot.filter({ owner_email: user.email }, "date", 50),
    enabled: !!user,
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user || !channel) return;
    if (!form.date || !form.start_time) {
      toast.error("日付と開始時刻を入力してください");
      return;
    }
    if (form.price < 150) {
      toast.error("料金は150円以上で設定してください（15分毎に150円）");
      return;
    }
    setAdding(true);
    const startParts = form.start_time.split(":");
    const endMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]) + parseInt(form.duration_minutes);
    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const endMin = (endMinutes % 60).toString().padStart(2, "0");

    await base44.entities.CallSlot.create({
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: user.email,
      date: form.date,
      start_time: form.start_time,
      end_time: `${endHour}:${endMin}`,
      duration_minutes: parseInt(form.duration_minutes),
      price: parseInt(form.price),
      status: "open",
    });
    queryClient.invalidateQueries({ queryKey: ["call-slots-owner", user.email] });
    toast.success("予約枠を追加しました");
    setForm({ ...form, date: "", start_time: "" });
    setAdding(false);
  };

  const handleToggleWaiting = async () => {
    if (!channel) return;
    const newState = !channel.call_enabled;
    await base44.entities.Channel.update(channel.id, { call_enabled: newState });
    setChannel({ ...channel, call_enabled: newState });
    toast.success(newState ? "✅ 待機を開始しました。TOPページに表示されます。" : "待機を停止しました。");
  };

  const handleDelete = async (slot) => {
    if (slot.status === "reserved") {
      toast.error("予約済みの枠は削除できません");
      return;
    }
    await base44.entities.CallSlot.delete(slot.id);
    queryClient.invalidateQueries({ queryKey: ["call-slots-owner", user.email] });
    toast.success("削除しました");
  };

  // 受信DM
  const { data: allMessages = [] } = useQuery({
    queryKey: ["slot-manage-dms", user?.email],
    queryFn: () => base44.entities.DirectChat.filter({ to_channel_owner_email: user.email }, "-created_date", 100),
    enabled: !!user,
    refetchInterval: 5000,
  });
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.DirectChat.subscribe((e) => {
      if (e.data?.to_channel_owner_email === user.email)
        queryClient.invalidateQueries({ queryKey: ["slot-manage-dms", user.email] });
    });
    return unsub;
  }, [user, queryClient]);

  const threadMap = new Map();
  for (const msg of allMessages) {
    const tid = msg.thread_id || msg.from_email;
    if (!threadMap.has(tid)) threadMap.set(tid, msg);
  }
  const threads = Array.from(threadMap.values());
  const unreadCount = allMessages.filter((m) => !m.is_read).length;

  const upcomingSlots = slots.filter((s) => s.date >= new Date().toISOString().slice(0, 10));
  const pastSlots = slots.filter((s) => s.date < new Date().toISOString().slice(0, 10));

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/my-channel" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> 通話予約枠管理
        </h1>
      </div>

      {/* ── カメラ待機 + チャット ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* 左: カメラ */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">あなたのカメラ映像（待機中）</p>
          <CameraPreview avatarUrl={channel?.avatar_url} />
        </div>

        {/* 右: チャット */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "280px" }}>
          {!selectedThread ? (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">受信チャット</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              {threads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center py-8">
                    <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-xs">まだメッセージがありません</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                  {threads.map((msg) => {
                    const isUnread = !msg.is_read;
                    return (
                      <button key={msg.id}
                        onClick={() => setSelectedThread({ fromEmail: msg.from_email, fromName: msg.from_name })}
                        className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${isUnread ? "bg-primary/5" : ""}`}>
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
              <div className="px-4 py-2 border-b border-border/50 shrink-0">
                <button onClick={() => setSelectedThread(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  ← 一覧に戻る
                </button>
              </div>
              <div className="flex-1 min-h-0">
                <InlineChatPanel user={user} fromEmail={selectedThread.fromEmail} fromName={selectedThread.fromName}
                  onStartCall={(id) => navigate(`/video-call/${id}`)} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 待機中トグルボタン */}
      {channel && (
        <div className={`rounded-2xl p-5 mb-6 border flex items-center justify-between gap-4 ${channel.call_enabled ? "bg-green-500/10 border-green-500/40" : "bg-card border-border/50"}`}>
          <div>
            <p className="font-bold text-sm flex items-center gap-2">
              {channel.call_enabled
                ? <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> 現在待機中（TOPページに表示されています）</>
                : <><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" /> 現在オフライン</>
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              待機中にするとTOPページの「1対1ビデオ通話 待機中」に表示されます
            </p>
          </div>
          <Button
            onClick={handleToggleWaiting}
            className={`shrink-0 gap-2 ${channel.call_enabled ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
          >
            {channel.call_enabled
              ? <><PhoneOff className="w-4 h-4" /> 待機停止</>
              : <><PhoneCall className="w-4 h-4" /> 今すぐ待機開始</>
            }
          </Button>
        </div>
      )}

      {!channel && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-sm text-yellow-400">
          チャンネルを作成してから予約枠を追加できます。
        </div>
      )}

      {/* Add slot form */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> 新しい枠を追加
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>日付</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>開始時刻</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="bg-secondary border-0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>通話時間</Label>
              <Select
                value={String(form.duration_minutes)}
                onValueChange={(v) => setForm({ ...form, duration_minutes: parseInt(v) })}
              >
                <SelectTrigger className="bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50, 60].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>料金（円）</Label>
              <Input
                type="number"
                min={150}
                step={10}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-0"
              />
            </div>
          </div>

          {/* 画質固定表示 */}
          <div className="bg-primary/10 border border-primary/40 rounded-xl p-4">
            <p className="text-xs font-black text-foreground">📊 1対1通話は常にFHD 1080p固定で配信されます</p>
            <p className="text-xs text-muted-foreground mt-2">最低料金: 150円/15分</p>
          </div>

          <Button
            type="submit"
            disabled={adding || !channel}
            className="w-full bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> 枠を追加
          </Button>
        </form>
      </div>

      {/* Upcoming slots */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">今後の枠 ({upcomingSlots.length})</h2>
        {upcomingSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">予約枠がありません</p>
        ) : (
          upcomingSlots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onDelete={() => handleDelete(slot)} />
          ))
        )}
      </div>

      {pastSlots.length > 0 && (
        <div className="space-y-3 mt-6">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">過去の枠</h2>
          {pastSlots.slice(0, 10).map((slot) => (
            <SlotCard key={slot.id} slot={slot} onDelete={() => handleDelete(slot)} past />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot, onDelete, past }) {
  const statusMap = {
    open: { label: "受付中", color: "text-green-400 bg-green-500/10" },
    reserved: { label: "予約済", color: "text-blue-400 bg-blue-500/10" },
    cancelled: { label: "キャンセル", color: "text-muted-foreground bg-secondary" },
  };
  const s = statusMap[slot.status] || statusMap.open;

  return (
    <div className={`bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 ${past ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">{slot.date}</span>
          <span className="text-muted-foreground text-xs flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {slot.start_time} 〜 {slot.end_time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
          <span className="text-muted-foreground">{slot.duration_minutes}分</span>
          <span className="text-primary font-bold">¥{(slot.price || 0).toLocaleString()}</span>
          {slot.reserved_by_email && (
            <span className="text-muted-foreground truncate max-w-[120px]">{slot.reserved_by_email}</span>
          )}
        </div>
      </div>
      {!past && slot.status !== "reserved" && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}