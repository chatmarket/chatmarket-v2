/**
 * CallWaitingWidget
 * どの画面にいても着信を検知してモーダルを出す。
 * callee_email でポーリング（callee_channel_id に依存しない）
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CallWaitingWidget({ user, channel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [waiting, setWaiting] = useState(!!channel?.call_enabled);
  const [incomingCall, setIncomingCall] = useState(null);
  const seenIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);

  // channelが後から読み込まれたときに同期（初回のみ）
  const syncedRef = useRef(false);
  useEffect(() => {
    if (!syncedRef.current && channel?.call_enabled !== undefined) {
      setWaiting(!!channel.call_enabled);
      syncedRef.current = true;
    }
  }, [channel?.call_enabled]);

  // ★ callee_email でポーリング（channel_id に依存しない。3秒ごと）
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["widget-pending-calls-v2", user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const results = await base44.entities.VideoCall.filter(
        { callee_email: user.email, status: "pending" },
        "-created_date",
        5
      );
      console.log(`[CallWaitingWidget] 📞 Polled pending calls for ${user.email}:`, results.length, 'found');
      return results;
    },
    enabled: !!user?.email,
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  // ★ リアルタイム購読も併用（二重で監視）
  useEffect(() => {
    if (!user?.email) return;
    console.log('[CallWaitingWidget] 📡 Subscribing to VideoCall events for:', user.email);
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      const data = event.data;
      if (data?.callee_email === user.email && data?.status === 'pending') {
        console.log('[CallWaitingWidget] 🔔 Real-time incoming call detected:', data.id);
        queryClient.invalidateQueries({ queryKey: ["widget-pending-calls-v2", user.email] });
      }
    });
    return () => unsub();
  }, [user?.email, queryClient]);

  // ★ 着信検出：初回ロード後の新着のみ表示
  useEffect(() => {
    if (pendingCalls.length === 0) {
      if (!initialLoadDoneRef.current) initialLoadDoneRef.current = true;
      return;
    }

    if (!initialLoadDoneRef.current) {
      // 初回: 既存IDを記録するだけで通知しない
      pendingCalls.forEach((c) => seenIdsRef.current.add(c.id));
      initialLoadDoneRef.current = true;
      console.log('[CallWaitingWidget] 📋 Initial load: seeded', seenIdsRef.current.size, 'existing calls');
      return;
    }

    // 新着を検出
    const newCalls = pendingCalls.filter((c) => !seenIdsRef.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      console.log('[CallWaitingWidget] 🚨 NEW incoming call:', newCalls[0].id, 'from', newCalls[0].caller_email);
      setIncomingCall(newCalls[0]);
      newCalls.forEach((c) => seenIdsRef.current.add(c.id));
    }
  }, [pendingCalls]);

  const handleStartWaiting = async () => {
    if (!channel) {
      toast.error("チャンネルが見つかりません。");
      return;
    }
    await base44.entities.Channel.update(channel.id, { call_enabled: true });
    setWaiting(true);
    // リセット: 待機開始時に既存の着信を再度拾えるようにする
    seenIdsRef.current = new Set();
    initialLoadDoneRef.current = false;
    toast.success("通話待機を開始しました。");
  };

  const handleStopWaiting = async () => {
    if (channel) await base44.entities.Channel.update(channel.id, { call_enabled: false });
    setWaiting(false);
    setIncomingCall(null);
    toast.info("通話待機を終了しました。");
  };

  const handleAccept = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "accepted" });
    setIncomingCall(null);
    navigate(`/video-call/${call.id}`);
  };

  const handleDecline = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "declined" });
    setIncomingCall(null);
    toast.info("通話を断りました。");
  };

  return (
    <>
      {/* 待機ボタン */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${
        waiting ? "bg-primary/10 border-primary/40" : "bg-card border-border/50"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${waiting ? "bg-primary/20" : "bg-secondary"}`}>
            <PhoneCall className={`w-5 h-5 ${waiting ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-sm flex items-center gap-2">
              通話待機
              {waiting && (
                <span className="flex items-center gap-1 text-xs text-green-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> 受付中
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {waiting
                ? `申込が届くと着信します（${pendingCalls.length}件待機中）`
                : "ONにするとビデオ通話の申込を受け付けます"}
            </p>
          </div>
        </div>
        {waiting ? (
          <Button size="sm" variant="outline" className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 shrink-0" onClick={handleStopWaiting}>
            <PhoneOff className="w-4 h-4" /> 待機終了
          </Button>
        ) : (
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 shrink-0" onClick={handleStartWaiting}>
            <PhoneCall className="w-4 h-4" /> 待機開始
          </Button>
        )}
      </div>

      {/* ★ 着信オーバーレイ（どの画面でも最前面） */}
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
              className="bg-card border-2 border-primary rounded-3xl p-10 max-w-md w-full mx-4 text-center space-y-6 shadow-2xl"
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
                <p className="text-base text-white/60">さんからの通話リクエスト</p>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{incomingCall.duration_minutes || 15}分</span>
                  {incomingCall.is_free_call
                    ? <span className="text-green-400 font-semibold">無料通話</span>
                    : <span className="text-primary font-semibold">¥{(incomingCall.price || 0).toLocaleString()}</span>
                  }
                </div>
                {incomingCall.message && (
                  <p className="text-sm text-white/50 bg-secondary rounded-xl px-4 py-2 text-left line-clamp-3">
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
                  <CheckCircle2 className="w-5 h-5" /> 通話を開始する
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}