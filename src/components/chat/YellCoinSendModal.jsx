import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Coins } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const PRESETS = [1, 5, 10, 50, 100];

export default function YellCoinSendModal({ user, channel, threadId, onSent, onClose }) {
  const [amount, setAmount] = useState(10);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!amount || amount <= 0 || sending) return;
    setSending(true);

    // 1. DMチャットメッセージ作成
    await base44.entities.DirectChat.create({
      from_email: user.email,
      from_name: user.full_name || user.email,
      to_channel_owner_email: channel.owner_email,
      to_channel_id: channel.id,
      to_channel_name: channel.name,
      content: message.trim() || `エールコイン×${amount}を送りました！`,
      yell_coin: amount,
      thread_id: threadId,
    });

    // 2. 消費ログ（証跡・永久保存）
    const txRecord = await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      service_type: "direct_chat",
      service_id: threadId,
      channel_id: channel.id,
      channel_owner_email: channel.owner_email,
      target_name: channel.name,
      amount,
      message: message.trim(),
    });

    // 3. CreatorEarning作成（報酬テーブル分離）
    base44.entities.CreatorEarning.create({
      creator_email: channel.owner_email,
      channel_id: channel.id,
      channel_name: channel.name,
      sender_email: user.email,
      sender_name: user.full_name || user.email,
      coin_amount: amount,
      yen_equivalent: Math.floor(amount * 1.1),
      service_type: "direct_chat",
      service_id: threadId,
      transaction_id: txRecord?.id || "",
      message: message.trim(),
    }).catch(() => {});

    toast.success(`エールコイン×${amount}を送りました！`);
    setSending(false);
    onSent();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Coins className="w-5 h-5 text-yellow-400" />
            エールコインを送る
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{channel.name}</span> さんへエールコインを送りましょう！
          </p>

          {/* Preset amounts */}
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setAmount(p)}
                className={`px-3 py-1.5 rounded-full text-sm font-bold border transition-all ${
                  amount === p
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-secondary text-foreground border-border hover:border-yellow-400/50"
                }`}
              >
                ×{p}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">枚数を直接入力</label>
            <input
              type="number"
              min={1}
              max={9999}
              value={amount}
              onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full rounded-lg bg-secondary px-3 py-2 text-sm border-0 focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">一言メッセージ（任意・50文字）</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 50))}
              placeholder="応援してます！"
              rows={2}
              className="w-full resize-none rounded-lg bg-secondary px-3 py-2 text-sm border-0 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-yellow-400/50"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={onClose}>キャンセル</Button>
            <Button
              className="flex-1 gap-2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold"
              onClick={handleSend}
              disabled={sending}
            >
              <Coins className="w-4 h-4" />
              {sending ? "送信中..." : `×${amount} 送る`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}