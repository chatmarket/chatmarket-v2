/**
 * AppointmentRequestModal
 * 視聴者が鑑定予約リクエストを送るモーダル
 */
import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CalendarDays, Clock, MessageCircle, Send, Globe } from "lucide-react";
import { getTimezoneHint, getUserTimezone } from "@/lib/timezone";
import { getLang } from "@/lib/i18n";

const DURATION_OPTIONS = [15, 30, 45, 60, 90];
const TIME_OPTIONS = [];
for (let h = 9; h <= 22; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function AppointmentRequestModal({ channel, user, onClose, onSent }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [duration, setDuration] = useState(30);
  const [message, setMessage] = useState("");
  const [theme, setTheme] = useState("恋愛・結婚");
  const [birthDate, setBirthDate] = useState("");
  const [sending, setSending] = useState(false);

  const THEMES = ["恋愛・結婚", "仕事・転職", "人間関係", "健康", "金運・財運", "総合運", "その他"];

  // 今日以降の日付のみ選択可
  const today = new Date().toISOString().split("T")[0];

  const handleSend = async () => {
    if (!date) { toast.error("希望日を選択してください"); return; }
    if (!message.trim()) { toast.error("相談内容を入力してください"); return; }
    setSending(true);
    try {
      await base44.entities.Appointment.create({
        channel_id: channel.id,
        channel_name: channel.name,
        channel_owner_email: channel.owner_email,
        requester_email: user.email,
        requester_name: user.full_name || user.email,
        requested_date: date,
        requested_time: time,
        duration_minutes: duration,
        message: message.trim(),
        consultation_theme: theme,
        birth_date: birthDate || undefined,
        status: "pending",
      });
      toast.success("🗓️ リクエストを送信しました！ライバーからの返答をお待ちください");
      onSent?.();
      onClose();
    } catch (e) {
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            鑑定予約リクエスト
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 宛先 */}
          <div className="bg-secondary/60 rounded-xl p-3 flex items-center gap-3">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black">
                {channel.name?.[0]}
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">リクエスト先</p>
              <p className="font-bold">{channel.name}</p>
            </div>
          </div>

          {/* タイムゾーン表示（海外ユーザー向け） */}
          {getTimezoneHint(getLang()) && (
            <div className="flex items-center gap-1.5 text-[10px] text-blue-400/80 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
              <Globe className="w-3 h-3 shrink-0" />
              <span>{getTimezoneHint(getLang())}</span>
            </div>
          )}

          {/* 希望日 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> 希望日
            </label>
            <input
              type="date"
              value={date}
              min={today}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* 希望時間 */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 希望時間
            </label>
            <select
              value={time}
              onChange={e => setTime(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            >
              {TIME_OPTIONS.map(t => (
                <option key={t} value={t} className="bg-card">{t}</option>
              ))}
            </select>
          </div>

          {/* 希望時間（分） */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">通話時間</label>
            <div className="grid grid-cols-5 gap-1.5">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                    duration === d
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-secondary text-muted-foreground"
                  }`}
                >
                  {d}分
                </button>
              ))}
            </div>
          </div>

          {/* 相談テーマ */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground">🔮 相談テーマ（鑑定カルテに自動連携）</label>
            <div className="grid grid-cols-4 gap-1.5">
              {THEMES.map(t => (
                <button key={t} type="button" onClick={() => setTheme(t)}
                  className={`py-1.5 rounded-xl border text-[10px] font-bold transition-all ${
                    theme === t ? "border-primary bg-primary/20 text-primary" : "border-border bg-secondary text-muted-foreground"
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 生年月日（任意） */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              生年月日（任意・鑑定に使用）
            </label>
            <input
              type="date"
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/50"
            />
          </div>

          {/* メッセージ */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" /> 相談内容・メッセージ
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="どのようなことを相談したいか、具体的に教えてください..."
              className="w-full bg-secondary border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">{message.length}/500</p>
          </div>

          {/* 送信 */}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>キャンセル</Button>
            <Button
              className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={handleSend}
              disabled={sending}
            >
              <Send className="w-4 h-4" />
              {sending ? "送信中..." : "リクエストを送る"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}