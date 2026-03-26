import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AgeVerificationModal({ onConfirm, onClose }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm text-center z-[60]">
        <DialogHeader>
          <div className="mx-auto w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-400" />
          </div>
          <DialogTitle className="text-xl">年齢確認</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-muted-foreground text-sm">
            このコンテンツは<span className="font-bold text-foreground">18歳以上</span>の方を対象としています。
          </p>

          <label className="flex items-center gap-3 cursor-pointer bg-secondary rounded-lg p-4 text-left">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4 accent-primary shrink-0"
            />
            <span className="text-sm">私は18歳以上であることを確認しました</span>
          </label>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              キャンセル
            </Button>
            <Button
              onClick={onConfirm}
              disabled={!confirmed}
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              確認して続ける
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}