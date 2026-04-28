import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import {
  PhoneCall, PhoneOff, Camera, CameraOff, MessageCircle, X,
  CheckCircle2, XCircle, Settings, Play, Clock, Coins,
  ChevronRight, Info, Lock, Send
} from "lucide-react";
import CallWaitingManager from "@/components/call/CallWaitingManager";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// キャンペーン枠（初回登録300名限定・4ヶ月間全機能無料）
const CAMPAIGN_LIMIT = 300;

// プラン別機能マトリクス
const PLAN_FEATURES = {
  free: {
    label: "無料プラン",
    color: "text-muted-foreground",
    bg: "bg-secondary",
    border: "border-border",
    maxDuration: 60,        // 最大1時間
    minPrice: 150,          // 最低150円/15分・上限なし
    canSetPrice: true,      // 料金設定可（150円以上）
    canSetTitle: true,
    canSetDescription: true,
    recordingAllowed: false, // 録画はVODプラン加入が必要
    recordingRequiresPlan: "vod",
  },
  vod: {
    label: "VODプラン",
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    maxDuration: 60,
    minPrice: 150,
    canSetPrice: true,
    canSetTitle: true,
    canSetDescription: true,
    recordingAllowed: true,
  },
  basic: {
    label: "Basicプラン",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    border: "border-purple-500/30",
    maxDuration: 120,
    minPrice: 150,
    canSetPrice: true,
    canSetTitle: true,
    canSetDescription: true,
    recordingAllowed: true,
  },
  "call-anser": {
    label: "CALL&ANSERプラン",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/30",
    maxDuration: 120,       // 最大120分（2時間）
    minPrice: 150,
    canSetPrice: true,
    canSetTitle: true,
    canSetDescription: true,
    recordingAllowed: true,
  },
};

// 15分刻みの時間オプション（最大2時間）
const DURATION_OPTIONS = [
  { minutes: 15, label: "15分" },
  { minutes: 30, label: "30分" },
  { minutes: 45, label: "45分" },
  { minutes: 60, label: "1時間" },
  { minutes: 75, label: "1時間15分" },
  { minutes: 90, label: "1時間30分" },
  { minutes: 105, label: "1時間45分" },
  { minutes: 120, label: "2時間" },
];

// 料金プリセット（15分あたり）
const PRICE_PRESETS_PER_15MIN = [150, 300, 500, 1000, 2000, 3000, 5000];

function makeThreadId(a, b) { return [a, b].sort().join("__"); }

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
function InlineChatPanel({ user, fromEmail, fromName }) {
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
      content: input.trim().slice(0, 200),
      yell_coin: 0,
      thread_id: threadId,
    });
    setInput("");
    setSending(false);
    queryClient.invalidateQueries({ queryKey: ["waiting-inline-chat", threadId] });
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: "400px" }}>
      <div className="px-3 py-2.5 border-b border-border/50 shrink-0">
        <p className="font-bold text-sm">{fromName || fromEmail}</p>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground py-8">まだメッセージがありません</p>
        )}
        {messages.map((msg) => {
          const mine = msg.from_email === user.email;
          return (
            <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="px-3 py-2 border-t border-border/50 flex gap-2 shrink-0">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value.slice(0, 200))}
          onKeyDown={(e) => { if (e.key === "Enter") handleSend(); }}
          placeholder="返信..."
          className="flex-1 rounded-lg bg-secondary border-0 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
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
  const [userPlan, setUserPlan] = useState("free");
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 設定フォーム
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pricePerUnit, setPricePerUnit] = useState(150); // 15分あたりの料金
  const [maxDuration, setMaxDuration] = useState(30);    // 最大通話時間（分）
  const [isWaiting, setIsWaiting] = useState(false);
  const [recordingEnabled, setRecordingEnabled] = useState(false);

  // 着信関連
  const [incomingCall, setIncomingCall] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const seenCallIds = useRef(new Set());
  const initialDoneRef = useRef(false);

  // チャット
  const [selectedThread, setSelectedThread] = useState(null);

  // カメラプレビュー
  const [camStream, setCamStream] = useState(null);
  const [showCam, setShowCam] = useState(false);
  const camRef = useRef(null);
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState("");

  const [isCampaignUser, setIsCampaignUser] = useState(false);
  const [campaignMonthsLeft, setCampaignMonthsLeft] = useState(null);
  const [totalUserCount, setTotalUserCount] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(async (u) => {
        setUser(u);
        let plan = u?.plan || (u?.role === "admin" ? "call-anser" : "free");

        // キャンペーン判定：登録から4ヶ月以内 かつ 全ユーザー数が300名以内
        try {
          const allUsers = await base44.entities.User.list("-created_date", 300);
          const count = allUsers.length;
          setTotalUserCount(count);
          if (count <= CAMPAIGN_LIMIT && u?.created_date) {
            const registeredAt = new Date(u.created_date);
            const campaignEnd = new Date(registeredAt);
            campaignEnd.setMonth(campaignEnd.getMonth() + 4);
            const now = new Date();
            if (now < campaignEnd) {
              setIsCampaignUser(true);
              const msLeft = campaignEnd - now;
              const monthsLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24 * 30));
              setCampaignMonthsLeft(monthsLeft);
              plan = "call-anser"; // 全機能開放
            }
          }
        } catch {}

        setUserPlan(plan);
        const features = PLAN_FEATURES[plan] || PLAN_FEATURES.free;
        setMaxDuration(Math.min(30, features.maxDuration));
      }).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const features = PLAN_FEATURES[userPlan] || PLAN_FEATURES.free;

  // 着信ポーリング（待機中のみ） - 指数バックオフ付き
  const [pollRetries, setPollRetries] = useState(0);
  const basePollInterval = 5000; // 5秒
  const pollInterval = Math.min(basePollInterval * Math.pow(1.5, pollRetries), 30000); // 最大30秒

  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["waiting-room-pending-v3", user?.email],
    queryFn: async () => {
      try {
        const res = await base44.entities.VideoCall.filter(
          { callee_email: user.email, status: "pending" },
          "-created_date", 5
        );
        setPollRetries(0); // 成功時はリセット
        return res;
      } catch (err) {
        if (err.response?.status === 429) {
          setPollRetries(prev => prev + 1); // 失敗時は指数バックオフ
        }
        throw err;
      }
    },
    enabled: !!user?.email && isWaiting,
    refetchInterval: pollInterval,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      const d = event.data;
      if (d?.callee_email === user.email && d?.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["waiting-room-pending-v3", user.email] });
      }
    });
    return unsub;
  }, [user?.email, queryClient]);

  useEffect(() => {
    if (!initialDoneRef.current) {
      pendingCalls.forEach((c) => seenCallIds.current.add(c.id));
      initialDoneRef.current = true;
      return;
    }
    const newCalls = pendingCalls.filter((c) => !seenCallIds.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      setIncomingCall(newCalls[0]);
      newCalls.forEach((c) => seenCallIds.current.add(c.id));
      playRingtone();
    }
  }, [pendingCalls]);

  // 受信DM
  const { data: allMessages = [] } = useQuery({
    queryKey: ["waiting-room-dms-v2", user?.email],
    queryFn: () => base44.entities.DirectChat.filter({ to_channel_owner_email: user.email }, "-created_date", 100),
    enabled: !!user?.email && isWaiting,
    refetchInterval: 5000,
  });

  const threadMap = new Map();
  for (const msg of allMessages) {
    const tid = msg.thread_id || msg.from_email;
    if (!threadMap.has(tid)) threadMap.set(tid, msg);
  }
  const threads = Array.from(threadMap.values());
  const unreadCount = allMessages.filter((m) => !m.is_read).length;

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (t, f) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t); o.stop(t + 0.4);
      };
      beep(ctx.currentTime, 880); beep(ctx.currentTime + 0.5, 1100);
      beep(ctx.currentTime + 1.0, 880); beep(ctx.currentTime + 1.5, 1100);
    } catch {}
  };

  const handleStartWaiting = () => {
    if (!title.trim()) { toast.error("タイトルを入力してください"); return; }
    setIsWaiting(true);
    initialDoneRef.current = false;
    seenCallIds.current = new Set();
    toast.success("通話受付を開始しました！着信をお待ちください");
  };

  const handleStopWaiting = () => {
    setIsWaiting(false);
    setIncomingCall(null);
    stopCam();
    toast.info("通話受付を終了しました");
  };

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

  // デバイスリスト取得（初回レンダリング時）
  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const vDevices = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(vDevices);
      // デフォルト: FaceTime / Built-in 優先
      let def = vDevices.find((d) => d.label.toLowerCase().includes("facetime"));
      if (!def) def = vDevices.find((d) => d.label.toLowerCase().includes("built-in"));
      if (!def) def = vDevices.find((d) => !d.label.toLowerCase().includes("obs"));
      if (!def) def = vDevices[0];
      if (def) setSelectedCameraId(def.deviceId);
    }).catch(() => {});
  }, []);

  const startCam = async (deviceId) => {
    camStream?.getTracks().forEach((t) => t.stop());
    try {
      const videoConstraint = deviceId ? { deviceId: { exact: deviceId } } : true;
      const stream = await navigator.mediaDevices.getUserMedia({ video: videoConstraint, audio: false });
      // カメラ起動後にデバイスラベルを再取得（初回許可後にラベルが付く）
      const devices = await navigator.mediaDevices.enumerateDevices();
      const vDevices = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(vDevices);
      setCamStream(stream);
      setShowCam(true);
      setTimeout(() => { if (camRef.current) camRef.current.srcObject = stream; }, 100);
    } catch { toast.error("カメラにアクセスできません"); }
  };

  const toggleCam = async () => {
    if (showCam) { stopCam(); return; }
    await startCam(selectedCameraId);
  };

  const handleCameraSwitch = async (deviceId) => {
    setSelectedCameraId(deviceId);
    if (showCam) await startCam(deviceId);
  };

  const stopCam = () => {
    camStream?.getTracks().forEach((t) => t.stop());
    setCamStream(null); setShowCam(false);
  };
  useEffect(() => () => stopCam(), []);

  if (!user) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const totalPrice = Math.round((pricePerUnit / 15) * maxDuration);

  // ===== 設定画面 =====
  if (!isWaiting) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* ヘッダー */}
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <PhoneCall className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-black">1対1ビデオ通話を受け付ける</h1>
          </div>
          <p className="text-sm text-muted-foreground">設定を確認して「受付開始」を押すと着信待機状態になります</p>
        </div>

        {/* キャンペーンバナー */}
        {isCampaignUser && (
          <div className="rounded-2xl border-2 border-yellow-500/60 bg-yellow-500/10 p-4 flex items-start gap-3">
            <span className="text-2xl">🎉</span>
            <div className="flex-1">
              <p className="font-black text-yellow-400 text-sm">初回登録キャンペーン適用中！</p>
              <p className="text-xs text-yellow-300/80 mt-0.5">
                300名限定・登録から4ヶ月間、全プランの機能が無料で使えます。
                {campaignMonthsLeft !== null && (
                  <span className="font-bold"> あと約{campaignMonthsLeft}ヶ月で通常課金に切り替わります。</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* 通常プラン表示（キャンペーン外のみ） */}
        {!isCampaignUser && (
          <div className={`rounded-2xl border p-4 ${features.bg} ${features.border}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`font-black text-sm ${features.color}`}>{features.label}</span>
                <span className="text-xs text-muted-foreground">でご利用中</span>
              </div>
              <button onClick={() => navigate("/plan-select")} className="text-xs text-primary hover:underline flex items-center gap-1">
                プランを変更 <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="text-primary font-semibold">最大 {features.maxDuration}分</span>
              <span className="text-primary font-semibold">料金カスタマイズ（¥150〜）</span>
              <span className="text-primary font-semibold">説明文</span>
              <span className={features.recordingAllowed ? "text-primary font-semibold" : "text-orange-400"}>
                {features.recordingAllowed ? "録画オプション" : "録画：VODプラン加入で利用可"}
              </span>
            </div>
          </div>
        )}

        {/* 設定フォーム */}
        <div className="space-y-4">
          {/* タイトル */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold flex items-center gap-1.5">
              タイトル <span className="text-red-400 text-xs">必須</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 50))}
              placeholder="例：相談・雑談・悩み聞きます"
              className="w-full rounded-xl bg-secondary border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/50</p>
          </div>

          {/* 説明 */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold">説明文</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 200))}
              placeholder={features.canSetDescription ? "通話の内容・ルール・注意事項などを入力..." : "Basicプラン以上で利用できます"}
              rows={3}
              disabled={!features.canSetDescription}
              className="w-full rounded-xl bg-secondary border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {features.canSetDescription && <p className="text-xs text-muted-foreground text-right">{description.length}/200</p>}
          </div>

          {/* 最大通話時間 */}
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> 最大通話時間
            </label>
            <div className="flex flex-wrap gap-2">
              {DURATION_OPTIONS.filter((d) => d.minutes <= features.maxDuration).map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => setMaxDuration(opt.minutes)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                    maxDuration === opt.minutes
                      ? "bg-primary text-black border-primary"
                      : "bg-secondary border-border hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              {/* ロックされた選択肢 */}
              {DURATION_OPTIONS.filter((d) => d.minutes > features.maxDuration).map((opt) => (
                <button
                  key={opt.minutes}
                  onClick={() => navigate("/plan-select")}
                  className="px-4 py-2 rounded-xl text-sm font-bold border-2 border-border bg-secondary opacity-40 cursor-not-allowed flex items-center gap-1"
                >
                  <Lock className="w-3 h-3" /> {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* 料金設定（15分あたり） */}
          <div className="space-y-2">
            <label className="text-sm font-bold flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-yellow-400" /> 料金（15分あたり）
              {!features.canSetPrice && (
                <span className="flex items-center gap-1 text-xs text-orange-400">
                  <Lock className="w-3 h-3" /> 固定150円
                </span>
              )}
            </label>
            {features.canSetPrice ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {PRICE_PRESETS_PER_15MIN.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPricePerUnit(p)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                        pricePerUnit === p
                          ? "bg-yellow-500/20 text-yellow-400 border-yellow-500"
                          : "bg-secondary border-border hover:border-yellow-500/40"
                      }`}
                    >
                      ¥{p.toLocaleString()}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">カスタム：</span>
                  <input
                    type="number"
                    value={pricePerUnit}
                    min={150}
                    onChange={(e) => setPricePerUnit(Math.max(150, Number(e.target.value)))}
                    className="w-28 rounded-lg bg-secondary border-0 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  />
                  <span className="text-xs text-muted-foreground">円/15分</span>
                </div>
              </>
            ) : (
              <div className="bg-secondary rounded-xl px-4 py-3 text-sm font-bold text-yellow-400">
                ¥150 / 15分（固定）
              </div>
            )}
          </div>
        </div>

        {/* 録画オプション */}
        <div className="space-y-2">
          <label className="text-sm font-bold flex items-center gap-1.5">
            🎥 録画オプション
          </label>
          {features.recordingAllowed ? (
            <div className="flex gap-3">
              {[{ val: false, label: "録画なし" }, { val: true, label: "録画あり（別途料金）" }].map(({ val, label }) => (
                <button
                  key={String(val)}
                  onClick={() => setRecordingEnabled(val)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                    recordingEnabled === val
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-secondary border-border hover:border-primary/40"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : (
            <div
              onClick={() => navigate("/plan-select")}
              className="flex items-center gap-3 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 cursor-pointer hover:bg-orange-500/20 transition-all"
            >
              <Lock className="w-4 h-4 text-orange-400 shrink-0" />
              <div>
                <p className="text-sm font-bold text-orange-400">録画にはVODプランへの加入が必要です</p>
                <p className="text-xs text-orange-300/70">タップしてプランを確認する →</p>
              </div>
            </div>
          )}
        </div>

        {/* 料金サマリー */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">料金プレビュー</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-primary">¥{totalPrice.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground">/ {maxDuration}分（最大）</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {DURATION_OPTIONS.filter((d) => d.minutes <= maxDuration).map((d) => (
              <span key={d.minutes}>{d.label} → ¥{Math.round((pricePerUnit / 15) * d.minutes).toLocaleString()}</span>
            ))}
          </div>
          <div className="flex items-start gap-2 bg-secondary rounded-xl p-3 text-xs text-muted-foreground mt-2">
            <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            <span>料金は通話終了後に自動精算されます。ライバーへの還元率はプランにより85%〜です。</span>
          </div>
        </div>

        {/* カメラ確認 */}
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-card gap-3 flex-wrap">
            <p className="text-sm font-bold">カメラ確認（任意）</p>
            <div className="flex items-center gap-2 flex-wrap">
              {/* デバイス選択 */}
              {videoDevices.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraSwitch(e.target.value)}
                  className="text-xs rounded-lg bg-secondary border-0 px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/50 max-w-[180px]"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `カメラ ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={toggleCam}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  showCam
                    ? "bg-red-500/20 border-red-500/60 text-red-300"
                    : "bg-secondary border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {showCam ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                {showCam ? "カメラOFF" : "カメラ確認"}
              </button>
            </div>
          </div>
          {showCam && (
            <div className="aspect-video bg-black">
              <video ref={camRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            </div>
          )}
        </div>

        {/* 開始ボタン */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleStartWaiting}
          disabled={!title.trim()}
          className="w-full py-5 rounded-2xl font-black text-lg text-black flex items-center justify-center gap-3 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{
            background: title.trim() ? "linear-gradient(135deg, #00ff9d, #00d4aa)" : undefined,
            backgroundColor: title.trim() ? undefined : "hsl(var(--secondary))",
            boxShadow: title.trim() ? "0 0 40px rgba(0,255,157,0.5)" : "none",
          }}
        >
          <Play className="w-6 h-6" />
          通話受付を開始する
        </motion.button>
      </div>
    );
  }

  // ===== 待機中画面 =====
  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
      {/* 管理パネル */}
      <CallWaitingManager user={user} channel={null} onStatusChange={(on) => { if (!on) handleStopWaiting(); }} />

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <PhoneCall className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-black">{title}</h1>
            <p className="text-xs text-muted-foreground">
              ¥{pricePerUnit}/15分 · 最大{maxDuration}分 · 合計最大¥{totalPrice.toLocaleString()}
            </p>
          </div>
          <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" /> 受付中
          </span>
        </div>
        <Button
          onClick={handleStopWaiting}
          variant="outline"
          size="sm"
          className="gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
        >
          <PhoneOff className="w-4 h-4" /> 受付終了
        </Button>
      </div>

      {description && (
        <div className="bg-secondary rounded-xl px-4 py-3 text-sm text-muted-foreground">
          {description}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 待機中表示 */}
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
            {showCam ? (
              <video ref={camRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-card">
                <PhoneCall className="w-16 h-16 text-primary/30" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-3 pointer-events-none">
              <div className="flex items-center gap-2 bg-black/70 rounded-full px-4 py-2 border border-primary/40">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse inline-block" />
                <span className="text-white font-bold text-sm">着信待機中...</span>
              </div>
              <p className="text-white/50 text-xs">リクエストが届くと着信します</p>
            </div>
            <div className="absolute bottom-3 right-3 pointer-events-auto flex items-center gap-2">
              {showCam && videoDevices.length > 1 && (
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleCameraSwitch(e.target.value)}
                  className="text-xs rounded-lg bg-black/70 border border-white/20 text-white px-2 py-1 focus:outline-none max-w-[150px]"
                >
                  {videoDevices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId} className="bg-black">
                      {d.label || `カメラ ${i + 1}`}
                    </option>
                  ))}
                </select>
              )}
              <button
                onClick={toggleCam}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  showCam ? "bg-red-500/20 border-red-500/60 text-red-300" : "bg-black/60 border-white/20 text-white/70"
                }`}
              >
                {showCam ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                {showCam ? "カメラOFF" : "カメラ確認"}
              </button>
            </div>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-3 text-xs space-y-1 text-muted-foreground">
            <p className="font-bold text-foreground text-sm">通話設定</p>
            <p>⏱ 最大通話時間：{maxDuration}分</p>
            <p>💰 料金：¥{pricePerUnit}/15分（最大¥{totalPrice.toLocaleString()}）</p>
            {description && <p>📝 {description}</p>}
          </div>
        </div>

        {/* 受信チャット */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "500px" }}>
          {!selectedThread ? (
            <>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 shrink-0">
                <MessageCircle className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">受信メッセージ</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black bg-red-500 text-white px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              {threads.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                  <div className="text-center">
                    <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>まだメッセージがありません</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto divide-y divide-border/30">
                  {threads.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => setSelectedThread({ fromEmail: msg.from_email, fromName: msg.from_name })}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-secondary/50 text-left ${!msg.is_read ? "bg-primary/5" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 text-xs font-bold">
                        {(msg.from_name || msg.from_email || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold truncate">{msg.from_name || msg.from_email}</p>
                          <span className="text-[10px] text-muted-foreground shrink-0">{formatTime(msg.created_date)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{msg.content}</p>
                      </div>
                      {!msg.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1" />}
                    </button>
                  ))}
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
                <InlineChatPanel user={user} fromEmail={selectedThread.fromEmail} fromName={selectedThread.fromName} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* 着信モーダル */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
              className="bg-card border-2 border-primary rounded-3xl p-10 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl"
              style={{ boxShadow: "0 0 80px rgba(0,255,157,0.4)" }}
            >
              <div className="relative mx-auto w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-24 h-24 rounded-full bg-primary/30 flex items-center justify-center border-2 border-primary">
                  <PhoneCall className="w-11 h-11 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-bold text-primary uppercase tracking-widest">着信！</p>
                <p className="text-2xl font-black text-white">{incomingCall.caller_name || incomingCall.caller_email}</p>
                <p className="text-base text-white/60">さんがビデオ通話を希望しています</p>
                {incomingCall.message && (
                  <p className="text-sm text-white/50 bg-secondary rounded-xl px-4 py-2 text-left">
                    {incomingCall.message}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <Button onClick={handleDecline} variant="outline" className="flex-1 h-14 gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
                  <XCircle className="w-5 h-5" /> 断る
                </Button>
                <Button
                  onClick={handleAccept}
                  disabled={accepting}
                  className="flex-1 h-14 font-black gap-2 bg-primary hover:bg-primary/90 text-black"
                  style={{ boxShadow: "0 0 30px rgba(0,255,157,0.5)" }}
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {accepting ? "接続中..." : "承認する"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}