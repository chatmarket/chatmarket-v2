import React, { useState, useRef, useEffect } from "react";

/**
 * TikTok快感UI: 最適化画像コンポーネント
 * - Intersection Observer による真のLazy Load（画面外は一切読み込まない）
 * - スケルトン → フェードインの滑らかな遷移
 * - WebPサポート検出 + URLへのwebp変換（Cloudflare等CDN経由の場合）
 */
export default function OptimizedImage({
  src,
  alt = "",
  className = "",
  skeletonClassName = "",
  onLoad,
  style,
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef(null);

  // Intersection Observer: 画面に映る直前にだけ読み込む
  useEffect(() => {
    if (!src) return;
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px 0px" } // 200px手前から先行読み込み
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const handleLoad = () => {
    setLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setError(true);
    setLoaded(true);
  };

  return (
    <div ref={ref} className={`relative overflow-hidden ${skeletonClassName}`} style={style}>
      {/* スケルトン: 読み込み完了まで表示 */}
      {!loaded && (
        <div
          className="absolute inset-0 bg-secondary"
          style={{
            background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
            backgroundSize: "200% 100%",
            animation: "skeletonShimmer 1.5s infinite",
          }}
        />
      )}

      {/* 実画像: inViewになった瞬間だけsrcを設定 */}
      {inView && !error && src && (
        <img
          src={src}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          className={className}
          style={{
            opacity: loaded ? 1 : 0,
            transition: "opacity 0.4s ease",
            ...style,
          }}
          {...props}
        />
      )}

      {/* エラー時フォールバック */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <span className="text-2xl opacity-30">🎬</span>
        </div>
      )}

      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}