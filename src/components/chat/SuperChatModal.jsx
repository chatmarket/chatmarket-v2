import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";

const AMOUNTS = [
  { value: 200, color: "green", label: "¥200" },
  { value: 500, color: "green", label: "¥500" },
  { value: 1000, color: "yellow", label: "¥1,000" },
  { value: 5000, color: "orange", label: "¥5,000" },
  { value: 10000, color: "red", label: "¥10,000" },
  { value: 50000, color: "red", label: "¥50,000" },
];

const colorStyles = {
  green: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  yellow: "bg-yellow-500/20 border-yellow-500/50 text-yellow-400",
  orange: "bg-orange-500/20 border-orange-500/50 text-orange-400",
  red: "bg-red-500/20 border-red-500/50 text-red-400",
};

export default function SuperChatModal({ livestreamId, user, onClose }) {
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const queryClient = useQueryClient();

  const handleSend = async () => {
    if (!selectedAmount) return;
    setSending(true);
    const chosen = AMOUNTS.find((a) => a.value === selectedAmount);
    await base44.entities.SuperChat.create({
      amount: selectedAmount,
      message,
      livestream_id: livestreamId,
      user_name: user?.full_name || "匿名",
      user_email: user?.email,
      color: chosen?.color || "green",
    });
    queryClient.invalidateQueries({ queryKey: ["superchats", livestreamId] });
    setSending(false);
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-yellow-400" />
            エールコインを送る
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {AMOUNTS.map((amt) => (
              <button
                key={amt.value}
                onClick={() => setSelectedAmount(amt.value)}
                className={`p-3 rounded-lg border-2 transition-all font-bold text-sm ${
                  selectedAmount === amt.value
                    ? colorStyles[amt.color]
                    : "border-border bg-secondary hover:border-primary/30"
                }`}
              >
                {amt.label}
              </button>
            ))}
          </div>

          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="メッセージを追加（任意）"
            className="bg-secondary border-0 resize-none"
            rows={2}
          />

          <Button
            onClick={handleSend}
            disabled={!selectedAmount || sending}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {sending ? "送信中..." : `エールコイン ¥${selectedAmount?.toLocaleString() || 0} を送る`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}