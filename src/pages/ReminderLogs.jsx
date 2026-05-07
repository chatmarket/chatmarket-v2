/**
 * ReminderLogs — 予約リマインドログ管理画面 (Admin専用)
 * 送信成功・失敗・スキップを一覧表示し、失敗原因を即座に確認できる
 */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import {
  CheckCircle2, AlertCircle, Clock, SkipForward,
  RefreshCw, Bell, Filter, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "sent", label: "送信済み" },
  { value: "pending", label: "未送信（対象外）" },
  { value: "error", label: "エラー" },
];

function ReminderRow({ appt }) {
  const dateStr = appt.confirmed_date || appt.requested_date;
  const timeStr = appt.confirmed_time || appt.requested_time;
  const apptLabel = `${dateStr} ${timeStr}`;

  const sent = !!appt.reminder_sent_at;
  const hasError = !!appt.reminder_error;

  let icon, statusLabel, statusClass;
  if (hasError) {
    icon = <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />;
    statusLabel = "エラー";
    statusClass = "bg-red-500/10 border-red-500/30 text-red-400";
  } else if (sent) {
    icon = <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
    statusLabel = "送信済み";
    statusClass = "bg-green-500/10 border-green-500/30 text-green-400";
  } else {
    icon = <SkipForward className="w-4 h-4 text-zinc-500 shrink-0" />;
    statusLabel = "未送信";
    statusClass = "bg-zinc-800/50 border-zinc-700/50 text-zinc-500";
  }

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border px-4 py-3 ${statusClass}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {icon}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black">{statusLabel}</span>
            <span className="text-xs text-muted-foreground truncate">{appt.requester_name || appt.requester_email}</span>
            <span className="text-xs text-muted-foreground">→</span>
            <span className="text-xs text-muted-foreground truncate">{appt.channel_name || appt.channel_owner_email}</span>
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Calendar className="w-3 h-3" />{apptLabel}（{appt.duration_minutes || 30}分）
            </span>
            {sent && appt.reminder_sent_at && (
              <span className="flex items-center gap-1 text-[11px] text-green-400/70">
                <Bell className="w-3 h-3" />
                送信: {format(parseISO(appt.reminder_sent_at), "M/d HH:mm", { locale: ja })}
              </span>
            )}
          </div>
          {hasError && (
            <div className="mt-1.5 bg-red-900/30 border border-red-500/20 rounded-lg px-3 py-1.5">
              <p className="text-[11px] font-bold text-red-400 mb-0.5">エラー詳細</p>
              <p className="text-[11px] text-red-300/80 font-mono break-all">{appt.reminder_error}</p>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0 pl-7 sm:pl-0">
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusClass}`}>
          {appt.status === "accepted" ? "確定" : appt.status}
        </span>
      </div>
    </div>
  );
}

export default function ReminderLogs() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      if (u?.role !== "admin") navigate("/");
    }).catch(() => navigate("/"));
  }, []);

  const { data: appointments = [], refetch, isFetching } = useQuery({
    queryKey: ["reminder-logs"],
    queryFn: () => base44.entities.Appointment.list("-updated_date", 200),
    enabled: !!user,
    refetchInterval: 60000,
  });

  // 統計
  const accepted = appointments.filter(a => a.status === "accepted");
  const sent = accepted.filter(a => a.reminder_sent_at);
  const errors = accepted.filter(a => a.reminder_error);
  const pending = accepted.filter(a => !a.reminder_sent_at && !a.reminder_error);

  // フィルタリング
  const filtered = appointments.filter(a => {
    const dateStr = a.confirmed_date || a.requested_date;
    if (dateFilter && dateStr !== dateFilter) return false;

    if (filter === "sent") return !!a.reminder_sent_at;
    if (filter === "error") return !!a.reminder_error;
    if (filter === "pending") return a.status === "accepted" && !a.reminder_sent_at && !a.reminder_error;
    return true;
  });

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black">リマインドログ</h1>
            <p className="text-xs text-muted-foreground">予約15分前通知の送信状況を監視</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          更新
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "確定予約", value: accepted.length, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30" },
          { label: "送信済み", value: sent.length, icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" },
          { label: "未送信", value: pending.length, icon: SkipForward, color: "text-zinc-400", bg: "bg-zinc-800 border-zinc-700" },
          { label: "エラー", value: errors.length, icon: AlertCircle, color: "text-red-400", bg: errors.length > 0 ? "bg-red-500/10 border-red-500/30" : "bg-zinc-800 border-zinc-700" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 ${bg}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color}`} />
              <span className={`text-xs font-bold ${color}`}>{label}</span>
            </div>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${
                filter === opt.value
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-zinc-700 text-zinc-500 hover:border-zinc-500"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="date"
          value={dateFilter}
          onChange={e => setDateFilter(e.target.value)}
          className="ml-auto bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:border-primary/50"
        />
        {dateFilter && (
          <button onClick={() => setDateFilter("")} className="text-xs text-muted-foreground hover:text-foreground">
            ✕ クリア
          </button>
        )}
      </div>

      {/* エラーハイライト */}
      {errors.length > 0 && filter === "all" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-black text-red-400">⚠️ {errors.length}件の送信エラーがあります</p>
            <p className="text-xs text-red-400/70 mt-0.5">下記の「エラー」フィルタで詳細を確認してください</p>
          </div>
        </div>
      )}

      {/* Log List */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-3 opacity-20" />
            <p className="text-sm">該当するログがありません</p>
          </div>
        ) : (
          filtered.map(appt => <ReminderRow key={appt.id} appt={appt} />)
        )}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        1分ごとに自動更新 · 直近200件を表示 · 5分ごとのリマインダー自動化が稼働中
      </p>
    </div>
  );
}