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
import CallSettingsPanel from "../components/call/CallSettingsPanel";
import CallChatPanel from "../components/call/CallChatPanel";
import AdaptiveBitrateManager from "../components/call/AdaptiveBitrateManager";
import CallIsolationValidator from "../components/debug/CallIsolationValidator";
import WaitingScreenDisplay from "../components/call/WaitingScreenDisplay";
import ExtensionRequestModal from "../components/call/ExtensionRequestModal";
import ExtensionAcceptanceModal from "../components/call/ExtensionAcceptanceModal";
import ExtensionConfirmationModal from "../components/call/ExtensionConfirmationModal";
import ReconnectionNotification from "../components/call/ReconnectionNotification";
import RemoteMuteIndicator from "../components/call/RemoteMuteIndicator";
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

// ---- Constants (外部ファイルから import) ----
import { YELL_AMOUNTS, colorStyles, EMOJIS, THROW_MARKS, FILTERS, BACKGROUNDS, AUDIO_QUALITY, VIDEO_QUALITY } from "../components/call/videoCallConstants";

// ---- Floating emoji animation component ----
function FloatingItem({ item, onDone, type = "emoji" }) {
  const xOffset = (Math.random() - 0.5) * 160; // ランダム横ばらけ
  useEffect(() => {
    const t = setTimeout(onDone, 2500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="pointer-events-none select-none"
      style={{ position: 'fixed', left: `calc(50% + ${xOffset}px)`, top: '40%', zIndex: 10000, transform: 'translateX(-50%)' }}
      initial={{ opacity: 1, y: 0, scale: 0.6 }}
      animate={{ opacity: 0, y: -200, scale: 1.4 }}
      transition={{ duration: 2.2, ease: "easeOut" }}
    >
      {type === "coin" ? (
        <div className="text-6xl font-black drop-shadow-2xl" style={{ textShadow: "0 0 30px rgba(255,215,0,1), 0 0 60px rgba(255,165,0,0.8)" }}>
          💰
        </div>
      ) : (
        <div className="text-5xl">{item}</div>
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
  const muteUpdateTimerRef = useRef(null); // ミュート状態のDB同期タイマー

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

  // 音声レベルインジケーター（ローカル・リモート両方）
  const [audioLevel, setAudioLevel] = useState(0);
  const [remoteAudioLevel, setRemoteAudioLevel] = useState(0);
  const audioAnalyserRef = useRef(null);
  const audioAnimFrameRef = useRef(null);
  const remoteAnalyserRef = useRef(null);
  const remoteAnimFrameRef = useRef(null);
  const localAudioCtxRef = useRef(null); // AudioContext参照を保持（自動復旧用）

  // 無音検知アラート
  const [showMicAlert, setShowMicAlert] = useState(false);
  const silenceCountRef = useRef(0);

  // ローカルマイクの音声メーター（スマートフォン対応 + AudioContext 自動復旧）
  useEffect(() => {
    if (!localStream || !micOn) {
      setAudioLevel(0);
      silenceCountRef.current = 0;
      if (audioAnimFrameRef.current) cancelAnimationFrame(audioAnimFrameRef.current);
      if (localAudioCtxRef.current) { localAudioCtxRef.current.close().catch(() => {}); localAudioCtxRef.current = null; }
      audioAnalyserRef.current = null;
      return;
    }
    let cancelled = false;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    localAudioCtxRef.current = ctx;

    const start = () => {
      if (cancelled) return;
      const source = ctx.createMediaStreamSource(localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      audioAnalyserRef.current = analyser;
      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (cancelled) return;
        // AudioContext がスリープしていたら即座に復旧
        if (ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((s, v) => s + v, 0) / data.length;
        const level = Math.min(100, Math.round(avg * 2.5));
        setAudioLevel(level);
        // 無音検知: 5秒(約300フレーム)連続でゼロならアラート
        if (level === 0) {
          silenceCountRef.current += 1;
          if (silenceCountRef.current >= 300) { setShowMicAlert(true); }
        } else {
          silenceCountRef.current = 0;
          setShowMicAlert(false);
        }
        audioAnimFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(start).catch(() => {});
    } else {
      start();
    }

    // ページが非表示→表示に戻ったとき AudioContext を resume
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // AudioContext が外部からスリープさせられたら自動復旧
    ctx.addEventListener('statechange', () => {
      if (!cancelled && ctx.state === 'suspended') { ctx.resume().catch(() => {}); }
    });

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      cancelAnimationFrame(audioAnimFrameRef.current);
      ctx.close().catch(() => {});
      localAudioCtxRef.current = null;
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

  // リモート音声メーター（相手の声が届いているか可視化 + AudioContext自動復旧）
  const remoteAudioCtxRef = useRef(null);
  useEffect(() => {
    if (!remoteVideoRef.current || call?.status !== 'active') return;
    const videoEl = remoteVideoRef.current;
    let cancelled = false;

    const attachMeter = () => {
      const stream = videoEl.srcObject;
      if (!(stream instanceof MediaStream) || stream.getAudioTracks().length === 0) return;
      if (remoteAnalyserRef.current) return;

      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        remoteAudioCtxRef.current = ctx;
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        remoteAnalyserRef.current = analyser;
        const data = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          if (cancelled) return;
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          analyser.getByteFrequencyData(data);
          const avg = data.reduce((s, v) => s + v, 0) / data.length;
          setRemoteAudioLevel(Math.min(100, Math.round(avg * 3)));
          remoteAnimFrameRef.current = requestAnimationFrame(tick);
        };
        tick();
        ctx.addEventListener('statechange', () => {
          if (!cancelled && ctx.state === 'suspended') ctx.resume().catch(() => {});
        });
        console.log('[AudioMeter] 🔊 Remote audio meter connected');
      } catch (e) {
        console.warn('[AudioMeter] Remote meter failed:', e.message);
      }
    };

    const observer = setInterval(() => {
      if (cancelled) { clearInterval(observer); return; }
      if (videoEl.srcObject) { attachMeter(); }
      // リモート音声トラックが意図せず muted になっていたら強制ON
      const stream = videoEl.srcObject;
      if (stream instanceof MediaStream) {
        stream.getAudioTracks().forEach(track => {
          if (!track.enabled) { track.enabled = true; console.log('[AudioGuard] 🔧 Remote audio track re-enabled'); }
        });
        // video要素がミュートされていたら解除
        if (videoEl.muted) { videoEl.muted = false; videoEl.volume = 1.0; }
      }
    }, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && remoteAudioCtxRef.current?.state === 'suspended') {
        remoteAudioCtxRef.current.resume().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(observer);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (remoteAnimFrameRef.current) cancelAnimationFrame(remoteAnimFrameRef.current);
      remoteAnalyserRef.current = null;
      if (remoteAudioCtxRef.current) { remoteAudioCtxRef.current.close().catch(() => {}); remoteAudioCtxRef.current = null; }
      setRemoteAudioLevel(0);
    };
  }, [call?.status]);

  // コイン残高取得（通話状態に関わらず常時更新）
  useEffect(() => {
    if (!user) return;
    const fetchBalance = () => {
      base44.entities.YellCoinWallet.filter({ user_email: user.email }).then((wallets) => {
        setCoinBalance(wallets[0]?.balance || 0);
      });
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 30000); // 30秒ごとに更新
    return () => clearInterval(interval);
  }, [user?.email, coinsConsumed]);

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
    // ページ離脱時にカメラ・マイクを確実に停止
    return () => {
      if (smartStream) {
        smartStream.getTracks().forEach(t => t.stop());
        console.log('[VideoCallPage] 🔒 Stopped all camera/mic tracks on unmount');
      }
    };
  }, [smartStream]);

  // 通話が ended/declined/cancelled になったらカメラを即停止
  useEffect(() => {
    if (['ended', 'declined', 'cancelled'].includes(call?.status)) {
      localStream?.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
  }, [call?.status]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach((t) => (t.enabled = camOn));
  }, [camOn, localStream]);

  // ミュート切替: トラック制御 + AudioContext 強制復旧 + DB同期
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach((t) => (t.enabled = micOn));

    // ミュート解除時: AudioContext を確実に resume（音切れバグ防止）
    if (micOn) {
      [localAudioCtxRef.current, remoteAudioCtxRef.current].forEach(ctx => {
        if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
      });
    }

    // DB 同期（500ms デバウンス）— 相手画面のインジケーター用
    if (!call?.id) return;
    clearTimeout(muteUpdateTimerRef.current);
    muteUpdateTimerRef.current = setTimeout(() => {
      const isCaller = user?.email === call.caller_email;
      base44.entities.VideoCall.update(call.id, isCaller
        ? { caller_muted: !micOn }
        : { callee_muted: !micOn }
      ).catch(() => {});
    }, 500);
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

    // 残高チェック（送信前に確認）
    if (coinBalance !== null && coinBalance < selectedYell) {
      setShowYellModal(false);
      setShowLowBalanceModal(true);
      return;
    }

    setYellSending(true);

    // ★ UI を即座に更新（楽観的更新）→ 画面フリーズ解消
    const amount = selectedYell;
    const senderName = user.full_name || user.email;
    setCoinBalance(prev => Math.max(0, (prev || 0) - amount));
    setShowYellModal(false);
    setSelectedYell(null);
    addFloating("💰");
    toast.success(`${amount.toLocaleString()} コインのエールを送りました！`);
    setYellSending(false);

    // バックグラウンドで非同期処理（UIをブロックしない）
    (async () => {
      try {
        const senderWallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
        const senderWallet = senderWallets[0];
        if (!senderWallet || senderWallet.balance < amount) {
          toast.error("エールコインが不足しています");
          setCoinBalance(prev => (prev || 0) + amount); // ロールバック
          return;
        }

        // 並列実行で高速化
        const creatorCoins = Math.floor(amount * 0.85);
        const [calleeWallets] = await Promise.all([
          base44.entities.YellCoinWallet.filter({ user_email: call.callee_email }),
          base44.entities.YellCoinWallet.update(senderWallet.id, {
            balance: senderWallet.balance - amount,
            total_sent: (senderWallet.total_sent || 0) + amount,
          }),
          base44.entities.VideoCall.update(call.id, {
            yell_coin_amount: (call.yell_coin_amount || 0) + amount,
          }),
          // ★ YellCoinTransactionを作成（ライバー側がsubscribeで受信する）
          base44.entities.YellCoinTransaction.create({
            user_email: user.email,
            type: "send",
            amount,
            target_name: call.callee_name,
            target_id: call.id,
            service_type: "direct_chat",
            service_id: call.id,
            channel_id: call.callee_channel_id || "",
            channel_owner_email: call.callee_email,
          }),
          // ★ チャット欄にシステムメッセージを投稿（両者に届く）
          base44.entities.DirectChat.create({
            from_email: "system",
            from_name: "💰 エール通知",
            to_channel_owner_email: call.callee_email,
            to_channel_id: call.callee_channel_id || "",
            to_channel_name: call.callee_name || "",
            content: `🎉 ${senderName} さんから ${amount.toLocaleString()} コインのエールが届きました！`,
            yell_coin: amount,
            thread_id: threadId,
          }),
        ]);

        console.log(`[Yell] ✅ Sent ${amount} coins from ${user.email} to ${call.callee_email}`);

        if (calleeWallets[0]) {
          await base44.entities.YellCoinWallet.update(calleeWallets[0].id, {
            balance: (calleeWallets[0].balance || 0) + creatorCoins,
          });
          console.log(`[Yell] ✅ Callee wallet updated: +${creatorCoins} coins`);
        }
      } catch (e) {
        console.error('[Yell] Payment error:', e);
        toast.error("送金処理でエラーが発生しました");
        setCoinBalance(prev => (prev || 0) + amount); // ロールバック
      }
    })();
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

  // 残高不足でのチャージ誘導モーダル
  const [showLowBalanceModal, setShowLowBalanceModal] = useState(false);

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

  // ★ エール受信購読 — call.status === 'active' になった直後に確実に起動
  // user と call が揃った瞬間から購読を開始し、映像接続と同期する
  // ★ CRITICAL: call.status === 'active' でのみ購読を開始（DB更新と画面同期）
  useEffect(() => {
    if (!user || !call || call.status !== 'active') return;
    
    const playCoinSound = () => {
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [[0,1600],[0.1,2400],[0.2,2000]].forEach(([dl,fr]) => {
          const o=ctx.createOscillator(),g=ctx.createGain(); o.connect(g); g.connect(ctx.destination);
          o.type="sine"; o.frequency.setValueAtTime(fr,ctx.currentTime+dl);
          g.gain.setValueAtTime(0.35,ctx.currentTime+dl); g.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+dl+0.6);
          o.start(ctx.currentTime+dl); o.stop(ctx.currentTime+dl+0.6);
        }); setTimeout(()=>ctx.close(),1500);
      } catch {}
    };
    const unsub = base44.entities.YellCoinTransaction.subscribe((ev) => {
      const d = ev.data;
      if (ev.type !== "create" || d?.channel_owner_email !== user.email) return;
      const amount = d.amount || 0;
      
      // ★ CRITICAL: トースト＋アニメーション完全同期（1ミリの遅延なし）
      console.log('[Yell] 🎉 RECEIVED:', { amount, from: d.user_email, timestamp: new Date().toISOString() });
      
      // 音声 + トースト を同時発火
      playCoinSound();
      toast.success(`🎉 +${amount.toLocaleString()} コインのエール受信！獲得: ${Math.floor(amount*0.85)}コイン`, {
        duration: 6000,
        style: { background: 'linear-gradient(135deg,#7c4a00,#b8860b)', border: '2px solid #ffd700', color: '#fff9c4', fontWeight: 'bold', boxShadow: '0 0 24px rgba(255,215,0,0.7)' },
      });
      
      // 同時にアニメーション開始（queueMicrotask で遅延を最小化）
      queueMicrotask(() => {
        addFloating("💰", "coin");
        setTimeout(() => addFloating("🪙", "emoji"), 130);
        setTimeout(() => addFloating("✨", "emoji"), 260);
        setTimeout(() => addFloating("🎉", "emoji"), 390);
        setTimeout(() => addFloating("💛", "emoji"), 520);
      });
      
      // 残高更新（DBとUI同期）
      setCoinBalance(prev => (prev !== null ? prev + Math.floor(amount * 0.85) : prev));
    });
    return ()=>unsub();
  }, [user?.email, call?.status]);

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
    <div className="bg-black flex flex-col" style={{ height: '100dvh', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', minHeight: 0 }}>

      {/* ABR Manager */}
      <AdaptiveBitrateManager
        enabled={abrEnabled && call?.status === "active"}
        currentQuality={videoQuality}
        onQualityChange={(newQuality) => { setVideoQuality(newQuality); setAbrEnabled(false); setTimeout(() => setAbrEnabled(true), 5000); }}
        measureInterval={3000}
      />

      {/* ★ 隔離検証（通話中のみ） */}
      {call?.status === 'active' && (
        <CallIsolationValidator remoteVideoRef={remoteVideoRef} call={call} enabled={true} />
      )}

      {/* Floating items */}
      {floatingItems.map((f) => (
        <FloatingItem key={f.id} item={f.emoji} type={f.type} onDone={() => removeFloating(f.id)} />
      ))}

      {/* VIDEO AREA — 16:9固定（paddingトリックで確実に比率維持） */}
      <div className="relative bg-black w-full" style={{ flexShrink: 0 }}>
      <div ref={videoContainerRef} className="w-full" style={{ paddingTop: '56.25%', position: 'relative', backgroundColor: '#000', overflow: 'hidden' }}>

        {/* ── 常時マウント: リモート映像（active時のみ表示）— 16:9比率死守 ── */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          webkit-playsinline="true"
          x5-playsinline="true"
          onLoadedMetadata={e => {
            e.target.muted = false;
            e.target.volume = 1.0;
            e.target.play().catch(() => {});
          }}
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            objectPosition: 'center center',
            backgroundColor: '#000',
            verticalAlign: 'middle',
            overflow: 'hidden',
            display: call?.status === 'active' ? 'block' : 'none',
            zIndex: 1,
          }}
        />

        {/* ── 常時マウント: ローカル映像（active時はワイプ右下、それ以外はフルスクリーン） ── */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          webkit-playsinline="true"
          onLoadedMetadata={e => e.target.play().catch(() => {})}
          style={call?.status === 'active' ? {
            // active: 右下ワイプ（縦長4:3、スマホカメラ比率）
            position: 'absolute',
            bottom: 8, right: 8,
            width: 72, height: 96,
            objectFit: 'cover',
            borderRadius: 8,
            border: '2px solid rgba(255,255,255,0.5)',
            boxShadow: '0 0 12px rgba(0,255,157,0.4)',
            backgroundColor: '#000',
            zIndex: 10,
            filter: currentFilter?.style || '',
          } : {
            // pending / accepted: 16:9コンテナ内でcontain＋中央表示
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            objectFit: 'contain',
            objectPosition: 'center center',
            backgroundColor: '#000',
            verticalAlign: 'middle',
            zIndex: 1,
            filter: call?.status === 'pending' && !isCaller ? 'brightness(0.5)' : '',
          }}
        />

        {/* active: カメラOFF時のワイプ黒幕 */}
        {call?.status === 'active' && !camOn && (
          <div className="absolute bg-black/80 flex items-center justify-center z-20"
            style={{ bottom: 8, right: 8, width: 72, height: 96, borderRadius: 8 }}>
            <CameraOff className="w-4 h-4 text-white/40" />
          </div>
        )}
        {/* active: ワイプラベル */}
        {call?.status === 'active' && (
          <div className="absolute z-20 text-center" style={{ bottom: 10, right: 8, width: 72 }}>
            <span className="text-[8px] text-white/70 bg-black/60 px-1 py-0.5 rounded-full">あなた</span>
          </div>
        )}

        {/* pending / accepted: カメラOFF時のフルスクリーン黒幕 */}
        {call?.status !== 'active' && !camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-20">
            <CameraOff className="w-16 h-16 text-white/30" />
          </div>
        )}

        {/* ── オーバーレイUI（状態別） ── */}

        {/* PENDING caller: 承認待ち */}
        {call?.status === 'pending' && isCaller && (
          <div className="absolute inset-0 flex flex-col z-30" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 30%, transparent)' }}>
            <div className="absolute bg-black/60 backdrop-blur rounded-full px-4 py-2 left-1/2 -translate-x-1/2" style={{ top: 'calc(env(safe-area-inset-top) + 12px)' }}>
              <span className="text-white/80 text-xs font-bold">📹 {call.callee_name} さんに通話申請中</span>
            </div>
            <div className="mt-auto px-6 w-full max-w-sm mx-auto space-y-4" style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                <p className="text-white/70 text-sm font-bold">承認を待っています...</p>
              </div>
              {/* 最低高さ48px確保 */}
              <button
                onClick={async () => {
                  if (call) await base44.entities.VideoCall.update(call.id, { status: 'cancelled' }).catch(() => {});
                  localStream?.getTracks().forEach(t => t.stop());
                  navigate(-1);
                }}
                className="w-full rounded-2xl bg-red-600/80 border-2 border-red-500 text-white font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                style={{ minHeight: 52 }}
              >
                <PhoneOff className="w-5 h-5" /> キャンセル
              </button>
            </div>
          </div>
        )}

        {/* PENDING callee: 着信UI */}
        {call?.status === 'pending' && !isCaller && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 z-30">
            <div className="text-center space-y-2">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
                <PhoneCall className="w-16 h-16 text-primary mx-auto" style={{ filter: 'drop-shadow(0 0 20px rgba(0,255,157,0.8))' }} />
              </motion.div>
              <p className="text-white font-black text-xl">{call.caller_name || call.caller_email}</p>
              <p className="text-white/60 text-sm">からビデオ通話のリクエスト</p>
            </div>
            {/* 拒否/応答ボタン: 最低64px高さで誤タップ防止 */}
            <div className="flex gap-4 w-full max-w-xs">
              <button
                onClick={() => { base44.entities.VideoCall.update(call.id, { status: 'declined' }).catch(() => {}); navigate(-1); }}
                className="flex-1 rounded-2xl bg-red-600 text-white font-black flex items-center justify-center active:scale-95 transition-transform border-2 border-red-500"
                style={{ minHeight: 64 }}
                aria-label="拒否"
              >
                <PhoneOff className="w-7 h-7" />
              </button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (remoteVideoRef.current) remoteVideoRef.current.play().catch(() => {});
                  base44.entities.VideoCall.update(call.id, { status: 'accepted' }).catch(() => {});
                  setTimeout(() => refetchCall(), 300);
                  setTimeout(() => refetchCall(), 1000);
                }}
                className="flex-1 rounded-2xl text-black font-black flex items-center justify-center gap-2 text-lg"
                style={{ background: 'linear-gradient(135deg, #00ff9d, #00d4aa)', boxShadow: '0 0 30px rgba(0,255,157,0.6)', minHeight: 64 }}
                aria-label="応答"
              >
                <Phone className="w-7 h-7" /> 応答
              </motion.button>
            </div>
          </div>
        )}

        {/* ACCEPTED: 接続中スピナー */}
        {call?.status === 'accepted' && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/50">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 rounded-full border-4 border-primary/40 border-t-primary animate-spin mx-auto" />
              <p className="text-white font-bold">接続中...</p>
            </div>
          </div>
        )}

        {/* ACTIVE: オーバーレイ各種 */}
        {call?.status === 'active' && (
          <div className="absolute inset-0 pointer-events-none z-20">
            {/* カウントダウン */}
            {countdown !== null && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-30">
                <div className="text-center">
                  <p className="text-white text-xl font-bold mb-2">通話開始</p>
                  <p className="text-primary font-black" style={{ fontSize: 80, lineHeight: 1, textShadow: '0 0 30px rgba(0,255,157,0.8)' }}>{countdown}</p>
                </div>
              </div>
            )}
            {/* 通話中ステータス + リモート音声メーター */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 backdrop-blur rounded-full px-3 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-primary text-xs font-bold">通話中</span>
              {/* 相手の音声レベルメーター */}
              <div className="flex items-end gap-[2px] h-3 ml-1">
                {[0.3, 0.5, 0.7, 0.9, 1.0].map((threshold, i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-sm transition-all duration-75"
                    style={{
                      height: `${(i + 1) * 20}%`,
                      backgroundColor: remoteAudioLevel / 100 >= threshold ? '#00ff9d' : 'rgba(255,255,255,0.2)',
                    }}
                  />
                ))}
              </div>
              <span className="text-[9px] text-white/40">相手の声</span>
            </div>
            {/* コイン残高（両者に表示） */}
            {coinBalance !== null && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/80 border border-yellow-500/60 rounded-full px-3 py-1.5 backdrop-blur">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span className="text-yellow-300 font-black text-xs">{coinBalance.toLocaleString()} コイン</span>
              </div>
            )}
            {/* 自分がミュート中の警告（一時離席） */}
            {!micOn && (
              <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-500/60 rounded-xl px-4 py-2 flex items-center gap-2 text-red-300 text-xs font-bold backdrop-blur animate-pulse pointer-events-auto">
                <MicOff className="w-4 h-4 shrink-0" /> マイクOFF（一時離席中）
              </div>
            )}
            {/* 相手がミュート中のインジケーター */}
            <RemoteMuteIndicator call={call} user={user} otherName={otherName} selfMuted={!micOn} />
            {/* 無音検知アラート（マイクON でも5秒間無音の場合） */}
            {micOn && showMicAlert && (
              <div
                className="absolute left-3 right-3 bg-orange-900/95 border border-orange-500/70 rounded-xl px-4 py-2.5 flex items-center gap-2 text-orange-200 text-xs font-bold backdrop-blur pointer-events-auto"
                style={{ top: 48 }}
                onClick={() => { if (localAudioCtxRef.current?.state === 'suspended') localAudioCtxRef.current.resume().catch(() => {}); setShowMicAlert(false); silenceCountRef.current = 0; }}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 text-orange-400" />
                <span className="flex-1">マイクを再確認してください（音声が検出されません）</span>
                <span className="text-orange-400 underline cursor-pointer">再試行</span>
              </div>
            )}
            {/* 30秒カウントダウン */}
            {remainingSeconds !== null && remainingSeconds <= 30 && remainingSeconds > 0 && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur rounded-xl px-3 py-2 text-center border border-cyan-500/30">
                <p className="font-black text-3xl leading-none" style={{ color: '#00ff9d', textShadow: '0 0 10px #00ff9d' }}>{String(remainingSeconds).padStart(2, '0')}</p>
                <p className="text-[10px]" style={{ color: remainingSeconds <= 10 ? '#ff0055' : '#00ff9d' }}>秒</p>
              </div>
            )}
            {/* 延長バナー */}
            {showExtendBanner && !showExtendModal && (
              <div className="absolute top-14 left-4 right-4 bg-black/90 backdrop-blur-xl border border-primary/40 rounded-2xl p-3 flex items-center gap-3 pointer-events-auto">
                <Clock className="w-5 h-5 text-primary shrink-0" />
                <p className="text-white text-sm font-bold flex-1">あと{remainingSeconds}秒 — 延長しますか？</p>
                <button onClick={() => setShowExtendBanner(false)} className="text-white/40 text-xs px-2">終了</button>
                <button onClick={() => setShowExtendModal(true)} className="text-xs font-bold px-3 py-1.5 rounded-xl border border-primary text-primary">延長</button>
              </div>
            )}
            {/* IVS再接続 */}
            {ivsConnectStatus === 'reconnecting' && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-primary/40 border-t-primary animate-spin mx-auto" />
                  <p className="text-white font-bold">再接続中...</p>
                </div>
              </div>
            )}
            {ivsConnectStatus === 'failed' && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-auto">
                <div className="text-center space-y-3 px-6">
                  <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
                  <p className="text-white font-bold">再接続に失敗しました</p>
                  <button onClick={() => handleEndCall(true)} className="px-6 py-2.5 bg-red-600 text-white rounded-full font-bold text-sm">終了</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      </div>{/* /paddingTop wrapper */}
      {/* BOTTOM AREA */}
      <div className="flex flex-col bg-black border-t border-white/10" style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* コントロールバー */}
        <div className="flex items-center justify-between px-4 border-b border-white/10 shrink-0" style={{ paddingTop: 10, paddingBottom: 10 }}>
          {/* マイク・カメラ・設定 */}
          <div className="flex items-center gap-3">
          {/* マイクボタン: OFF時は赤背景+斜線アイコン+「一時離席」ラベル */}
          <div className="flex flex-col items-center gap-1">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all relative ${micOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 ring-2 ring-red-400"}`}
              aria-label={micOn ? "マイクON" : "一時離席中（タップで復帰）"}
              title={micOn ? "マイクON" : "一時離席中 — タップで音声復帰"}
            >
              {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
              {!micOn && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full border-2 border-black" />}
            </button>
            {!micOn && <span className="text-[8px] text-red-400 font-bold leading-none">離席中</span>}
              {/* マイク音声レベルメーター */}
              {micOn && (
                <div className="flex items-end gap-[2px] h-3">
                  {[20, 40, 60, 80, 100].map((threshold, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-sm transition-all duration-75"
                      style={{
                        height: `${(i + 1) * 20}%`,
                        backgroundColor: audioLevel >= threshold ? '#00ff9d' : 'rgba(255,255,255,0.15)',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* カメラボタン: OFF時は赤背景+斜線アイコン */}
            <button
              onClick={() => setCamOn(!camOn)}
              className={`w-12 h-12 rounded-full flex flex-col items-center justify-center transition-all relative ${camOn ? "bg-white/10 hover:bg-white/20" : "bg-red-600 ring-2 ring-red-400"}`}
              aria-label={camOn ? "カメラON" : "カメラOFF"}
            >
              {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
              {!camOn && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full border-2 border-black" />}
            </button>

            {/* 設定 */}
            <button
              onClick={() => togglePanel(activePanel === "settings" ? null : "settings")}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activePanel === "settings" ? "bg-primary/20 border-2 border-primary/60" : "bg-white/10 hover:bg-white/20"}`}
              aria-label="設定"
            >
              <Settings className={`w-5 h-5 ${activePanel === "settings" ? "text-primary" : "text-white/70"}`} />
            </button>
          </div>

          {/* 中央: ステータス + コイン残高 */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${micOn ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {micOn ? "MIC ON" : "MIC OFF"}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${camOn ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                {camOn ? "CAM ON" : "CAM OFF"}
              </span>
            </div>
            {/* コイン残高（両者に表示） */}
            {coinBalance !== null && (
              <button
                onClick={() => navigate("/coin-charge")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border transition-all ${
                  coinBalance < 150
                    ? "bg-red-500/20 border-red-500/50 text-red-400 animate-pulse"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                }`}
              >
                <Coins className="w-2.5 h-2.5" />
                {coinBalance.toLocaleString()} コイン
                {isCaller && coinBalance < 150 && <span className="text-red-300 ml-0.5">残高不足</span>}
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* エールコイン（視聴者のみ・通話中のみ） */}
            {isCaller && call?.status === 'active' && (
              <button
                onClick={() => setShowYellPanel(!showYellPanel)}
                className={`h-12 px-3 rounded-xl border-2 transition-all font-bold text-xs flex items-center gap-1.5 ${showYellPanel ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-400" : "bg-white/10 border-white/20 text-white/70 hover:border-yellow-500/40"}`}
                aria-label="エールコインを送る"
              >
                <Coins className="w-4 h-4" /> エール
              </button>
            )}

            {/* 通話終了 — 最大サイズで誤タップ防止 + z-index確保 */}
            <motion.button
              onClick={handleEndCall}
              animate={{ boxShadow: ["0 0 15px rgba(255,0,85,0.5)", "0 0 30px rgba(255,0,85,0.9)", "0 0 15px rgba(255,0,85,0.5)"] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-14 h-14 rounded-full bg-red-600 flex items-center justify-center border-2 border-red-400 hover:bg-red-500 active:scale-95 transition-transform"
              style={{ position: 'relative', zIndex: 40 }}
              aria-label="通話を終了する"
            >
              <PhoneOff className="w-6 h-6 text-white" />
            </motion.button>
          </div>
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

        {/* ══ pending caller: タイトル・説明・プロフィール表示エリア ══ */}
        {call?.status === 'pending' && isCaller && calleeChannel && (
          <div className="border-b border-white/10 px-4 py-3 shrink-0 overflow-y-auto space-y-3" style={{ maxHeight: '40vh' }}>
            {/* チャンネルプロフィール */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/20">
                {calleeChannel.avatar_url
                  ? <img src={calleeChannel.avatar_url} alt={calleeChannel.name} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-black text-sm">{calleeChannel.name?.[0]}</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{calleeChannel.name}</p>
              </div>
              <button
                onClick={() => navigate(`/channel/${call.callee_channel_id}`)}
                className="text-xs text-primary border border-primary/40 px-2.5 py-1 rounded-full hover:bg-primary/10 transition-all shrink-0"
              >
                チャンネルへ
              </button>
            </div>
            {/* チャンネル説明文 */}
            {calleeChannel.description && (
              <div className="bg-white/5 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold mb-1">📝 ライバーの説明</p>
                <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{calleeChannel.description}</p>
              </div>
            )}
            {/* 通話テーマ（タイトル） */}
            {calleeChannel.call_theme && (
              <div className="bg-white/5 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-primary/70 font-bold mb-1">📞 通話テーマ</p>
                <p className="text-white text-sm font-bold leading-snug">{calleeChannel.call_theme}</p>
              </div>
            )}
            {/* 通話可能日時・説明文 */}
            {calleeChannel.call_available_dates && (
              <div className="bg-white/5 rounded-xl px-3 py-2.5">
                <p className="text-[10px] text-white/40 font-bold mb-1">📅 説明・対応日時</p>
                <p className="text-white/80 text-xs leading-relaxed whitespace-pre-wrap">{calleeChannel.call_available_dates}</p>
              </div>
            )}
          </div>
        )}

        {/* 設定パネル（デバイス + エフェクト） */}
        {activePanel === "settings" && (
          <CallSettingsPanel
            videoDevices={videoDevices} audioDevices={audioDevices}
            selectedCameraId={selectedCameraId} selectedMicId={selectedMicId}
            switchCamera={switchCamera} switchMic={switchMic}
            effectKey={selectedFilter}
            onEffectChange={setSelectedFilter}
            localVideoRef={localVideoRef}
          />
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
            const isYell = msg.from_email === "system" && msg.yell_coin > 0;
            if (isYell) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <div className="rounded-2xl px-4 py-2 text-xs font-bold text-center"
                    style={{ background: 'linear-gradient(135deg, rgba(234,179,8,0.3), rgba(234,179,8,0.1))', border: '1px solid rgba(234,179,8,0.5)', boxShadow: '0 0 12px rgba(234,179,8,0.3)', color: '#fde047' }}>
                    {msg.content}
                  </div>
                </div>
              );
            }
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

        {/* チャット入力欄 — safe-area-inset-bottom で最下部見切れ対応 */}
        <div className="px-3 border-t border-white/10 flex gap-2 items-center shrink-0" style={{ paddingTop: '12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
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

      {/* 残高不足チャージ誘導モーダル */}
      <Dialog open={showLowBalanceModal} onOpenChange={setShowLowBalanceModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-yellow-400">
              <Coins className="w-5 h-5" /> エールコインが不足しています
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary rounded-xl p-4 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">現在の残高</span>
              <span className="text-2xl font-black text-red-400">{(coinBalance || 0).toLocaleString()} コイン</span>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 text-xs text-yellow-300">
              エールコインをチャージして、応援の気持ちを届けましょう！
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowLowBalanceModal(false)}>
                キャンセル
              </Button>
              <Button
                className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-bold gap-2"
                onClick={() => {
                  setShowLowBalanceModal(false);
                  navigate("/coin-charge");
                }}
              >
                <Coins className="w-4 h-4" /> コインをチャージ
              </Button>
            </div>
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