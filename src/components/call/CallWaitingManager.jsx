/**
 * CallWaitingManager
 * 配信者が通話待機状況を一目で把握・管理できる専用コンポーネント
 * - ワンクリックON/OFF
 * - 待機時間・予約状況の表示
 * - 過去の通話履歴サマリー
 */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  PhoneCall, PhoneOff, Clock, CheckCircle2, XCircle,
  Calendar, TrendingUp, Users, Zap, ChevronRight, Info
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export default function CallWaitingManager({ user, channel, onStatusChange }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [waiting, setWaiting] = useState(!!channel?.call_enabled);
  const [waitingSince, setWaitingSince] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [toggling, setToggling] = useState(false);
  const seenIdsRef = useRef(new Set());
  const initialLoadDoneRef = useRef(false);
  const syncedRef = useRef(false);

  // channelが後から読み込まれたときに同期
  useEffect(() => {
    if (!syncedRef.current && channel?.call_enabled !== undefined) {
      setWaiting(!!channel.call_enabled);
      syncedRef.current = true;
    }
  }, [channel?.call_enabled]);

  // 待機開始からの経過時間
  useEffect(() => {
    if (waiting && !waitingSince) setWaitingSince(new Date());
    if (!waiting) setWaitingSince(null);
  }, [waiting]);

  // 経過時間カウンター
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    if (!waitingSince) { setElapsed(""); return; }
    const tick = () => {
      const diff = Math.floor((Date.now() - waitingSince.getTime()) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setElapsed(h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}` : `${m}:${String(s).padStart(2,'0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [waitingSince]);

  // pending通話取得
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["call-manager-pending", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { callee_email: user.email, status: "pending" }, "-created_date", 10
    ),
    enabled: !!user?.email,
    refetchInterval: 10000,
    staleTime: 0,
  });

  // 過去の通話履歴（直近20件）
  const { data: callHistory = [] } = useQuery({
    queryKey: ["call-manager-history", user?.email],
    queryFn: () => base44.entities.VideoCall.filter(
      { callee_email: user.email }, "-created_date", 20
    ),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  // 予約（CallReservation）
  const { data: reservations = [] } = useQuery({
    queryKey: ["call-manager-reservations", channel?.id],
    queryFn: () => base44.entities.CallReservation
      ? base44.entities.CallReservation.filter({ channel_id: channel.id, status: "confirmed" }, "scheduled_at", 10)
      : Promise.resolve([]),
    enabled: !!channel?.id,
    staleTime: 30000,
  });

  // リアルタイム購読（着信即時検出 → 即座に navigate）
  useEffect(() => {
    if (!user?.email) return;
    const unsub = base44.entities.VideoCall.subscribe((event) => {
      const data = event.data;
      if (!data) return;
      
      // ライバー側：pending着信を即座に拾ってオーバーレイ表示
      if (data.callee_email === user.email && data.status === "pending" && !seenIdsRef.current.has(event.id)) {
        console.log('[CallWaitingManager] 🔔 INSTANT incoming call:', event.id);
        queryClient.invalidateQueries({ queryKey: ["call-manager-pending", user.email] });
        seenIdsRef.current.add(event.id);
        if (!incomingCall) {
          setIncomingCall({ ...data, id: event.id });
          playRingtone();
        }
      }
      
      // accepted/active になったら即座に通話ページへ強制遷移
      if (data.callee_email === user.email && ["accepted", "active"].includes(data.status)) {
        const callId = event.id || data.id;
        if (callId) {
          console.log('[CallWaitingManager] 🚀 Call accepted/active → navigating to', callId);
          navigate(`/video-call/${callId}`);
        }
      }
    });
    return () => unsub();
  }, [user?.email, queryClient, incomingCall, navigate]);

  // 着信検出
  useEffect(() => {
    if (pendingCalls.length === 0) {
      if (!initialLoadDoneRef.current) initialLoadDoneRef.current = true;
      return;
    }
    if (!initialLoadDoneRef.current) {
      pendingCalls.forEach((c) => seenIdsRef.current.add(c.id));
      initialLoadDoneRef.current = true;
      return;
    }
    const newCalls = pendingCalls.filter((c) => !seenIdsRef.current.has(c.id));
    if (newCalls.length > 0 && !incomingCall) {
      setIncomingCall(newCalls[0]);
      newCalls.forEach((c) => seenIdsRef.current.add(c.id));
      playRingtone();
    }
  }, [pendingCalls]);

  const playRingtone = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [[0, 880], [0.5, 1100], [1.0, 880], [1.5, 1100]].forEach(([t, f]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(f, ctx.currentTime + t);
        gain.gain.setValueAtTime(0.4, ctx.currentTime + t);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);
        osc.start(ctx.currentTime + t);
        osc.stop(ctx.currentTime + t + 0.4);
      });
    } catch (e) {}
  };

  const handleToggle = async () => {
    if (!channel) { toast.error("チャンネルが見つかりません"); return; }
    setToggling(true);
    try {
      const newState = !waiting;
      await base44.entities.Channel.update(channel.id, { call_enabled: newState });
      setWaiting(newState);
      if (newState) {
        seenIdsRef.current = new Set();
        initialLoadDoneRef.current = false;
        toast.success("通話待機を開始しました");
      } else {
        setIncomingCall(null);
        toast.info("通話待機を終了しました");
      }
      onStatusChange?.(newState);
    } finally {
      setToggling(false);
    }
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

  // 統計計算
  const completedCalls = callHistory.filter(c => c.status === "ended");
  const totalRevenue = completedCalls.reduce((sum, c) => sum + (c.coins_consumed || 0), 0);
  const avgDuration = completedCalls.length > 0
    ? Math.round(completedCalls.reduce((sum, c) => sum + (c.actual_duration_minutes || 0), 0) / completedCalls.length)
    : 0;

  const PRICE_OPTIONS = [
    { key: "call_price_15min", label: "15分", val: channel?.call_price_15min },
    { key: "call_price_30min", label: "30分", val: channel?.call_price_30min },
    { key: "call_price_60min", label: "60分", val: channel?.call_price_60min },
  ].filter(p => p.val > 0);

  return (
    <>
      <div className="space-y-4">
        {/* ===== メイン待機トグルカード ===== */}
        <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-500 ${
          waiting
            ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
            : "border-border bg-card"
        }`}>
          {/* 待機中の背景アニメーション */}
          {waiting && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 animate-pulse" />
            </div>
          )}

          <div className="relative p-5 flex items-center gap-4">
            {/* アイコン */}
            <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shrink-0 ${
              waiting ? "bg-primary/20" : "bg-secondary"
            }`}>
              {waiting && (
                <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-50" />
              )}
              <PhoneCall className={`w-7 h-7 ${waiting ? "text-primary" : "text-muted-foreground"}`} />
            </div>

            {/* ステータステキスト */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-lg">通話待機</h3>
                {waiting && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-400/10 px-2 py-0.5 rounded-full border border-green-400/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    受付中
                  </span>
                )}
                {pendingCalls.length > 0 && (
                  <span className="text-xs font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/30 animate-pulse">
                    {pendingCalls.length}件の申込あり
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                {waiting
                  ? elapsed ? `待機中 ${elapsed} 経過` : "待機開始しました"
                  : "ONにするとビデオ通話の申込を受け付けます"}
              </p>
            </div>

            {/* トグルボタン */}
            <Button
              onClick={handleToggle}
              disabled={toggling}
              size="lg"
              className={`shrink-0 h-12 px-6 font-bold gap-2 transition-all ${
                waiting
                  ? "bg-destructive/10 text-destructive border border-destructive/40 hover:bg-destructive/20"
                  : "bg-primary hover:bg-primary/90 text-black"
              }`}
              variant={waiting ? "outline" : "default"}
            >
              {toggling ? (
                <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              ) : waiting ? (
                <><PhoneOff className="w-4 h-4" />待機終了</>
              ) : (
                <><PhoneCall className="w-4 h-4" />待機開始</>
              )}
            </Button>
          </div>

          {/* 料金表示バー */}
          {waiting && PRICE_OPTIONS.length > 0 && (
            <div className="border-t border-primary/20 px-5 py-3 flex items-center gap-4 flex-wrap">
              <span className="text-xs text-muted-foreground font-medium">設定料金:</span>
              {PRICE_OPTIONS.map(p => (
                <span key={p.key} className="text-xs font-bold text-primary">
                  {p.label} ¥{p.val?.toLocaleString()}
                </span>
              ))}
              {channel?.call_theme && (
                <span className="text-xs text-muted-foreground ml-auto truncate max-w-[180px]">
                  テーマ: {channel.call_theme}
                </span>
              )}
            </div>
          )}
        </div>

        {/* ===== 統計カード 3列 ===== */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-black">{completedCalls.length}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">通話実績</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <TrendingUp className="w-5 h-5 text-yellow-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-yellow-400">{totalRevenue.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">累計コイン</p>
          </div>
          <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
            <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
            <p className="text-2xl font-black text-blue-400">{avgDuration}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">平均分数</p>
          </div>
        </div>

        {/* ===== 申込中リスト ===== */}
        {pendingCalls.length > 0 && (
          <div className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-yellow-400 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 申込待ち ({pendingCalls.length}件)
            </h4>
            {pendingCalls.map(call => (
              <div key={call.id} className="flex items-center gap-3 bg-card rounded-lg p-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold truncate">{call.caller_name || call.caller_email}</p>
                  <p className="text-xs text-muted-foreground">
                    {call.duration_minutes || 15}分 ·{" "}
                    {call.is_free_call ? "無料" : `¥${(call.price || 0).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" className="h-8 text-xs border-red-500/40 text-red-400 hover:bg-red-500/10"
                    onClick={() => handleDecline(call)}>
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90 text-black"
                    onClick={() => handleAccept(call)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />応答
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== 予約一覧 ===== */}
        {reservations.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-bold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" /> 予約済み ({reservations.length}件)
            </h4>
            {reservations.slice(0, 3).map(r => (
              <div key={r.id} className="flex items-center gap-3 text-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground text-xs">
                  {new Date(r.scheduled_at).toLocaleString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
                <span className="font-medium truncate flex-1">{r.caller_name || r.caller_email}</span>
                <span className="text-xs text-primary">{r.duration_minutes}分</span>
              </div>
            ))}
          </div>
        )}

        {/* ===== 最近の通話履歴 ===== */}
        {callHistory.length > 0 && (
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
              <h4 className="text-sm font-bold">最近の通話</h4>
              <button onClick={() => navigate("/call-history")} className="text-xs text-primary flex items-center gap-1 hover:underline">
                すべて見る <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="divide-y divide-border/30">
              {callHistory.slice(0, 5).map(call => (
                <div key={call.id} className="px-4 py-3 flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    call.status === "ended" ? "bg-green-400" :
                    call.status === "declined" ? "bg-red-400" :
                    call.status === "cancelled" ? "bg-gray-400" : "bg-yellow-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{call.caller_name || call.caller_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.created_date), { addSuffix: true, locale: ja })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-primary">
                      {call.status === "ended" ? `${call.actual_duration_minutes || 0}分` : 
                       call.status === "declined" ? "断った" :
                       call.status === "cancelled" ? "キャンセル" : call.status}
                    </p>
                    {call.coins_consumed > 0 && (
                      <p className="text-[10px] text-yellow-400">{call.coins_consumed}コイン</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== モード設定ヒント ===== */}
        {channel?.incoming_call_mode === "AUTO_ACCEPT" && (
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-xl p-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              <span className="font-bold">自動承諾モード</span>が有効です。申込が届くと即座に通話が開始されます。
            </p>
          </div>
        )}
      </div>

      {/* ===== 着信オーバーレイ ===== */}
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
                <p className="text-2xl font-black">{incomingCall.caller_name || incomingCall.caller_email}</p>
                <p className="text-base text-white/60">さんからの通話リクエスト</p>
                <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{incomingCall.duration_minutes || 15}分</span>
                  {incomingCall.is_free_call
                    ? <span className="text-green-400 font-semibold">無料通話</span>
                    : <span className="text-primary font-semibold">¥{(incomingCall.price || 0).toLocaleString()}</span>}
                </div>
                {incomingCall.message && (
                  <p className="text-sm text-white/50 bg-secondary rounded-xl px-4 py-2 text-left line-clamp-3">
                    {incomingCall.message}
                  </p>
                )}
              </div>
              <div className="flex gap-4">
                <Button onClick={() => handleDecline(incomingCall)} variant="outline"
                  className="flex-1 h-14 text-base gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
                  <XCircle className="w-5 h-5" /> 断る
                </Button>
                <Button onClick={() => handleAccept(incomingCall)}
                  className="flex-1 h-14 text-base font-black gap-2 bg-primary hover:bg-primary/90 text-black"
                  style={{ boxShadow: "0 0 30px rgba(0,255,157,0.5)" }}>
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