import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, DollarSign, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function VideoEditPanel({ video, onClose, onUpdate }) {
  const [price, setPrice] = useState(video?.price || 0);
  const [isFree, setIsFree] = useState(video?.is_free || false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Video.update(video.id, {
        price: isFree ? 0 : Math.max(0, parseInt(price) || 0),
        is_free: isFree,
      });
      toast.success('動画の値段を更新しました');
      onUpdate?.();
      onClose();
    } catch (err) {
      console.error('Failed to update video:', err);
      toast.error('更新に失敗しました');
    }
    setSaving(false);
  };

  return (
    <Dialog open={!!video} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            動画値付け設定
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* サムネイル */}
          {video?.thumbnail_url && (
            <div className="relative w-full rounded-lg overflow-hidden bg-black/30 aspect-video">
              <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
            </div>
          )}

          {/* タイトル */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">動画タイトル</p>
            <p className="font-semibold text-foreground line-clamp-2">{video?.title}</p>
          </div>

          {/* 無料/有料切り替え */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">配信方式</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsFree(true)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  isFree
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/40"
                }`}
              >
                <span className="text-lg">🆓</span>
                <span className={`text-xs font-bold ${isFree ? "text-primary" : "text-foreground"}`}>
                  無料公開
                </span>
              </button>
              <button
                onClick={() => setIsFree(false)}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all ${
                  !isFree
                    ? "border-primary bg-primary/10"
                    : "border-border bg-secondary hover:border-primary/40"
                }`}
              >
                <span className="text-lg">💰</span>
                <span className={`text-xs font-bold ${!isFree ? "text-primary" : "text-foreground"}`}>
                  有料販売
                </span>
              </button>
            </div>
          </div>

          {/* 価格設定 */}
          {!isFree && (
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-semibold flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-primary" />
                販売価格（コイン）
              </Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="50"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="例：500"
                className="bg-secondary border-0 text-lg font-bold"
              />
              <p className="text-xs text-muted-foreground">
                ユーザーがこの額をコインで支払って動画を視聴できます
              </p>
            </div>
          )}

          {/* 注意 */}
          <div className="bg-blue-500/10 border border-blue-500/40 rounded-lg p-3 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-blue-300 font-semibold">値段設定のヒント</p>
              <p className="text-blue-200/70">
                • 短編（5分以下）: 100-200コイン
              </p>
              <p className="text-blue-200/70">
                • 通常（5-30分）: 300-500コイン
              </p>
              <p className="text-blue-200/70">
                • ロング（30分以上）: 500-1000コイン
              </p>
            </div>
          </div>

          {/* 収益情報 */}
          {!isFree && price > 0 && (
            <div className="bg-green-500/10 border border-green-500/40 rounded-lg p-3 space-y-1 text-xs">
              <p className="text-green-300 font-semibold">あなたの収益</p>
              <div className="flex justify-between text-green-200/80">
                <span>販売価格:</span>
                <span className="font-bold">{price}コイン ≈ ¥{price}</span>
              </div>
              <div className="flex justify-between text-green-200/80">
                <span>あなたの取分 (85%):</span>
                <span className="font-bold text-green-400">{Math.floor(price * 0.85)}コイン</span>
              </div>
              <div className="flex justify-between text-green-200/60 text-[10px]">
                <span>手数料 (15%):</span>
                <span>{Math.ceil(price * 0.15)}コイン</span>
              </div>
            </div>
          )}

          {/* アクション */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              <X className="w-4 h-4 mr-1" /> キャンセル
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              <Save className="w-4 h-4" />
              {saving ? '保存中...' : '値段を設定'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}