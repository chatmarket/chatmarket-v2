import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ArrowLeft, Calendar, Clock, Coins, CheckCircle2, ChevronLeft, ChevronRight, User
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isBefore, startOfDay, addMonths, subMonths } from "date-fns";
import { toast } from "sonner";

export default function CallCalendar() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [message, setMessage] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reserving, setReserving] = useState(false);

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

  // 当月～翌月分の枠を取得
  const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
  const monthEnd = format(endOfMonth(addMonths(currentMonth, 1)), "yyyy-MM-dd");

  const { data: slots = [] } = useQuery({
    queryKey: ["call-slots", channelId, monthStart],
    queryFn: () => base44.entities.CallSlot.filter({ channel_id: channelId, status: "open" }, "date", 100),
    enabled: !!channelId,
  });

  const today = startOfDay(new Date());

  // 日付ごとの枠マップ
  const slotsByDate = slots.reduce((acc, s) => {
    if (!acc[s.date]) acc[s.date] = [];
    acc[s.date].push(s);
    return acc;
  }, {});

  // カレンダーの日一覧
  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth),
  });
  const firstDayOfWeek = startOfMonth(currentMonth).getDay(); // 0=Sun

  // 選択日の枠一覧
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;
  const slotsForDate = selectedDateStr ? (slotsByDate[selectedDateStr] || []) : [];

  const handleReserve = async () => {
    if (!selectedSlot || !user) return;
    setReserving(true);

    // 予約作成
    const reservation = await base44.entities.CallReservation.create({
      slot_id: selectedSlot.id,
      channel_id: channelId,
      channel_name: channel?.name || "",
      owner_email: selectedSlot.owner_email,
      user_email: user.email,
      user_name: user.full_name || user.email,
      date: selectedSlot.date,
      start_time: selectedSlot.start_time,
      duration_minutes: selectedSlot.duration_minutes,
      price: selectedSlot.price,
      message,
      status: "confirmed",
    });

    // 枠を予約済みに更新
    await base44.entities.CallSlot.update(selectedSlot.id, {
      status: "reserved",
      reserved_by_email: user.email,
      reservation_id: reservation.id,
    });

    // チャットメッセージを送信（通知目的）
    const threadId = [user.email, selectedSlot.owner_email].sort().join("__");
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: selectedSlot.owner_email,
      to_channel_id: channelId,
      to_channel_name: channel?.name || "",
      content: `【通話予約完了🗓️】\n📅 ${selectedSlot.date}（${selectedSlot.start_time}〜）\n⏱ ${selectedSlot.duration_minutes}分 / 💴 ¥${(selectedSlot.price || 0).toLocaleString()}${message ? `\n💬 ${message}` : ""}`,
      yell_coin: 0,
      thread_id: threadId,
    });

    queryClient.invalidateQueries({ queryKey: ["call-slots", channelId] });
    setReserving(false);
    setShowConfirmModal(false);
    toast.success("予約が完了しました！");
    navigate(`/chat/${channelId}`);
  };

  if (!channel) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          {channel.avatar_url ? (
            <img src={channel.avatar_url} className="w-8 h-8 rounded-full object-cover" alt="" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <span className="text-sm font-bold">{channel.name?.[0]}</span>
            </div>
          )}
          <div>
            <h1 className="text-base font-bold leading-tight">{channel.name}</h1>
            <p className="text-xs text-muted-foreground">通話予約カレンダー</p>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden mb-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border/50">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-bold text-sm">
            {format(currentMonth, "yyyy年M月")}
          </span>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-border/50">
          {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
            <div key={d} className={`py-2 text-center text-xs font-semibold ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-muted-foreground"}`}>
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7">
          {/* Empty cells before month start */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} className="h-12" />
          ))}
          {daysInMonth.map((day) => {
            const dateStr = format(day, "yyyy-MM-dd");
            const isPast = isBefore(day, today);
            const hasSlots = !!(slotsByDate[dateStr]?.length);
            const isSelected = selectedDate && format(selectedDate, "yyyy-MM-dd") === dateStr;
            const dayOfWeek = day.getDay();

            return (
              <button
                key={dateStr}
                disabled={isPast || !hasSlots}
                onClick={() => setSelectedDate(day)}
                className={`relative h-12 flex flex-col items-center justify-center gap-0.5 transition-all
                  ${isSelected ? "bg-primary text-primary-foreground" : ""}
                  ${!isSelected && !isPast && hasSlots ? "hover:bg-secondary cursor-pointer" : ""}
                  ${isPast ? "opacity-30 cursor-not-allowed" : ""}
                  ${!hasSlots && !isPast ? "opacity-40 cursor-not-allowed" : ""}
                `}
              >
                <span className={`text-sm font-semibold leading-none
                  ${isToday(day) && !isSelected ? "text-primary" : ""}
                  ${dayOfWeek === 0 && !isSelected ? "text-red-400" : ""}
                  ${dayOfWeek === 6 && !isSelected ? "text-blue-400" : ""}
                `}>
                  {format(day, "d")}
                </span>
                {hasSlots && !isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
                {hasSlots && isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground opacity-80" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 px-1">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" /> 予約可能</span>
        <span>色なし = 枠なし</span>
      </div>

      {/* Slots for selected date */}
      {selectedDate && (
        <div>
          <p className="text-sm font-bold mb-3 flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-primary" />
            {format(selectedDate, "M月d日")} の空き枠
          </p>

          {slotsForDate.length === 0 ? (
            <div className="bg-secondary rounded-xl p-4 text-center text-muted-foreground text-sm">
              この日の空き枠はありません
            </div>
          ) : (
            <div className="space-y-2">
              {slotsForDate.sort((a, b) => a.start_time.localeCompare(b.start_time)).map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => { setSelectedSlot(slot); setShowConfirmModal(true); }}
                  className="w-full bg-card border border-border/50 hover:border-primary/50 rounded-xl p-4 flex items-center gap-3 text-left transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex flex-col items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <span className="text-xs font-bold text-foreground">{slot.start_time}</span>
                    <span className="text-[10px] text-muted-foreground">{slot.end_time}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{slot.duration_minutes}分</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Coins className="w-3 h-3 text-yellow-400" />
                      ¥{(slot.price || 0).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                    予約する →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Confirm Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> 予約内容の確認
            </DialogTitle>
          </DialogHeader>

          {selectedSlot && (
            <div className="space-y-4">
              {/* 予約詳細 */}
              <div className="bg-secondary rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">日付</span>
                  <span className="font-semibold">{selectedSlot.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">開始時刻</span>
                  <span className="font-semibold">{selectedSlot.start_time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">通話時間</span>
                  <span className="font-semibold">{selectedSlot.duration_minutes}分</span>
                </div>
                <div className="flex justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">料金</span>
                  <span className="font-black text-primary text-base">¥{(selectedSlot.price || 0).toLocaleString()}</span>
                </div>
              </div>

              {/* メッセージ */}
              <div className="space-y-1.5">
                <Label className="text-xs">メッセージ（任意）</Label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value.slice(0, 100))}
                  placeholder="通話の目的など（100文字以内）"
                  className="w-full bg-secondary rounded-lg px-3 py-2 text-sm resize-none border-0 outline-none focus:ring-1 focus:ring-ring"
                  rows={2}
                />
              </div>

              <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-3">
                予約確定後、チャットに通知が届きます。時間になったら通話画面に進んでください。
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirmModal(false)}>
                  キャンセル
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90 gap-2"
                  onClick={handleReserve}
                  disabled={reserving}
                >
                  {reserving ? "予約中..." : (
                    <><CheckCircle2 className="w-4 h-4" /> ¥{(selectedSlot.price || 0).toLocaleString()} で予約確定</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}