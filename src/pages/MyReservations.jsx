import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { ArrowLeft, Calendar, Clock, Coins, CheckCircle2, XCircle, Phone } from "lucide-react";
import { format } from "date-fns";

const STATUS_MAP = {
  pending_payment: { label: "支払い待ち", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  confirmed: { label: "予約確定", color: "text-green-400 bg-green-500/10 border-green-500/30" },
  completed: { label: "完了", color: "text-muted-foreground bg-secondary border-border" },
  cancelled: { label: "キャンセル", color: "text-red-400 bg-red-500/10 border-red-500/30" },
};

export default function MyReservations() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: myReservations = [] } = useQuery({
    queryKey: ["my-reservations", user?.email],
    queryFn: () => base44.entities.CallReservation.filter({ user_email: user.email }, "-date", 30),
    enabled: !!user,
  });

  const { data: incomingReservations = [] } = useQuery({
    queryKey: ["incoming-reservations", user?.email],
    queryFn: () => base44.entities.CallReservation.filter({ owner_email: user.email }, "-date", 30),
    enabled: !!user,
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const upcoming = myReservations.filter((r) => r.date >= today && r.status === "confirmed");
  const past = myReservations.filter((r) => r.date < today || r.status === "completed");
  const incomingUpcoming = incomingReservations.filter((r) => r.date >= today && r.status === "confirmed");

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" /> 予約管理
        </h1>
      </div>

      {/* 受信予約（配信者向け） */}
      {incomingUpcoming.length > 0 && (
        <section className="mb-6">
          <p className="text-sm font-bold text-primary mb-3">📬 受付中の予約（あなたへの予約）</p>
          <div className="space-y-2">
            {incomingUpcoming.map((r) => (
              <ReservationCard key={r.id} reservation={r} isIncoming />
            ))}
          </div>
        </section>
      )}

      {/* 自分の予約 */}
      <section className="mb-6">
        <p className="text-sm font-bold mb-3 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-primary" /> 予約済みの通話
        </p>
        {upcoming.length === 0 ? (
          <div className="bg-secondary rounded-xl p-6 text-center text-muted-foreground text-sm">
            <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
            予約はありません
          </div>
        ) : (
          <div className="space-y-2">
            {upcoming.map((r) => <ReservationCard key={r.id} reservation={r} />)}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <p className="text-sm font-bold text-muted-foreground mb-3">過去の予約</p>
          <div className="space-y-2">
            {past.map((r) => <ReservationCard key={r.id} reservation={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function ReservationCard({ reservation: r, isIncoming }) {
  const st = STATUS_MAP[r.status] || STATUS_MAP.confirmed;
  return (
    <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0">
        <span className="text-xs font-bold">{r.start_time}</span>
        <span className="text-[10px] text-muted-foreground">{r.date?.slice(5)}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">
          {isIncoming ? (r.user_name || r.user_email) : (r.channel_name || r.owner_email)}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{r.duration_minutes}分</span>
          <span className="flex items-center gap-0.5"><Coins className="w-3 h-3 text-yellow-400" />¥{(r.price || 0).toLocaleString()}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${st.color}`}>{st.label}</span>
        </div>
        {r.message && <p className="text-xs text-muted-foreground mt-1 truncate">💬 {r.message}</p>}
      </div>
      {r.status === "confirmed" && !isIncoming && (
        <Link to={`/chat/${r.channel_id}`}>
          <button className="shrink-0 w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors">
            <Phone className="w-4 h-4 text-primary" />
          </button>
        </Link>
      )}
    </div>
  );
}