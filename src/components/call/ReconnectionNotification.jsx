import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { PhoneCall, MessageCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function ReconnectionNotification({ call, streamerName, onClose, onReconnect }) {
  const [sending, setSending] = useState(false);

  const handleSendNotification = async () => {
    if (!call) return;
    setSending(true);

    try {
      // チャット送信（相手にプッシュ通知）
      const threadId = [call.caller_email, call.callee_email].sort().join("__");
      
      await base44.entities.DirectChat.create({
        from_email: call.callee_email,
        from_name: call.callee_name,
        to_channel_owner_email: call.caller_email,
        to_channel_id: call.callee_channel_id || "",
        to_channel_name: call.callee_name || "",
        content: `さっきの通話の続きをしませんか？ ${call.extension_request_minutes}分の延長をお待ちしています！`,
        yell_coin: 0,
        thread_id: threadId,
      });

      toast.success("相手に通知を送りました");
      onReconnect();
      onClose();
    } catch (err) {
      toast.error(`送信失敗: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Clock className="w-5 h-5 text-orange-400" />
            </motion.div>
            通話が終了しました
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* メッセージ */}
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 space-y-2 text-center">
            <p className="text-sm text-orange-300 font-bold">相手の延長が確定する前に時間切れになりました</p>
            <p className="text-xs text-orange-300/70">
              相手にメッセージを送って、続きの通話をお誘いしませんか？
            </p>
          </div>

          {/* 相手情報 */}
          <div className="bg-secondary rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground mb-1">延長待機中だった方：</p>
            <p className="font-bold text-sm">{streamerName || call?.callee_name}</p>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={sending}>
              いいえ
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 gap-2"
              onClick={handleSendNotification}
              disabled={sending}
            >
              <MessageCircle className="w-4 h-4" />
              {sending ? "送信中..." : "メッセージを送る"}
            </Button>
          </div>

          {/* 代替案 */}
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => {
              toast.info("チャットで直接メッセージを送ることもできます");
              onClose();
            }}
          >
            <PhoneCall className="w-4 h-4" />
            チャットで直接メッセージ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}