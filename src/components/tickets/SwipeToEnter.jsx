/**
 * SwipeToEnter — 右スワイプ（またはドラッグ）で入場処理するもぎりUI
 * スタッフがファンのスマホ画面を右にスワイプすると入場済みになる
 */
import React, { useRef, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

const SWIPE_THRESHOLD = 0.65; // 65%以上スワイプで確定

export default function SwipeToEnter({ ticket, userEmail, onUsed }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0); // 0~1
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const startXRef = useRef(null);
  const qc = useQueryClient();

  const isUsed = ticket.status === "used" || done;

  const getTrackWidth = () => trackRef.current?.offsetWidth || 300;

  const onStart = (clientX) => {
    if (isUsed || loading) return;
    setDragging(true);
    startXRef.current = clientX;
  };

  const onMove = (clientX) => {
    if (!dragging || startXRef.current === null) return;
    const delta = clientX - startXRef.current;
    const trackW = getTrackWidth();
    const thumbW = 56; // w-14
    const maxMove = trackW - thumbW - 8;
    const raw = Math.max(0, Math.min(delta, maxMove));
    setProgress(raw / maxMove);
  };

  const onEnd = async () => {
    if (!dragging) return;
    setDragging(false);
    if (progress >= SWIPE_THRESHOLD) {
      await handleConfirm();
    } else {
      setProgress(0);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setProgress(1);
    try {
      await base44.entities.DigitalTicket.update(ticket.id, {
        status: "used",
        used_at: new Date().toISOString(),
        used_by_email: userEmail || "staff",
      });
      setDone(true);
      toast.success("✅ 入場済みに変更しました");
      qc.invalidateQueries(["my-tickets"]);
      onUsed?.();
    } catch (e) {
      toast.error("処理に失敗しました");
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  // Touch events
  const onTouchStart = (e) => onStart(e.touches[0].clientX);
  const onTouchMove = (e) => onMove(e.touches[0].clientX);
  const onTouchEnd = () => onEnd();

  // Mouse events (for desktop testing)
  const onMouseDown = (e) => { e.preventDefault(); onStart(e.clientX); };
  useEffect(() => {
    if (!dragging) return;
    const move = (e) => onMove(e.clientX);
    const up = () => onEnd();
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dragging, progress]);

  const trackW = typeof window !== "undefined" ? (trackRef.current?.offsetWidth || 300) : 300;
  const thumbW = 56;
  const maxMove = trackW - thumbW - 8;
  const thumbX = progress * maxMove;
  const pct = Math.round(progress * 100);

  const tierDisplay = ticket.tier_name || ticket.ticket_type || "一般";
  const numberDisplay = ticket.ticket_number || ticket.id.slice(-8).toUpperCase();

  if (isUsed) {
    return (
      <div className="space-y-2">
        <div className="text-center bg-secondary rounded-xl px-4 py-2">
          <p className="text-xs text-muted-foreground">{tierDisplay}</p>
          <p className="text-xl font-black tracking-widest">{numberDisplay}</p>
        </div>
        <div className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-green-500/20 border border-green-500/40">
          <CheckCircle2 className="w-5 h-5 text-green-400" />
          <span className="font-bold text-green-400 text-sm">入場済み</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* 席種名と整理番号を大きく表示 */}
      <div className="text-center bg-secondary rounded-xl px-4 py-2">
        <p className="text-xs text-muted-foreground font-semibold">{tierDisplay}</p>
        <p className="text-2xl font-black tracking-widest text-primary">{numberDisplay}</p>
      </div>
      <p className="text-[10px] text-muted-foreground text-center">スタッフ：右にスワイプして入場処理</p>
      <div
        ref={trackRef}
        className="relative w-full h-14 rounded-2xl bg-secondary border border-border overflow-hidden select-none"
        style={{ touchAction: "none" }}
      >
        {/* Progress fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-2xl transition-none"
          style={{
            width: `${Math.min(thumbX + thumbW, trackW)}px`,
            background: `rgba(var(--primary-rgb, 50,200,130), ${0.1 + progress * 0.25})`,
          }}
        />

        {/* Label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-xs text-muted-foreground font-semibold">
            {loading ? "処理中..." : pct < 30 ? "→ スワイプして入場" : pct < 65 ? "もう少し..." : "離して確定！"}
          </span>
        </div>

        {/* Thumb */}
        <div
          className="absolute top-1 bottom-1 w-14 rounded-xl bg-primary flex items-center justify-center cursor-grab active:cursor-grabbing shadow-lg z-10"
          style={{
            left: `${4 + thumbX}px`,
            transition: dragging ? "none" : "left 0.25s ease",
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onMouseDown={onMouseDown}
        >
          {loading
            ? <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
            : <ChevronRight className="w-5 h-5 text-primary-foreground" />
          }
        </div>
      </div>
    </div>
  );
}