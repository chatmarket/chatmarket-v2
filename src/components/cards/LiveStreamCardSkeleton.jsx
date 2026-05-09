import React from "react";

/**
 * TikTok快感UI: LiveStreamCard スケルトンスクリーン
 */
export default function LiveStreamCardSkeleton({ count = 3 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="block">
          <div
            className="rounded-xl aspect-video"
            style={{
              background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
              backgroundSize: "200% 100%",
              animation: `skeletonShimmer 1.5s infinite`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        </div>
      ))}
      <style>{`
        @keyframes skeletonShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </>
  );
}