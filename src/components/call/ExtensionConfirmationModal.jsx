import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function ExtensionConfirmationModal({ call, onClose, onConfirmed }) {
  const [confirming, setConfirming] = useState(false);

  const extensionMinutes = call?.extension_request_minutes || 0;

  const handleConfirm = async () => {
    if (!call) return;
    setConfirming(true);

    try {
      const res = await base44.functions.invoke("confirmCallExtension", {
        callId: call.id,
      });

      if (res?.data?.success) {
        const newTotal = res.data.newTotalDurationMinutes;
        toast.success(`${extensionMinutes}分延長されました！（新しい総時間: ${newTotal}分）`);
        onConfirmed(res.data);
        onClose();
      } else {
        toast.error("確定に失敗しました");
      }
    } catch (err) {
      toast.error(`エラー: ${err.message}`);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-400" /> 決済完了
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 確認メッセージ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 space-y-2 text-center"
          >
            <p className="text-sm text-green-300 font-bold">相手が決済を完了しました！</p>
            <p className="text-xs text-green-300/70">
              下の『確定』を押すと、通話時間に{extensionMinutes}分追加されます
            </p>
          </motion.div>

          {/* 注意 */}
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/30 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">
              この『確定』は取り消せません。相手の通話時間が即座に追加されます。
            </p>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={confirming}>
              キャンセル
            </Button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleConfirm}
              disabled={confirming}
              className="flex-1 flex items-center justify-center gap-2 font-black text-sm text-white rounded-lg py-2.5 disabled:opacity-40 transition-all"
              style={{
                background: "linear-gradient(135deg, #10b981, #059669)",
                boxShadow: "0 0 20px rgba(16,185,129,0.5)",
              }}
            >
              {confirming ? "確定中..." : <><CheckCircle2 className="w-4 h-4" /> 延長を確定</>}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}