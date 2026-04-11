import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Plus, Trash2, Clock,
  Phone, Radio, CalendarDays
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, addMonths, subMonths
} from "date-fns";
import { ja } from "date-fns/locale";

export default function CreatorSchedule() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ start_time: "", duration_minutes: 30, price: 3000 });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(async (u) => {
          setUser(u);
          const channels = await base44.entities.Channel.filter({ owner_email: u.email });
          setChannel(channels[0] || null);
        }).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: slots = [] } = useQuery({
    queryKey: ["creator-slots", user?.email],
    queryFn: () => base44.entities.CallSlot.filter({ owner_email: user.email }, "date", 200),
    enabled: !!user,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["creator-streams-schedule", channel?.id],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channel.id }, "scheduled_at", 100),
    enabled: !!channel,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart);
  const today = new Date().toISOString().slice(0, 10);

  // index by date
  const slotsByDate = slots.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  const streamsByDate = streams.reduce((acc, s) => {
    if (!s.scheduled_at) return acc;
    const d = s.scheduled_at.slice(0, 10);
    if (!acc[d]) acc[d] = [];
    acc[d].push(s);
    return acc;
  }, {});

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];
  const selectedStreams = selectedDate ? (streamsByDate[selectedDate] || []) : [];

  const handleAddSlot = async (e) => {
    e.preventDefault();
    if (!selectedDate || !form.start_time || !channel) return;
    setAdding(true);
    const startParts = form.start_time.split(":");
    const endMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]) + parseInt(form.duration_minutes);
    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const endMin = (endMinutes % 60).toString().padStart(2, "0");
    await base44.entities.CallSlot.create({
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: user.email,
      date: selectedDate,
      start_time: form.start_time,
      end_time: `${endHour}:${endMin}`,
      duration_minutes: parseInt(form.duration_minutes),
      price: parseInt(form.price),
      status: "open",
    });
    queryClient.invalidateQueries({ queryKey: ["creator-slots", user.email] });
    toast.success("通話枠を追加しました");
    setShowAddSlot(false);
    setAdding(false);
  };

  const handleDeleteSlot = async (slot) => {
    if (slot.status === "reserved") { toast.error("予約済みの枠は削除できません"); return; }
    await base44.entities.CallSlot.delete(slot.id);
    queryClient.invalidateQueries({ queryKey: ["creator-slots", user.email] });
    toast.success("削除しました");
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> スケジュール管理
        </h1>
        {channel && (
          <Link to={`/channel-schedule/${channel.id}`} className="ml-auto text-xs text-primary underline">
            視聴者ページを確認
          </Link>
        )}
      </div>

      {!channel && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-sm text-yellow-400">
          チャンネルを作成してからスケジュールを追加できます。
        </div>
      )}

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-base">{format(currentMonth, "yyyy年M月", { locale: ja })}</span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-secondary">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-7 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(startPadding).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hasSlots = !!slotsByDate[dateStr];
            const hasStreams = !!streamsByDate[dateStr];
            const isSelected = selectedDate === dateStr;
            const isPast = dateStr < today;
            const dow = getDay(day);
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                  ${isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}
                  ${isPast ? "opacity-40" : ""}
                  ${dow === 0 && !isSelected ? "text-red-400" : ""}
                  ${dow === 6 && !isSelected ? "text-blue-400" : ""}
                `}
              >
                {format(day, "d")}
                <div className="flex gap-0.5 mt-0.5">
                  {hasSlots && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-primary"}`} />}
                  {hasStreams && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-red-400"}`} />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 px-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary inline-block" /> 通話枠</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> ライブ配信</span>
        </div>
      </div>

      {/* Day detail */}
      {selectedDate && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm">{format(new Date(selectedDate + "T00:00:00"), "M月d日（E）", { locale: ja })}</h2>
            {channel && selectedDate >= today && (
              <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90" onClick={() => setShowAddSlot(true)}>
                <Plus className="w-3.5 h-3.5" /> 通話枠を追加
              </Button>
            )}
          </div>

          {/* Live streams */}
          {selectedStreams.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">ライブ配信</p>
              {selectedStreams.map((s) => (
                <div key={s.id} className="bg-card border border-red-500/20 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                    <Radio className={`w-4 h-4 ${s.status === "live" ? "text-red-400 animate-pulse" : "text-red-400"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.scheduled_at ? format(new Date(s.scheduled_at), "HH:mm") : "時刻未定"}
                      {s.price > 0 && ` / ¥${s.price.toLocaleString()}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.status === "live" ? "bg-red-500 text-white animate-pulse" : s.status === "ended" ? "bg-secondary text-muted-foreground" : "bg-red-500/20 text-red-400"}`}>
                    {s.status === "live" ? "LIVE" : s.status === "ended" ? "終了" : "予定"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Call slots */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">通話枠</p>
            {selectedSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">通話枠がありません</p>
            ) : (
              selectedSlots.map((slot) => (
                <div key={slot.id} className="bg-card border border-border/50 rounded-xl p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {slot.start_time} 〜 {slot.end_time}
                    </p>
                    <p className="text-xs text-muted-foreground">{slot.duration_minutes}分 / <span className="text-primary font-bold">¥{(slot.price || 0).toLocaleString()}</span></p>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${slot.status === "open" ? "bg-green-500/20 text-green-400" : "bg-blue-500/20 text-blue-400"}`}>
                    {slot.status === "open" ? "受付中" : "予約済"}
                  </span>
                  {slot.status !== "reserved" && selectedDate >= today && (
                    <button onClick={() => handleDeleteSlot(slot)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>

          {selectedSlots.length === 0 && selectedStreams.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">この日のスケジュールはありません</p>
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-sm text-muted-foreground text-center py-8">
          カレンダーから日付を選択してスケジュールを管理<br />
          <span className="text-[11px]">● 通話枠　● ライブ配信</span>
        </p>
      )}

      {/* Add slot dialog */}
      <Dialog open={showAddSlot} onOpenChange={setShowAddSlot}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> 通話枠を追加
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddSlot} className="space-y-4">
            <div className="bg-secondary rounded-lg p-3 text-sm font-semibold text-center">
              {selectedDate && format(new Date(selectedDate + "T00:00:00"), "yyyy年M月d日（E）", { locale: ja })}
            </div>
            <div className="space-y-1.5">
              <Label>開始時刻</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} className="bg-secondary border-0" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>通話時間</Label>
                <Select value={String(form.duration_minutes)} onValueChange={(v) => setForm({ ...form, duration_minutes: parseInt(v) })}>
                  <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[15, 30, 45, 60, 90, 120].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m}分</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>料金（円）</Label>
                <Input type="number" min={0} step={100} value={form.price} onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })} className="bg-secondary border-0" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowAddSlot(false)}>キャンセル</Button>
              <Button type="submit" disabled={adding} className="flex-1 bg-primary hover:bg-primary/90">
                {adding ? "追加中..." : "追加する"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}