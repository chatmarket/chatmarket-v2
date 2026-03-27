import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Ticket, GraduationCap, Calendar, Clock, CheckCircle2, XCircle, ShoppingCart } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS_MAP = {
  pending_payment: { label: "支払い待ち", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20" },
  active: { label: "有効", color: "text-green-400 bg-green-500/10 border-green-500/20" },
  used: { label: "使用済み", color: "text-muted-foreground bg-secondary border-border" },
  cancelled: { label: "キャンセル", color: "text-destructive bg-destructive/10 border-destructive/20" },
};

export default function SchoolTickets() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("mine"); // mine | available
  const [buyTarget, setBuyTarget] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  // 自分が持っているチケット
  const { data: myTickets = [] } = useQuery({
    queryKey: ["my-school-tickets", user?.email],
    queryFn: () => base44.entities.SchoolTicket.filter({ student_email: user.email }, "-created_date", 100),
    enabled: !!user,
  });

  // 購入可能な授業一覧
  const { data: availableSessions = [] } = useQuery({
    queryKey: ["available-sessions"],
    queryFn: () => base44.entities.SchoolSession.filter({ status: "scheduled" }, "scheduled_at", 50),
    enabled: !!user,
  });

  // 自分がチケット持ってる授業IDセット
  const mySessionIds = new Set(myTickets.filter((t) => t.status !== "cancelled").map((t) => t.session_id));

  // 席が残っている授業
  const { data: allTickets = [] } = useQuery({
    queryKey: ["all-school-tickets-count"],
    queryFn: () => base44.entities.SchoolTicket.filter({ status: "active" }, "-created_date", 500),
    enabled: !!user,
  });

  const getEnrolledCount = (sessionId) => allTickets.filter((t) => t.session_id === sessionId).length;

  const handleBuy = async () => {
    if (!buyTarget || !user) return;
    const enrolled = getEnrolledCount(buyTarget.id);
    if (enrolled >= buyTarget.max_students) {
      toast.error("この授業は満席です");
      setBuyTarget(null);
      return;
    }
    const ticket = await base44.entities.SchoolTicket.create({
      student_email: user.email,
      student_name: user.full_name || user.email,
      teacher_email: buyTarget.teacher_email,
      channel_id: buyTarget.channel_id || "",
      channel_name: buyTarget.channel_name || "",
      session_id: buyTarget.id,
      session_title: buyTarget.title,
      scheduled_at: buyTarget.scheduled_at,
      duration_minutes: buyTarget.duration_minutes,
      price: buyTarget.ticket_price,
      status: "pending_payment",
    });
    queryClient.invalidateQueries({ queryKey: ["my-school-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["all-school-tickets-count"] });
    setBuyTarget(null);
    toast.success("チケットを購入しました！授業当日にアクセスしてください。");
  };

  const upcomingTickets = myTickets.filter((t) => t.status === "active" || t.status === "pending_payment");
  const pastTickets = myTickets.filter((t) => t.status === "used" || t.status === "cancelled");

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/"><Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button></Link>
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Ticket className="w-5 h-5 text-primary" /> スクールチケット
          </h1>
          <p className="text-xs text-muted-foreground">ミニスクール授業のチケット管理</p>
        </div>
      </div>

      {/* 準備中バナー */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl px-4 py-3 flex items-center gap-2 text-xs">
        <span>🚧</span>
        <span className="text-orange-300">ミニスクールプランは現在準備中です。事前にチケットの確認が可能です。</span>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-secondary rounded-xl p-1">
        {[
          { key: "mine", label: "マイチケット" },
          { key: "available", label: "授業を探す" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-sm font-semibold py-2 rounded-lg transition-all ${tab === key ? "bg-card text-foreground shadow" : "text-muted-foreground"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "mine" && (
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">今後の授業（{upcomingTickets.length}枚）</h3>
            {upcomingTickets.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                <Ticket className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>チケットがありません</p>
                <button onClick={() => setTab("available")} className="text-primary text-xs underline mt-2">授業を探す →</button>
              </div>
            ) : (
              upcomingTickets.map((t) => <TicketCard key={t.id} ticket={t} />)
            )}
          </div>
          {pastTickets.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">過去のチケット</h3>
              {pastTickets.map((t) => <TicketCard key={t.id} ticket={t} past />)}
            </div>
          )}
        </div>
      )}

      {tab === "available" && (
        <div className="space-y-3">
          {availableSessions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <GraduationCap className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>現在予定中の授業はありません</p>
            </div>
          ) : (
            availableSessions.map((s) => {
              const enrolled = getEnrolledCount(s.id);
              const remaining = s.max_students - enrolled;
              const alreadyBought = mySessionIds.has(s.id);
              return (
                <div key={s.id} className="bg-card border border-border/50 rounded-2xl p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.channel_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(s.scheduled_at), "M/d(E) HH:mm", { locale: ja })}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}分</span>
                        <span className={`font-semibold ${remaining > 0 ? "text-primary" : "text-destructive"}`}>
                          残席{remaining}名
                        </span>
                      </div>
                      {s.description && <p className="text-xs text-foreground/60 mt-1">{s.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-black text-yellow-400">¥{s.ticket_price.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">/1回</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-2 bg-primary hover:bg-primary/90"
                    disabled={alreadyBought || remaining === 0}
                    onClick={() => setBuyTarget(s)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {alreadyBought ? "購入済み" : remaining === 0 ? "満席" : "チケットを購入"}
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 購入確認モーダル */}
      <Dialog open={!!buyTarget} onOpenChange={(o) => !o && setBuyTarget(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> チケット購入確認
            </DialogTitle>
          </DialogHeader>
          {buyTarget && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl p-3 space-y-2 text-sm">
                <p className="font-bold">{buyTarget.title}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{format(new Date(buyTarget.scheduled_at), "M月d日(E) HH:mm", { locale: ja })}
                </p>
                <p className="flex justify-between border-t border-border/50 pt-2 font-bold">
                  <span>チケット料金</span>
                  <span className="text-primary">¥{buyTarget.ticket_price.toLocaleString()}</span>
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setBuyTarget(null)}>キャンセル</Button>
                <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleBuy}>購入する</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TicketCard({ ticket: t, past }) {
  const s = STATUS_MAP[t.status] || STATUS_MAP.pending_payment;
  return (
    <div className={`bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 ${past ? "opacity-60" : ""}`}>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <GraduationCap className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-bold text-sm truncate">{t.session_title}</p>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${s.color} shrink-0`}>{s.label}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{t.scheduled_at ? format(new Date(t.scheduled_at), "M/d HH:mm") : "-"}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{t.duration_minutes}分</span>
          <span className="text-yellow-400 font-bold">¥{t.price.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}