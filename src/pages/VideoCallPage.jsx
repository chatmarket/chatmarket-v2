import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Phone, PhoneOff, Coins, Shield, Flag, Mic, MicOff, Camera, CameraOff,
  AlertTriangle, Smile, Settings, Image, Sparkles, X, Clock, CreditCard, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ---- Constants ----
const YELL_AMOUNTS = [
  { value: 200, color: "green", label: "¥200" },
  { value: 500, color: "green", label: "¥500" },
  { value: 1000, color: "yellow", label: "¥1,000" },
  { value: 3000, color: "orange", label: "¥3,000" },
  { value: 5000, color: "orange", label: "¥5,000" },
  { value: 10000, color: "red", label: "¥10,000" },
];

const colorStyles = {
  green: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  yellow: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
  orange: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  red: "bg-red-500/20 border-red-500/50 text-red-400",
};

const EMOJIS = ["😊","😂","🥺","❤️","🔥","👏","💪","🎉","😎","🙏","👍","✨","😍","🤩","💯","🫶","😆","🥳","😘","💫"];

const THROW_MARKS = [
  { emoji: "🌹", label: "バラ" },
  { emoji: "⭐", label: "スター" },
  { emoji: "🎁", label: "プレゼント" },
  { emoji: "🪄", label: "魔法" },
  { emoji: "🦋", label: "蝶々" },
  { emoji: "💎", label: "ダイヤ" },
  { emoji: "🍀", label: "四葉" },
  { emoji: "🎵", label: "音符" },
];

const FILTERS = [
  { id: "none", label: "なし", style: "" },
  { id: "beauty", label: "美肌", style: "brightness(1.1) contrast(0.9) saturate(1.1)" },
  { id: "vivid", label: "ビビッド", style: "saturate(1.5) contrast(1.1)" },
  { id: "cool", label: "クール", style: "hue-rotate(30deg) saturate(0.9)" },
  { id: "warm", label: "温かみ", style: "sepia(0.3) saturate(1.2)" },
  { id: "mono", label: "モノクロ", style: "grayscale(1)" },
  { id: "blur-bg", label: "ぼかし", style: "blur(0px)" }, // simulated
];

const BACKGROUNDS = [
  { id: "none", label: "なし", preview: null },
  { id: "blur", label: "ぼかし", preview: "blur" },
  { id: "office", label: "オフィス", preview: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80" },
  { id: "cafe", label: "カフェ", preview: "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80" },
  { id: "nature", label: "自然", preview: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80" },
  { id: "studio", label: "スタジオ", preview: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=400&q=80" },
];

const AUDIO_QUALITY = [
  { id: "low", label: "低品質（省データ）" },
  { id: "medium", label: "標準" },
  { id: "high", label: "高品質" },
];

const VIDEO_QUALITY = [
  { id: "360p", label: "360p（省データ）" },
  { id: "480p", label: "480p（標準）" },
  { id: "720p", label: "720p（HD）" },
  { id: "1080p", label: "1080p（フルHD）" },
];

// ---- Floating emoji animation component ----
function FloatingItem({ item, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="pointer-events-none fixed text-4xl z-50 select-none"
      initial={{ opacity: 1, y: 0, x: Math.random() * 80 + 20 + "%" }}
      animate={{ opacity: 0, y: -200 }}
      transition={{ duration: 2, ease: "easeOut" }}
      style={{ bottom: "200px" }}
    >
      {item}
    </motion.div>
  );
}

// ---- Helper: available durations ----
function getAvailableDurations(channel) {
  const options = [];
  [15,30,45,60,75,90,105,120].forEach((min) => {
    const price = channel?.[`call_price_${min}min`] || 0;
    if (price > 0) options.push({ minutes: min, price });
  });
  if (options.length === 0) {
    if ((channel?.call_price_30min || 0) > 0) options.push({ minutes: 30, price: channel.call_price_30min });
    if ((channel?.call_price_60min || 0) > 0) options.push({ minutes: 60, price: channel.call_price_60min });
  }
  return options;
}

// ---- Main Component ----
export default function VideoCallPage() {
  const { callId } = useParams();
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const canvasRef = useRef(null);

  const [user, setUser] = useState(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);

  // Panels
  const [activePanel, setActivePanel] = useState(null);

  // Filters & BG
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [selectedBg, setSelectedBg] = useState("none");

  // Quality
  const [audioQuality, setAudioQuality] = useState("medium");
  const [videoQuality, setVideoQuality] = useState("720p");

  // Floating items
  const [floatingItems, setFloatingItems] = useState([]);

  // Modals
  const [showYellModal, setShowYellModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedYell, setSelectedYell] = useState(null);
  const [yellSending, setYellSending] = useState(false);
  const [reportReason, setReportReason] = useState("");

  // ---- Countdown & Extension ----
  const [callStartTime, setCallStartTime] = useState(null);
  const [remainingSeconds, setRemainingSeconds] = useState(null);
  const [showExtendBanner, setShowExtendBanner] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState(null);
  const [extendPrice, setExtendPrice] = useState(0);
  const [extendPaid, setExtendPaid] = useState(false);
  const [extendPaying, setExtendPaying] = useState(false);
  const [extendDurations, setExtendDurations] = useState([]);
  const countdownAlertedRef = useRef(false);
  const extendBannerShownRef = useRef(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: call } = useQuery({
    queryKey: ["videocall", callId],
    queryFn: async () => {
      const calls = await base44.entities.VideoCall.filter({ id: callId });
      return calls[0];
    },
    refetchInterval: 3000,
  });

  // calleeのchannelを取得（延長料金設定用）
  const { data: calleeChannel } = useQuery({
    queryKey: ["callee-channel", call?.callee_email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: call.callee_email }).then((r) => r[0]),
    enabled: !!call?.callee_email,
  });

  // 通話開始時刻をセット
  useEffect(() => {
    if (call?.status === "active" && !callStartTime) {
      setCallStartTime(Date.now());
    }
  }, [call?.status]);

  // 延長用の選択肢セット
  useEffect(() => {
    if (calleeChannel) {
      const durations = getAvailableDurations(calleeChannel);
      setExtendDurations(durations);
      if (durations.length > 0 && !extendMinutes) {
        setExtendMinutes(durations[0].minutes);
        setExtendPrice(durations[0].price);
      }
    }
  }, [calleeChannel]);

  // カウントダウンタイマー
  useEffect(() => {
    if (!callStartTime || !call?.duration_minutes) return;
    const totalMs = call.duration_minutes * 60 * 1000;

    const timer = setInterval(() => {
      const elapsed = Date.now() - callStartTime;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setRemainingSeconds(remaining);

      // 30秒前にバナー表示
      if (remaining <= 30 && !extendBannerShownRef.current) {
        extendBannerShownRef.current = true;
        setShowExtendBanner(true);
      }

      // 時間切れ
      if (remaining === 0 && !extendPaid) {
        clearInterval(timer);
        handleEndCall();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime, call?.duration_minutes, extendPaid]);

  // Start camera
  useEffect(() => {
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true }).then((stream) => {
      setLocalStream(stream);
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    }).catch(() => {});
    return () => {};
  }, []);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, localStream]);

  const handleEndCall = async () => {
    if (call) await base44.entities.VideoCall.update(call.id, { status: "ended" });
    localStream?.getTracks().forEach((t) => t.stop());
    navigate(-1);
  };

  const handleSendYell = async () => {
    if (!selectedYell || !call) return;
    setYellSending(true);
    await base44.entities.VideoCall.update(call.id, {
      yell_coin_amount: (call.yell_coin_amount || 0) + selectedYell,
    });
    await base44.entities.SuperChat.create({
      amount: selectedYell,
      message: "📹 ビデオ通話中のエールコイン",
      livestream_id: call.id,
      user_name: user?.full_name || "匿名",
      user_email: user?.email,
      color: YELL_AMOUNTS.find((a) => a.value === selectedYell)?.color || "green",
    });
    setYellSending(false);
    setShowYellModal(false);
    setSelectedYell(null);
    toast.success(`¥${selectedYell.toLocaleString()} のエールコインを送りました！`);
    addFloating("💰");
  };

  const handleBlock = async () => {
    if (!user || !call) return;
    const targetEmail = call.caller_email === user.email ? call.callee_email : call.caller_email;
    await base44.entities.BlockReport.create({ type: "block", from_email: user.email, target_email: targetEmail });
    setShowBlockModal(false);
    toast.success("ブロックしました");
    handleEndCall();
  };

  const handleReport = async () => {
    if (!user || !call || !reportReason) return;
    const targetEmail = call.caller_email === user.email ? call.callee_email : call.caller_email;
    await base44.entities.BlockReport.create({ type: "report", from_email: user.email, target_email: targetEmail, reason: reportReason });
    setShowReportModal(false);
    setReportReason("");
    toast.success("通報しました。確認いたします。");
  };

  // 延長決済
  const handleExtendPayment = async () => {
    if (!extendMinutes || !call) return;
    setExtendPaying(true);
    // 延長分のVideoCallレコードを更新（duration_minutesを追加）
    await base44.entities.VideoCall.update(call.id, {
      duration_minutes: (call.duration_minutes || 0) + extendMinutes,
      price: (call.price || 0) + extendPrice,
    });
    setExtendPaid(true);
    setExtendPaying(false);
    setShowExtendModal(false);
    setShowExtendBanner(false);
    extendBannerShownRef.current = false;
    // 延長分のカウントダウンをリセット
    setCallStartTime(Date.now() - (call.duration_minutes * 60 * 1000 - 30 * 1000));
    setTimeout(() => setExtendPaid(false), 1000);
    toast.success(`${extendMinutes}分延長しました！`);
  };

  const addFloating = useCallback((emoji) => {
    const id = Date.now() + Math.random();
    setFloatingItems((prev) => [...prev, { id, emoji }]);
  }, []);

  const removeFloating = useCallback((id) => {
    setFloatingItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const togglePanel = (name) => setActivePanel(activePanel === name ? null : name);

  const currentFilter = FILTERS.find((f) => f.id === selectedFilter);

  const otherName = call
    ? user?.email === call.caller_email ? call.callee_name : call.caller_name
    : "相手";

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Floating items */}
      {floatingItems.map((f) => (
        <FloatingItem key={f.id} item={f.emoji} onDone={() => removeFloating(f.id)} />
      ))}

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{otherName?.[0] || "?"}</span>
          </div>
          <div>
            <p className="text-white font-bold text-sm">{otherName} との通話</p>
            {call?.status === "active" && (
              <p className="text-xs text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                通話中
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => setShowReportModal(true)} className="text-white/60 hover:text-red-400 gap-1 text-xs h-8">
            <Flag className="w-3.5 h-3.5" /> 通報
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowBlockModal(true)} className="text-white/60 hover:text-orange-400 gap-1 text-xs h-8">
            <Shield className="w-3.5 h-3.5" /> ブロック
          </Button>
        </div>
      </div>

      {/* Main video area */}
      <div className="flex-1 relative">
        {/* Remote video (full screen) */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
          {selectedBg !== "none" && selectedBg !== "blur" && (
            <img
              src={BACKGROUNDS.find((b) => b.id === selectedBg)?.preview}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
              alt=""
            />
          )}
          <div className="flex flex-col items-center gap-3 relative z-10">
            <div className="w-24 h-24 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
              <span className="text-4xl font-black text-primary">{otherName?.[0] || "?"}</span>
            </div>
            <p className="text-white/80 font-semibold">{otherName}</p>
            <p className="text-white/40 text-xs animate-pulse">接続中...</p>
          </div>
        </div>

        {/* Local video (PiP) */}
        <div className="absolute bottom-4 right-4 w-32 h-44 md:w-40 md:h-56 rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black z-10">
          <video
            ref={localVideoRef}
            autoPlay muted playsInline
            className="w-full h-full object-cover"
            style={{ filter: currentFilter?.style || "" }}
          />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-secondary/90">
              <CameraOff className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          {selectedBg === "blur" && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-lg" />
          )}
          <div className="absolute bottom-1 left-1 right-1 text-center">
            <span className="text-[10px] text-white/70 bg-black/50 px-2 py-0.5 rounded-full">あなた</span>
          </div>
        </div>

        {/* Yell coin badge */}
        {call?.yell_coin_amount > 0 && (
          <div className="absolute top-4 left-4 z-10 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-3 py-1 flex items-center gap-1.5 text-yellow-400 text-xs font-bold backdrop-blur">
            <Coins className="w-3.5 h-3.5" />
            ¥{call.yell_coin_amount?.toLocaleString()} エール済み
          </div>
        )}

        {/* ---- Countdown (30秒前から表示) ---- */}
        <AnimatePresence>
          {remainingSeconds !== null && remainingSeconds <= 30 && remainingSeconds > 0 && (
            <motion.div
              key="countdown"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            >
              <div className={`text-center ${remainingSeconds <= 10 ? "text-red-400" : "text-yellow-300"}`}>
                <p className="font-black leading-none drop-shadow-2xl"
                  style={{ fontSize: "120px", textShadow: "0 0 40px rgba(0,0,0,0.8)" }}>
                  {remainingSeconds}
                </p>
                <p className="text-lg font-bold opacity-80 -mt-4 drop-shadow-lg">
                  {remainingSeconds <= 10 ? "⚠️ まもなく終了" : "秒"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Extension Banner (30秒前から) ---- */}
        <AnimatePresence>
          {showExtendBanner && !showExtendModal && (
            <motion.div
              key="extend-banner"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-4 right-4 z-40"
            >
              <div className="bg-black/90 backdrop-blur-xl border border-primary/40 rounded-2xl p-4 flex items-center gap-3 shadow-2xl">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm">この通話を延長しますか？</p>
                  <p className="text-white/50 text-xs">あと {remainingSeconds}秒 で終了します</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setShowExtendBanner(false)}
                    className="text-xs text-white/40 hover:text-white/70 px-2 py-1"
                  >
                    終了
                  </button>
                  <button
                    onClick={() => setShowExtendModal(true)}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    延長する
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active panel overlay */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-20 left-0 right-0 mx-4 z-20"
            >
              <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-white font-bold text-sm">
                    {activePanel === "emoji" && "😊 絵文字を送る"}
                    {activePanel === "throw" && "🎁 投げマーク"}
                    {activePanel === "filter" && "✨ 加工フィルター"}
                    {activePanel === "bg" && "🖼️ 背景"}
                    {activePanel === "settings" && "⚙️ 音声・画質設定"}
                  </p>
                  <button onClick={() => setActivePanel(null)}>
                    <X className="w-4 h-4 text-white/60" />
                  </button>
                </div>

                {activePanel === "emoji" && (
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => { addFloating(emoji); }}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}

                {activePanel === "throw" && (
                  <div className="grid grid-cols-4 gap-2">
                    {THROW_MARKS.map((mark) => (
                      <button
                        key={mark.emoji}
                        onClick={() => { addFloating(mark.emoji); toast.success(`${mark.label}を投げました！`); }}
                        className="flex flex-col items-center gap-1 bg-white/5 hover:bg-white/10 rounded-xl p-2 transition-all"
                      >
                        <span className="text-2xl">{mark.emoji}</span>
                        <span className="text-[10px] text-white/60">{mark.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activePanel === "filter" && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setSelectedFilter(f.id)}
                        className={`shrink-0 flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${selectedFilter === f.id ? "bg-primary/30 border border-primary" : "bg-white/5 hover:bg-white/10"}`}
                      >
                        <div
                          className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/30 to-secondary overflow-hidden"
                          style={{ filter: f.style }}
                        >
                          <div className="w-full h-full bg-gradient-to-br from-green-400/40 to-blue-400/40" />
                        </div>
                        <span className="text-[10px] text-white/70 whitespace-nowrap">{f.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activePanel === "bg" && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBg(bg.id)}
                        className={`shrink-0 flex flex-col items-center gap-1 rounded-xl p-2 transition-all ${selectedBg === bg.id ? "bg-primary/30 border border-primary" : "bg-white/5 hover:bg-white/10"}`}
                      >
                        <div className="w-14 h-10 rounded-lg overflow-hidden bg-gray-800">
                          {bg.preview === "blur" ? (
                            <div className="w-full h-full bg-blue-400/20 backdrop-blur-xl" />
                          ) : bg.preview ? (
                            <img src={bg.preview} alt={bg.label} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                              <X className="w-3 h-3 text-gray-500" />
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-white/70">{bg.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activePanel === "settings" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">🎙️ 音声品質</label>
                      <div className="flex flex-wrap gap-2">
                        {AUDIO_QUALITY.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => { setAudioQuality(q.id); toast.success(`音声品質を「${q.label}」に変更しました`); }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${audioQuality === q.id ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 text-white/70 border-white/10 hover:border-primary/40"}`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs text-white/60 mb-1 block">📹 映像品質</label>
                      <div className="flex flex-wrap gap-2">
                        {VIDEO_QUALITY.map((q) => (
                          <button
                            key={q.id}
                            onClick={() => { setVideoQuality(q.id); toast.success(`映像品質を「${q.label}」に変更しました`); }}
                            className={`text-xs px-3 py-1.5 rounded-full border transition-all ${videoQuality === q.id ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 text-white/70 border-white/10 hover:border-primary/40"}`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom controls */}
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-20">
        {/* Feature row */}
        <div className="flex items-center justify-center gap-2 mb-4">
          {[
            { key: "emoji", icon: Smile, label: "絵文字" },
            { key: "throw", icon: Sparkles, label: "投げ" },
            { key: "filter", icon: Camera, label: "フィルター" },
            { key: "bg", icon: Image, label: "背景" },
            { key: "settings", icon: Settings, label: "設定" },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => togglePanel(key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                activePanel === key ? "bg-primary/20 border border-primary/40" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              <Icon className={`w-5 h-5 ${activePanel === key ? "text-primary" : "text-white/70"}`} />
              <span className={`text-[10px] ${activePanel === key ? "text-primary" : "text-white/50"}`}>{label}</span>
            </button>
          ))}
        </div>

        {/* Main control row */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setMicOn(!micOn)}
            className={`w-13 h-13 w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"}`}
          >
            {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={() => setCamOn(!camOn)}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"}`}
          >
            {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
          </button>

          <button
            onClick={() => setShowYellModal(true)}
            className="flex items-center gap-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 h-12 px-5 rounded-full font-bold text-sm transition-all"
          >
            <Coins className="w-5 h-5" />
            エール
          </button>

          <button
            onClick={handleEndCall}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg shadow-red-500/30 transition-all"
          >
            <PhoneOff className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Quality indicator */}
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-[10px] text-white/30">🎙️ {AUDIO_QUALITY.find(q => q.id === audioQuality)?.label}</span>
          <span className="text-white/20">·</span>
          <span className="text-[10px] text-white/30">📹 {videoQuality}</span>
          {selectedFilter !== "none" && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] text-primary/60">✨ {FILTERS.find(f => f.id === selectedFilter)?.label}</span>
            </>
          )}
          {selectedBg !== "none" && (
            <>
              <span className="text-white/20">·</span>
              <span className="text-[10px] text-primary/60">🖼️ {BACKGROUNDS.find(b => b.id === selectedBg)?.label}</span>
            </>
          )}
        </div>
      </div>

      {/* ---- Extension Modal ---- */}
      <Dialog open={showExtendModal} onOpenChange={setShowExtendModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" /> 通話を延長する
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary rounded-xl p-3 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              決済完了後に延長分の通話が継続されます。決済が完了するまでお待ちください。
            </div>

            <div>
              <Label className="text-sm mb-2 block">延長時間を選択（15分刻み）</Label>
              {extendDurations.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {extendDurations.map(({ minutes, price }) => (
                    <button
                      key={minutes}
                      onClick={() => { setExtendMinutes(minutes); setExtendPrice(price); }}
                      className={`flex flex-col items-center gap-0.5 p-3 rounded-xl border-2 transition-all ${
                        extendMinutes === minutes
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary hover:border-primary/40"
                      }`}
                    >
                      <span className={`font-bold text-sm ${extendMinutes === minutes ? "text-primary" : ""}`}>{minutes}分</span>
                      <span className={`text-xs font-black ${extendMinutes === minutes ? "text-primary" : "text-muted-foreground"}`}>¥{price.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">配信者が料金設定していません</p>
              )}
            </div>

            {extendPrice > 0 && (
              <div className="bg-secondary rounded-lg p-3 text-sm space-y-1.5">
                <div className="flex justify-between text-muted-foreground">
                  <span>延長料金 ({extendMinutes}分)</span>
                  <span>¥{extendPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-border pt-1.5">
                  <span>お支払い合計</span>
                  <span className="text-primary">¥{extendPrice.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowExtendModal(false)}>
                キャンセル
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                onClick={handleExtendPayment}
                disabled={!extendMinutes || extendPaying || extendDurations.length === 0}
              >
                {extendPaying ? (
                  <>決済中...</>
                ) : (
                  <><CreditCard className="w-4 h-4" /> ¥{extendPrice.toLocaleString()} 決済して延長</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Extend paid success overlay */}
      <AnimatePresence>
        {extendPaid && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-none"
          >
            <div className="bg-card border border-primary/40 rounded-2xl p-8 flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-primary" />
              <p className="text-white font-bold text-lg">延長決済完了！</p>
              <p className="text-muted-foreground text-sm">{extendMinutes}分延長されました</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Yell Modal */}
      <Dialog open={showYellModal} onOpenChange={setShowYellModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-yellow-400" /> エールコインを送る
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {YELL_AMOUNTS.map((amt) => (
                <button
                  key={amt.value}
                  onClick={() => setSelectedYell(amt.value)}
                  className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${selectedYell === amt.value ? colorStyles[amt.color] : "border-border bg-secondary hover:border-primary/30"}`}
                >
                  {amt.label}
                </button>
              ))}
            </div>
            <Button onClick={handleSendYell} disabled={!selectedYell || yellSending} className="w-full bg-yellow-500/80 hover:bg-yellow-500 text-black font-bold">
              {yellSending ? "送信中..." : `¥${selectedYell?.toLocaleString() || 0} を送る`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Block Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <Shield className="w-5 h-5" /> ブロックしますか？
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">このユーザーをブロックすると、相手からのコンタクトを受け取れなくなります。通話も終了します。</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowBlockModal(false)}>キャンセル</Button>
            <Button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" onClick={handleBlock}>ブロック</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Modal */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" /> 通報する
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={reportReason} onValueChange={setReportReason}>
              <SelectTrigger className="bg-secondary border-0">
                <SelectValue placeholder="通報理由を選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="スパム・迷惑行為">スパム・迷惑行為</SelectItem>
                <SelectItem value="不適切なコンテンツ">不適切なコンテンツ</SelectItem>
                <SelectItem value="ハラスメント">ハラスメント</SelectItem>
                <SelectItem value="詐欺・偽り">詐欺・偽り</SelectItem>
                <SelectItem value="その他">その他</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowReportModal(false)}>キャンセル</Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white" onClick={handleReport} disabled={!reportReason}>通報する</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}