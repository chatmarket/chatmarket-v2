import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSmartCameraSelection } from "@/hooks/useSmartCameraSelection";
import { useIvsStagesCall } from "@/hooks/useIvsStagesCall";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Phone, PhoneOff, PhoneCall, Coins, Shield, Flag, Mic, MicOff, Camera, CameraOff,
  AlertTriangle, Settings, X, Clock, CreditCard, CheckCircle2, MessageCircle, Maximize, Minimize, Send
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import MessageModal from "../components/chat/MessageModal";
import CallChatPanel from "../components/call/CallChatPanel";
import AdaptiveBitrateManager from "../components/call/AdaptiveBitrateManager";
import WaitingScreenDisplay from "../components/call/WaitingScreenDisplay";
import ExtensionRequestModal from "../components/call/ExtensionRequestModal";
import ExtensionAcceptanceModal from "../components/call/ExtensionAcceptanceModal";
import ExtensionConfirmationModal from "../components/call/ExtensionConfirmationModal";
import ReconnectionNotification from "../components/call/ReconnectionNotification";
import IncomingCallScreen from "../components/call/IncomingCallScreen";
import OutgoingCallScreen from "../components/call/OutgoingCallScreen";
import MobileVideoCallUI from "../components/call/MobileVideoCallUI";

// ---- プラン別定数（バックエンドと同期） ----
const PLAN_MATRIX = {
  free:         { min_coins: 200, creator_rate: 0.70, platform_rate: 0.30 },
  basic:        { min_coins: 150, creator_rate: 0.85, platform_rate: 0.15 },
  "call-anser": { min_coins: 150, creator_rate: 0.85, platform_rate: 0.15 },
};
const PLAN_DEFAULT_DURATION = {
  free:         15,
  basic:        15,
  "call-anser": 15,
};
const MILLIONAIRE_CHALLENGE_START = new Date("2026-04-01");
const MILLIONAIRE_CHALLENGE_END = new Date("2026-06-30");

function getPlanMatrix(plan) { return PLAN_MATRIX[plan] || PLAN_MATRIX.free; }
function getUserPlan(user) {
  if (!user) return "free";
  if (user.plan === "call-anser") return "call-anser";
  if (user.plan === "basic") return "basic";
  if (user.role === "admin") return "basic";
  return "free";
}

function isMillionaireChallengePeriod() {
  const now = new Date();
  return now >= MILLIONAIRE_CHALLENGE_START && now <= MILLIONAIRE_CHALLENGE_END;
}

function getEffectiveDuration(channel, user) {
  // 1. ミリオネア・チャレンジ期間中は全員15分ロック
  if (isMillionaireChallengePeriod()) {
    return 15;
  }
  
  // 2. ライバー個別設定があれば使用
  if (channel?.default_call_duration_minutes && channel.default_call_duration_minutes > 0) {
    return channel.default_call_duration_minutes;
  }
  
  // 3. プラン別デフォルト値を使用
  const plan = getUserPlan(user);
  return PLAN_DEFAULT_DURATION[plan] || 15;
}

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
function FloatingItem({ item, onDone, type = "emoji" }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="pointer-events-none fixed z-50 select-none left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 1, y: 0, scale: 0.8 }}
      animate={{ opacity: 0, y: -150, scale: 1.2 }}
      transition={{ duration: 2, ease: "easeOut" }}
    >
      {type === "coin" ? (
        <div className="text-5xl font-black text-yellow-400 drop-shadow-2xl animate-bounce" style={{ textShadow: "0 0 20px rgba(255,215,0,1)" }}>
          💰 {item}
        </div>
      ) : (
        <div className="text-6xl animate-bounce">{item}</div>
      )}
    </motion.div>
  );
}

// ---- Helper: available durations ----
function getAvailableDurations(channel) {
  const options = [];
  [10, 20, 30, 40, 50, 60].forEach((min) => {
    const price = channel?.[`call_price_${min}min`] || 0;
    if (price > 0) options.push({ minutes: min, price });
  });
  // 旧形式後方互換
  [15, 45, 75, 90, 105, 120].forEach((min) => {
    const price = channel?.[`call_price_${min}min`] || 0;
    if (price > 0) options.push({ minutes: min, price });
  });
  options.sort((a, b) => a.minutes - b.minutes);
  return options;
}

// ---- Main Component ----
export default function VideoCallPage() {
   const { callId } = useParams();
   const navigate = useNavigate();
   const localVideoRef = useRef(null);
   const remoteVideoRef = useRef(null);

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
  const [abrEnabled, setAbrEnabled] = useState(true); // ABR（アダプティブビットレート）有効フラグ

  // Floating items
  const [floatingItems, setFloatingItems] = useState([]);

  // Standby state
  const [isWaiting, setIsWaiting] = useState(false);

  // カウントダウン（accepted → active）
  const [countdown, setCountdown] = useState(null); // 3,2,1 or null
  const countdownStartedRef = useRef(false);

  // Message modal
  const [showMessageModal, setShowMessageModal] = useState(false);

  // 延長システム
  const [showExtensionRequest, setShowExtensionRequest] = useState(false);
  const [showExtensionAcceptance, setShowExtensionAcceptance] = useState(false);
  const [showExtensionConfirmation, setShowExtensionConfirmation] = useState(false);
  const [showReconnectionNotification, setShowReconnectionNotification] = useState(false);

  // フルスクリーン
  const videoContainerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    const el = videoContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // 音声レベルインジケーター
  const [audioLevel, setAudioLevel] = useState(0);
  const audioAnalyserRef = useRef(null);
  const audioAnimFrameRef = useRef(null);

  useEffect(() => {
    if (!localStream || !micOn) {
      setAudioLevel(0);
      if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
      if (audioAnalyserRef.current) { audioAnalyserRef.current.context?.close(); audioAnalyserRef.current = null; }
      return;
    }
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(localStream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    audioAnalyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);
    const tick = () => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((s, v) => s + v, 0) / data.length;
      setAudioLevel(Math.min(100, Math.round(avg * 2.5)));
      audioAnimFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(audioAnimFrameRef.current);
      ctx.close();
    };
  }, [localStream, micOn]);

  // 録画
  const [isRecording, setIsRecording] = useState(false);
  const [recordingPipelineId, setRecordingPipelineId] = useState(null);
  const [recordingStartTime, setRecordingStartTime] = useState(null);

  // NG Word Detection
  const recognitionRef = useRef(null);
  const [ngDetected, setNgDetected] = useState(null);
  const [isListening, setIsListening] = useState(false);

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

  // ---- コインベース課金 ----
  const [coinBalance, setCoinBalance] = useState(null);
  const [coinsConsumed, setCoinsConsumed] = useState(0);
  const [nextBillingAt, setNextBillingAt] = useState(null);
  const [secondsUntilBilling, setSecondsUntilBilling] = useState(null);
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [currentUnit, setCurrentUnit] = useState(0); // 課金ユニット番号
  const [showChargeAlert, setShowChargeAlert] = useState(false); // 12分警告
  const billingTickRef = useRef(null);
  const checkNextRef = useRef(null);
  const chargeAlertShownRef = useRef(false);
  const warned5minRef = useRef(false);
  const warned1minRef = useRef(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  // 着信イベント受信フラグ + 自動応答
  const [incomingCallDetected, setIncomingCallDetected] = useState(false);
  const autoAcceptTimeoutRef = useRef(null);

  const { data: call, refetch: refetchCall } = useQuery({
    queryKey: ["videocall", callId],
    queryFn: async () => {
      const calls = await base44.entities.VideoCall.filter({ id: callId });
      return calls[0];
    },
    refetchInterval: 3000,
    // ended でも refetch を止めない
    refetchIntervalInBackground: true,
  });

  // ★ pending 状態ではライバーに着信モーダルを表示。ended でも再接続可能にリセット
  useEffect(() => {
    if (!call || !user) return;

    // ended → pending に戻った場合（または新規着信）でも確実に検出
    if (call.status === 'pending' && call.callee_email === user.email) {
      if (!incomingCallDetected) {
        setIncomingCallDetected(true);
        console.log('[VideoCallPage] 🔔 INCOMING CALL DETECTED:', {
          callId: call.id,
          caller: call.caller_email,
          callee: call.callee_email,
        });
      }
    }

    // ended になったらリセット（次の着信に備える）
    if (call.status === 'ended') {
      setIncomingCallDetected(false);
      countdownStartedRef.current = false;
    }
  }, [call?.id, call?.status, user?.email, call?.callee_email, incomingCallDetected]);

  // ★ VideoCall リアルタイム購読（マウント時1回のみ登録、ended後も維持）
  useEffect(() => {
    if (!callId) return;
    console.log('[VideoCallPage] 📡 Subscribing to VideoCall events for:', callId);
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      // callId が一致すれば常に refetch（ended → pending の変化も拾う）
      if (event.id === callId || event.data?.id === callId) {
        console.log('[VideoCallPage] 📬 VideoCall event:', { type: event.type, status: event.data?.status });
        refetchCall();
      }
    });
    // アンマウント時のみ解除（status変化では解除しない）
    return () => unsub();
  }, [callId]); // callId のみ依存（refetchCall は安定参照）

  // ★ 延長リクエスト監視（視聴者側が申請を受け取る）
  useEffect(() => {
    if (!call || !user || call.extension_request_status !== 'pending' || user.email !== call.caller_email) return;
    
    // 視聴者（caller）が申請を受け取ったら、モーダルを表示
    if (!showExtensionAcceptance) {
      setShowExtensionAcceptance(true);
      console.log('[Extension] Caller received extension request:', {
        minutes: call.extension_request_minutes,
        coins: call.extension_request_coins,
      });
    }
  }, [call?.extension_request_status, call?.extension_request_minutes, user?.email]);

  // ★ 延長決済完了監視（ライバー側が確定を促される）
  useEffect(() => {
    if (!call || !user || call.extension_request_status !== 'accepted' || user.email !== call.callee_email) return;
    
    // ライバー（callee）が決済完了通知を受け取ったら、確定モーダルを表示
    if (!showExtensionConfirmation) {
      setShowExtensionConfirmation(true);
      toast.info("相手が決済を完了しました！延長を確定してください");
      console.log('[Extension] Streamer received acceptance notification');
    }
  }, [call?.extension_request_status, user?.email]);

  // calleeのchannelを取得（延長料金設定用）
  const { data: calleeChannel } = useQuery({
    queryKey: ["callee-channel", call?.callee_email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: call.callee_email }).then((r) => r[0]),
    enabled: !!call?.callee_email,
  });

  // 有効な通話時間を計算（優先順: ミリオネア期間 > ライバー設定 > プラン別デフォルト）
  const effectiveDuration = useMemo(
    () => getEffectiveDuration(calleeChannel, user),
    [calleeChannel, user]
  );

  // ★ Caller側: accepted を検知 → IVSトークン生成 → active に変更
  // ★ Callee側: active を待機 → リモート映像受信開始
  useEffect(() => {
    if (!call || !user) return;

    const callerId = call.caller_email;
    const calleeId = call.callee_email;
    const isCaller = user.email === callerId;
    const isCallee = user.email === calleeId;

    console.log('[VideoCallPage] 🔍 Call state check:', {
      call_id: call.id,
      status: call.status,
      user_email: user.email,
      is_caller: isCaller,
      is_callee: isCallee,
      countdown_started: countdownStartedRef.current
    });

    // Caller のみ: accepted → IVS Stages token 生成 → active に遷移
    if (isCaller && call.status === 'accepted' && !countdownStartedRef.current) {
      countdownStartedRef.current = true;
      console.log('[VideoCallPage] ⚡ CALLER: accepted detected, generating IVS tokens...');
      
      base44.functions.invoke('createIvsStagesSession', { call_id: call.id })
        .then((res) => {
          console.log('[VideoCallPage] ✅ IVS tokens generated:', res.data);
          return base44.entities.VideoCall.update(call.id, { status: 'active' });
        })
        .then(() => {
          console.log('[VideoCallPage] ✅ Call status updated to active, refetching...');
          return refetchCall();
        })
        .catch((err) => {
          console.error('[VideoCallPage] ❌ IVS token gen failed:', err.message);
          // フォールバック: トークン生成失敗でも active に進む
          console.log('[VideoCallPage] 🔄 Fallback: proceeding to active anyway');
          base44.entities.VideoCall.update(call.id, { status: 'active' })
            .then(() => refetchCall())
            .catch((e) => console.error('[VideoCallPage] ❌ Fallback update failed:', e));
        });
    }

    // Active になったら 3秒カウントダウン表示
    if (call.status === 'active' && countdown === null) {
      console.log('[VideoCallPage] 🎬 Active detected, starting countdown...');
      setCountdown(3);
      const t1 = setTimeout(() => setCountdown(2), 1000);
      const t2 = setTimeout(() => setCountdown(1), 2000);
      const t3 = setTimeout(() => setCountdown(null), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [call?.status, call?.id, user?.email, call?.caller_email, call?.callee_email]);

  // 通話開始時刻をセット
  // AUTO_ACCEPT 自動承諾ロジック
  useEffect(() => {
    if (!call || !calleeChannel || !user) return;
    
    // callee が AUTO_ACCEPT モードで、pending 状態の場合は自動承諾
    if (
      calleeChannel.incoming_call_mode === 'AUTO_ACCEPT' &&
      call.status === 'pending' &&
      user?.email === call.callee_email
    ) {
      base44.functions.invoke('autoAcceptCall', { call_id: call.id })
        .then(() => {
          // status 更新を確実にするため即座に refetch
          setTimeout(() => {
            refetchCall();
            base44.entities.VideoCall.filter({ id: call.id }).then((calls) => {
              if (calls[0]?.status === 'accepted') {
                // accepted 状態に更新されたら active に変更
                base44.entities.VideoCall.update(call.id, { status: 'active' }).then(() => {
                  // active に更新した後も refetch を再実行
                  setTimeout(() => refetchCall(), 300);
                });
              }
            });
          }, 200);
        })
        .catch(() => {});
    }
  }, [call?.status, calleeChannel?.incoming_call_mode, user?.email, call?.callee_email, refetchCall]);

  useEffect(() => {
    // タイマーは active 状態で開始
    if (call?.status === "active" && !callStartTime) {
      setCallStartTime(Date.now());
    }
    // 自動切断検出
    if (call?.auto_disconnected && call?.status === "ended") {
      setShowInsufficientModal(true);
    }
  }, [call?.status, call?.auto_disconnected]);

  // コイン残高取得
  useEffect(() => {
    if (!user) return;
    base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((wallets) => {
      setCoinBalance(wallets[0]?.balance || 0);
    });
  }, [user, coinsConsumed]);

  // 課金ティック + 15分MVP課金トリガー（通話中・発信者のみ）
  useEffect(() => {
    if (call?.status !== "active" || !user || call.caller_email !== user.email) return;

    // MVP版: 15分タイマーを別途管理
    const mvpBillingTimer = setTimeout(async () => {
      console.log('MVP: 15分経過 - 150コイン課金トリガー発火');
      try {
        // 発信者から150コイン減算
        const wallet = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
        if (wallet[0]) {
          await base44.entities.YellCoinWallet.update(wallet[0].id, {
            balance: Math.max(0, (wallet[0].balance || 0) - 150),
            total_sent: (wallet[0].total_sent || 0) + 150,
          });
          console.log(`MVP: Caller wallet updated: -150 coins`);
        }

        // ライバーに127コイン加算（ライバー85%相当）
        const calleeWallet = await base44.entities.YellCoinWallet.filter({ user_email: call.callee_email });
        if (calleeWallet[0]) {
          await base44.entities.YellCoinWallet.update(calleeWallet[0].id, {
            balance: (calleeWallet[0].balance || 0) + 127,
          });
          console.log(`MVP: Callee wallet updated: +127 coins`);
        }

        // 通話レコード更新（課金履歴）
        await base44.entities.VideoCall.update(call.id, {
          coins_consumed: 150,
          creator_revenue_coins: 127,
          platform_revenue_coins: 23,
          actual_duration_minutes: 15,
        });

        toast.success('15分経過: 150コイン課金完了（ライバーに127コイン分配）');
        setCoinBalance(prev => Math.max(0, (prev || 0) - 150));
      } catch (err) {
        console.error('MVP billing error:', err);
        toast.error('課金処理エラー');
      }
    }, 15 * 60 * 1000); // 15分後

    return () => {
      clearTimeout(mvpBillingTimer);
      clearInterval(billingTickRef.current);
      clearTimeout(checkNextRef.current);
    };
  }, [call?.status, call?.id, user?.email, call?.callee_email]);

  // 次回課金までの残り秒数カウントダウン + 12分時点の残高チェック
  useEffect(() => {
    if (!nextBillingAt || !call?.id || !user) return;
    chargeAlertShownRef.current = false;
    warned5minRef.current = false;
    warned1minRef.current = false;

    const timer = setInterval(async () => {
      const secs = Math.max(0, Math.ceil((nextBillingAt - Date.now()) / 1000));
      setSecondsUntilBilling(secs);

      // 12分経過 = 次課金3分前(180秒) → 残高チェック
      if (secs <= 180 && secs > 60 && !chargeAlertShownRef.current && call?.caller_email === user.email) {
        chargeAlertShownRef.current = true;
        const res = await base44.functions.invoke("videoCallBilling", { call_id: call.id, action: "check_next" });
        if (res.data && !res.data.has_enough) {
          setShowChargeAlert(true);
          toast.error(`⚠️ 残高不足！次の15分（500コイン）が不足しています。今すぐチャージしてください。`, { duration: 10000 });
        }
      }
      // 1分前警告
      if (secs <= 60 && !warned1minRef.current) {
        warned1minRef.current = true;
        toast.warning("⚡ 次の課金まで1分前！残高を確認してください", { duration: 8000 });
      }
      // リセット（次のインターバル用）
      if (secs === 0) {
        chargeAlertShownRef.current = false;
        warned1minRef.current = false;
        setShowChargeAlert(false);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [nextBillingAt, call?.id, user?.email]);

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

  // カウントダウンタイマー（有効な時間に基づいて動作）
  const warned3minRef = useRef(false);
  const warned1minBannerRef = useRef(false);

  useEffect(() => {
    if (!callStartTime || !effectiveDuration) return;
    const totalMs = effectiveDuration * 60 * 1000;
    warned3minRef.current = false;
    warned1minBannerRef.current = false;

    const timer = setInterval(() => {
      const elapsed = Date.now() - callStartTime;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setRemainingSeconds(remaining);

      // 3分前（180秒）に通知
      if (remaining === 180 && !warned3minRef.current && call?.id) {
        warned3minRef.current = true;
        toast.warning("⏰ あと3分で通話が終了します");
      }

      // 1分前（60秒）に通知
      if (remaining === 60 && !warned1minBannerRef.current && call?.id) {
        warned1minBannerRef.current = true;
        toast.error("⏰ あと1分で通話が終了します");
      }

      // 30秒前にバナー表示（延長提案）
      if (remaining <= 30 && !extendBannerShownRef.current) {
        extendBannerShownRef.current = true;
        setShowExtendBanner(true);
      }

      // 時間切れ ★ ロスタイムバッファをチェック
      if (remaining === 0 && !extendPaid) {
        // ロスタイムバッファが有効かチェック（決済完了待機中の時間猶予）
        if (call?.loss_time_buffer_until) {
          const bufferUntil = new Date(call.loss_time_buffer_until).getTime();
          if (Date.now() < bufferUntil) {
            // バッファ期間内：時間切れを遅延、待機続行
            console.log('[Extension] Loss-time buffer active, holding call...');
            return;
          }
        }
        
        // バッファなし or バッファ期限切れ → 通話終了
        clearInterval(timer);
        handleEndCall();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime, effectiveDuration, extendPaid, call?.id]);

  // スマートカメラ選択 hook からストリームを取得
  const { stream: smartStream, videoDevices, audioDevices, selectedCameraId, selectedMicId, switchCamera, switchMic } = useSmartCameraSelection();
  useEffect(() => {
    if (smartStream) {
      setLocalStream(smartStream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = smartStream;
        localVideoRef.current.play().catch((e) => {
          console.warn('[VideoCallPage] ⚠️ Local video play error:', e);
        });
      }
      // トラック確認ログ
      const vTracks = smartStream.getVideoTracks();
      const aTracks = smartStream.getAudioTracks();
      console.log('[VideoCallPage] 📹 Local stream tracks:', {
        video: vTracks.length,
        audio: aTracks.length,
        videoEnabled: vTracks[0]?.enabled,
        audioEnabled: aTracks[0]?.enabled,
      });
    }
  }, [smartStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, localStream]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));
  }, [micOn, localStream]);

  const handleStartWaiting = async () => {
    setIsWaiting(true);
    if (call) {
      await base44.entities.VideoCall.update(call.id, { status: "waiting" });
    }
    toast.success("待機状態になりました");
  };

  const handleEndWaiting = async () => {
    setIsWaiting(false);
    if (call) {
      await base44.entities.VideoCall.update(call.id, { status: "pending_payment" });
    }
  };

  // 録画開始
  const handleStartRecording = async () => {
    if (!call?.id) { toast.error("通話が開始されていません"); return; }
    try {
      const res = await base44.functions.invoke('startRecording', { callId: call.id });
      if (res?.data?.pipeline_id) {
        setRecordingPipelineId(res.data.pipeline_id);
        setIsRecording(true);
        setRecordingStartTime(Date.now());
        toast.success("🔴 録画を開始しました（S3保存中）");
      }
    } catch (e) {
      toast.error("録画開始に失敗しました: " + e.message);
    }
  };

  // 録画停止
  const handleStopRecording = async () => {
    if (!recordingPipelineId) return;
    const durationSec = recordingStartTime ? Math.floor((Date.now() - recordingStartTime) / 1000) : 0;
    try {
      await base44.functions.invoke('stopRecording', {
        callId: call.id,
        pipelineId: recordingPipelineId,
        durationSeconds: durationSec,
      });
      setIsRecording(false);
      setRecordingPipelineId(null);
      toast.success("⏹️ 録画を停止しました。S3に保存中…");
    } catch (e) {
      toast.error("録画停止エラー: " + e.message);
    }
  };

  const handleEndCall = async (skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("通話を終了しますか？")) return;
    clearInterval(billingTickRef.current);

    // 録画中なら自動停止
    if (isRecording && recordingPipelineId) {
      await handleStopRecording();
    }

    // 精算（active 状態のみ ended に変更）
    if (call && call.status === "active" && user && call.caller_email === user.email) {
      await base44.functions.invoke("videoCallBilling", { call_id: call.id, action: "end" });
    } else if (call && call.status === "active") {
      // callee側が終了した場合
      await base44.entities.VideoCall.update(call.id, { status: "ended" });
      
      // ★ ライバー（callee）側が終了する場合、再接続通知を表示
      if (call.extension_request_status === 'accepted') {
        // 延長待機中だった → 相手にメッセージ送信提案
        setShowReconnectionNotification(true);
        return; // ここではナビゲートしない
      }
    }
    // active 以外（accepted, pending など）では ended に変更しない
    localStream?.getTracks().forEach((t) => t.stop());
    toast.success("通話を終了しました");
    navigate(-1);
  };

  const handleSendYell = async () => {
    if (!selectedYell || !call || !user) return;
    setYellSending(true);

    // 視聴者のウォレットから減算
    const senderWallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
    const senderWallet = senderWallets[0];
    if (!senderWallet || senderWallet.balance < selectedYell) {
      toast.error("エールコインが不足しています。チャージしてください。");
      setYellSending(false);
      return;
    }
    await base44.entities.YellCoinWallet.update(senderWallet.id, {
      balance: senderWallet.balance - selectedYell,
      total_sent: (senderWallet.total_sent || 0) + selectedYell,
    });

    // ライバーのウォレットへ加算（85%相当）
    const creatorCoins = Math.floor(selectedYell * 0.85);
    const calleeWallets = await base44.entities.YellCoinWallet.filter({ user_email: call.callee_email });
    if (calleeWallets[0]) {
      await base44.entities.YellCoinWallet.update(calleeWallets[0].id, {
        balance: (calleeWallets[0].balance || 0) + creatorCoins,
      });
    }

    // 通話レコードにエールコイン合計を記録
    await base44.entities.VideoCall.update(call.id, {
      yell_coin_amount: (call.yell_coin_amount || 0) + selectedYell,
    });

    // トランザクション記録
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount: selectedYell,
      target_name: call.callee_name,
      target_id: call.id,
      service_type: "direct_chat",
      service_id: call.id,
      channel_id: call.callee_channel_id || "",
      channel_owner_email: call.callee_email,
    });

    setCoinBalance(prev => Math.max(0, (prev || 0) - selectedYell));
    setYellSending(false);
    setShowYellModal(false);
    setSelectedYell(null);
    toast.success(`${selectedYell.toLocaleString()} コインのエールを送りました！`);
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

  // ---- IVS Stages 接続ステータス ----
  const [ivsConnectStatus, setIvsConnectStatus] = useState(null); // null | 'reconnecting' | 'failed'

  // ---- IVS Stages 接続（1対1通話） ----
  useIvsStagesCall({
    call,
    localStream,
    remoteVideoRef,
    user,
    enabled: call?.status === 'active' && !!localStream && !!user,
    onReconnecting: (attempt) => setIvsConnectStatus('reconnecting'),
    onReconnected: () => setIvsConnectStatus(null),
    onReconnectFailed: () => setIvsConnectStatus('failed'),
  });

  const addFloating = useCallback((emoji, type = "emoji") => {
    const id = Date.now() + Math.random();
    setFloatingItems((prev) => [...prev, { id, emoji, type }]);
  }, []);

  const removeFloating = useCallback((id) => {
    setFloatingItems((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const togglePanel = (name) => setActivePanel(activePanel === name ? null : name);

  // Web Speech API NGワード検出
  useEffect(() => {
    const ngWords = calleeChannel?.ng_words || [];
    if (!micOn || !call || call.status !== "active" || ngWords.length === 0) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "ja-JP";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      // 自動再起動（通話中は常時検出）
      if (micOn && call?.status === "active") {
        try { recognition.start(); setIsListening(true); } catch (e) {}
      }
    };

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript.toLowerCase();
        const hit = ngWords.find((w) => w && transcript.includes(w.toLowerCase()));
        if (hit) {
          setNgDetected(hit);
          toast.error(`⚠️ NGワード検出: "${hit}"`, { duration: 4000 });
          setTimeout(() => setNgDetected(null), 4000);
        }
      }
    };

    recognitionRef.current = recognition;
    try { recognition.start(); } catch (e) {}

    return () => { recognition.stop(); };
  }, [micOn, call?.status, calleeChannel]);

  const currentFilter = FILTERS.find((f) => f.id === selectedFilter);

  const otherName = call
    ? user?.email === call.caller_email ? call.callee_name : call.caller_name
    : "相手";

  // 配信者判定: calleeがlistreamerの場合、userが配信者
  const isBroadcaster = user && call && user?.email === call?.callee_email;

  // チャット入力state（下部に集約）
  const [chatInput, setChatInput] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [showYellPanel, setShowYellPanel] = useState(false);
  const chatBottomRef = useRef(null);
  const [chatMessages, setChatMessages] = useState([]);

  const threadId = call && user ? [call.caller_email, call.callee_email].sort().join("__") : null;

  useEffect(() => {
    if (!threadId) return;
    base44.entities.DirectChat.filter({ thread_id: threadId })
      .then(msgs => setChatMessages(msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date))))
      .catch(() => {});
    const unsub = base44.entities.DirectChat.subscribe(ev => {
      if (ev.data?.thread_id === threadId && ev.type === "create") {
        setChatMessages(prev => [...prev, ev.data]);
      }
    });
    return () => unsub();
  }, [threadId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleChatSend = async () => {
    if (!chatInput.trim() || !call || !user || !threadId || chatSending) return;
    setChatSending(true);
    const toEmail = user.email === call.caller_email ? call.callee_email : call.caller_email;
    try {
      await base44.entities.DirectChat.create({
        from_email: user.email,
        from_name: user.full_name || user.email,
        to_channel_owner_email: toEmail,
        to_channel_id: call.callee_channel_id || "",
        to_channel_name: call.callee_name || "",
        content: chatInput.trim(),
        yell_coin: 0,
        thread_id: threadId,
      });
      setChatInput("");
    } catch {}
    setChatSending(false);
  };

  const isCaller = user && call && user.email === call.caller_email;

  return (
    <div className="bg-black flex flex-col" style={{ height: '100dvh', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* ABR Manager */}
      <AdaptiveBitrateManager
        enabled={abrEnabled && call?.status === "active"}
        currentQuality={videoQuality}
        onQualityChange={(newQuality) => { setVideoQuality(newQuality); setAbrEnabled(false); setTimeout(() => setAbrEnabled(true), 5000); }}
        measureInterval={3000}
      />

      {/* Floating items */}
      {floatingItems.map((f) => (
        <FloatingItem key={f.id} item={f.emoji} type={f.type} onDone={() => removeFloating(f.id)} />
      ))}

      {/* ════════════════════════════════════════
          VIDEO AREA — 画面上部60%
      ════════════════════════════════════════ */}
      <div ref={videoContainerRef} className="relative bg-black" style={{ height: '60dvh', minHeight: '280px', flexShrink: 0 }}>

        {/* === PENDING: 視聴者（caller）=== 自分の映像フルスクリーン + 通話申請ボタン */}
        {call?.status === 'pending' && isCaller && (
          <div className="absolute inset-0 bg-black">
            <video ref={localVideoRef} autoPlay muted playsInline webkit-playsinline="true"
              onLoadedMetadata={e => e.target.play().catch(() => {})}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            {!camOn && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/90">
                <CameraOff className="w-16 h-16 text-white/30" />
              </div>
            )}
            {/* 申請ボタンオーバーレイ */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-8 bg-gradient-to-t from-black/80 via-transparent to-transparent">
              <div className="text-center space-y-4 px-6 w-full max-w-sm">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                  <p className="text-white/70 text-sm font-bold">{call.callee_name} の承認を待っています...</p>
                </div>
                <motion.button
                  animate={{ boxShadow: ["0 0 20px rgba(0,255,157,0.4)", "0 0 40px rgba(0,255,157,0.8)", "0 0 20px rgba(0,255,157,0.4)"] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  onClick={() => { localStream?.getTracks().forEach(t => t.stop()); navigate(-1); }}
                  className="w-full py-3 rounded-2xl bg-red-600/80 border border-red-500 text-white font-bold flex items-center justify-center gap-2"
                >
                  <PhoneOff className="w-5 h-5" /> キャンセル
                </motion.button>
              </div>
            </div>
            {/* 📹 確認ラベル */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur rounded-full px-4 py-1.5 z-10">
              <span className="text-white/80 text-xs font-bold">📹 あなたの映り — {call.callee_name} さんに通話申請中</span>
            </div>
          </div>
        )}

        {/* === PENDING: ライバー（callee）=== 着信承認UI */}
        {call?.status === 'pending' && !isCaller && (
          <div className="absolute inset-0 bg-black">
            <video ref={localVideoRef} autoPlay muted playsInline webkit-playsinline="true"
              onLoadedMetadata={e => e.target.play().catch(() => {})}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(0.6)' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6">
              <div className="text-center space-y-2">
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                  <PhoneCall className="w-16 h-16 text-primary mx-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,157,0.8))' }} />
                </motion.div>
                <p className="text-white font-black text-xl">{call.caller_name || call.caller_email}</p>
                <p className="text-white/60 text-sm">からビデオ通話のリクエスト</p>
              </div>
              <div className="flex gap-4 w-full max-w-xs">
                <button
                  onClick={() => { base44.entities.VideoCall.update(call.id, { status: 'declined' }).catch(() => {}); navigate(-1); }}
                  className="flex-1 py-4 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center gap-2 text-lg"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    if (remoteVideoRef.current) remoteVideoRef.current.play().catch(() => {});
                    base44.entities.VideoCall.update(call.id, { status: 'accepted' }).catch(() => {});
                    setTimeout(() => refetchCall(), 300);
                    setTimeout(() => refetchCall(), 1000);
                  }}
                  className="flex-1 py-4 rounded-2xl text-black font-black flex items-center justify-center gap-2 text-lg"
                  style={{ background: 'linear-gradient(135deg, #00ff9d, #00d4aa)', boxShadow: '0 0 30px rgba(0,255,157,0.6)' }}
                >
                  <Phone className="w-6 h-6" /> 応答
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {/* === ACCEPTED: IVSトークン生成中 === */}
        {(call?.status === 'accepted') && (
          <div className="absolute inset-0 bg-black flex flex-col items-center justify-center gap-4">
            <video ref={localVideoRef} autoPlay muted playsInline webkit-playsinline="true"
              onLoadedMetadata={e => e.target.play().catch(() => {})}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.4 }} />
            <div className="relative z-10 text-center space-y-3">
              <div className="w-14 h-14 rounded-full border-4 border-primary/40 border-t-primary animate-spin mx-auto" />
              <p className="text-white font-bold">接続中...</p>
            </div>
          </div>
        )}

        {/* === ACTIVE: 相手映像フルスクリーン === */}
        {call?.status === 'active' && (
          <>
            {/* 相手映像（リモート） */}
            <video ref={remoteVideoRef} autoPlay playsInline webkit-playsinline="true" x5-playsinline="true"
              onLoadedMetadata={e => e.target.play().catch(() => {})}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', backgroundColor: '#000' }} />

            {/* カウントダウン */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center">
                  <p className="text-white text-xl font-bold mb-2">通話開始</p>
                  <p className="text-primary font-black" style={{ fontSize: 80, lineHeight: 1, textShadow: '0 0 30px rgba(0,255,157,0.8)' }}>{countdown}</p>
                </div>
              </div>
            )}

            {/* 自分のワイプ（右下） */}
            <div className="absolute bottom-3 right-3 w-28 h-36 sm:w-36 sm:h-48 rounded-xl overflow-hidden border-2 border-white/40 bg-black z-10"
              style={{ boxShadow: '0 0 16px rgba(0,255,157,0.4)' }}>
              <video ref={localVideoRef} autoPlay muted playsInline webkit-playsinline="true"
                onLoadedMetadata={e => e.target.play().catch(() => {})}
                style={{ width: '100%', height: '100%', objectFit: 'cover', filter: currentFilter?.style || "" }} />
              {!camOn && <div className="absolute inset-0 bg-black/80 flex items-center justify-center"><CameraOff className="w-5 h-5 text-white/40" /></div>}
              <div className="absolute bottom-1 inset-x-0 text-center">
                <span className="text-[9px] text-white/70 bg-black/60 px-1.5 py-0.5 rounded-full">あなた</span>
              </div>
            </div>

            {/* コイン残高バッジ（視聴者のみ） */}
            {isCaller && coinBalance !== null && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-black/80 border border-yellow-500/60 rounded-full px-3 py-1.5 backdrop-blur">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-black text-xs">{coinBalance.toLocaleString()} コイン</span>
              </div>
            )}

            {/* 通話中ステータス */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-xs font-bold">通話中</span>
            </div>

            {/* マイクOFF警告 */}
            {!micOn && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 border border-red-500/60 rounded-xl px-4 py-2 flex items-center gap-2 text-red-300 text-xs font-bold backdrop-blur animate-pulse">
                <MicOff className="w-4 h-4 shrink-0" /> マイクOFF
              </div>
            )}

            {/* カウントダウン（30秒前） */}
            {remainingSeconds !== null && remainingSeconds <= 30 && remainingSeconds > 0 && (
              <div className="absolute top-3 right-3 z-20 bg-black/70 backdrop-blur rounded-xl px-3 py-2 text-center border border-cyan-500/30">
                <p className="font-black text-3xl leading-none" style={{ color: '#00ff9d', textShadow: '0 0 10px #00ff9d' }}>{String(remainingSeconds).padStart(2, '0')}</p>
                <p className="text-[10px]" style={{ color: remainingSeconds <= 10 ? '#ff0055' : '#00ff9d' }}>秒</p>
              </div>
            )}

            {/* 延長バナー */}
            {showExtendBanner && !showExtendModal && (
              <div className="absolute top-14 left-4 right-4 z-40 bg-black/90 backdrop-blur-xl border border-primary/40 rounded-2xl p-3 flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <p className="text-white text-sm font-bold flex-1">あと{remainingSeconds}秒 — 延長しますか？</p>
                <button onClick={() => setShowExtendBanner(false)} className="text-white/40 text-xs px-2">終了</button>
                <button onClick={() => setShowExtendModal(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-primary text-primary">延長</button>
              </div>
            )}

            {/* IVS再接続バナー */}
            {ivsConnectStatus === 'reconnecting' && (
              <div className="absolute inset-0 z-30 bg-black/70 backdrop-blur-sm flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/40 border-t-primary animate-spin mx-auto" />
                  <p className="text-white font-bold">再接続中...</p>
                </div>
              </div>
            )}
            {ivsConnectStatus === 'failed' && (
              <div className="absolute inset-0 z-30 bg-black/80 flex items-center justify-center">
                <div className="text-center space-y-3 px-6">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
                  <p className="text-white font-bold">再接続に失敗しました</p>
                  <button onClick={() => handleEndCall(true)} className="px-6 py-2.5 bg-red-600 text-white rounded-full font-bold text-sm">終了</button>
                </div>
              </div>
            )}
          </>
        )}

        {/* エールコインが未設定の場合は両方で remoteVideoRef を mount しておく（非表示） */}
        {call?.status !== 'active' && (
          <video ref={remoteVideoRef} autoPlay playsInline muted style={{ display: 'none' }} />
        )}
      </div>

      {/* ════════════════════════════════════════
          BOTTOM AREA — コントロール + チャット + エールコイン
      ════════════════════════════════════════ */}
      <div className="flex flex-col bg-black border-t border-white/10" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* コントロールバー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          {/* マイク・カメラ */}
          <div className="flex items-center gap-2">
            <button onClick={() => setMicOn(!micOn)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10" : "bg-red-500"}`}>
              {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
            </button>
            <button onClick={() => setCamOn(!camOn)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10" : "bg-red-500"}`}>
              {camOn ? <Camera className="w-4 h-4 text-white" /> : <CameraOff className="w-4 h-4 text-white" />}
            </button>
            {/* 設定 */}
            <button onClick={() => togglePanel(activePanel === "settings" ? null : "settings")}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${activePanel === "settings" ? "bg-primary/20 border border-primary/40" : "bg-white/10"}`}>
              <Settings className={`w-4 h-4 ${activePanel === "settings" ? "text-primary" : "text-white/70"}`} />
            </button>
          </div>

          {/* エールコイン（視聴者のみ・通話中のみ） */}
          {isCaller && call?.status === 'active' && (
            <button onClick={() => setShowYellPanel(!showYellPanel)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all font-bold text-xs ${showYellPanel ? "bg-yellow-500/20 border-yellow-500/50 text-yellow-400" : "bg-white/10 border-white/20 text-white/70"}`}>
              <Coins className="w-4 h-4" /> エール
            </button>
          )}

          {/* 通話終了 */}
          <motion.button onClick={handleEndCall}
            animate={{ boxShadow: ["0 0 15px rgba(255,0,85,0.5)", "0 0 30px rgba(255,0,85,0.9)", "0 0 15px rgba(255,0,85,0.5)"] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500">
            <PhoneOff className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* エールコインパネル */}
        {showYellPanel && (
          <div className="border-b border-white/10 px-4 py-3 shrink-0">
            <p className="text-xs text-white/50 mb-2 font-bold">💰 エールコインを送る</p>
            <div className="grid grid-cols-6 gap-1.5">
              {YELL_AMOUNTS.map(amt => (
                <button key={amt.value}
                  onClick={() => { setSelectedYell(amt.value); setShowYellModal(true); setShowYellPanel(false); }}
                  className={`py-2 rounded-lg border text-xs font-bold transition-all ${colorStyles[amt.color]}`}>
                  {amt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 設定パネル（インライン） */}
        {activePanel === "settings" && (
          <div className="border-b border-white/10 px-4 py-3 shrink-0 space-y-3">
            {videoDevices.length > 1 && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">📹 カメラ</label>
                <select value={selectedCameraId || ""} onChange={e => switchCamera(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none">
                  {videoDevices.map((d, i) => <option key={d.deviceId} value={d.deviceId} className="bg-black">{d.label || `カメラ ${i+1}`}</option>)}
                </select>
              </div>
            )}
            {audioDevices.length > 1 && (
              <div>
                <label className="text-xs text-white/50 mb-1 block">🎙️ マイク</label>
                <select value={selectedMicId || ""} onChange={e => switchMic(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs focus:outline-none">
                  {audioDevices.map((d, i) => <option key={d.deviceId} value={d.deviceId} className="bg-black">{d.label || `マイク ${i+1}`}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {/* チャットメッセージ一覧 */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 min-h-0">
          {chatMessages.length === 0 && call?.status === 'active' && (
            <p className="text-center text-white/20 text-xs pt-4">チャットを始めましょう</p>
          )}
          {chatMessages.length === 0 && call?.status !== 'active' && (
            <p className="text-center text-white/20 text-xs pt-4">通話が始まるとチャットできます</p>
          )}
          {chatMessages.map(msg => {
            const isMe = msg.from_email === user?.email;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-sm ${isMe ? "text-black font-semibold" : "bg-white/10 text-white"}`}
                  style={isMe ? { background: '#00ff9d', boxShadow: '0 0 6px rgba(0,255,157,0.3)' } : {}}>
                  {!isMe && <p className="text-[10px] text-white/40 mb-0.5">{msg.from_name}</p>}
                  <p>{msg.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={chatBottomRef} />
        </div>

        {/* チャット入力欄 */}
        <div className="px-3 py-3 border-t border-white/10 flex gap-2 items-center shrink-0">
          <input
            type="text"
            value={chatInput}
            onChange={e => setChatInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleChatSend()}
            placeholder="メッセージ..."
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50"
          />
          <button onClick={handleChatSend} disabled={!chatInput.trim() || chatSending}
            className="w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-40 shrink-0"
            style={{ background: 'rgba(0,255,157,0.15)', border: '1.5px solid rgba(0,255,157,0.4)' }}>
            <Send className="w-4 h-4" style={{ color: '#00ff9d' }} />
          </button>
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
              <Label className="text-sm mb-2 block">延長時間を選択（10分刻み）</Label>
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

      {/* 残高不足自動切断モーダル */}
      <Dialog open={showInsufficientModal} onOpenChange={() => {}}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="w-5 h-5" /> エールコイン残高不足
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              次の15分分の通話料金（150コイン〜）が不足しているため、通話を自動切断しました。
            </p>
            <div className="bg-secondary rounded-lg p-3 text-xs space-y-1 text-muted-foreground">
              <p>📌 課金ルール</p>
               <p>・通話料金: <span className="text-primary font-bold">15分150円〜上限なし（配信者設定）</span></p>
               <p>・ライバー還元: <span className="text-green-400 font-bold">85%</span></p>
               <p>・運営手数料: <span className="text-muted-foreground">15%</span></p>
            </div>
            <div className="bg-secondary rounded-lg p-3 text-xs text-muted-foreground">
              コインをチャージしてから再度通話をご利用ください。
            </div>
            <Button
              className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
              onClick={() => { setShowInsufficientModal(false); localStream?.getTracks().forEach(t => t.stop()); navigate("/settings"); }}
            >
              <Coins className="w-4 h-4 mr-2" /> コインをチャージする
            </Button>
            <Button variant="outline" className="w-full" onClick={() => { setShowInsufficientModal(false); navigate(-1); }}>
              閉じる
            </Button>
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

      {/* Message Modal */}
      {showMessageModal && call && user && (
        <MessageModal
          channel={{ id: call.callee_channel_id, name: call.callee_name, owner_email: call.callee_email }}
          video={null}
          user={user}
          onClose={() => setShowMessageModal(false)}
        />
      )}

      {/* Extension Request Modal (Streamer) */}
      {showExtensionRequest && call && user && user.email === call.callee_email && (
        <ExtensionRequestModal
          call={call}
          onClose={() => setShowExtensionRequest(false)}
          onRequestSent={() => {
            refetchCall();
          }}
        />
      )}

      {/* Extension Acceptance Modal (Viewer) */}
      {showExtensionAcceptance && call && user && user.email === call.caller_email && call.extension_request_status === 'pending' && (
        <ExtensionAcceptanceModal
          call={call}
          user={user}
          onClose={() => setShowExtensionAcceptance(false)}
          onAccepted={(data) => {
            setShowExtensionAcceptance(false);
            setShowExtensionConfirmation(true);
            // ロスタイムバッファをセット
            if (data.lossTimeBufferUntil) {
              setRemainingSeconds(null); // タイマーを一度リセット
            }
            refetchCall();
          }}
        />
      )}

      {/* Extension Confirmation Modal (Streamer) */}
      {showExtensionConfirmation && call && user && user.email === call.callee_email && call.extension_request_status === 'accepted' && (
        <ExtensionConfirmationModal
          call={call}
          onClose={() => setShowExtensionConfirmation(false)}
          onConfirmed={(data) => {
            if (data.newTotalDurationMinutes) {
              // タイマーをリセット（新しい総時間で再カウント）
              setCallStartTime(Date.now());
              setRemainingSeconds(data.newTotalDurationMinutes * 60);
            }
            refetchCall();
          }}
        />
      )}

      {/* Reconnection Notification (After call ended while extension pending) */}
      {showReconnectionNotification && call && (
        <ReconnectionNotification
          call={call}
          streamerName={call.callee_name}
          onClose={() => {
            setShowReconnectionNotification(false);
            localStream?.getTracks().forEach((t) => t.stop());
            navigate(-1);
          }}
          onReconnect={() => {
            // 通話を再度 pending にリセット（再接続用）
            base44.entities.VideoCall.update(call.id, {
              status: 'pending',
              extension_request_status: null,
            });
          }}
        />
      )}

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