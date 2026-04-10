import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Coins } from "lucide-react";
import { toast } from "sonner";

const PRESET_AMOUNTS = [100, 300, 500, 1000, 3000, 5000];

export default function FanClubTipping({ channel, user, wallet, onWalletUpdate }) {
  const [amount, setAmount] = useState(500);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // 送る側は10%手数料を上乗せして支払う
  const platformFee = Math.ceil(amount * 0.1);
  const totalCost = amount + platformFee;
  const hasBalance = wallet && wallet.balance >= totalCost;

  const handleSend = async () => {
    if (!hasBalance) {
      toast.error("エールコインが不足しています");
      return;
    }
    setSending(true);

    // ウォレット残高を減らす（送信者）
    const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
    if (wallets[0]) {
      await base44.entities.YellCoinWallet.update(wallets[0].id, {
        balance: wallets[0].balance - totalCost,
        total_sent: (wallets[0].total_sent || 0) + totalCost,
      });
    }

    // 取引記録（送信者側 - 手数料込み合計を消費）
    await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount: totalCost,
      target_name: channel.name,
      target_id: channel.id,
      message: message,
    });

    // スーパーチャット記録（配信者は tip amount 100% 受取）
    await base44.entities.SuperChat.create({
      user_email: user.email,
      user_name: user.nickname || user.full_name || user.email,
      callee_email: channel.owner_email,
      channel_id: channel.id,
      channel_name: channel.name,
      amount: amount,
      message: message,
      type: "fanclub_tip",
    });

    toast.success(`¥${amount.toLocaleString()}の投げ銭を送りました！（手数料¥${platformFee}含む合計¥${totalCost}消費）`);
    setMessage("");
    onWalletUpdate?.();
    setSending(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-yellow-400" />
        <h3 className="font-bold text-sm">投げ銭（会員限定）</h3>
      </div>

      {/* プリセット金額 */}
      <div className="grid grid-cols-3 gap-2">
        {PRESET_AMOUNTS.map((a) => (
          <button
            key={a}
            onClick={() => setAmount(a)}
            className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
              amount === a
                ? "bg-yellow-500/20 border-yellow-500/60 text-yellow-300"
                : "bg-secondary border-border text-muted-foreground hover:border-yellow-500/40"
            }`}
          >
            ¥{a.toLocaleString()}
          </button>
        ))}
      </div>

      {/* カスタム金額 */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground shrink-0">金額:</span>
        <Input
          type="number"
          min={1}
          value={amount}
          onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
          className="bg-secondary border-0"
        />
      </div>

      {/* メッセージ */}
      <Input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="メッセージを添えて送る（任意）"
        className="bg-secondary border-0"
      />

      {/* 料金内訳 */}
      <div className="bg-secondary rounded-xl p-3 text-xs space-y-1.5">
        <div className="flex justify-between text-muted-foreground">
          <span>投げ銭金額</span>
          <span>{amount.toLocaleString()} コイン</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>プラットフォーム手数料 (10%)</span>
          <span>{platformFee.toLocaleString()} コイン</span>
        </div>
        <div className="flex justify-between font-bold border-t border-border pt-1.5">
          <span>合計消費</span>
          <span className="text-yellow-400">{totalCost.toLocaleString()} コイン</span>
        </div>
        <div className="flex justify-between text-primary font-semibold">
          <span>{channel.name} への受取</span>
          <span>{amount.toLocaleString()} コイン (100%)</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>あなたの残高</span>
          <span className={!hasBalance ? "text-red-400" : ""}>{wallet?.balance?.toLocaleString() ?? 0} コイン</span>
        </div>
      </div>

      <Button
        onClick={handleSend}
        disabled={sending || !hasBalance || amount <= 0}
        className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
      >
        <Coins className="w-4 h-4" />
        {sending ? "送信中..." : `${totalCost.toLocaleString()} コイン消費して投げ銭する`}
      </Button>
    </div>
  );
}