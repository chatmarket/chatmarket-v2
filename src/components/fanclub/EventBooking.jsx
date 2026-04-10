import React, { useState } from "react";
import { motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, CheckCircle2, Lock } from "lucide-react";
import { toast } from "sonner";

const generateSlots = () => {
  const slots = [];
  const bookedIndexes = [1, 3, 6, 8];
  for (let i = 0; i < 12; i++) {
    const hour = 19;
    const min = i * 5;
    const h = String(Math.floor(hour + min / 60)).padStart(2, "0");
    const m = String(min % 60).padStart(2, "0");
    const endMin = (i + 1) * 5;
    const eh = String(Math.floor(hour + endMin / 60)).padStart(2, "0");
    const em = String(endMin % 60).padStart(2, "0");
    slots.push({ id: i, time: `${h}:${m}〜${eh}:${em}`, booked: bookedIndexes.includes(i) });
  }
  return slots;
};

export default function EventBooking({ isMember }) {
  const [slots, setSlots] = useState(generateSlots);
  const [selected, setSelected] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  const handleConfirm = async () => {
    setBooking(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSlots((prev) => prev.map((s) => s.id === selected.id ? { ...s, booked: true } : s));
    setBooking(false);
    setConfirmOpen(false);
    setSelected(null);
    toast.success(`${selected.time} の予約が完了しました！🎉`);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-yellow-400" />
        1on1 優待イベント予約
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 border text-xs">会員限定</Badge>
      </h2>

      {/* イベント概要 */}
      <div className="bg-gradient-to-br from-yellow-500/10 to-transparent border border-yellow-500/20 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shrink-0">
            <User className="w-6 h-6 text-black" />
          </div>
          <div>
            <p className="font-bold text-yellow-100">1対1 プレミアムトーク</p>
            <p className="text-xs text-muted-foreground mt-0.5">ファンクラブ会員専用・5分間の特別トーク</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-yellow-200/70">
          <span className="flex items-center gap-1.5 bg-yellow-500/10 rounded-lg px-3 py-1.5">
            <Calendar className="w-3.5 h-3.5 text-yellow-400" /> 2026年4月15日（水）
          </span>
          <span className="flex items-center gap-1.5 bg-yellow-500/10 rounded-lg px-3 py-1.5">
            <Clock className="w-3.5 h-3.5 text-yellow-400" /> 19:00〜20:00
          </span>
        </div>
      </div>

      {/* タイムスロット */}
      {!isMember ? (
        <div className="bg-card border border-border/50 rounded-xl p-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6 text-yellow-400" />
          </div>
          <p className="font-semibold text-sm">ファンクラブ会員限定の予約機能です</p>
          <p className="text-xs text-muted-foreground">会員登録後、タイムスロットの予約ができます</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">予約したい時間枠を選択してください</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {slots.map((slot) => (
              <motion.button
                key={slot.id}
                whileHover={slot.booked ? {} : { scale: 1.03 }}
                whileTap={slot.booked ? {} : { scale: 0.97 }}
                disabled={slot.booked}
                onClick={() => { setSelected(slot); setConfirmOpen(true); }}
                className={`rounded-xl px-2 py-3 text-xs font-semibold text-center transition-colors border ${
                  slot.booked
                    ? "bg-secondary/50 border-border/30 text-muted-foreground/50 cursor-not-allowed"
                    : selected?.id === slot.id
                    ? "bg-yellow-500 border-yellow-400 text-black"
                    : "bg-card border-yellow-500/20 text-yellow-200 hover:border-yellow-400/50 hover:bg-yellow-500/10"
                }`}
              >
                {slot.booked ? (
                  <div className="space-y-0.5">
                    <div className="text-[10px] text-muted-foreground/60">{slot.time}</div>
                    <Badge className="text-[9px] bg-secondary text-muted-foreground border-0 px-1 py-0">予約済</Badge>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    <div>{slot.time}</div>
                    <div className="text-[10px] text-yellow-400/70">空き</div>
                  </div>
                )}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* 確認ダイアログ */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-400" /> 予約の確認
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 space-y-2">
              <p className="text-sm text-muted-foreground">選択した時間枠</p>
              <p className="text-xl font-black text-yellow-400">{selected?.time}</p>
              <p className="text-xs text-muted-foreground">2026年4月15日（水）1対1 プレミアムトーク</p>
            </div>
            <p className="text-xs text-muted-foreground">この時間枠で予約を確定しますか？確定後の変更はできません。</p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>キャンセル</Button>
            <Button
              onClick={handleConfirm}
              disabled={booking}
              style={{ background: "linear-gradient(135deg, #b8860b, #ffd700)", color: "#000" }}
              className="font-bold gap-2"
            >
              {booking ? (
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> 予約を確定する</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}