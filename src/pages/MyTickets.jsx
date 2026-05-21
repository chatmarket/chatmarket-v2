import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { QRCodeSVG } from "qrcode.react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, User, Calendar, MapPin, RefreshCw, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import SwipeToEnter from "@/components/tickets/SwipeToEnter";

// 30秒ごとに変わる時刻スロット（転売防止）
function getTimeSlot() {
  return Math.floor(Date.now() / 30000);
}

function buildQRPayload(ticket, user, timeSlot) {
  const raw = `${ticket.id}|${user.email}|${timeSlot}`;
  return btoa(raw);
}

function TicketCard({ ticket, user }) {
  const [timeSlot, setTimeSlot] = useState(getTimeSlot());
  const [secondsLeft, setSecondsLeft] = useState(30 - (Math.floor(Date.now() / 1000) % 30));
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const slot = getTimeSlot();
      const secs = 30 - (Math.floor(Date.now() / 1000) % 30);
      setTimeSlot(slot);
      setSecondsLeft(secs);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const qrPayload = buildQRPayload(ticket, user, timeSlot);

  // tier_nameがあればそれを優先、なければticket_typeのラベルにフォールバック
  const tierDisplayName = ticket.tier_name || ticket.ticket_type || "一般";
  const ticketDisplayNumber = ticket.ticket_number || ticket.id.slice(-8).toUpperCase();

  const statusConfig = {
    valid: { label: "有効", icon: CheckCircle2, color: "text-green-400" },
    used: { label: "使用済み", icon: CheckCircle2, color: "text-muted-foreground" },
    cancelled: { label: "キャンセル済み", icon: XCircle, color: "text-destructive" },
  };
  const sc = statusConfig[ticket.status] || statusConfig.valid;
  const StatusIcon = sc.icon;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        ticket.status === "valid"
          ? "bg-card border-border/50 hover:border-primary/40"
          : "bg-secondary/30 border-border/30 opacity-60"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4">
        {ticket.thumbnail_url ? (
          <img src={ticket.thumbnail_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Ticket className="w-7 h-7 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Badge className="text-[10px] border bg-primary/20 text-primary border-primary/40 font-bold">
              {tierDisplayName}
            </Badge>
            <span className={`flex items-center gap-1 text-[10px] font-semibold ${sc.color}`}>
              <StatusIcon className="w-3 h-3" />{sc.label}
            </span>
          </div>
          <p className="font-bold text-sm leading-tight">{ticket.event_name}</p>
          {/* 整理番号を目立つ形で表示 */}
          <p className="text-lg font-black text-primary tracking-widest mt-1">{ticketDisplayNumber}</p>
          {ticket.channel_name && (
            <p className="text-xs text-primary mt-0.5">{ticket.channel_name}</p>
          )}
          {ticket.event_date && (
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(ticket.event_date), "yyyy年M月d日(E) HH:mm", { locale: ja })}
            </p>
          )}
          {ticket.event_location && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" />{ticket.event_location}
            </p>
          )}
          {ticket.seat_info && (
            <p className="text-xs text-foreground/70 mt-0.5">座席: {ticket.seat_info}</p>
          )}
        </div>
      </div>

      {/* QR Section — valid only */}
      {ticket.status === "valid" && (
        <div className="border-t border-border/30 px-4 pb-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full mt-3 text-xs text-primary font-semibold flex items-center justify-center gap-1.5 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            <Ticket className="w-3.5 h-3.5" />
            {expanded ? "QRコードを閉じる" : "入場QRコードを表示"}
          </button>

          {expanded && (
            <div className="mt-4 flex flex-col items-center gap-3">
              {/* Profile + QR */}
              <div className="bg-white rounded-2xl p-4 flex flex-col items-center gap-2 w-full max-w-[280px]">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                  {user.full_name?.[0] || "?"}
                </div>
                <p className="text-black font-bold text-sm">{user.full_name}</p>
                <p className="text-gray-500 text-[10px]">{user.email}</p>
                {/* 席種名と整理番号を大きく */}
                <div className="text-center bg-gray-50 rounded-xl px-4 py-2 w-full">
                  <p className="text-black text-xs font-semibold">{ticket.tier_name || ticket.ticket_type}</p>
                  <p className="text-black text-2xl font-black tracking-widest">{ticketDisplayNumber}</p>
                </div>
                <QRCodeSVG
                  value={qrPayload}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>

              {/* Countdown */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" style={{ animationDuration: "3s" }} />
                <span>{secondsLeft}秒後に更新（転売防止）</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center px-4">
                このQRコードは30秒ごとに変わります。スクリーンショットは無効です。
              </p>

              {/* スワイプもぎり（スタッフ用） */}
              <div className="w-full max-w-[280px] pt-2 border-t border-border/30">
                <SwipeToEnter ticket={ticket} userEmail={user.email} onUsed={() => {}} />
              </div>
            </div>
          )}
        </div>
      )}

      {ticket.status === "used" && ticket.used_at && (
        <div className="border-t border-border/30 px-4 py-2 text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          入場済み: {format(new Date(ticket.used_at), "yyyy/MM/dd HH:mm")}
        </div>
      )}
    </div>
  );
}

export default function MyTickets() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      setLoading(false);
    });
  }, []);

  const { data: tickets = [], isLoading: ticketsLoading } = useQuery({
    queryKey: ["my-tickets", user?.email],
    queryFn: () => base44.entities.DigitalTicket.filter({ owner_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  if (loading || ticketsLoading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        {[1, 2].map((i) => <div key={i} className="h-32 bg-secondary rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-24">
        <Ticket className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
        <p className="text-muted-foreground mb-4">チケットを確認するにはログインが必要です</p>
        <Button onClick={() => base44.auth.redirectToLogin()}>ログイン</Button>
      </div>
    );
  }

  const validTickets = tickets.filter((t) => t.status === "valid");
  const pastTickets = tickets.filter((t) => t.status !== "valid");

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Profile */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-bold text-primary shrink-0">
          {user.full_name?.[0] || <User className="w-6 h-6" />}
        </div>
        <div>
          <p className="font-bold">{user.full_name}</p>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <p className="text-xs text-primary mt-0.5">有効チケット: {validTickets.length}枚</p>
        </div>
      </div>

      {/* Valid tickets */}
      {validTickets.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" /> 有効なチケット
          </h2>
          {validTickets.map((t) => <TicketCard key={t.id} ticket={t} user={user} />)}
        </section>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Ticket className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">有効なチケットはありません</p>
        </div>
      )}

      {/* Past tickets */}
      {pastTickets.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="w-4 h-4" /> 過去のチケット
          </h2>
          {pastTickets.map((t) => <TicketCard key={t.id} ticket={t} user={user} />)}
        </section>
      )}
    </div>
  );
}