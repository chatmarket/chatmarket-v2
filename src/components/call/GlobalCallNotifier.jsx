/**
 * GlobalCallNotifier
 * ログインユーザー全員に対して：
 * 1. 着信通知（callee側）→ 承認/拒否モーダル
 * 2. 通話承認通知（caller側）→ 「承認されました！通話開始」バナー
 * チャンネルの有無に関係なく全ユーザーに対して動作する
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, CheckCircle2, XCircle, Video } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalCallNotifier({ user }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ---- 着信側（自分がcallee）----
  const [incomingCall, setIncomingCall] = useState(null);
  const seenIncomingRef = useRef(new Set());
  const incomingInitRef = useRef(false);

  // ---- 発信側（自分がcaller）: 承認通知 ----
  const [acceptedCall, setAcceptedCall] = useState(null);
  const seenAcceptedRef = useRef(new Set());
  const callerInitRef = useRef(false);

  // ---- 着信ポーリング: 初回1回のみ、以降はリアルタイム購読のみ ----
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["global-incoming-calls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { callee_email: user.email, status: "pending" },
      "-created_date", 5
    ),
    enabled: !!user?.email,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  // ---- 発信済み通話の承認: 初回1回のみ、以降はリアルタイム購読のみ ----
  const { data: callerCalls = [] } = useQuery({
    queryKey: ["global-caller-accepted", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { caller_email: user.email, status: "accepted" },
      "-created_date", 3
    ),
    enabled: !!user?.email,
    refetchInterval: false,
    refetchIntervalInBackground: false,
    staleTime: 60000,
  });

  // リアルタイム購読のみで更新（ポーリング廃止）
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      const d = event.data;
      if (!d) return;
      if (d.callee_email === user.email && d.status === "pending") {
        queryClient.invalidateQueries({ queryKey: ["global-incoming-calls", user.email] });
      }
      if (d.caller_email === user.email && d.status === "accepted") {
        queryClient.invalidateQueries({ queryKey: ["global-caller-accepted", user.email] });
      }
    });
    return () => unsub();
  }, [user?.email, queryClient]);

  // 着信検出
  useEffect(() => {
    if (!incomingInitRef.current) {
      pendingCalls.forEach(c => seenIncomingRef.current.add(c.id));
      incomingInitRef.current = true;
      return;
    }
    const newCalls = pendingCalls.filter(c => !seenIncomingRef.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      setIncomingCall(newCalls[0]);
      newCalls.forEach(c => seenIncomingRef.current.add(c.id));
      playRingtone();
    }
  }, [pendingCalls]);

  // 承認通知検出（caller側）
  useEffect(() => {
    if (!callerInitRef.current) {
      callerCalls.forEach(c => seenAcceptedRef.current.add(c.id));
      callerInitRef.current = true;
      return;
    }
    const newAccepted = callerCalls.filter(c => !seenAcceptedRef.current.has(c.id));
    if (newAccepted.length > 0 && !acceptedCall) {
      setAcceptedCall(newAccepted[0]);
      newAccepted.forEach(c => seenAcceptedRef.current.add(c.id));
      // 承認音
      playAcceptSound();
    }
  }, [callerCalls]);

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (t, f) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        o.start(t); o.stop(t + 0.4);
      };
      beep(ctx.currentTime, 880);
      beep(ctx.currentTime + 0.5, 1100);
      beep(ctx.currentTime + 1.0, 880);
      beep(ctx.currentTime + 1.5, 1100);
    } catch {}
  };

  const playAcceptSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (t, f, dur = 0.3) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = "sine"; o.frequency.setValueAtTime(f, t);
        g.gain.setValueAtTime(0.3, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + dur);
        o.start(t); o.stop(t + dur);
      };
      beep(ctx.currentTime, 660);
      beep(ctx.currentTime + 0.3, 880);
      beep(ctx.currentTime + 0.6, 1100);
    } catch {}
  };

  const handleAccept = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "accepted" });
    setIncomingCall(null);
    navigate(`/video-call/${call.id}`);
  };

  const handleDecline = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "declined" });
    setIncomingCall(null);
    toast.info("通話を断りました");
  };

  const handleJoinAccepted = (call) => {
    setAcceptedCall(null);
    navigate(`/video-call/${call.id}`);
  };

  return (
    <>
      {/* ===== 着信モーダル（自分がcallee） ===== */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-card border-2 border-primary rounded-3xl p-10 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl"
              style={{ boxShadow: "0 0 80px rgba(0,255,157,0.5)" }}
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
                <Button
                  onClick={() => handleDecline(incomingCall)}
                  variant="outline"
                  className="flex-1 h-14 text-base gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-5 h-5" /> 断る
                </Button>
                <Button
                  onClick={() => handleAccept(incomingCall)}
                  className="flex-1 h-14 text-base font-black gap-2 bg-primary hover:bg-primary/90 text-black"
                  style={{ boxShadow: "0 0 30px rgba(0,255,157,0.5)" }}
                >
                  <CheckCircle2 className="w-5 h-5" /> 承認する
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===== 承認通知バナー（自分がcaller） ===== */}
      <AnimatePresence>
        {acceptedCall && (
          <AcceptedCallBanner
            call={acceptedCall}
            onJoin={() => handleJoinAccepted(acceptedCall)}
            onClose={() => setAcceptedCall(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function AcceptedCallBanner({ call, onJoin, onClose }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onJoin();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: -100, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -100, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-[9998]"
    >
      <div
        className="rounded-2xl overflow-hidden shadow-2xl"
        style={{
          background: "rgba(0,15,8,0.97)",
          border: "2px solid #00ff9d",
          boxShadow: "0 0 40px rgba(0,255,157,0.5), 0 8px 32px rgba(0,0,0,0.6)",
        }}
      >
        {/* カウントダウンプログレスバー */}
        <motion.div
          className="h-1 bg-primary"
          initial={{ width: "100%" }}
          animate={{ width: "0%" }}
          transition={{ duration: 5, ease: "linear" }}
        />

        <div className="p-4 space-y-3">
          {/* アイコン＋テキスト */}
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center shrink-0">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              >
                <CheckCircle2 className="w-5 h-5 text-primary" />
              </motion.div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm leading-tight">
                {call.callee_name || "ライバー"} さんが承認しました！
              </p>
              <p className="text-primary text-xs mt-0.5 font-semibold">
                {countdown}秒後に通話画面へ自動移動します
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white/30 hover:text-white/70 text-xs shrink-0 mt-0.5 px-1"
            >
              ✕
            </button>
          </div>

          {/* ボタン */}
          <Button
            onClick={onJoin}
            className="w-full h-11 font-black text-sm gap-2 text-black"
            style={{
              background: "linear-gradient(135deg, #00ff9d, #00d4aa)",
              boxShadow: "0 0 20px rgba(0,255,157,0.5)",
            }}
          >
            <Video className="w-4 h-4" />
            今すぐ通話画面へ
          </Button>
        </div>
      </div>
    </motion.div>
  );
}