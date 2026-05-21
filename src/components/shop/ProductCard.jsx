import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Download, Package } from "lucide-react";
import ProductPurchaseModal from "./ProductPurchaseModal";

export default function ProductCard({ product }) {
  const [showModal, setShowModal] = useState(false);

  const soldOut = product.stock !== -1 && product.sold_count >= product.stock;

  return (
    <>
      <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 transition-colors">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full aspect-square object-cover" />
        ) : (
          <div className="w-full aspect-square bg-muted flex items-center justify-center">
            {product.is_digital ? <Download className="w-10 h-10 text-muted-foreground" /> : <Package className="w-10 h-10 text-muted-foreground" />}
          </div>
        )}
        <div className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-foreground text-sm line-clamp-2">{product.title}</p>
            <Badge className={`text-xs shrink-0 ${product.is_digital ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"}`}>
              {product.is_digital ? "デジタル" : "グッズ"}
            </Badge>
          </div>
          {product.description && <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>}
          <div className="flex items-center justify-between pt-1">
            <span className="font-bold text-foreground">¥{product.price?.toLocaleString()}</span>
            <Button
              size="sm"
              disabled={soldOut || !product.is_active}
              onClick={() => setShowModal(true)}
              className="gap-1.5"
            >
              {product.is_digital ? <Download className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />}
              {soldOut ? "売切れ" : product.is_digital ? "購入" : "購入"}
            </Button>
          </div>
          {product.stock !== -1 && (
            <p className="text-xs text-muted-foreground">残り {Math.max(0, product.stock - (product.sold_count || 0))} 点</p>
          )}
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