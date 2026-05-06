/**
 * AppointmentDashboard
 * ライバー用：届いた予約リクエスト一覧＋承諾/拒否/再提案UI
 */
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CalendarDays, Check, X, RefreshCw, Clock, MessageCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

const STATUS_CONFIG = {
  pending:          { label: "リクエスト中", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  accepted:         { label: "確定", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
  declined:         { label: "拒否", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" },
  counter_proposed: { label: "再提案中", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
};

const TIME_OPTIONS = [];
for (let h = 9; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

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
      // 視聴者へ通知（DirectChatシステムメッセージ）
      await sendSystemMessage(appt, `📅 ライバーから再提案が届きました！\n希望日時: ${date} ${time}\n${msg ? `メッセージ: ${msg}` : ""}`);
      toast.success("再提案を送りました");
      onDone();
      onClose();
    } catch {
      toast.error("送信に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-400">
            <RefreshCw className="w-4 h-4" /> 日時を再提案する
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">再提案日</label>
            <input type="date" value={date} min={today} onChange={e => setDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">再提案時間</label>
            <select value={time} onChange={e => setTime(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none">
              {TIME_OPTIONS.map(t => <option key={t} value={t} className="bg-card">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground font-bold mb-1 block">メッセージ（任意）</label>
            <textarea value={msg} onChange={e => setMsg(e.target.value)} rows={3}
              placeholder="この日時はいかがですか？"
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold gap-2" onClick={handleSubmit} disabled={saving}>
              <RefreshCw className="w-4 h-4" /> {saving ? "送信中..." : "再提案する"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

async function sendSystemMessage(appt, content) {
  try {
    const threadId = [appt.requester_email, appt.channel_owner_email].sort().join("__");
    await base44.entities.DirectChat.create({
      from_email: "system",
      from_name: "📅 予約通知",
      to_channel_owner_email: appt.requester_email,
      to_channel_id: appt.channel_id,
      to_channel_name: appt.channel_name,
      content,
      yell_coin: 0,
      thread_id: threadId,
    });
  } catch {}
}

function AppointmentCard({ appt, isOwner, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [showCounter, setShowCounter] = useState(false);
  const [acting, setActing] = useState(false);
  const cfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG.pending;

  const handleAccept = async () => {
    setActing(true);
    try {
      const confirmedDate = appt.counter_date || appt.requested_date;
      const confirmedTime = appt.counter_time || appt.requested_time;
      await base44.entities.Appointment.update(appt.id, {
        status: "accepted",
        confirmed_date: confirmedDate,
        confirmed_time: confirmedTime,
      });
      await sendSystemMessage(appt, `✅ 予約が確定しました！\n確定日時: ${confirmedDate} ${confirmedTime}\nお楽しみに！`);
      toast.success("予約を承諾しました");
      onRefresh();
    } catch { toast.error("失敗しました"); }
    finally { setActing(false); }
  };

  const handleDecline = async () => {
    if (!window.confirm("このリクエストを拒否しますか？")) return;
    setActing(true);
    try {
      await base44.entities.Appointment.update(appt.id, { status: "declined" });
      await sendSystemMessage(appt, `❌ 申し訳ありませんが、このリクエストはお断りさせていただきました。\n別の日時でまたご連絡ください。`);
      toast.success("拒否しました");
      onRefresh();
    } catch { toast.error("失敗しました"); }
    finally { setActing(false); }
  };

  return (
    <>
      <div className={`rounded-xl border p-3 space-y-2 ${cfg.bg}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
              <span className="text-xs text-muted-foreground">{appt.requester_name || appt.requester_email}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm font-bold">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                {appt.requested_date} {appt.requested_time}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" /> {appt.duration_minutes}分
              </span>
            </div>
            {appt.status === "counter_proposed" && appt.counter_date && (
              <div className="flex items-center gap-1 text-xs text-blue-400 mt-0.5">
                <RefreshCw className="w-3 h-3" /> 再提案: {appt.counter_date} {appt.counter_time}
              </div>
            )}
            {appt.status === "accepted" && appt.confirmed_date && (
              <div className="flex items-center gap-1 text-xs text-green-400 mt-0.5">
                <Check className="w-3 h-3" /> 確定: {appt.confirmed_date} {appt.confirmed_time}
              </div>
            )}
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground p-1">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* 展開: メッセージ表示 */}
        {expanded && (
          <div className="bg-black/20 rounded-lg p-2.5 space-y-2">
            {appt.message && (
              <div>
                <p className="text-[10px] text-muted-foreground font-bold mb-0.5">相談内容</p>
                <p className="text-xs text-foreground leading-relaxed">{appt.message}</p>
              </div>
            )}
            {appt.counter_message && (
              <div>
                <p className="text-[10px] text-blue-400 font-bold mb-0.5">再提案メッセージ</p>
                <p className="text-xs text-foreground leading-relaxed">{appt.counter_message}</p>
              </div>
            )}
          </div>
        )}

        {/* アクションボタン（ライバー用: pending / counter_proposed） */}
        {isOwner && (appt.status === "pending" || appt.status === "counter_proposed") && (
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-500 text-white gap-1 h-8 text-xs font-bold" onClick={handleAccept} disabled={acting}>
              <Check className="w-3.5 h-3.5" /> 承諾
            </Button>
            <Button size="sm" variant="outline" className="flex-1 border-blue-500/50 text-blue-400 hover:bg-blue-500/10 gap-1 h-8 text-xs font-bold" onClick={() => setShowCounter(true)} disabled={acting}>
              <RefreshCw className="w-3.5 h-3.5" /> 再提案
            </Button>
            <Button size="sm" variant="outline" className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 gap-1 h-8 text-xs font-bold" onClick={handleDecline} disabled={acting}>
              <X className="w-3.5 h-3.5" /> 拒否
            </Button>
          </div>
        )}

        {/* 視聴者用: counter_proposed → 承諾ボタン */}
        {!isOwner && appt.status === "counter_proposed" && (
          <div className="flex gap-1.5 pt-1">
            <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-500 text-white gap-1 h-8 text-xs font-bold" onClick={handleAccept} disabled={acting}>
              <Check className="w-3.5 h-3.5" /> 再提案を承諾する
            </Button>
          </div>
        )}
      </div>

      {showCounter && (
        <CounterProposalModal appt={appt} onClose={() => setShowCounter(false)} onDone={onRefresh} />
      )}
    </>
  );
}

export default function AppointmentDashboard({ channel, user }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isOwner = user?.email === channel?.owner_email;

  const { data: appointments = [], refetch } = useQuery({
    queryKey: ["appointments", channel?.id, user?.email],
    queryFn: () => isOwner
      ? base44.entities.Appointment.filter({ channel_id: channel.id })
      : base44.entities.Appointment.filter({ channel_id: channel.id, requester_email: user.email }),
    enabled: !!channel?.id && !!user?.email,
    refetchInterval: 10000,
  });

  // リアルタイム購読
  useEffect(() => {
    if (!channel?.id) return;
    const unsub = base44.entities.Appointment.subscribe(ev => {
      if (ev.data?.channel_id === channel.id) {
        refetch();
        const appt = ev.data;
        // 通知トースト
        if (ev.type === "create" && isOwner) {
          toast.info(`📅 新しい予約リクエストが届きました！ (${appt.requested_date} ${appt.requested_time})`);
        }
        if (ev.type === "update" && !isOwner && appt.requester_email === user?.email) {
          const msg = appt.status === "accepted" ? "✅ 予約が確定しました！" 
            : appt.status === "declined" ? "❌ リクエストが拒否されました"
            : appt.status === "counter_proposed" ? "📅 ライバーから別日時の提案が届きました"
            : null;
          if (msg) toast.info(msg, { duration: 6000 });
        }
      }
    });
    return () => unsub();
  }, [channel?.id, isOwner, user?.email]);

  const pending = appointments.filter(a => a.status === "pending" || a.status === "counter_proposed");
  const others = appointments.filter(a => a.status === "accepted" || a.status === "declined");

  if (!user) return null;

  return (
    <div className="mb-5 rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold">{isOwner ? "届いた予約リクエスト" : "あなたの予約リクエスト"}</p>
          {pending.length > 0 && (
            <span className="ml-1 text-[10px] font-black bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full px-2 py-0.5">
              {pending.length}件 対応待ち
            </span>
          )}
          <button
            onClick={() => navigate("/fortune-calendar")}
            className="ml-auto flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
          >
            カレンダーで見る <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        {appointments.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            {isOwner ? "まだリクエストはありません" : "まだ予約リクエストはありません"}
          </p>
        ) : (
          <div className="space-y-2">
            {pending.map(a => <AppointmentCard key={a.id} appt={a} isOwner={isOwner} onRefresh={refetch} />)}
            {others.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground font-bold pt-2">過去のリクエスト</p>
                {others.slice(0, 3).map(a => <AppointmentCard key={a.id} appt={a} isOwner={isOwner} onRefresh={refetch} />)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}