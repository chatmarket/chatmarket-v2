import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarDays, Plus, Trash2, Clock, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CallSlotManage() {
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({
    date: "",
    start_time: "",
    duration_minutes: 30,
    price: 60,
  });
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
    queryKey: ["call-slots-owner", user?.email],
    queryFn: () => base44.entities.CallSlot.filter({ owner_email: user.email }, "date", 50),
    enabled: !!user,
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!user || !channel) return;
    if (!form.date || !form.start_time) {
      toast.error("日付と開始時刻を入力してください");
      return;
    }
    setAdding(true);
    const startParts = form.start_time.split(":");
    const endMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]) + parseInt(form.duration_minutes);
    const endHour = Math.floor(endMinutes / 60).toString().padStart(2, "0");
    const endMin = (endMinutes % 60).toString().padStart(2, "0");

    await base44.entities.CallSlot.create({
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: user.email,
      date: form.date,
      start_time: form.start_time,
      end_time: `${endHour}:${endMin}`,
      duration_minutes: parseInt(form.duration_minutes),
      price: parseInt(form.price),
      status: "open",
    });
    queryClient.invalidateQueries({ queryKey: ["call-slots-owner", user.email] });
    toast.success("予約枠を追加しました");
    setForm({ ...form, date: "", start_time: "" });
    setAdding(false);
  };

  const handleDelete = async (slot) => {
    if (slot.status === "reserved") {
      toast.error("予約済みの枠は削除できません");
      return;
    }
    await base44.entities.CallSlot.delete(slot.id);
    queryClient.invalidateQueries({ queryKey: ["call-slots-owner", user.email] });
    toast.success("削除しました");
  };

  const upcomingSlots = slots.filter((s) => s.date >= new Date().toISOString().slice(0, 10));
  const pastSlots = slots.filter((s) => s.date < new Date().toISOString().slice(0, 10));

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/my-channel" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <CalendarDays className="w-5 h-5 text-primary" /> 通話予約枠管理
        </h1>
      </div>

      {!channel && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6 text-sm text-yellow-400">
          チャンネルを作成してから予約枠を追加できます。
        </div>
      )}

      {/* Add slot form */}
      <div className="bg-card border border-border/50 rounded-2xl p-5 mb-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> 新しい枠を追加
        </h2>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>日付</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                min={new Date().toISOString().slice(0, 10)}
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>開始時刻</Label>
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                className="bg-secondary border-0"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>通話時間</Label>
              <Select
                value={String(form.duration_minutes)}
                onValueChange={(v) => setForm({ ...form, duration_minutes: parseInt(v) })}
              >
                <SelectTrigger className="bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 30, 40, 50, 60].map((m) => (
                    <SelectItem key={m} value={String(m)}>{m}分</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>料金（円）</Label>
              <Input
                type="number"
                min={20}
                step={10}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-0"
              />
            </div>
          </div>
          <Button
            type="submit"
            disabled={adding || !channel}
            className="w-full bg-primary hover:bg-primary/90 gap-2"
          >
            <Plus className="w-4 h-4" /> 枠を追加
          </Button>
        </form>
      </div>

      {/* Upcoming slots */}
      <div className="space-y-3">
        <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">今後の枠 ({upcomingSlots.length})</h2>
        {upcomingSlots.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">予約枠がありません</p>
        ) : (
          upcomingSlots.map((slot) => (
            <SlotCard key={slot.id} slot={slot} onDelete={() => handleDelete(slot)} />
          ))
        )}
      </div>

      {pastSlots.length > 0 && (
        <div className="space-y-3 mt-6">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">過去の枠</h2>
          {pastSlots.slice(0, 10).map((slot) => (
            <SlotCard key={slot.id} slot={slot} onDelete={() => handleDelete(slot)} past />
          ))}
        </div>
      )}
    </div>
  );
}

function SlotCard({ slot, onDelete, past }) {
  const statusMap = {
    open: { label: "受付中", color: "text-green-400 bg-green-500/10" },
    reserved: { label: "予約済", color: "text-blue-400 bg-blue-500/10" },
    cancelled: { label: "キャンセル", color: "text-muted-foreground bg-secondary" },
  };
  const s = statusMap[slot.status] || statusMap.open;

  return (
    <div className={`bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 ${past ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-bold text-sm">{slot.date}</span>
          <span className="text-muted-foreground text-xs flex items-center gap-0.5">
            <Clock className="w-3 h-3" /> {slot.start_time} 〜 {slot.end_time}
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className={`px-2 py-0.5 rounded-full font-semibold ${s.color}`}>{s.label}</span>
          <span className="text-muted-foreground">{slot.duration_minutes}分</span>
          <span className="text-primary font-bold">¥{(slot.price || 0).toLocaleString()}</span>
          {slot.reserved_by_email && (
            <span className="text-muted-foreground truncate max-w-[120px]">{slot.reserved_by_email}</span>
          )}
        </div>
      </div>
      {!past && slot.status !== "reserved" && (
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}