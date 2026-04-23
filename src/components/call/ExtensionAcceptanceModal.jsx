import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Clock, Coins, AlertTriangle, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ExtensionAcceptanceModal({ call, user, onClose, onAccepted }) {
  const [processing, setProcessing] = useState(false);

  const extensionMinutes = call?.extension_request_minutes || 0;
  const extensionCoins = call?.extension_request_coins || 0;

  const handleAccept = async () => {
    if (!call || !user) return;
    setProcessing(true);

    try {
      const res = await base44.functions.invoke("acceptCallExtension", {
        callId: call.id,
      });

      if (res?.data?.success) {
        toast.success(`${extensionMinutes}分の延長料金を決済しました！`);
        onAccepted(res.data);
      } else {
        toast.error("決済に失敗しました");
      }
    } catch (err) {
      if (err.response?.status === 402) {
        toast.error(`コイン残高不足です（必要: ${extensionCoins}コイン）`);
      } else {
        toast.error(`エラー: ${err.message}`);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = () => {
    toast.info("延長を拒否しました");
    onClose();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <Clock className="w-5 h-5 text-primary" />
            </motion.div>
            {call?.callee_name} さんが延長を申請しました
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 延長内容 */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary/10 border border-primary/30 rounded-lg p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" /> 延長時間
              </span>
              <span className="font-black text-lg text-primary">{extensionMinutes}分</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="w-4 h-4 text-yellow-400" /> 必要コイン
              </span>
              <span className="font-black text-lg text-yellow-400">{extensionCoins}コイン</span>
            </div>
          </motion.div>

          {/* 注意 */}
          <div className="flex items-start gap-2 bg-orange-500/10 border border-orange-500/30 rounded-lg px-3 py-2.5">
            <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <div className="text-xs text-orange-300">
              <p className="font-bold mb-0.5">『OK』で即座に決済が実行されます</p>
              <p>その後、ライバーが延長を最終確定すると通話時間が追加されます</p>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
              onClick={handleDecline}
              disabled={processing}
            >
              拒否
            </Button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAccept}
              disabled={processing}
              className="flex-1 flex items-center justify-center gap-2 font-black text-sm text-black rounded-lg py-2.5 disabled:opacity-40 transition-all"
              style={{
                background: "linear-gradient(135deg, #00ff9d, #00d4aa)",
                boxShadow: "0 0 20px rgba(0,255,157,0.5)",
              }}
            >
              {processing ? (
                "決済処理中..."
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> OK（決済する）
                </>
              )}
            </motion.button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}