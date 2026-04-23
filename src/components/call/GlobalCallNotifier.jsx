/**
 * GlobalCallNotifier
 * ログインユーザー全員に対して：
 * 1. 着信通知（callee側）→ 承認/拒否モーダル
 * 2. 通話承認通知（caller側）→ 「承認されました！通話開始」バナー
 * チャンネルの有無に関係なく全ユーザーに対して動作する
 */
import React, { useState, useEffect, useRef } from "react";
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

  // ---- 着信ポーリング ----
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["global-incoming-calls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { callee_email: user.email, status: "pending" },
      "-created_date", 5
    ),
    enabled: !!user?.email,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // ---- 発信済み通話の承認ポーリング ----
  const { data: callerCalls = [] } = useQuery({
    queryKey: ["global-caller-accepted", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { caller_email: user.email, status: "accepted" },
      "-created_date", 3
    ),
    enabled: !!user?.email,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // リアルタイム購読
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
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-full max-w-sm mx-4 px-4"
          >
            <div
              className="rounded-2xl p-4 flex items-center gap-4 shadow-2xl"
              style={{ background: "rgba(0,20,10,0.97)", border: "2px solid #00ff9d", boxShadow: "0 0 40px rgba(0,255,157,0.6)" }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/30 flex items-center justify-center shrink-0 border border-primary">
                <CheckCircle2 className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm">{acceptedCall.callee_name} さんが承認しました！</p>
                <p className="text-primary/80 text-xs">今すぐ通話を開始できます</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleJoinAccepted(acceptedCall)}
                  className="bg-primary hover:bg-primary/90 text-black font-black text-xs h-8 gap-1"
                >
                  <Video className="w-3.5 h-3.5" /> 通話開始
                </Button>
                <button
                  onClick={() => setAcceptedCall(null)}
                  className="text-[10px] text-white/40 hover:text-white/70 text-center"
                >
                  閉じる
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}