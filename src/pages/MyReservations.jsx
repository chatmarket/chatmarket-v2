import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CalendarDays, Clock, ArrowLeft, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";

const STATUS_MAP = {
  pending_payment: { label: "支払い待ち", color: "text-yellow-400 bg-yellow-500/10" },
  confirmed: { label: "確定", color: "text-green-400 bg-green-500/10" },
  completed: { label: "完了", color: "text-muted-foreground bg-secondary" },
  cancelled: { label: "キャンセル", color: "text-red-400 bg-red-500/10" },
};

export default function MyReservations() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const today = new Date().toISOString().slice(0, 10);

  const { data: myReservations = [] } = useQuery({
    queryKey: ["my-reservations", user?.email],
    queryFn: () => base44.entities.CallReservation.filter({ user_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const { data: incomingReservations = [] } = useQuery({
    queryKey: ["incoming-reservations", user?.email],
    queryFn: () => base44.entities.CallReservation.filter({ owner_email: user.email }, "-created_date", 50),
    enabled: !!user,
  });

  const upcoming = myReservations.filter((r) => r.date >= today && r.status !== "cancelled" && r.status !== "completed");
  const past = myReservations.filter((r) => r.date < today || r.status === "completed" || r.status === "cancelled");
  const incomingPending = incomingReservations.filter((r) => r.status === "pending_payment" || r.status === "confirmed");

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> 予約管理
        </h1>
      </div>

      {/* Incoming */}
      {incomingPending.length > 0 && (
        <div className="mb-6 space-y-2">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">受信した予約リクエスト ({incomingPending.length})</h2>
          {incomingPending.map((r) => (
            <ReservationCard key={r.id} reservation={r} isOwner onChat={() => {
              const threadId = [r.user_email, r.owner_email].sort().join("__");
              navigate(`/chat/${r.channel_id}`);
            }} />
          ))}
        </div>
      )}

      {/* Upcoming */}
      <div className="mb-6 space-y-2">
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">今後の予約 ({upcoming.length})</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">予約はありません</p>
        ) : (
          upcoming.map((r) => (
            <ReservationCard key={r.id} reservation={r} onChat={() => navigate(`/chat/${r.channel_id}`)} />
          ))
        )}
      </div>

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">過去の予約</h2>
          {past.slice(0, 20).map((r) => (
            <ReservationCard key={r.id} reservation={r} past />
          ))}
        </div>
      )}
    </div>
  );
}

function ReservationCard({ reservation: r, isOwner, onChat, past }) {
  const s = STATUS_MAP[r.status] || STATUS_MAP.pending_payment;
  return (
    <div className={`bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 ${past ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-bold text-sm">{isOwner ? r.user_name || r.user_email : r.channel_name}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-0.5"><CalendarDays className="w-3 h-3" /> {r.date}</span>
          <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {r.start_time} ({r.duration_minutes}分)</span>
          <span className="text-primary font-bold">¥{(r.price || 0).toLocaleString()}</span>
        </div>
        {r.message && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">💬 {r.message}</p>}
      </div>
      {onChat && (
        <button onClick={onChat} className="shrink-0 p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <MessageCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}