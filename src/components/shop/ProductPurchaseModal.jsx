import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ProductPurchaseModal({ open, onClose, product }) {
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    setLoading(true);
    try {
      const user = await base44.auth.me().catch(() => null);
      if (!user) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }

      const payload = { product_id: product.id };
      const res = await base44.functions.invoke("createProductCheckout", payload);
      const { checkout_url } = res.data;
      window.location.href = checkout_url;
    } catch (e) {
      toast.error(e.message || "購入処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 物理グッズは現在非公開（将来対応候補）
  if (!product || !product.is_digital) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            デジタルコンテンツを購入
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* 商品情報 */}
          <div className="flex gap-3 p-3 bg-muted rounded-lg">
            {product.image_url ? (
              <img src={product.image_url} alt={product.title} className="w-16 h-16 object-cover rounded-lg shrink-0" />
            ) : (
              <div className="w-16 h-16 bg-card rounded-lg flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-muted-foreground" />
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{product.title}</p>
              {product.description && <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{product.description}</p>}
              <p className="font-bold text-foreground mt-1">¥{product.price?.toLocaleString()}</p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p>💡 決済完了後、マイページの「購入履歴」からダウンロードできます。</p>
            <p className="mt-1">有効期限: 購入日より1年間</p>
          </div>

          <Button className="w-full" onClick={handlePurchase} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Stripe決済へ進む
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}