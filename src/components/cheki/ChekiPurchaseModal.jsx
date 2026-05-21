import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, CreditCard, Loader2, X } from "lucide-react";
import { toast } from "sonner";

export default function ChekiPurchaseModal({ cheki, channel, user, open, onClose }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    setLoading(true);
    try {
      const res = await base44.functions.invoke("createChekiCheckout", {
        cheki_id: cheki.id,
        buyer_message: message,
      });
      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        toast.error("決済ページの作成に失敗しました");
      }
    } catch (err) {
      toast.error(err.message || "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-pink-400" /> チェキを購入
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* チェキプレビュー */}
          <div className="rounded-xl overflow-hidden border border-pink-500/30 bg-gradient-to-br from-pink-500/10 to-purple-500/10">
            {cheki.image_url ? (
              <img src={cheki.image_url} alt={cheki.title} className="w-full h-48 object-cover" />
            ) : (
              <div className="w-full h-32 flex items-center justify-center">
                <Camera className="w-12 h-12 text-pink-400/30" />
              </div>
            )}
            <div className="p-3">
              <p className="font-black text-base">{cheki.title}</p>
              {cheki.description && <p className="text-xs text-muted-foreground mt-1">{cheki.description}</p>}
              <p className="text-pink-400 font-black text-xl mt-2">¥{cheki.price.toLocaleString()}</p>
            </div>
          </div>

          {/* メッセージ */}
          <div>
            <label className="text-xs font-bold mb-1.5 block">アイドルへのメッセージ（任意）</label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="例: サインをお願いします！"
              className="bg-secondary border-0 resize-none"
              rows={2}
              maxLength={200}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
              キャンセル
            </Button>
            <Button
              className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-400 hover:to-purple-400 text-white font-black gap-2"
              onClick={handlePurchase}
              disabled={loading}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> 処理中...</>
                : <><CreditCard className="w-4 h-4" /> ¥{cheki.price.toLocaleString()} 購入</>
              }
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}