import React from "react";

/**
 * TikTok快感UI: VideoCard スケルトンスクリーン
 * 読み込み中に枠組みだけ先に表示して「動いている安心感」を与える
 */
export default function VideoCardSkeleton({ count = 6 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="block">
          {/* サムネイルスケルトン */}
          <div
            className="rounded-lg sm:rounded-xl aspect-video"
            style={{
              background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
              backgroundSize: "200% 100%",
              animation: `skeletonShimmer 1.5s infinite`,
              animationDelay: `${i * 0.08}s`,
            }}
          />
          <div className="mt-2 space-y-2">
            {/* タイトルスケルトン */}
            <div
              className="h-3.5 rounded-md w-4/5"
              style={{
                background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
                backgroundSize: "200% 100%",
                animation: `skeletonShimmer 1.5s infinite`,
                animationDelay: `${i * 0.08 + 0.1}s`,
              }}
            />
            <div
              className="h-3.5 rounded-md w-3/5"
              style={{
                background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
                backgroundSize: "200% 100%",
                animation: `skeletonShimmer 1.5s infinite`,
                animationDelay: `${i * 0.08 + 0.15}s`,
              }}
            />
            {/* チャンネルアバタースケルトン */}
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded-full shrink-0"
                style={{
                  background: "hsl(var(--secondary))",
                  animation: `skeletonShimmer 1.5s infinite`,
                  animationDelay: `${i * 0.08 + 0.2}s`,
                }}
              />
              <div
                className="h-3 rounded w-1/3"
                style={{
                  background: "linear-gradient(90deg, hsl(var(--secondary)) 25%, hsl(var(--muted)) 50%, hsl(var(--secondary)) 75%)",
                  backgroundSize: "200% 100%",
                  animation: `skeletonShimmer 1.5s infinite`,
                  animationDelay: `${i * 0.08 + 0.2}s`,
                }}
              />
            </div>
          </div>
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