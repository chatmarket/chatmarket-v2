/**
 * FortuneCalendar — 占い師 & リスナー共用の予約カレンダー
 * - 月/週ビューで予約を可視化
 * - 予約時刻になったら自動で通話ルームへ誘導
 * - 確定予約から鑑定カルテへのリンク
 */
import React, { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CalendarDays, ChevronLeft, ChevronRight, Clock, Phone, BookOpen,
  Plus, Check, RefreshCw, X, Video, Bell, ArrowRight, Globe
} from "lucide-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { minutesUntilLocal, getTimezoneHint, formatAppointmentDateTime } from "@/lib/timezone";
import { getLang } from "@/lib/i18n";
import AppointmentRequestModal from "@/components/appointment/AppointmentRequestModal";

const STATUS_CONFIG = {
  pending:          { label: "リクエスト中", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" },
  accepted:         { label: "確定", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  declined:         { label: "拒否", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  counter_proposed: { label: "再提案中", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

const TIME_OPTIONS = [];
for (let h = 9; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

// minutesUntilLocal をlib/timezoneからimport済み

// 通話ルームを開く（VideoCallを作成 or 既存のを返す）
async function openCallRoom(appt, user) {
  if (appt.video_call_id) return appt.video_call_id;

  const isCaller = user.email === appt.requester_email;
  const callData = {
    caller_email: appt.requester_email,
    caller_name: appt.requester_name,
    callee_email: appt.channel_owner_email,
    callee_name: appt.channel_name,
    callee_channel_id: appt.channel_id,
    status: "pending",
    duration_minutes: appt.duration_minutes || 30,
    is_paid: false,
    is_free_call: true,
    message: `📅 予約通話: ${appt.confirmed_date || appt.requested_date} ${appt.confirmed_time || appt.requested_time}`,
  };

  const call = await base44.entities.VideoCall.create(callData);
  await base44.entities.Appointment.update(appt.id, {
    video_call_id: call.id,
    room_opened_at: new Date().toISOString(),
  });
  return call.id;
}

// ───── CounterProposalModal ─────
function CounterProposalModal({ appt, onClose, onDone }) {
  const [date, setDate] = useState(appt.requested_date || "");
  const [time, setTime] = useState(appt.requested_time || "10:00");
  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);
  const today = new Date().toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!date) { toast.error("再提案日を選択してください"); return; }
    setSaving(true);
    try {
      await base44.entities.Appointment.update(appt.id, {
        status: "counter_proposed",
        counter_date: date,
        counter_time: time,
        counter_message: msg.trim(),
      });
      const threadId = [appt.requester_email, appt.channel_owner_email].sort().join("__");
      await base44.entities.DirectChat.create({
        from_email: "system", from_name: "📅 予約通知",
        to_channel_owner_email: appt.requester_email,
        to_channel_id: appt.channel_id, to_channel_name: appt.channel_name,
        content: `📅 ライバーから再提案が届きました！\n希望日時: ${date} ${time}${msg ? `\nメッセージ: ${msg}` : ""}`,
        yell_coin: 0, thread_id: threadId,
      });
      toast.success("再提案を送りました");
      onDone(); onClose();
    } catch { toast.error("送信に失敗しました"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-blue-400" />
          <p className="font-bold text-blue-400">日時を再提案する</p>
          <button onClick={onClose} className="ml-auto text-muted-foreground"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">再提案日</label>
            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">再提案時間</label>
            <select value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm focus:outline-none">
              {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-card">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">メッセージ（任意）</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={2}
              placeholder="この日時はいかがですか？"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1" onClick={handleSubmit} disabled={saving}>
              <RefreshCw className="w-3.5 h-3.5" />{saving ? "送信中..." : "再提案"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── AppointmentDetailModal ─────
function AppointmentDetailModal({ appt, user, onClose, onRefresh }) {
  const navigate = useNavigate();
  const [acting, setActing] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const isOwner = user?.email === appt.channel_owner_email;
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;
  const confirmedDate = appt.confirmed_date || appt.requested_date;
  const confirmedTime = appt.confirmed_time || appt.requested_time;
  const mins = minutesUntilLocal(confirmedDate, confirmedTime);
  const isCallable = appt.status === "accepted" && mins !== null && mins >= -5 && mins <= 30;
  const isUpcoming = appt.status === "accepted" && mins !== null && mins > 30;

  const handleAccept = async () => {
    setActing(true);
    try {
      await base44.entities.Appointment.update(appt.id, {
        status: "accepted",
        confirmed_date: confirmedDate,
        confirmed_time: confirmedTime,
      });
      const threadId = [appt.requester_email, appt.channel_owner_email].sort().join("__");
      await base44.entities.DirectChat.create({
        from_email: "system", from_name: "📅 予約通知",
        to_channel_owner_email: appt.requester_email,
        to_channel_id: appt.channel_id, to_channel_name: appt.channel_name,
        content: `✅ 予約が確定しました！\n確定日時: ${confirmedDate} ${confirmedTime}\nお楽しみに！`,
        yell_coin: 0, thread_id: threadId,
      });
      toast.success("予約を承諾しました ✅");
      onRefresh(); onClose();
    } catch { toast.error("失敗しました"); }
    finally { setActing(false); }
  };

  const handleDecline = async () => {
    if (!window.confirm("このリクエストを拒否しますか？")) return;
    setActing(true);
    try {
      await base44.entities.Appointment.update(appt.id, { status: "declined" });
      toast.success("拒否しました");
      onRefresh(); onClose();
    } catch { toast.error("失敗しました"); }
    finally { setActing(false); }
  };

  const handleOpenRoom = async () => {
    setActing(true);
    try {
      const callId = await openCallRoom(appt, user);
      navigate(`/video-call/${callId}`);
    } catch (e) { toast.error("通話ルームの開設に失敗しました"); }
    finally { setActing(false); }
  };

  const handleOpenKarte = () => {
    navigate(`/creator-dashboard`);
    toast.info("ダッシュボードの鑑定カルテパネルから記録してください");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="font-black text-base flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> 予約詳細
          </p>
          <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
        </div>

        <div className={`rounded-xl border px-4 py-3 space-y-2 ${cfg.color}`}>
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
            <span className="text-xs text-muted-foreground">{appt.duration_minutes}分</span>
          </div>
          <p className="font-bold text-sm">{isOwner ? appt.requester_name || appt.requester_email : appt.channel_name}</p>
          <div className="flex items-center gap-2 text-sm">
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="font-bold">{confirmedDate} {confirmedTime}</span>
          </div>
          {appt.consultation_theme && (
            <p className="text-xs text-muted-foreground">🔮 {appt.consultation_theme}</p>
          )}
          {appt.message && (
            <div className="bg-black/20 rounded-lg p-2.5">
              <p className="text-xs text-foreground/80 leading-relaxed">{appt.message}</p>
            </div>
          )}
          {appt.counter_message && (
            <div className="bg-blue-500/10 rounded-lg p-2.5">
              <p className="text-[10px] font-bold text-blue-400 mb-0.5">再提案メッセージ</p>
              <p className="text-xs text-foreground/80">{appt.counter_message}</p>
            </div>
          )}
        </div>

        {/* 時刻カウントダウン */}
        {appt.status === "accepted" && mins !== null && (
          <div className={`rounded-xl px-4 py-3 flex items-center gap-3 ${
            mins <= 0 ? "bg-green-500/20 border border-green-500/40" :
            mins <= 30 ? "bg-yellow-500/10 border border-yellow-500/30" :
            "bg-secondary border border-border/50"
          }`}>
            <Bell className={`w-4 h-4 shrink-0 ${mins <= 0 ? "text-green-400 animate-pulse" : mins <= 30 ? "text-yellow-400" : "text-muted-foreground"}`} />
            <div>
              {mins <= 0 ? (
                <p className="text-sm font-black text-green-400">通話時間です！今すぐ入室できます</p>
              ) : mins <= 30 ? (
                <p className="text-sm font-bold text-yellow-400">あと {mins} 分で通話開始です</p>
              ) : (
                <p className="text-xs text-muted-foreground">開始まで {Math.floor(mins / 60)}時間 {mins % 60}分</p>
              )}
            </div>
          </div>
        )}

        {/* アクションボタン */}
        <div className="space-y-2">
          {/* 通話開始ボタン（時刻前後30分以内） */}
          {isCallable && (
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-black h-12" onClick={handleOpenRoom} disabled={acting}>
              <Video className="w-4 h-4" /> {acting ? "開設中..." : "通話ルームへ入室する"}
            </Button>
          )}

          {/* ライバー: 承諾・再提案・拒否 */}
          {isOwner && (appt.status === "pending" || appt.status === "counter_proposed") && (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold gap-1" onClick={handleAccept} disabled={acting}>
                <Check className="w-3.5 h-3.5" /> 承諾
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-blue-500/50 text-blue-400 gap-1" onClick={() => setShowCounter(true)} disabled={acting}>
                <RefreshCw className="w-3.5 h-3.5" /> 再提案
              </Button>
              <Button size="sm" variant="outline" className="flex-1 border-red-500/40 text-red-400 gap-1" onClick={handleDecline} disabled={acting}>
                <X className="w-3.5 h-3.5" /> 拒否
              </Button>
            </div>
          )}

          {/* 視聴者: 再提案を承諾 */}
          {!isOwner && appt.status === "counter_proposed" && (
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-500 text-white font-bold" onClick={handleAccept} disabled={acting}>
              <Check className="w-4 h-4" /> 再提案を承諾する
            </Button>
          )}

          {/* 鑑定カルテへ（確定後・通話済み向け） */}
          {isOwner && appt.status === "accepted" && (
            <Button variant="outline" className="w-full gap-2 border-violet-500/40 text-violet-400 hover:bg-violet-500/10" onClick={handleOpenKarte}>
              <BookOpen className="w-4 h-4" /> 鑑定カルテを記録する
            </Button>
          )}
        </div>
      </div>

      {showCounter && (
        <CounterProposalModal appt={appt} onClose={() => setShowCounter(false)} onDone={onRefresh} />
      )}
    </div>
  );
}

// ───── Main Calendar Page ─────
export default function FortuneCalendar() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [user, setUser] = useState(null);
  const [myChannel, setMyChannel] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(new Date());
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [callableAppts, setCallableAppts] = useState([]);

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) {
        base44.auth.me().then(async u => {
          setUser(u);
          const channels = await base44.entities.Channel.filter({ owner_email: u.email });
          if (channels[0]) setMyChannel(channels[0]);
        }).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // 自分が関係する全予約
  const { data: appointments = [], refetch } = useQuery({
    queryKey: ["all-appointments-calendar", user?.email],
    queryFn: async () => {
      const [asOwner, asRequester] = await Promise.all([
        myChannel ? base44.entities.Appointment.filter({ channel_id: myChannel.id }) : Promise.resolve([]),
        base44.entities.Appointment.filter({ requester_email: user.email }),
      ]);
      const map = new Map();
      [...asOwner, ...asRequester].forEach(a => map.set(a.id, a));
      return Array.from(map.values()).sort((a, b) => {
        const da = `${a.confirmed_date || a.requested_date} ${a.confirmed_time || a.requested_time}`;
        const db = `${b.confirmed_date || b.requested_date} ${b.confirmed_time || b.requested_time}`;
        return da.localeCompare(db);
      });
    },
    enabled: !!user,
    refetchInterval: 15000,
  });

  // リアルタイム購読
  useEffect(() => {
    if (!user) return;
    const unsub = base44.entities.Appointment.subscribe(ev => {
      const a = ev.data;
      if (a?.channel_owner_email === user.email || a?.requester_email === user.email) {
        refetch();
        if (ev.type === "create" && a.channel_owner_email === user.email) {
          toast.info(`📅 新しい予約リクエスト: ${a.requested_date} ${a.requested_time}`);
        }
        if (ev.type === "update" && a.requester_email === user.email) {
          if (a.status === "accepted") toast.success("✅ 予約が確定しました！");
          else if (a.status === "counter_proposed") toast.info("📅 再提案が届きました");
        }
      }
    });
    return () => unsub();
  }, [user?.email, refetch]);

  // 1分おきに通話開始時刻チェック
  useEffect(() => {
    const check = () => {
      const callable = appointments.filter(a => {
        if (a.status !== "accepted") return false;
        const d = a.confirmed_date || a.requested_date;
        const t = a.confirmed_time || a.requested_time;
        const m = minutesUntilLocal(d, t);
        return m !== null && m >= -5 && m <= 5;
      });
      if (callable.length > 0) {
        setCallableAppts(callable);
        callable.forEach(a => {
          const d = a.confirmed_date || a.requested_date;
          const t = a.confirmed_time || a.requested_time;
          toast.success(`🔔 予約時刻です！${d} ${t} の通話を開始してください`, {
            duration: 10000,
            action: {
              label: "入室する",
              onClick: () => openCallRoom(a, user).then(id => navigate(`/video-call/${id}`)).catch(() => {}),
            },
          });
        });
      } else {
        setCallableAppts([]);
      }
    };
    check();
    const timer = setInterval(check, 60000);
    return () => clearInterval(timer);
  }, [appointments, user]);

  // カレンダー日付
  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay(); // 0=日

  // 選択日の予約
  const dayAppts = appointments.filter(a => {
    const d = a.confirmed_date || a.requested_date;
    return d && isSameDay(parseISO(d), selectedDay);
  });

  // 今後の確定予約
  const upcomingAccepted = appointments.filter(a => {
    if (a.status !== "accepted") return false;
    const d = a.confirmed_date || a.requested_date;
    return d && d >= new Date().toISOString().slice(0, 10);
  });

  // 対応待ち
  const pendingAppts = appointments.filter(a =>
    a.status === "pending" || a.status === "counter_proposed"
  );

  const getApptDot = (day) => {
    const dayStr = format(day, "yyyy-MM-dd");
    const list = appointments.filter(a => (a.confirmed_date || a.requested_date) === dayStr);
    if (list.length === 0) return null;
    if (list.some(a => a.status === "accepted")) return "green";
    if (list.some(a => a.status === "pending" || a.status === "counter_proposed")) return "yellow";
    return "gray";
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-black">🔮 鑑定予約カレンダー</h1>
          <p className="text-xs text-muted-foreground">予約時刻になると自動で通話ルームへ誘導されます</p>
          {getTimezoneHint(getLang()) && (
            <p className="text-[10px] text-blue-400/70 flex items-center gap-1 mt-0.5">
              <Globe className="w-3 h-3" /> {getTimezoneHint(getLang())}
            </p>
          )}
        </div>
        {myChannel && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="ml-auto flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" /> 予約リクエスト
          </button>
        )}
      </div>

      {/* 通話可能アラート */}
      {callableAppts.length > 0 && (
        <div className="bg-green-500/15 border-2 border-green-500/50 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-green-400" />
          </div>
          <div className="flex-1">
            <p className="font-black text-green-400">📞 予約時刻です！今すぐ入室できます</p>
            <p className="text-xs text-green-400/70">{callableAppts[0].confirmed_date || callableAppts[0].requested_date} {callableAppts[0].confirmed_time || callableAppts[0].requested_time}</p>
          </div>
          <Button
            className="bg-green-600 hover:bg-green-500 text-white font-black gap-2 shrink-0"
            onClick={async () => {
              const id = await openCallRoom(callableAppts[0], user);
              navigate(`/video-call/${id}`);
            }}
          >
            <Video className="w-4 h-4" /> 入室
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── カレンダー ── */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          {/* 月ナビゲーション */}
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentMonth(m => subMonths(m, 1))} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <p className="font-bold">{format(currentMonth, "yyyy年 M月", { locale: ja })}</p>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 曜日ヘッダー */}
          <div className="grid grid-cols-7 text-center">
            {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
              <div key={d} className={`text-xs font-bold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
                {d}
              </div>
            ))}
          </div>

          {/* 日付グリッド */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
            {days.map(day => {
              const dot = getApptDot(day);
              const sel = isSameDay(day, selectedDay);
              const tod = isToday(day);
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all
                    ${sel ? "bg-primary text-primary-foreground" : tod ? "bg-primary/20 text-primary" : "hover:bg-secondary"}
                  `}
                >
                  {format(day, "d")}
                  {dot && (
                    <span className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                      dot === "green" ? "bg-green-400" : dot === "yellow" ? "bg-yellow-400" : "bg-gray-500"
                    }`} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 凡例 */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> 確定</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> 待機中</span>
          </div>

          {/* 選択日の予約一覧 */}
          <div className="border-t border-border/40 pt-4">
            <p className="text-xs font-bold text-muted-foreground mb-2">
              {format(selectedDay, "M月d日(EEE)", { locale: ja })} の予約
            </p>
            {dayAppts.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">予約はありません</p>
            ) : (
              <div className="space-y-2">
                {dayAppts.map(a => {
                  const cfg = STATUS_CONFIG[a.status] || STATUS_CONFIG.pending;
                  const d = a.confirmed_date || a.requested_date;
                  const t = a.confirmed_time || a.requested_time;
                  const mins = minutesUntilLocal(d, t);
                  const nearTime = a.status === "accepted" && mins !== null && mins >= -5 && mins <= 30;
                  return (
                    <button key={a.id} onClick={() => setSelectedAppt(a)}
                      className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all hover:brightness-110 border ${cfg.color} ${nearTime ? "ring-2 ring-green-500/50" : ""}`}
                    >
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">
                          {user?.email === a.channel_owner_email ? a.requester_name || a.requester_email : a.channel_name}
                        </p>
                        <p className="text-[10px] opacity-70">{t} ({a.duration_minutes}分)</p>
                      </div>
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.color}`}>{cfg.label}</span>
                      {nearTime && <Phone className="w-3.5 h-3.5 text-green-400 animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── サイドバー ── */}
        <div className="space-y-4">
          {/* 対応待ち */}
          {pendingAppts.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-black text-yellow-400 uppercase tracking-widest">対応待ち ({pendingAppts.length}件)</p>
              {pendingAppts.map(a => {
                const d = a.confirmed_date || a.requested_date;
                const t = a.confirmed_time || a.requested_time;
                return (
                  <button key={a.id} onClick={() => setSelectedAppt(a)}
                    className="w-full text-left rounded-xl bg-black/20 hover:bg-black/30 px-3 py-2.5 transition-all">
                    <p className="text-xs font-bold text-white truncate">
                      {user?.email === a.channel_owner_email ? a.requester_name || a.requester_email : a.channel_name}
                    </p>
                    <p className="text-[10px] text-yellow-400/70">{d} {t}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* 今後の確定予約 */}
          <div className="bg-card border border-border/50 rounded-2xl p-4 space-y-3">
            <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">確定済み予約</p>
            {upcomingAccepted.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">確定した予約はありません</p>
            ) : (
              upcomingAccepted.slice(0, 5).map(a => {
                const d = a.confirmed_date || a.requested_date;
                const t = a.confirmed_time || a.requested_time;
                const mins = minutesUntilLocal(d, t);
                const isCallable = mins !== null && mins >= -5 && mins <= 30;
                return (
                  <button key={a.id} onClick={() => setSelectedAppt(a)}
                    className={`w-full text-left rounded-xl px-3 py-2.5 transition-all border ${isCallable ? "bg-green-500/15 border-green-500/40 animate-pulse" : "bg-secondary/50 border-border/30 hover:bg-secondary"}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isCallable ? "bg-green-400 animate-pulse" : "bg-primary"}`} />
                      <p className="text-xs font-bold text-white truncate">
                        {user?.email === a.channel_owner_email ? a.requester_name || a.requester_email : a.channel_name}
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5 pl-3.5">{d} {t} ({a.duration_minutes}分)</p>
                    {isCallable && (
                      <p className="text-[10px] font-black text-green-400 mt-0.5 pl-3.5 flex items-center gap-1">
                        <Phone className="w-3 h-3" /> 今すぐ入室できます
                      </p>
                    )}
                    {a.karte_id && (
                      <p className="text-[10px] text-violet-400 mt-0.5 pl-3.5 flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> カルテ記録済み
                      </p>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* ダッシュボードへ */}
          <button onClick={() => navigate("/creator-dashboard")}
            className="w-full flex items-center justify-between px-4 py-3 bg-violet-500/10 border border-violet-500/30 rounded-xl hover:bg-violet-500/15 transition-all">
            <div className="flex items-center gap-2 text-violet-400">
              <BookOpen className="w-4 h-4" />
              <span className="text-xs font-bold">鑑定カルテパネルへ</span>
            </div>
            <ArrowRight className="w-4 h-4 text-violet-400" />
          </button>
        </div>
      </div>

      {/* 予約詳細モーダル */}
      {selectedAppt && (
        <AppointmentDetailModal
          appt={selectedAppt}
          user={user}
          onClose={() => setSelectedAppt(null)}
          onRefresh={() => { refetch(); setSelectedAppt(null); }}
        />
      )}

      {/* 予約リクエストモーダル（視聴者向け） */}
      {showRequestModal && myChannel && user && (
        <AppointmentRequestModal
          channel={myChannel}
          user={user}
          onClose={() => setShowRequestModal(false)}
          onSent={refetch}
        />
      )}
    </div>
  );
}