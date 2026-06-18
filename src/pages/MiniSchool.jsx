import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  GraduationCap, Plus, Users, Clock, Calendar, Play, ArrowLeft,
  Ticket, CheckCircle2, XCircle, Settings, Video, Mic, MicOff, CameraOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { toast } from "sonner";

const MAX_STUDENTS = 9;

const STATUS_MAP = {
  scheduled: { label: "開催予定", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  live: { label: "🔴 授業中", color: "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse" },
  ended: { label: "終了", color: "bg-secondary text-muted-foreground border-border" },
  cancelled: { label: "キャンセル", color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function MiniSchool() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeSession, setActiveSession] = useState(null);
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 60,
    max_students: 9,
    ticket_price: 3000,
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          base44.entities.Channel.filter({ owner_email: u.email }).then((r) => setChannel(r[0]));
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: sessions = [] } = useQuery({
    queryKey: ["school-sessions", user?.email],
    queryFn: () => base44.entities.SchoolSession.filter({ teacher_email: user.email }, "-scheduled_at", 50),
    enabled: !!user,
  });

  const { data: tickets = [] } = useQuery({
    queryKey: ["school-tickets-teacher", user?.email],
    queryFn: () => base44.entities.SchoolTicket.filter({ teacher_email: user.email }, "-created_date", 200),
    enabled: !!user,
  });

  const handleCreateSession = async () => {
    if (!form.title || !form.scheduled_at) {
      toast.error("タイトルと開始日時は必須です");
      return;
    }
    const session = await base44.entities.SchoolSession.create({
      ...form,
      teacher_email: user.email,
      channel_id: channel?.id || "",
      channel_name: channel?.name || user.full_name,
      max_students: Math.min(form.max_students, MAX_STUDENTS),
      enrolled_students: [],
      status: "scheduled",
    });
    queryClient.invalidateQueries({ queryKey: ["school-sessions"] });
    setShowCreateModal(false);
    setForm({ title: "", description: "", scheduled_at: "", duration_minutes: 60, max_students: 9, ticket_price: 3000 });
    toast.success("授業を作成しました！");
  };

  const startSession = async (session) => {
    await base44.entities.SchoolSession.update(session.id, { status: "live" });
    queryClient.invalidateQueries({ queryKey: ["school-sessions"] });
    setActiveSession({ ...session, status: "live" });
    toast.success("授業を開始しました！");
  };

  const endSession = async (session) => {
    await base44.entities.SchoolSession.update(session.id, { status: "ended" });
    // チケットをused に更新
    const sessionTickets = tickets.filter((t) => t.session_id === session.id && t.status === "active");
    await Promise.all(sessionTickets.map((t) => base44.entities.SchoolTicket.update(t.id, { status: "used", used_at: new Date().toISOString() })));
    queryClient.invalidateQueries({ queryKey: ["school-sessions"] });
    queryClient.invalidateQueries({ queryKey: ["school-tickets-teacher"] });
    setActiveSession(null);
    toast.success("授業を終了しました");
  };

  const cancelSession = async (session) => {
    await base44.entities.SchoolSession.update(session.id, { status: "cancelled" });
    queryClient.invalidateQueries({ queryKey: ["school-sessions"] });
    toast.info("授業をキャンセルしました");
  };

  const totalRevenue = tickets.filter((t) => t.status === "active" || t.status === "used").reduce((s, t) => s + (t.price || 0), 0);
  const myRevenue = Math.floor(totalRevenue * 0.85);

  const upcomingSessions = sessions.filter((s) => s.status === "scheduled" || s.status === "live");
  const pastSessions = sessions.filter((s) => s.status === "ended" || s.status === "cancelled");

  if (!user) return null;

  // ── ライブ授業画面 ──
  if (activeSession) {
    return <LiveClassroom session={activeSession} user={user} tickets={tickets} onEnd={() => endSession(activeSession)} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link to="/creator-dashboard">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <GraduationCap className="w-6 h-6 text-primary" /> ミニスクール管理
            </h1>
            <p className="text-sm text-muted-foreground">1対2〜最大9名の少人数授業を開催</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/school-tickets">
            <Button variant="outline" size="sm" className="gap-2">
              <Ticket className="w-4 h-4" /> チケット管理
            </Button>
          </Link>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2 bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4" /> 授業を作成
          </Button>
        </div>
      </div>

      {/* 準備中バナー */}
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-2xl px-5 py-4 flex items-center gap-3">
        <span className="text-2xl">🚧</span>
        <div>
          <p className="font-bold text-orange-400 text-sm">ミニスクールプラン（準備中）</p>
          <p className="text-xs text-orange-300/70 mt-0.5">月額¥8,900 / 収益還元率90% — 現在準備中です。事前に授業・チケットの設定が可能です。</p>
        </div>
      </div>

      {/* 収益サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "チケット販売枚数", value: `${tickets.filter((t) => t.status !== "pending_payment" && t.status !== "cancelled").length}枚`, color: "text-primary" },
          { label: "総チケット収益", value: `¥${totalRevenue.toLocaleString()}`, color: "text-yellow-400" },
          { label: "あなたの受取（85%）", value: `¥${myRevenue.toLocaleString()}`, color: "text-green-400" },
          { label: "開催済み授業", value: `${pastSessions.filter((s) => s.status === "ended").length}回`, color: "text-blue-400" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-card border border-border/50 rounded-xl p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-xl font-black mt-0.5 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* 開催予定・進行中 */}
      <div>
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">開催予定・進行中</h2>
        {upcomingSessions.length === 0 ? (
          <div className="bg-card border border-dashed border-border/50 rounded-2xl p-10 text-center">
            <GraduationCap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">予定中の授業はありません</p>
            <Button onClick={() => setShowCreateModal(true)} className="mt-4 gap-2" size="sm">
              <Plus className="w-4 h-4" /> 最初の授業を作成
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingSessions.map((s) => (
              <SessionCard key={s.id} session={s} tickets={tickets} onStart={() => startSession(s)} onCancel={() => cancelSession(s)} onEnter={() => setActiveSession(s)} />
            ))}
          </div>
        )}
      </div>

      {/* 過去の授業 */}
      {pastSessions.length > 0 && (
        <div>
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-3">過去の授業</h2>
          <div className="space-y-2">
            {pastSessions.map((s) => (
              <SessionCard key={s.id} session={s} tickets={tickets} past />
            ))}
          </div>
        </div>
      )}

      {/* 作成モーダル */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" /> 授業を作成
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>授業タイトル *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="例：英会話入門 第1回" className="bg-secondary border-0" />
            </div>
            <div className="space-y-1.5">
              <Label>説明（任意）</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="授業の内容・準備物など" className="bg-secondary border-0 resize-none" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>開始日時 *</Label>
                <Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-secondary border-0" />
              </div>
              <div className="space-y-1.5">
                <Label>授業時間（分）</Label>
                <Input type="number" min={15} max={180} step={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: parseInt(e.target.value) || 60 })} className="bg-secondary border-0" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>最大生徒数（2〜9名）</Label>
                <Input type="number" min={1} max={9} value={form.max_students} onChange={(e) => setForm({ ...form, max_students: Math.min(9, parseInt(e.target.value) || 1) })} className="bg-secondary border-0" />
              </div>
              <div className="space-y-1.5">
                <Label>チケット価格（円）</Label>
                <Input type="number" min={0} step={100} value={form.ticket_price} onChange={(e) => setForm({ ...form, ticket_price: parseInt(e.target.value) || 0 })} className="bg-secondary border-0" />
              </div>
            </div>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-xs text-muted-foreground space-y-0.5">
              <p>収益還元率 <span className="text-primary font-bold">85%</span>（プラットフォーム手数料15%）</p>
              <p>チケット ¥{form.ticket_price.toLocaleString()} × {form.max_students}人満席 = 最大 <span className="text-green-400 font-bold">¥{Math.floor(form.ticket_price * form.max_students * 0.85).toLocaleString()}</span> 受取</p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>キャンセル</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreateSession}>作成する</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── 授業カードコンポーネント ──
function SessionCard({ session: s, tickets, onStart, onCancel, onEnter, past }) {
  const status = STATUS_MAP[s.status] || STATUS_MAP.scheduled;
  const sessionTickets = tickets.filter((t) => t.session_id === s.id && (t.status === "active" || t.status === "used"));
  const enrolledCount = sessionTickets.length;

  return (
    <div className={`bg-card border border-border/50 rounded-2xl p-4 ${past ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
            {s.ticket_price > 0 && (
              <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-semibold">
                ¥{s.ticket_price.toLocaleString()}/枚
              </span>
            )}
          </div>
          <p className="font-bold text-base">{s.title}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{format(new Date(s.scheduled_at), "M/d(E) HH:mm", { locale: ja })}</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes}分</span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />{enrolledCount}/{s.max_students}人</span>
          </div>
        </div>
        {!past && (
          <div className="flex gap-2 shrink-0">
            {s.status === "scheduled" && (
              <>
                <Button size="sm" onClick={onStart} className="gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs">
                  <Play className="w-3.5 h-3.5" /> 授業開始
                </Button>
                <Button size="sm" variant="outline" onClick={onCancel} className="text-xs text-destructive border-destructive/30">中止</Button>
              </>
            )}
            {s.status === "live" && (
              <Button size="sm" onClick={onEnter} className="gap-1.5 bg-primary text-xs animate-pulse">
                <Video className="w-3.5 h-3.5" /> 授業室へ入る
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 生徒リスト */}
      {enrolledCount > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground mb-2">参加生徒（{enrolledCount}名）</p>
          <div className="flex flex-wrap gap-2">
            {sessionTickets.map((t) => (
              <div key={t.id} className="flex items-center gap-1.5 bg-secondary rounded-lg px-2.5 py-1 text-xs">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                  {(t.student_name || t.student_email || "?")[0].toUpperCase()}
                </div>
                <span className="font-medium">{t.student_name || t.student_email}</span>
                {t.status === "used" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ライブ授業室コンポーネント ──
function LiveClassroom({ session, user, tickets, onEnd }) {
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const sessionTickets = tickets.filter((t) => t.session_id === session.id && (t.status === "active" || t.status === "used"));

  // 9マスグリッド（生徒スロット）
  const studentSlots = Array.from({ length: session.max_students }, (_, i) => sessionTickets[i] || null);

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur border-b border-white/10">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-5 h-5 text-primary" />
          <div>
            <p className="text-white font-bold text-sm">{session.title}</p>
            <p className="text-xs text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" /> 授業中 · {sessionTickets.length}/{session.max_students}名参加
            </p>
          </div>
        </div>
        <Button size="sm" onClick={onEnd} className="bg-red-500 hover:bg-red-600 text-white gap-2 text-xs">
          <XCircle className="w-4 h-4" /> 授業を終了
        </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-0">
        {/* 生徒グリッド */}
        <div className="flex-1 p-4">
          <p className="text-white/50 text-xs mb-3 font-semibold uppercase tracking-wider">生徒席（最大{session.max_students}名）</p>
          <div className="grid grid-cols-3 gap-2">
            {studentSlots.map((student, i) => (
              <div
                key={i}
                className={`aspect-video rounded-xl flex flex-col items-center justify-center border-2 transition-all
                  ${student ? "bg-gray-800 border-primary/40" : "bg-gray-900/50 border-white/5 border-dashed"}`}
              >
                {student ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-lg font-black text-primary">
                      {(student.student_name || student.student_email || "?")[0].toUpperCase()}
                    </div>
                    <p className="text-white text-xs font-semibold mt-1.5 px-2 truncate w-full text-center">
                      {student.student_name || student.student_email}
                    </p>
                    <p className="text-[9px] text-green-400">✓ 参加中</p>
                  </>
                ) : (
                  <p className="text-white/20 text-xs">空席 {i + 1}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 講師自分のプレビュー */}
        <div className="md:w-64 p-4 space-y-3">
          <p className="text-white/50 text-xs font-semibold uppercase tracking-wider">講師（あなた）</p>
          <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center border border-primary/30">
            {camOn ? (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl font-black text-primary">
                {(user.full_name || user.email || "T")[0].toUpperCase()}
              </div>
            ) : (
              <CameraOff className="w-8 h-8 text-white/30" />
            )}
          </div>
          <p className="text-white text-xs font-semibold text-center">{user.full_name || "講師"}</p>

          {/* コントロール */}
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => setMicOn(!micOn)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${micOn ? "bg-white/10" : "bg-red-500"}`}
            >
              {micOn ? <Mic className="w-4 h-4 text-white" /> : <MicOff className="w-4 h-4 text-white" />}
            </button>
            <button
              onClick={() => setCamOn(!camOn)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${camOn ? "bg-white/10" : "bg-red-500"}`}
            >
              {camOn ? <Video className="w-4 h-4 text-white" /> : <CameraOff className="w-4 h-4 text-white" />}
            </button>
          </div>

          {/* 授業情報 */}
          <div className="bg-white/5 rounded-xl p-3 space-y-1.5 text-xs">
            <p className="flex justify-between text-white/60"><span>授業時間</span><span className="text-white font-bold">{session.duration_minutes}分</span></p>
            <p className="flex justify-between text-white/60"><span>チケット</span><span className="text-yellow-400 font-bold">¥{session.ticket_price?.toLocaleString()}</span></p>
            <p className="flex justify-between text-white/60"><span>参加人数</span><span className="text-primary font-bold">{sessionTickets.length}名</span></p>
            <p className="flex justify-between text-white/60"><span>授業収益（85%）</span><span className="text-green-400 font-bold">¥{Math.floor((session.ticket_price || 0) * sessionTickets.length * 0.85).toLocaleString()}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}