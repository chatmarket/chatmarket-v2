import React from "react";
import { Button } from "@/components/ui/button";

/**
 * X（Twitter）シェアボタン
 * @param {string} text - シェアテキスト（ハッシュタグ含む）
 * @param {string} url  - シェアするURL
 * @param {string} [imageUrl] - 画像URL（Twitter Card用・任意）
 * @param {string} [className]
 * @param {string} [size] - "sm" | "default"
 */
export default function XShareButton({ text, url, className = "", size = "sm" }) {
  const handleShare = () => {
    const params = new URLSearchParams({ text, url });
    const twitterUrl = `https://twitter.com/intent/tweet?${params.toString()}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer,width=550,height=420");
  };

  return (
    <Button
      size={size}
      onClick={handleShare}
      className={`gap-1.5 bg-black hover:bg-zinc-800 text-white border-0 ${className}`}
    >
      {/* X ロゴ (SVG) */}
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.265 5.638 5.9-5.638zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
      Xでシェア
    </Button>
  );
}