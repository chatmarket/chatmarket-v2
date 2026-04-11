import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Send } from "lucide-react";
import { toast } from "sonner";

const QUICK_AMOUNTS = [100, 500, 1000, 5000];

export default function TipPanel({ streamId, user, wallet, onTipSent }) {
  const [amount, setAmount] = useState(100);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (!wallet || wallet.balance < amount) {
      toast.error("コインが不足しています");
      return;
    }
    setSending(true);
    // Deduct from wallet
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - amount,
      total_sent: (wallet.total_sent || 0) + amount,
    });
    // Record transaction
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount,
      target_id: streamId,
      message,
    });
    // Record SuperChat for display
    await base44.entities.SuperChat.create({
      livestream_id: streamId,
      sender_email: user.email,
      sender_name: user.nickname || user.full_name || user.email,
      amount,
      message,
    });
    toast.success(`${amount.toLocaleString()} コインを送りました！`);
    setMessage("");
    onTipSent?.();
    setSending(false);
  };

  if (!user) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-400">
        <Coins className="w-3.5 h-3.5" />
        投げ銭
        {wallet && (
          <span className="ml-auto text-muted-foreground font-normal">残高: {wallet.balance?.toLocaleString()} コイン</span>
        )}
      </div>

      {/* Quick amounts */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              amount === a
                ? "bg-yellow-500 text-black"
                : "bg-secondary text-muted-foreground hover:bg-yellow-500/20 hover:text-yellow-400"
            }`}
          >
            {a.toLocaleString()}
          </button>
        ))}
        <input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-16 px-2 py-1 rounded-full text-xs bg-secondary text-foreground border-0 text-center"
        />
      </div>

      {/* Message */}
      <div className="flex gap-2">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="メッセージ（任意）"
          className="bg-secondary border-0 text-xs h-8"
          maxLength={50}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !wallet || wallet.balance < amount}
          size="sm"
          className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold h-8 px-3 gap-1 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
          送る
        </Button>
      </div>
    </div>
  );
}