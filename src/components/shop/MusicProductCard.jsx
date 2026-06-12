/**
 * MusicProductCard
 * ミュージシャン向けアルバムジャケット風カード
 * 既存のProductPurchaseModalを流用（決済ロジック変更なし）
 */
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Music } from "lucide-react";
import ProductPurchaseModal from "./ProductPurchaseModal";

const RELEASE_TYPE_LABELS = {
  single: "Single",
  ep: "EP",
  album: "Album",
  sample_pack: "Sample Pack",
};

const RELEASE_TYPE_COLORS = {
  single: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  ep: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  album: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  sample_pack: "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function MusicProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);

  if (!product.is_digital) return null;

  const soldOut = product.stock !== -1 && product.sold_count >= product.stock;
  const releaseLabel = RELEASE_TYPE_LABELS[product.music_release_type];
  const releaseColor = RELEASE_TYPE_COLORS[product.music_release_type] || "bg-muted text-muted-foreground border-border";

  return (
    <>
      <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30">
        {/* ジャケット画像（正方形） */}
        <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-secondary to-muted">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <Music className="w-10 h-10 text-muted-foreground/40" />
              <p className="text-[10px] text-muted-foreground/40 font-medium">NO JACKET</p>
            </div>
          )}
          {/* リリースタイプバッジ */}
          {releaseLabel && (
            <span className={`absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded-full border backdrop-blur-sm ${releaseColor}`}>
              {releaseLabel}
            </span>
          )}
          {/* 販売停止オーバーレイ */}
          {(!product.is_active || soldOut) && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-xs font-bold text-white/70">{soldOut ? "SOLD OUT" : "非公開"}</span>
            </div>
          )}
        </div>

        {/* 情報エリア */}
        <div className="p-3 space-y-2">
          {/* タイトル */}
          <p className="font-bold text-sm text-foreground line-clamp-1">{product.title}</p>

          {/* アーティスト名 */}
          {product.artist_name && (
            <p className="text-xs text-muted-foreground line-clamp-1">{product.artist_name}</p>
          )}

          {/* メタ情報（曲数・フォーマット・年） */}
          <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
            {product.track_count && (
              <span className="bg-secondary px-1.5 py-0.5 rounded-md">{product.track_count} tracks</span>
            )}
            {product.audio_format_label && (
              <span className="bg-secondary px-1.5 py-0.5 rounded-md font-mono">{product.audio_format_label}</span>
            )}
            {product.release_year && (
              <span className="bg-secondary px-1.5 py-0.5 rounded-md">{product.release_year}</span>
            )}
          </div>

          {/* 説明文 */}
          {product.description && (
            <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">{product.description}</p>
          )}

          {/* 価格 + 購入ボタン */}
          <div className="flex items-center justify-between pt-1 gap-2">
            <span className="font-black text-foreground text-base">¥{product.price?.toLocaleString()}</span>
            <Button
              size="sm"
              disabled={soldOut || !product.is_active}
              onClick={() => setShowModal(true)}
              className="gap-1.5 text-xs shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {soldOut ? "売切れ" : "購入"}
            </Button>
          </div>
        </div>
      </div>

      <ProductPurchaseModal
        open={showModal}
        onClose={() => setShowModal(false)}
        product={product}
      />
    </>
  );
}