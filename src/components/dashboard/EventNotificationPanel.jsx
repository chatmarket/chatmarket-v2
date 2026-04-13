import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Clock, AlertCircle, Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function EventNotificationPanel({ channelId, user }) {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [notificationType, setNotificationType] = useState("reminder"); // reminder or update
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const { data: events = [] } = useQuery({
    queryKey: ["dashboard-events-for-notification", channelId],
    queryFn: () =>
      base44.entities.TicketEvent.filter(
        { channel_id: channelId, status: "on_sale" },
        "-event_date"
      ),
    enabled: !!channelId,
  });

  const handleSendReminder = async () => {
    if (!selectedEvent || !message.trim()) {
      toast.error("イベントとメッセージを入力してください");
      return;
    }

    setSending(true);
    try {
      // チケット購入者を取得
      const tickets = await base44.entities.DigitalTicket.filter({
        event_id: selectedEvent.id,
        status: "valid",
      });

      const uniqueEmails = [...new Set(tickets.map((t) => t.owner_email))];

      if (uniqueEmails.length === 0) {
        toast.info("チケット購入者がいません");
        setSending(false);
        return;
      }

      // 各購入者にメール送信
      for (const email of uniqueEmails) {
        await base44.functions.invoke("sendEventReminder", {
          recipient_email: email,
          event_name: selectedEvent.event_name,
          event_date: selectedEvent.event_date,
          event_location: selectedEvent.location,
          message,
          notification_type: notificationType,
        });
      }

      setSent(true);
      setMessage("");
      toast.success(`${uniqueEmails.length}人のチケット購入者に通知しました`);
      setTimeout(() => setSent(false), 3000);
    } catch (error) {
      toast.error("通知送信に失敗しました");
      console.error(error);
    }
    setSending(false);
  };

  return (
    <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
          <Bell className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h3 className="font-bold text-lg">イベント通知管理</h3>
          <p className="text-xs text-muted-foreground">チケット購入者にリマインドメール・更新通知を送信</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          販売中のイベントがありません
        </div>
      ) : (
        <div className="space-y-4">
          {/* イベント選択 */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">
              対象イベント
            </label>
            <select
              value={selectedEvent?.id || ""}
              onChange={(e) => {
                const event = events.find((ev) => ev.id === e.target.value);
                setSelectedEvent(event || null);
              }}
              className="w-full bg-secondary border border-border/50 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- イベントを選択 --</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.event_name} ({format(new Date(event.event_date), "MM/dd HH:mm")})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <>
              {/* 通知タイプ選択 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  通知種別
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNotificationType("reminder")}
                    className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                      notificationType === "reminder"
                        ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                        : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Clock className="w-3 h-3 inline mr-1" />
                    リマインド
                  </button>
                  <button
                    onClick={() => setNotificationType("update")}
                    className={`flex-1 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                      notificationType === "update"
                        ? "bg-red-500/20 border-red-500/40 text-red-300"
                        : "bg-secondary border-border/50 text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    更新通知
                  </button>
                </div>
              </div>

              {/* イベント詳細表示 */}
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2 border border-border/30">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-muted-foreground">開催日時</p>
                    <p className="font-semibold text-sm">
                      {format(new Date(selectedEvent.event_date), "yyyy年MM月dd日 HH:mm")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">場所</p>
                    <p className="font-semibold text-sm">{selectedEvent.location || "未定"}</p>
                  </div>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">説明</p>
                  <p className="text-xs text-foreground/70 line-clamp-2">
                    {selectedEvent.description || "説明なし"}
                  </p>
                </div>
              </div>

              {/* メッセージ入力 */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  {notificationType === "reminder" ? "リマインドメッセージ" : "更新内容"}
                </label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    notificationType === "reminder"
                      ? "例：本イベントは明日開催です。ご来場をお待ちしています。"
                      : "例：開催時間が15:00→14:00に変更になりました。ご注意ください。"
                  }
                  className="bg-secondary border-0 text-sm resize-none h-20"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/500文字
                </p>
              </div>

              {/* 送信ボタン */}
              {!sent ? (
                <Button
                  onClick={handleSendReminder}
                  disabled={sending || !message.trim()}
                  className="w-full gap-2 bg-blue-500 hover:bg-blue-600"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      通知を送信
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-300">送信完了</p>
                    <p className="text-xs text-green-300/70">チケット購入者に通知しました</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 使用例 */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-xs space-y-2">
        <p className="font-semibold text-blue-300">💡 使用例</p>
        <ul className="space-y-1 text-blue-300/70">
          <li>• リマインド：開催日の数日前に送信</li>
          <li>• 更新通知：時間変更・場所変更時に即座に送信</li>
        </ul>
      </div>
    </div>
  );
}