import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Package, FileText, Music, Archive, Image, Video, File, Loader2, CheckCircle2, Clock, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const FILE_ICONS = {
  pdf: FileText, mp3: Music, zip: Archive, jpg: Image, png: Image, mp4: Video, other: File,
};

function DigitalDownloadButton({ order }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getProductDownloadUrl", { order_id: order.id });
      const { signed_url, file_name } = res.data;
      const a = document.createElement("a");
      a.href = signed_url;
      a.download = file_name || "download";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("ダウンロードを開始しました");
    } catch (e) {
      toast.error(e.message || "ダウンロードに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const expired = order.download_expires_at && new Date(order.download_expires_at) < new Date();

  return (
    <Button size="sm" onClick={handleDownload} disabled={loading || expired} className="gap-2">
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {expired ? "期限切れ" : "ダウンロード"}
    </Button>
  );
}

function DigitalOrderRow({ order }) {
  const isCustomOrder = order.delivery_mode === "custom_order";
  const isPendingDelivery = order.delivery_status === "pending_delivery";
  const isDelivered = order.delivery_status === "delivered";
  const canDownload = !isCustomOrder || isDelivered;

  const ext = (order.file_name || order.delivered_file_name || "").split(".").pop().toLowerCase();
  const IconComp = FILE_ICONS[ext] || File;

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          {isCustomOrder ? <ClipboardList className="w-5 h-5 text-primary" /> : <IconComp className="w-5 h-5 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-foreground truncate">{order.product_title}</p>
            {isCustomOrder && (
              <Badge className={`text-xs shrink-0 ${isDelivered ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                {isDelivered ? "納品済み" : "納品待ち"}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{order.channel_name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
            <span>¥{order.price_yen?.toLocaleString()}</span>
            <span>{format(new Date(order.created_date), "yyyy/MM/dd", { locale: ja })}</span>
            {order.download_count > 0 && (
              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />{order.download_count}回DL済</span>
            )}
            {order.download_expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {format(new Date(order.download_expires_at), "yyyy/MM/dd", { locale: ja })}まで
              </span>
            )}
          </div>

          {/* オーダーメイド：納品待ちメッセージ */}
          {isCustomOrder && isPendingDelivery && (
            <div className="mt-2 text-xs text-yellow-400 bg-yellow-500/10 rounded-lg px-3 py-2">
              ⏳ 販売者が個別に作成・納品中です。しばらくお待ちください。
            </div>
          )}

          {/* オーダーメイド：納品完了メッセージ */}
          {isCustomOrder && isDelivered && order.delivery_message && (
            <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
              <span className="text-foreground font-medium">販売者より：</span> {order.delivery_message}
            </div>
          )}
        </div>

        {canDownload && (
          <div className="shrink-0">
            <DigitalDownloadButton order={order} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyPurchases() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["my-product-orders", user?.email],
    queryFn: () => base44.entities.ProductOrder.filter({ buyer_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <Button onClick={() => base44.auth.redirectToLogin()}>ログイン</Button>
    </div>
  );

  const digitalOrders = orders.filter(o => o.is_digital && o.status === "completed");
  // 物理グッズは現在非公開（将来候補）
  // const physicalOrders = orders.filter(o => !o.is_digital);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-2xl font-bold text-foreground">購入履歴・ダウンロード</h1>

        {/* デジタルコンテンツ */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />デジタルコンテンツ
          </h2>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : digitalOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4">購入済みのデジタルコンテンツはありません</p>
          ) : (
            <div className="space-y-3">
              {digitalOrders.map(order => <DigitalOrderRow key={order.id} order={order} />)}
            </div>
          )}
        </section>

        {/* 物理グッズ注文セクション: 現在非公開（将来候補） */}
      </div>
    </div>
  );
}