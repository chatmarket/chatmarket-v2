import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Clock, Coins, AlertTriangle } from "lucide-react";

export default function ExtensionRequestModal({ call, onClose, onRequestSent }) {
  const [extensionMinutes, setExtensionMinutes] = useState(15);
  const [extensionCoins, setExtensionCoins] = useState(500);
  const [sending, setSending] = useState(false);

  // 15分刻みのオプション
  const options = [
    { minutes: 15, coins: 500 },
    { minutes: 30, coins: 1000 },
    { minutes: 45, coins: 1500 },
    { minutes: 60, coins: 2000 },
  ];

  const handlePreset = (minutes, coins) => {
    setExtensionMinutes(minutes);
    setExtensionCoins(coins);
  };

  const handleSend = async () => {
    if (!call || extensionMinutes <= 0 || extensionCoins <= 0) {
      toast.error("有効な延長時間とコイン数を入力してください");
      return;
    }
    setSending(true);

    try {
      await base44.functions.invoke("requestCallExtension", {
        callId: call.id,
        extensionMinutes,
        extensionCoins,
      });
      toast.success(`${extensionMinutes}分の延長を申請しました`);
      onRequestSent();
      onClose();
    } catch (err) {
      toast.error(`申請失敗: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" /> 通話を延長する
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 延長時間プリセット */}
          <div>
            <Label className="text-sm mb-2 block">延長時間を選択</Label>
            <div className="grid grid-cols-2 gap-2">
              {options.map(({ minutes, coins }) => (
                <button
                  key={minutes}
                  onClick={() => handlePreset(minutes, coins)}
                  className={`px-3 py-2 rounded-lg border-2 transition-all text-sm font-bold ${
                    extensionMinutes === minutes
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-secondary border-border hover:border-primary/40"
                  }`}
                >
                  {minutes}分<br />¥{coins}
                </button>
              ))}
            </div>
          </div>

          {/* カスタム入力 */}
          <div className="space-y-2">
            <Label className="text-sm">カスタム設定</Label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">分数</Label>
                <Input
                  type="number"
                  value={extensionMinutes}
                  onChange={(e) => setExtensionMinutes(Math.max(1, Number(e.target.value)))}
                  min={1}
                  className="bg-secondary border-0"
                />
              </div>
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">コイン</Label>
                <Input
                  type="number"
                  value={extensionCoins}
                  onChange={(e) => setExtensionCoins(Math.max(1, Number(e.target.value)))}
                  min={1}
                  className="bg-secondary border-0"
                />
              </div>
            </div>
          </div>

          {/* 注意 */}
          <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2 text-xs text-yellow-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              申請後、相手の承認待機中です。相手が決済を完了した時点で延長が確定されます。
            </p>
          </div>

          {/* 確認 */}
          <div className="bg-secondary rounded-lg p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">延長時間</span>
              <span className="font-bold">{extensionMinutes}分</span>
            </div>
            <div className="flex items-center justify-between text-primary">
              <span className="flex items-center gap-1">
                <Coins className="w-4 h-4" /> 必要コイン
              </span>
              <span className="font-bold">{extensionCoins}</span>
            </div>
          </div>

          {/* ボタン */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              キャンセル
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 gap-2"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? "送信中..." : "延長を申請"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}