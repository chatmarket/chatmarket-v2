import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, CalendarDays, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";

export default function CallCalendar() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: () => base44.entities.Channel.filter({ id: channelId }).then((r) => r[0]),
    enabled: !!channelId,
  });

  const { data: slots = [] } = useQuery({
    queryKey: ["call-slots-channel", channelId],
    queryFn: () => base44.entities.CallSlot.filter({ channel_id: channelId, status: "open" }, "date", 100),
    enabled: !!channelId,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startPadding = getDay(monthStart); // 0=Sun

  const slotsByDate = slots.reduce((acc, slot) => {
    if (!acc[slot.date]) acc[slot.date] = [];
    acc[slot.date].push(slot);
    return acc;
  }, {});

  const selectedSlots = selectedDate ? (slotsByDate[selectedDate] || []) : [];

  const handleBook = async () => {
    if (!selectedSlot || !user || !channel) return;
    setBooking(true);
    const reservation = await base44.entities.CallReservation.create({
      slot_id: selectedSlot.id,
      channel_id: channel.id,
      channel_name: channel.name,
      owner_email: channel.owner_email,
      user_email: user.email,
      user_name: user.full_name || user.email,
      date: selectedSlot.date,
      start_time: selectedSlot.start_time,
      duration_minutes: selectedSlot.duration_minutes,
      price: selectedSlot.price,
      message: message,
      status: "pending_payment",
    });
    await base44.entities.CallSlot.update(selectedSlot.id, {
      status: "reserved",
      reserved_by_email: user.email,
      reservation_id: reservation.id,
    });

    // チャットへ通知
    const threadId = [user.email, channel.owner_email].sort().join("__");
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: channel.owner_email,
      to_channel_id: channel.id,
      to_channel_name: channel.name,
      content: `【通話予約リクエスト】\n📅 ${selectedSlot.date} ${selectedSlot.start_time}〜${selectedSlot.end_time}\n⏱ ${selectedSlot.duration_minutes}分 / ¥${(selectedSlot.price || 0).toLocaleString()}${message ? `\n💬 ${message}` : ""}`,
      yell_coin: 0,
      thread_id: threadId,
    });

    queryClient.invalidateQueries({ queryKey: ["call-slots-channel", channelId] });
    setBooking(false);
    setSelectedSlot(null);
    toast.success("予約リクエストを送りました！");
    navigate(`/my-reservations`);
  };

  if (!channel) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          {channel.avatar_url && (
            <img src={channel.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
          )}
          <div>
            <h1 className="font-bold text-base">{channel.name}</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> 通話予約カレンダー
            </p>
          </div>
        </div>
      </div>

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

      {/* Calendar grid */}
      <div className="bg-card border border-border/50 rounded-2xl p-4 mb-4">
        <div className="grid grid-cols-7 mb-2">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
            <div key={d} className={`text-center text-xs font-semibold py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array(startPadding).fill(null).map((_, i) => <div key={`pad-${i}`} />)}
          {days.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const hasSlots = !!slotsByDate[dateStr];
            const isSelected = selectedDate === dateStr;
            const isPast = day < new Date(new Date().toDateString());
            const dayOfWeek = getDay(day);
            return (
              <button
                key={dateStr}
                disabled={!hasSlots || isPast}
                onClick={() => setSelectedDate(dateStr)}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center text-sm font-medium transition-all
                  ${isSelected ? "bg-primary text-primary-foreground" : ""}
                  ${!isSelected && hasSlots && !isPast ? "hover:bg-secondary cursor-pointer" : ""}
                  ${isPast || !hasSlots ? "opacity-30 cursor-not-allowed" : ""}
                  ${dayOfWeek === 0 && !isSelected ? "text-red-400" : ""}
                  ${dayOfWeek === 6 && !isSelected ? "text-blue-400" : ""}
                `}
              >
                {format(day, "d")}
                {hasSlots && !isPast && (
                  <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Slots for selected date */}
      {selectedDate && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground">{selectedDate} の空き枠</p>
          {selectedSlots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">この日の空き枠はありません</p>
          ) : (
            selectedSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => setSelectedSlot(slot)}
                className="w-full bg-card border border-border/50 hover:border-primary/50 rounded-xl p-4 text-left flex items-center gap-3 transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-sm">{slot.start_time} 〜 {slot.end_time}</p>
                  <p className="text-xs text-muted-foreground">{slot.duration_minutes}分 / <span className="text-primary font-bold">¥{(slot.price || 0).toLocaleString()}</span></p>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-sm text-muted-foreground text-center py-8">カレンダーから日付を選択してください<br />● のある日に空き枠があります</p>
      )}

      {/* Booking modal */}
      <Dialog open={!!selectedSlot} onOpenChange={(o) => !o && setSelectedSlot(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> 予約を確定する
            </DialogTitle>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl p-3 space-y-1.5 text-sm">
                <p className="flex justify-between"><span className="text-muted-foreground">日付</span><span className="font-bold">{selectedSlot.date}</span></p>
                <p className="flex justify-between"><span className="text-muted-foreground">時間</span><span className="font-bold">{selectedSlot.start_time} 〜 {selectedSlot.end_time}</span></p>
                <p className="flex justify-between"><span className="text-muted-foreground">通話時間</span><span className="font-bold">{selectedSlot.duration_minutes}分</span></p>
                <p className="flex justify-between"><span className="text-muted-foreground">料金</span><span className="font-bold text-primary">¥{(selectedSlot.price || 0).toLocaleString()}</span></p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">メッセージ（任意）</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                  placeholder="通話の目的や質問など"
                  className="w-full bg-secondary border-0 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setSelectedSlot(null)}>キャンセル</Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                  onClick={handleBook}
                  disabled={booking}
                >
                  {booking ? "処理中..." : <><CheckCircle2 className="w-4 h-4" /> 予約する</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}