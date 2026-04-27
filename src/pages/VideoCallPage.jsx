import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ChimeVideoCall from "@/components/call/ChimeVideoCall";
import { useSmartCameraSelection } from "@/hooks/useSmartCameraSelection";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Phone, PhoneOff, PhoneCall, Coins, Shield, Flag, Mic, MicOff, Camera, CameraOff,
  AlertTriangle, Smile, Settings, Image, Sparkles, X, Clock, CreditCard, CheckCircle2, Radio, MessageCircle, Video, VideoOff, Maximize, Minimize
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
   const [chimeMeeting, setChimeMeeting] = useState(null);
   const [chimeAttendee, setChimeAttendee] = useState(null);
   const [chimeConnected, setChimeConnected] = useState(false);

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

  // accepted → callerのみが active に変更（callee は待つだけ）
  // active になったら3秒カウントダウン表示
  useEffect(() => {
    if (!call || !user) return;

    // callerのみ: accepted → active に更新
    if (call.status === 'accepted' && user.email === call.caller_email && !countdownStartedRef.current) {
      countdownStartedRef.current = true;
      base44.entities.VideoCall.update(call.id, { status: 'active' }).then(() => refetchCall()).catch(() => {});
    }

    // active になったらカウントダウン表示
    if (call.status === 'active' && countdown === null && chimeConnected === false) {
      setCountdown(3);
      const t1 = setTimeout(() => setCountdown(2), 1000);
      const t2 = setTimeout(() => setCountdown(1), 2000);
      const t3 = setTimeout(() => setCountdown(null), 3000);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }
  }, [call?.status, call?.id, user?.email]);

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
    // タイマーはchimeConnected（映像接続確立）後にのみ開始
    if (call?.status === "active" && chimeConnected && !callStartTime) {
      setCallStartTime(Date.now());
    }
    // 自動切断検出
    if (call?.auto_disconnected && call?.status === "ended") {
      setShowInsufficientModal(true);
    }
  }, [call?.status, call?.auto_disconnected, chimeConnected]);

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
  const { stream: smartStream } = useSmartCameraSelection();
  useEffect(() => {
    if (smartStream) {
      setLocalStream(smartStream);
      if (localVideoRef.current) localVideoRef.current.srcObject = smartStream;
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
    if (!call?.chime_meeting_id) { toast.error("通話が開始されていません"); return; }
    try {
      const res = await base44.functions.invoke('startChimeRecording', { callId: call.id });
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
      await base44.functions.invoke('stopChimeRecording', {
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

  // Chimeミーティング情報をバックエンドから取得
  // caller: active になったら呼ぶ / callee: accepted or active になったら呼ぶ
  const fetchingMeetingRef = useRef(false);
  useEffect(() => {
    if (!call || !user) return;
    // caller: active のみ / callee: accepted or active
    const isCaller = user.email === call.caller_email;
    const shouldFetch = isCaller
      ? call.status === 'active'
      : ['accepted', 'active'].includes(call.status);
    if (!shouldFetch) return;
    if (chimeMeeting || fetchingMeetingRef.current) return;
    fetchingMeetingRef.current = true;

    const fetchMeeting = async () => {
      try {
        console.log(`[VideoCallPage] 🎯 createChimeMeeting for ${call.id} (user: ${user.email})`);
        const res = await base44.functions.invoke('createChimeMeeting', { callId: call.id });
        if (res?.data?.Meeting) {
          console.log(`[Chime] ✅ Meeting ready: ${res.data.Meeting.MeetingId}`);
          setChimeMeeting(res.data.Meeting);
          setChimeAttendee(res.data.Attendee);
        } else {
          console.error('[Chime] ❌ No Meeting in response:', res?.data);
          fetchingMeetingRef.current = false;
        }
      } catch (e) {
        console.error('[Chime] ❌ Meeting fetch failed:', e.message);
        fetchingMeetingRef.current = false;
        // 3秒後に再試行
        setTimeout(() => { fetchingMeetingRef.current = false; }, 3000);
      }
    };
    fetchMeeting();
  }, [call?.id, call?.status, user?.email]);

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

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ★ 視聴者側（caller）pending 待機画面 — ライバーの承認を待っている */}
      {call?.status === 'pending' && user?.email === call?.caller_email && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black gap-6 px-6">
          {/* 自分のカメラプレビュー（PiP） */}
          <div className="w-40 h-56 rounded-2xl overflow-hidden border-2 border-primary/50 bg-black shadow-2xl relative">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-1 left-0 right-0 text-center">
              <span className="text-[9px] text-white/70 bg-black/60 px-2 py-0.5 rounded-full">あなたのカメラ</span>
            </div>
          </div>

          {/* 待機メッセージ */}
          <div className="text-center space-y-3">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
              <div className="relative w-16 h-16 rounded-full bg-primary/30 border-2 border-primary flex items-center justify-center">
                <PhoneCall className="w-8 h-8 text-primary" />
              </div>
            </div>
            <p className="text-white font-black text-xl">{call?.callee_name || "ライバー"} さんに着信中...</p>
            <p className="text-white/50 text-sm">承認されると通話が始まります</p>
            {/* カメラ・マイク確認 */}
            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/40 rounded-xl px-4 py-3 text-left max-w-xs mx-auto">
              <span className="text-lg shrink-0">📷</span>
              <p className="text-yellow-300 text-xs font-bold leading-relaxed">
                PCやスマートフォンのカメラ・マイクは必ずONになるよう確認してください
              </p>
            </div>
            <div className="flex items-center justify-center gap-1.5">
              {[0,1,2].map(i => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>

          {/* キャンセルボタン */}
          <button
            onClick={() => { localStream?.getTracks().forEach(t => t.stop()); navigate(-1); }}
            className="flex items-center gap-2 text-red-400 border border-red-500/40 px-6 py-2.5 rounded-full text-sm hover:bg-red-500/10 transition-all"
          >
            <PhoneOff className="w-4 h-4" /> キャンセル
          </button>
        </div>
      )}

      {/* ★ CRITICAL: pending 着信 → 承認ボタン（ライバーのみ）。ended でも pending に戻った直後は表示 */}
      {(call?.status === 'pending') && user?.email === call?.callee_email && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border-2 border-primary rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-6"
          >
            <div className="flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center"
              >
                <PhoneCall className="w-10 h-10 text-primary" />
              </motion.div>
            </div>
            
            <div className="space-y-2">
              <p className="text-2xl font-black text-white">着信！</p>
              <p className="text-lg text-primary font-bold">{call?.caller_name || call?.caller_email}</p>
              <p className="text-sm text-muted-foreground">からの通話リクエストです</p>
            </div>

            <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/40 rounded-xl px-3 py-2.5 text-left">
              <span className="text-base shrink-0">📷</span>
              <p className="text-yellow-300 text-xs font-bold leading-relaxed">
                カメラ・マイクは必ずONになるよう確認してください
              </p>
            </div>

            <motion.div
              initial={{ opacity: 0.5 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="text-xs text-muted-foreground"
            >
              自動で受け付けます...
            </motion.div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={async () => {
                  if (autoAcceptTimeoutRef.current) clearTimeout(autoAcceptTimeoutRef.current);
                  navigate(-1);
                }}
              >
                <PhoneOff className="w-4 h-4" /> 拒否
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 gap-2 font-black"
                onClick={async () => {
                  try {
                    console.log('[VideoCallPage] ⚡ Streamer accepting call...');
                    await base44.entities.VideoCall.update(call.id, { status: 'accepted' });
                    console.log('[VideoCallPage] ✅ Call accepted -> status: accepted');
                    setTimeout(() => refetchCall(), 500);
                  } catch (err) {
                    console.error('[VideoCallPage] ❌ Accept failed:', err);
                    toast.error('承認に失敗しました');
                  }
                }}
              >
                <Phone className="w-4 h-4" /> 通話開始
              </Button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ABR Manager */}
      <AdaptiveBitrateManager
        enabled={abrEnabled && call?.status === "active"}
        currentQuality={videoQuality}
        onQualityChange={(newQuality) => {
          setVideoQuality(newQuality);
          setAbrEnabled(false);
          setTimeout(() => setAbrEnabled(true), 5000);
        }}
        measureInterval={3000}
      />

      {/* Main container: Video + Chat */}
       <div className="flex-1 flex flex-col overflow-hidden">
         {/* Video call section */}
         <div className="flex-1 flex flex-col min-w-0">
      {/* Floating items */}
      {floatingItems.map((f) => (
        <FloatingItem key={f.id} item={f.emoji} type={f.type} onDone={() => removeFloating(f.id)} />
      ))}

      {/* Top bar */}
      <div className="flex items-center justify-between px-3 md:px-4 py-2 md:py-3 bg-black/60 backdrop-blur z-20">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
            <span className="text-xs md:text-sm font-bold text-primary">{otherName?.[0] || "?"}</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-xs md:text-sm truncate">{otherName} との通話</p>
            {isWaiting && (
              <p className="text-[10px] md:text-xs text-green-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                待機中
              </p>
            )}
            {call?.status === "active" && (
              <p className="text-[10px] md:text-xs text-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                通話中
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 md:gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={() => setShowMessageModal(true)} className="text-white/60 hover:text-blue-400 gap-0.5 md:gap-1 text-[9px] md:text-xs h-7 md:h-8 px-1.5 md:px-2">
            <MessageCircle className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">メッセージ</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowReportModal(true)} className="text-white/60 hover:text-red-400 gap-0.5 md:gap-1 text-[9px] md:text-xs h-7 md:h-8 px-1.5 md:px-2">
            <Flag className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">通報</span>
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowBlockModal(true)} className="text-white/60 hover:text-orange-400 gap-0.5 md:gap-1 text-[9px] md:text-xs h-7 md:h-8 px-1.5 md:px-2">
            <Shield className="w-3 h-3 md:w-3.5 md:h-3.5" /> <span className="hidden sm:inline">ブロック</span>
          </Button>
        </div>
      </div>

      {/* Main video area */}
      <div ref={videoContainerRef} className="flex-1 relative bg-black min-h-0">
        {/* Chime接続エンジン（UI無し） - call active + meeting取得済み時のみ */}
        {call?.status === "active" && chimeMeeting && chimeAttendee && (
          <ChimeVideoCall
            meetingResponse={chimeMeeting}
            attendeeResponse={chimeAttendee}
            remoteVideoRef={remoteVideoRef}
            localVideoRef={localVideoRef}
            micEnabled={micOn}
            camEnabled={camOn}
            onConnected={() => {
              setChimeConnected(true);
              // 接続完了時にマイクを強制ON
              setMicOn(true);
            }}
          />
        )}

        {/* 待機中画面（isWaiting時はWaitingScreenDisplayを表示） */}
        {isWaiting ? (
          <WaitingScreenDisplay channel={calleeChannel} localVideoRef={localVideoRef} />
        ) : (
        /* 相手映像（フルスクリーン） - ChimeがここにRemoteVideoをbindする */
        <div className="absolute inset-0 w-full h-full bg-black">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          {countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/70 backdrop-blur-sm">
              <div className="text-center space-y-4">
                <p className="text-white text-xl font-bold">通話を開始します...</p>
                <p className="text-primary font-black" style={{ fontSize: "80px", lineHeight: 1, textShadow: "0 0 30px rgba(0,255,157,0.8)" }}>
                  {countdown}
                </p>
              </div>
            </div>
          )}
          {!chimeConnected && countdown === null && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-white/40 text-sm">
                {call?.status === "active" ? "相手の映像を待っています..." : "通話開始をお待ちください"}
              </p>
            </div>
          )}
        </div>
        )}

        {/* 背景・PiP（待機中は非表示） */}
        {!isWaiting && selectedBg !== "none" && selectedBg !== "blur" && (
          <img
            src={BACKGROUNDS.find((b) => b.id === selectedBg)?.preview}
            className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none"
            alt=""
          />
        )}

        {/* 自分の映像（PiP右下） - 待機中・カメラモードはWaitingScreenDisplay内で表示するため非表示 */}
        {!isWaiting && (
        <div className="absolute bottom-4 right-4 w-24 h-32 md:w-32 md:h-44 rounded-xl overflow-hidden border-2 border-white/30 shadow-2xl bg-black/80 z-10">
          <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" style={{ filter: currentFilter?.style || "" }} />
          {!camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <CameraOff className="w-4 h-4 md:w-6 md:h-6 text-muted-foreground" />
            </div>
          )}
          <div className="absolute bottom-0.5 left-0.5 right-0.5 text-center">
            <span className="text-[8px] text-white/70 bg-black/50 px-1.5 py-0.5 rounded-full">自分</span>
          </div>
        </div>
        )}
      {/* フルスクリーンボタン */}
        <button
          onClick={toggleFullscreen}
          className="absolute top-2 right-2 z-20 bg-black/60 hover:bg-black/90 text-white rounded-lg p-1.5 transition-all"
          title={isFullscreen ? "全画面解除" : "全画面表示"}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>

        {/* マイクOFF警告 */}
        {!micOn && call?.status === "active" && (
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 border border-red-500/60 rounded-xl px-4 py-2 flex items-center gap-2 text-red-300 text-xs font-bold backdrop-blur shadow-lg animate-pulse">
            <MicOff className="w-4 h-4 shrink-0" />
            マイクがオフです。マイクをONにしてください
          </div>
        )}

        {/* 音声レベルインジケーター */}
        {call?.status === "active" && (
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1.5 bg-black/60 backdrop-blur rounded-lg px-2 py-1.5">
            <Mic className={`w-3 h-3 shrink-0 ${micOn ? "text-primary" : "text-red-400"}`} />
            <div className="flex items-end gap-[2px] h-4">
              {[20, 40, 60, 80, 100].map((threshold, i) => (
                <div
                  key={i}
                  className="w-1 rounded-sm transition-all duration-75"
                  style={{
                    height: `${(i + 1) * 16}%`,
                    background: !micOn ? "#ef4444" : audioLevel >= threshold ? "#00ff9d" : "rgba(255,255,255,0.2)",
                  }}
                />
              ))}
            </div>
            <span className={`text-[9px] font-bold ${micOn ? "text-primary" : "text-red-400"}`}>
              {micOn ? (audioLevel > 5 ? "送信中" : "待機") : "OFF"}
            </span>
          </div>
        )}

      {/* NG Word Detection indicator */}
        {isListening && (
          <div className="absolute top-2 md:top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 border border-green-500/40 rounded-full px-2 md:px-3 py-0.5 md:py-1 flex items-center gap-1 text-green-400 text-[10px] md:text-xs backdrop-blur">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
            NGワード監視中
          </div>
        )}
        {ngDetected && (
          <div className="absolute top-8 md:top-12 left-1/2 -translate-x-1/2 z-10 bg-red-900/90 border border-red-500/60 rounded-lg md:rounded-xl px-2 md:px-4 py-1.5 md:py-2 flex items-center gap-1.5 md:gap-2 text-red-300 text-[10px] md:text-sm font-bold backdrop-blur shadow-lg max-w-[90%]">
            <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 shrink-0" />
            <span className="truncate">NGワード検出: "{ngDetected}"</span>
          </div>
        )}

        {/* Coin billing HUD (発信者のみ) - 下部に配置 */}
        {call?.billing_started_at && user?.email === call?.caller_email && (
          <div className="absolute bottom-4 left-2 md:left-4 z-10 space-y-1">
            {/* 残高 */}
            <div className="bg-black/70 border border-yellow-500/40 rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 flex items-center gap-1.5 md:gap-2 text-yellow-400 text-[10px] md:text-xs font-bold backdrop-blur min-w-max">
              <Coins className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span>残高 {coinBalance !== null ? coinBalance.toLocaleString() : "…"} コイン</span>
            </div>
            {/* ユニット表示（プラン別） */}
            <div className="bg-black/70 border border-white/10 rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 flex items-center gap-1 md:gap-2 text-white/60 text-[10px] md:text-xs backdrop-blur min-w-max">
              <span>第{currentUnit || 1}</span>
              <span className={`font-bold ${getUserPlan(user) === "free" ? "text-orange-400" : "text-primary"}`}>
                {getPlanMatrix(getUserPlan(user)).min_coins}コイン/15分
              </span>
            </div>
            {/* 次回課金カウントダウン */}
            {secondsUntilBilling !== null && (
              <div className={`bg-black/70 border rounded-lg md:rounded-xl px-2 md:px-3 py-1 md:py-1.5 flex items-center gap-1 md:gap-2 text-[10px] md:text-xs font-bold backdrop-blur min-w-max ${
                secondsUntilBilling <= 60 ? "border-red-500/60 text-red-400" : secondsUntilBilling <= 180 ? "border-orange-500/60 text-orange-400" : "border-white/20 text-white/60"
              }`}>
                <Clock className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span>{Math.floor(secondsUntilBilling / 60)}:{String(secondsUntilBilling % 60).padStart(2, "0")}</span>
                <span className="hidden md:inline opacity-70">(150コイン)</span>
              </div>
            )}
            {/* 12分時点のチャージ警告バナー */}
             {showChargeAlert && (
               <div className="bg-red-900/90 border border-red-500/60 rounded-lg md:rounded-xl px-2 md:px-3 py-1.5 md:py-2 flex items-start gap-1.5 md:gap-2 text-[10px] md:text-xs backdrop-blur max-w-[240px] md:max-w-[220px]">
                 <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 text-red-400 shrink-0 mt-0.5" />
                 <div>
                   <p className="text-red-300 font-bold">残高不足！</p>
                   <p className="text-red-300/80">次の500コインが不足しています。3分以内にチャージしないと強制終了されます。</p>
                   <button
                     className="mt-1 text-yellow-400 font-bold underline text-[9px] md:text-[11px]"
                     onClick={() => { window.open("/settings", "_blank"); }}
                   >
                     チャージする →
                   </button>
                 </div>
               </div>
             )}
          </div>
        )}

        {/* Yell coin badge */}
        {call?.yell_coin_amount > 0 && (
          <div className="absolute top-2 md:top-4 right-2 md:right-4 z-10 bg-yellow-500/20 border border-yellow-500/40 rounded-full px-2 md:px-3 py-0.5 md:py-1 flex items-center gap-1 text-yellow-400 text-[10px] md:text-xs font-bold backdrop-blur min-w-max">
            <Coins className="w-3 h-3 md:w-3.5 md:h-3.5" />
            <span>{call.yell_coin_amount?.toLocaleString()} エール済み</span>
          </div>
        )}



        {/* Call Progress HUD は下部コントロールエリアに移動 */}

        {/* ---- Neon Countdown Timer (30秒前から表示) - 右上隅 ---- */}
         <AnimatePresence>
           {remainingSeconds !== null && remainingSeconds <= 30 && remainingSeconds > 0 && (
             <motion.div
               key="countdown"
               initial={{ opacity: 0, scale: 0.5 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.5 }}
               className="absolute top-4 right-4 pointer-events-none z-30"
             >
               <div className="text-center bg-black/70 backdrop-blur rounded-xl p-3 border border-cyan-500/30">
                 <p className="font-black leading-none drop-shadow-2xl"
                   style={{
                     fontSize: "36px",
                     color: "#00ff9d",
                     textShadow: `
                       0 0 10px #00ff9d,
                       0 0 20px #00ff9d
                     `,
                     fontFamily: "'Courier New', monospace",
                     letterSpacing: "0.1em"
                   }}>
                   {String(remainingSeconds).padStart(2, '0')}
                 </p>
                 <p className="text-xs font-bold opacity-90 drop-shadow-lg"
                   style={{
                     color: remainingSeconds <= 10 ? "#ff0055" : "#00ff9d",
                     textShadow: `0 0 10px ${remainingSeconds <= 10 ? "#ff0055" : "#00ff9d"}`
                   }}>
                   {remainingSeconds <= 10 ? "⚠️ 終了" : "秒"}
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
                  <motion.button
                    onClick={() => setShowExtendModal(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-xs font-bold px-4 py-2 rounded-xl border-2"
                    style={{
                      background: "rgba(0,255,157,0.1)",
                      borderColor: "#00ff9d",
                      color: "#00ff9d",
                      boxShadow: "0 0 15px rgba(0,255,157,0.5)",
                    }}
                  >
                    延長する
                  </motion.button>
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
                    {activePanel === "throw" && "✨ 投げマーク"}
                    {activePanel === "yell" && "💰 エールコイン"}
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
                   <div className="space-y-3">
                     <p className="text-xs text-white/50 font-semibold">✨ 投げマーク</p>
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
                   </div>
                 )}

                {activePanel === "yell" && (
                  <div className="space-y-3">
                    <p className="text-xs text-white/50 font-semibold">💰 エールコイン</p>
                    <div className="grid grid-cols-3 gap-2">
                      {YELL_AMOUNTS.map((amt) => (
                        <button
                          key={amt.value}
                          onClick={() => { addFloating(`¥${amt.value}`, "coin"); toast.success(`¥${amt.value}を投げました！`); }}
                          className={`flex flex-col items-center gap-1 rounded-xl p-2 transition-all border ${colorStyles[amt.color].includes("border") ? colorStyles[amt.color].split(" ").filter(c => c.includes("border")).join(" ") : "border-white/10"} bg-white/5 hover:bg-white/10`}
                        >
                          <span className="text-lg font-bold">💰</span>
                          <span className="text-[9px] text-white/60">{amt.label}</span>
                        </button>
                      ))}
                    </div>
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
                       <div className="flex items-center justify-between mb-2">
                         <label className="text-xs text-white/60">📹 映像品質</label>
                         <label className="flex items-center gap-1.5 text-[10px] text-white/40 cursor-pointer">
                           <input
                             type="checkbox"
                             checked={abrEnabled}
                             onChange={(e) => setAbrEnabled(e.target.checked)}
                             className="w-3 h-3 rounded"
                           />
                           自動最適化
                         </label>
                       </div>
                       <div className="flex flex-wrap gap-2">
                         {VIDEO_QUALITY.map((q) => (
                           <button
                             key={q.id}
                             disabled={abrEnabled}
                             onClick={() => { setVideoQuality(q.id); setAbrEnabled(false); toast.success(`映像品質を「${q.label}」に手動変更しました`); }}
                             className={`text-xs px-3 py-1.5 rounded-full border transition-all disabled:opacity-50 ${videoQuality === q.id ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 text-white/70 border-white/10 hover:border-primary/40"}`}
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
      </div>
      <div className="bg-black/80 backdrop-blur-xl border-t border-white/10 px-4 py-4 z-20">

      {/* ▼ Progress bar - 最下部コントロールエリア最上部に配置 */}
      {callStartTime && effectiveDuration && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1 text-[10px]">
            <span className="text-cyan-400 font-bold">
              {`${Math.floor((Date.now() - callStartTime) / 1000 / 60)}:${String(Math.floor(((Date.now() - callStartTime) / 1000) % 60)).padStart(2, '0')}`} 経過
            </span>
            <span className="text-white/40">/ {effectiveDuration}分</span>
            <span className={`font-bold ${remainingSeconds <= 60 ? "text-red-400" : "text-cyan-400"}`}>
              {remainingSeconds !== null ? `${Math.floor(remainingSeconds / 60)}:${String(remainingSeconds % 60).padStart(2, '0')}` : "-"} 残り
            </span>
          </div>
          <div className="w-full bg-black/50 rounded-full h-1.5 border border-cyan-500/20">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${Math.min(100, (remainingSeconds === null ? 0 : (effectiveDuration * 60 - remainingSeconds) / (effectiveDuration * 60)) * 100)}%` }}
              transition={{ duration: 1 }}
              style={{ boxShadow: "0 0 8px rgba(0,229,255,0.5)" }}
            />
          </div>
        </div>
      )}

      {/* Feature row */}
      <div className="flex items-center justify-center gap-2 mb-4">
          {/* 延長リクエスト（ライバーのみ・通話中） */}
          {call?.status === "active" && user?.email === call?.callee_email && !call?.extension_request_status && (
            <button
              onClick={() => setShowExtensionRequest(true)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-purple-500/20 border border-purple-500/60 hover:bg-purple-500/30 transition-all"
            >
              <Clock className="w-5 h-5 text-purple-400" />
              <span className="text-[10px] text-purple-400">延長</span>
            </button>
          )}

          {/* 録画ボタン（calleeのみ・通話中） */}
          {call?.status === "active" && user?.email === call?.callee_email && (
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all ${
                isRecording ? "bg-red-500/20 border border-red-500/60 animate-pulse" : "bg-white/5 hover:bg-white/10"
              }`}
            >
              {isRecording ? <VideoOff className="w-5 h-5 text-red-400" /> : <Video className="w-5 h-5 text-white/70" />}
              <span className={`text-[10px] ${isRecording ? "text-red-400" : "text-white/50"}`}>{isRecording ? "録画中" : "録画"}</span>
            </button>
          )}
          {[
            { key: "emoji", icon: Smile, label: "絵文字" },
            { key: "throw", icon: Sparkles, label: "投げマーク" },
            { key: "yell", icon: Coins, label: "エール" },
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
          {!isWaiting ? (
            <>
              <button
                onClick={() => setMicOn(!micOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"}`}
              >
                {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              </button>

              <button
                onClick={() => setCamOn(!camOn)}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-500"}`}
              >
                {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
              </button>

              {/* エールコインボタン（視聴者＝callerのみ） */}
              {user?.email === call?.caller_email && (
                <button
                  onClick={() => setShowYellModal(true)}
                  className="flex items-center gap-1 md:gap-2 bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/30 h-10 md:h-12 px-3 md:px-5 rounded-full font-bold text-xs md:text-sm transition-all"
                >
                  <Coins className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">エール</span>
                </button>
              )}

              <button
                onClick={handleStartWaiting}
                className="flex items-center gap-1 md:gap-2 bg-green-500/20 border border-green-500/40 text-green-400 hover:bg-green-500/30 h-10 md:h-12 px-3 md:px-5 rounded-full font-bold text-xs md:text-sm transition-all"
              >
                <Radio className="w-4 h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">待機開始</span>
              </button>

              <motion.button
                onClick={handleEndCall}
                animate={{ boxShadow: ["0 0 20px rgba(255,0,85,0.6)", "0 0 40px rgba(255,0,85,1)", "0 0 20px rgba(255,0,85,0.6)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500"
                style={{
                  boxShadow: "0 0 30px #ff0055, inset 0 0 20px rgba(255,0,85,0.3)",
                }}
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>
              </>
              ) : (
              <>
              <button
                onClick={async () => {
                  const isAuth = await base44.auth.isAuthenticated();
                  if (!isAuth) {
                    base44.auth.redirectToLogin();
                    return;
                  }
                  // コイン残高確認
                  const wallet = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
                  const balance = wallet[0]?.balance || 0;
                  const minCoins = 150; // Basic最小コスト
                  if (balance >= minCoins) {
                    // コイン充分 → 通話開始
                    await base44.entities.VideoCall.update(call.id, { status: 'accepted' });
                    toast.success('通話を開始します');
                  } else {
                    // コイン不足 → プラン選択へ
                    navigate('/plan-select');
                  }
                }}
                className="flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30 h-12 px-5 rounded-full font-bold text-sm transition-all"
              >
                <PhoneCall className="w-5 h-5" />
                申し込む
              </button>
              <motion.button
                onClick={handleEndCall}
                animate={{ boxShadow: ["0 0 20px rgba(255,0,85,0.6)", "0 0 40px rgba(255,0,85,1)", "0 0 20px rgba(255,0,85,0.6)"] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-500"
                style={{
                  boxShadow: "0 0 30px #ff0055, inset 0 0 20px rgba(255,0,85,0.3)",
                }}
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </motion.button>
              </>
              )}
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

              {/* Chat section - Below video (3倍サイズ) */}
              {user && (
                <div className="w-full border-t border-white/10 flex-shrink-0 overflow-y-auto" style={{ height: "576px", background: "#050505" }}>
                  {call ? <CallChatPanel call={call} user={user} /> : <div className="flex items-center justify-center h-full text-white/30 text-xs">通話開始後にチャット利用可</div>}
                </div>
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