/**
 * CallWaitingWidget
 * 配信者ダッシュボード用: 通話待機ON/OFFボタン + pendingコール着信ポップアップ
 * リアルタイムでVideoCallをポーリング。新着があれば画面全体にオーバーレイ着信を出す。
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PhoneCall, PhoneOff, CheckCircle2, XCircle, Clock, User } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export default function CallWaitingWidget({ user, channel }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // channel.call_enabled をDBから初期値として使う
  const [waiting, setWaiting] = useState(!!channel?.call_enabled);
  const [incomingCall, setIncomingCall] = useState(null); // 着信中のコール
  const prevIdsRef = useRef(new Set());

  // channelが後から読み込まれたときに同期（初回のみ）
  const syncedRef = useRef(false);
  React.useEffect(() => {
    if (!syncedRef.current && channel?.call_enabled !== undefined) {
      setWaiting(!!channel.call_enabled);
      syncedRef.current = true;
    }
  }, [channel?.call_enabled]);

  // pendingコールをポーリング（waiting中のみ）
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["widget-pending-calls", channel?.id],
    queryFn: () => base44.entities.VideoCall.filter(
      { callee_channel_id: channel.id, status: "pending" },
      "-created_date",
      10
    ),
    enabled: !!channel?.id && waiting,
    refetchInterval: 3000,
  });

  // 新着検出 → 着信ポップアップ
  useEffect(() => {
    if (!waiting || pendingCalls.length === 0) return;
    const currentIds = new Set(pendingCalls.map((c) => c.id));

    if (prevIdsRef.current.size === 0) {
      // 初回ロード: IDだけ記録、通知しない
      prevIdsRef.current = currentIds;
      return;
    }

    const newCalls = pendingCalls.filter((c) => !prevIdsRef.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      setIncomingCall(newCalls[0]);
    }
    prevIdsRef.current = currentIds;
  }, [pendingCalls, waiting]);

  const handleStartWaiting = async () => {
    if (!channel) {
      toast.error("チャンネルが見つかりません。チャンネルを作成してください。");
      return;
    }
    await base44.entities.Channel.update(channel.id, { call_enabled: true });
    prevIdsRef.current = new Set(); // リセット
    setWaiting(true);
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
    queryClient.invalidateQueries({ queryKey: ["widget-pending-calls", channel?.id] });
    navigate(`/video-call/${call.id}`);
  };

  const handleDecline = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "declined" });
    setIncomingCall(null);
    queryClient.invalidateQueries({ queryKey: ["widget-pending-calls", channel?.id] });
    toast.info("通話を断りました。");
  };

  return (
    <>
      {/* 待機ボタン */}
      <div className={`rounded-2xl border p-4 flex items-center justify-between gap-4 transition-all ${
        waiting
          ? "bg-primary/10 border-primary/40"
          : "bg-card border-border/50"
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${waiting ? "bg-primary/20" : "bg-secondary"}`}>
            <PhoneCall className={`w-5 h-5 ${waiting ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-bold text-sm flex items-center gap-2">
              通話待機
              {waiting && <span className="flex items-center gap-1 text-xs text-green-400 font-semibold"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" /> 受付中</span>}
            </p>
            <p className="text-xs text-muted-foreground">
              {waiting
                ? `申込が届くと自動で着信します (${pendingCalls.length}件待機中)`
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

      {/* 着信オーバーレイ */}
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.8, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 30 }}
              className="bg-card border-2 border-primary/60 rounded-3xl p-8 max-w-sm w-full mx-4 text-center space-y-6 shadow-2xl"
              style={{ boxShadow: "0 0 60px rgba(0,255,157,0.3)" }}
            >
              {/* アニメーションアイコン */}
              <div className="relative mx-auto w-20 h-20">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                <div className="relative w-20 h-20 rounded-full bg-primary/30 flex items-center justify-center">
                  <PhoneCall className="w-9 h-9 text-primary" />
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-primary uppercase tracking-widest">着信</p>
                <p className="text-xl font-black">{incomingCall.caller_name || incomingCall.caller_email}</p>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground mt-2">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{incomingCall.duration_minutes}分</span>
                  {incomingCall.is_free_call
                    ? <span className="text-green-400 font-semibold">無料通話</span>
                    : <span className="text-primary font-semibold">¥{(incomingCall.price || 0).toLocaleString()}</span>
                  }
                </div>
                {incomingCall.message && (
                  <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2 mt-2 text-left line-clamp-3">
                    {incomingCall.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => handleDecline(incomingCall)}
                  variant="outline"
                  className="h-12 gap-2 border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="w-5 h-5" /> 断る
                </Button>
                <Button
                  onClick={() => handleAccept(incomingCall)}
                  className="h-12 gap-2 bg-primary hover:bg-primary/90 text-black font-bold"
                  style={{ boxShadow: "0 0 20px rgba(0,255,157,0.4)" }}
                >
                  <CheckCircle2 className="w-5 h-5" /> 承諾
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}