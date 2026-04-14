import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Coins, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const GIFTS = [
  { id: "rose",    emoji: "🌹", label: "バラ",     coins: 50   },
  { id: "star",    emoji: "⭐", label: "スター",   coins: 100  },
  { id: "fire",    emoji: "🔥", label: "ファイア", coins: 300  },
  { id: "diamond", emoji: "💎", label: "ダイヤ",   coins: 500  },
  { id: "crown",   emoji: "👑", label: "クラウン", coins: 1000 },
  { id: "rocket",  emoji: "🚀", label: "ロケット", coins: 2000 },
  { id: "rainbow", emoji: "🌈", label: "�虹",       coins: 5000 },
  { id: "universe",emoji: "🌌", label: "宇宙",     coins: 10000},
];

export default function GiftPanel({ streamId, channelId, channelOwnerEmail, user, wallet, onGiftSent }) {
  const [selected, setSelected] = useState(GIFTS[0]);
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (!wallet || wallet.balance < selected.coins) {
      toast.error("コインが不足しています");
      return;
    }
    setSending(true);

    const senderName = user.nickname || user.full_name || user.email;
    const creatorShare = Math.floor(selected.coins * 0.85);

    // 1. コイン残高を減らす
    await base44.entities.YellCoinWallet.update(wallet.id, {
      balance: wallet.balance - selected.coins,
      total_sent: (wallet.total_sent || 0) + selected.coins,
    });

    // 2. 送金トランザクション記録
    const txn = await base44.entities.YellCoinTransaction.create({
      user_email: user.email,
      type: "send",
      amount: selected.coins,
      target_id: streamId,
      target_name: channelOwnerEmail,
      message: `ギフト: ${selected.emoji} ${selected.label}`,
      service_type: "superchat",
      service_id: streamId,
      channel_id: channelId,
      channel_owner_email: channelOwnerEmail,
    });

    // 3. SuperChat (ライブオーバーレイ用) — gift フィールドを追加
    await base44.entities.SuperChat.create({
      livestream_id: streamId,
      sender_email: user.email,
      sender_name: senderName,
      amount: selected.coins,
      message: `${selected.emoji} ${selected.label}`,
      color: selected.coins >= 5000 ? "red" : selected.coins >= 1000 ? "orange" : selected.coins >= 300 ? "yellow" : "green",
      gift_id: selected.id,
      gift_emoji: selected.emoji,
      gift_label: selected.label,
    });

    // 4. ライバー報酬即時加算（CreatorEarning）
    await base44.entities.CreatorEarning.create({
      creator_email: channelOwnerEmail,
      channel_id: channelId,
      sender_email: user.email,
      sender_name: senderName,
      coin_amount: creatorShare,
      yen_equivalent: creatorShare,
      service_type: "superchat",
      service_id: streamId,
      transaction_id: txn.id,
      message: `${selected.emoji} ${selected.label}`,
    });

    // 5. LiveStream の revenue_coins を更新
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    if (streams[0]) {
      await base44.entities.LiveStream.update(streamId, {
        revenue_coins: (streams[0].revenue_coins || 0) + selected.coins,
      });
    }

    toast.success(`${selected.emoji} ${selected.label} を ${selected.coins.toLocaleString()} コインで送りました！`);
    onGiftSent?.();
    setSending(false);
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-3 space-y-2.5">
      {/* ヘッダー */}
      <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
        <Gift className="w-3.5 h-3.5" />
        ギフト
        {wallet && (
          <span className="ml-auto text-muted-foreground font-normal">
            残高: {wallet.balance?.toLocaleString()} コイン
          </span>
        )}
      </div>

      {/* ギフト選択グリッド */}
      <div className="grid grid-cols-4 gap-1.5">
        {GIFTS.map((gift) => (
          <button
            key={gift.id}
            onClick={() => setSelected(gift)}
            className={`flex flex-col items-center gap-0.5 p-2 rounded-xl border-2 transition-all ${
              selected.id === gift.id
                ? "border-primary bg-primary/10"
                : "border-border/40 bg-secondary hover:border-primary/40"
            }`}
          >
            <span className="text-xl leading-none">{gift.emoji}</span>
            <span className={`text-[10px] font-semibold leading-tight ${selected.id === gift.id ? "text-primary" : "text-muted-foreground"}`}>
              {gift.label}
            </span>
            <span className={`text-[10px] font-black ${selected.id === gift.id ? "text-primary" : "text-muted-foreground"}`}>
              {gift.coins.toLocaleString()}
            </span>
          </button>
        ))}
      </div>

      {/* 送るボタン */}
      <Button
        onClick={handleSend}
        disabled={sending || !user || !wallet || wallet.balance < selected.coins}
        className="w-full h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm gap-1.5"
      >
        <Coins className="w-3.5 h-3.5" />
        {sending ? "送信中..." : `${selected.emoji} ${selected.coins.toLocaleString()} コインで送る`}
      </Button>

      {/* 報酬内訳 */}
      <div className="text-[10px] text-muted-foreground flex justify-between px-1">
        <span>ライバー報酬: <span className="text-primary font-bold">{Math.floor(selected.coins * 0.85).toLocaleString()}コイン（85%）</span></span>
        <span>運営: {Math.floor(selected.coins * 0.15).toLocaleString()}コイン</span>
      </div>
    </div>
  );
}