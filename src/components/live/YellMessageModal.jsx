import React, { useState } from "react";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const FEE_RATE = 0.036;

function calcTotal(coins) {
  return Math.ceil(coins * (1 + FEE_RATE));
}

export default function YellMessageModal({ coins, user, streamId, channelId, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    setSending(true);

    try {
      // ② 投げ銭宛先の整合性チェック — DBの最新stream IDと一致するか確認
      const latestStreams = await base44.entities.LiveStream.filter({ id: streamId });
      const latestStream = latestStreams[0];
      if (!latestStream) {
        toast.error("⚠️ 配信が見つかりません。ページを再読み込みしてください。");
        setSending(false);
        return;
      }
      if (latestStream.status !== "live") {
        toast.error("⚠️ この配信はすでに終了しています。投げ銭を中断しました。");
        setSending(false);
        return;
      }
      if (latestStream.channel_id !== channelId) {
        toast.error(`⚠️ 投げ銭の宛先が一致しません。ページを再読み込みしてください。\n（期待: ${channelId?.slice(0,8)} / 実際: ${latestStream.channel_id?.slice(0,8)}）`);
        console.error(`[YellMessageModal] ❌ ID mismatch! streamId=${streamId}, expected channelId=${channelId}, actual=${latestStream.channel_id}`);
        setSending(false);
        return;
      }

      const total = calcTotal(coins);
      const wallets = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
      const wallet = wallets[0];

      if (!wallet || wallet.balance < total) {
        toast.error(`コインが不足しています`);
        setSending(false);
        return;
      }

      // ウォレット更新
      await base44.entities.YellCoinWallet.update(wallet.id, {
        balance: wallet.balance - total,
        total_sent: (wallet.total_sent || 0) + coins,
      });

      // トランザクション記録
      await base44.entities.YellCoinTransaction.create({
        user_email: user.email,
        type: "send",
        amount: coins,
        target_id: streamId,
        service_type: "superchat",
        service_id: streamId,
        channel_id: channelId,
      });

      // SuperChat 作成（応援メッセージ付き）
      await base44.entities.SuperChat.create({
        livestream_id: streamId,
        user_email: user.email,
        user_name: user.full_name || "匿名",
        amount: coins,
        message: message || "応援しています！",
        color: coins >= 500 ? "red" : coins >= 100 ? "orange" : coins >= 50 ? "yellow" : "green",
      });

      // ライバーへの収益反映
      if (channelId) {
        const channels = await base44.entities.Channel.filter({ id: channelId });
        const ch = channels[0];

        // CreatorEarning 記録（ライバー収益ログ）
        if (ch) {
          await base44.entities.CreatorEarning.create({
            creator_email: ch.owner_email,
            channel_id: channelId,
            channel_name: ch.name,
            sender_email: user.email,
            sender_name: user.full_name || "匿名",
            coin_amount: coins,
            yen_equivalent: coins * 1.1,
            service_type: "superchat",
            service_id: streamId,
            message: message || "応援しています！",
            is_settled: false,
          }).catch(() => {});

          // チャンネルの月間収益コインを加算
          await base44.entities.Channel.update(ch.id, {
            monthly_revenue_coins: (ch.monthly_revenue_coins || 0) + coins,
          }).catch(() => {});
        }
      }

      toast.success(`🎉 ${coins}コインのエール送信！`);
      onClose();
    } catch (e) {
      toast.error("送信に失敗しました");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black">応援メッセージを入力</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-primary font-bold">🪙 {coins} コイン</p>
          <p className="text-xs text-muted-foreground">手数料込み: {calcTotal(coins)} コイン消費</p>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 50))}
          placeholder="応援メッセージ（50文字以内、任意）"
          maxLength={50}
          className="w-full h-24 bg-secondary border border-border rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <p className="text-xs text-muted-foreground text-right">{message.length}/50</p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-bold transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold transition-colors disabled:opacity-50"
          >
            {sending ? "送信中..." : "送信"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}