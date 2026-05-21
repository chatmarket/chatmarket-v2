import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Loader2, CheckCircle2, Clock, Send, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// 個別注文に対して販売者がファイルをアップし「納品」するパネル
function DeliveryRow({ order, onDelivered }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [fileInfo, setFileInfo] = useState(null); // { url, name }
  const [message, setMessage] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFileInfo({ url: file_url, name: file.name });
      toast.success("ファイルをアップロードしました");
    } catch { toast.error("アップロード失敗"); }
    finally { setUploading(false); }
  };

  const handleDeliver = async () => {
    if (!fileInfo) { toast.error("納品ファイルをアップロードしてください"); return; }
    setDelivering(true);
    try {
      await base44.entities.ProductOrder.update(order.id, {
        delivered_file_url: fileInfo.url,
        delivered_file_name: fileInfo.name,
        delivery_status: "delivered",
        delivered_at: new Date().toISOString(),
        delivery_message: message,
        // 購入者がDL可能になるよう file_url と file_name もセット
        file_url: fileInfo.url,
        file_name: fileInfo.name,
        download_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast.success("納品しました！購入者にダウンロードが解放されました");
      setOpen(false);
      onDelivered();
    } catch { toast.error("納品処理に失敗しました"); }
    finally { setDelivering(false); }
  };

  const isDelivered = order.delivery_status === "delivered";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div
        className="p-3 flex items-center gap-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => !isDelivered && setOpen(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground text-sm truncate">{order.product_title}</p>
            <Badge className={`text-xs shrink-0 ${isDelivered ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
              {isDelivered ? "納品済" : "未納品"}
            </Badge>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{order.buyer_name || order.buyer_email}</span>
            <span>¥{order.price_yen?.toLocaleString()}</span>
            <span>{format(new Date(order.created_date), "MM/dd HH:mm", { locale: ja })}</span>
          </div>
          {order.buyer_note && (
            <p className="text-xs text-muted-foreground mt-1 italic">「{order.buyer_note}」</p>
          )}
          {isDelivered && order.delivered_at && (
            <p className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {format(new Date(order.delivered_at), "MM/dd HH:mm", { locale: ja })} 納品済み · {order.delivered_file_name}
            </p>
          )}
        </div>
        {!isDelivered && (
          <div className="shrink-0 text-muted-foreground">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        )}
      </div>

      {open && !isDelivered && (
        <div className="border-t border-border p-4 space-y-3 bg-muted/20">
          <p className="text-xs text-foreground font-medium">📦 納品ファイルをアップロードして送付</p>

          <div>
            <Label className="text-xs">納品ファイル *</Label>
            <div className="flex items-center gap-2 mt-1">
              {fileInfo && (
                <span className="text-xs text-primary bg-primary/10 rounded px-2 py-1">{fileInfo.name}</span>
              )}
              <label className="cursor-pointer">
                <input type="file" accept=".pdf,.mp3,.zip,.jpg,.png,.mp4,.docx" className="hidden" onChange={handleFileUpload} />
                <Button type="button" variant="outline" size="sm" disabled={uploading} asChild>
                  <span>{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}　ファイル選択</span>
                </Button>
              </label>
            </div>
          </div>

          <div>
            <Label className="text-xs">購入者へのメッセージ（任意）</Label>
            <Textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="鑑定結果のポイントや補足など…"
              rows={3}
              className="mt-1"
            />
          </div>

          <Button size="sm" onClick={handleDeliver} disabled={delivering || !fileInfo} className="gap-2 w-full">
            {delivering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            この注文に納品する
          </Button>
        </div>
      )}
    </div>
  );
}

export default function CustomOrderDeliveryPanel({ channel }) {
  const qc = useQueryClient();

  const { data: pendingOrders = [], isLoading: loadingPending } = useQuery({
    queryKey: ["custom-orders-pending", channel?.id],
    queryFn: () => base44.entities.ProductOrder.filter(
      { owner_email: channel.owner_email, delivery_mode: "custom_order", delivery_status: "pending_delivery", status: "completed" },
      "-created_date", 50
    ),
    enabled: !!channel?.owner_email,
    refetchInterval: 30000,
  });

  const { data: deliveredOrders = [], isLoading: loadingDelivered } = useQuery({
    queryKey: ["custom-orders-delivered", channel?.id],
    queryFn: () => base44.entities.ProductOrder.filter(
      { owner_email: channel.owner_email, delivery_mode: "custom_order", delivery_status: "delivered" },
      "-delivered_at", 20
    ),
    enabled: !!channel?.owner_email,
  });

  const refresh = () => {
    qc.invalidateQueries(["custom-orders-pending", channel?.id]);
    qc.invalidateQueries(["custom-orders-delivered", channel?.id]);
  };

  return (
    <div className="space-y-6">
      {/* 未納品 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            未納品の注文
            {pendingOrders.length > 0 && (
              <Badge className="bg-yellow-500/20 text-yellow-400 text-xs">{pendingOrders.length}</Badge>
            )}
          </h3>
        </div>
        {loadingPending ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : pendingOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-card rounded-xl border border-border">未納品の注文はありません 🎉</p>
        ) : (
          <div className="space-y-2">
            {pendingOrders.map(order => (
              <DeliveryRow key={order.id} order={order} onDelivered={refresh} />
            ))}
          </div>
        )}
      </div>

      {/* 納品済み */}
      <div>
        <h3 className="font-semibold text-foreground flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-4 h-4 text-green-400" />
          納品済み（直近20件）
        </h3>
        {loadingDelivered ? (
          <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : deliveredOrders.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4 bg-card rounded-xl border border-border">納品済みの注文はありません</p>
        ) : (
          <div className="space-y-2">
            {deliveredOrders.map(order => (
              <DeliveryRow key={order.id} order={order} onDelivered={refresh} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}