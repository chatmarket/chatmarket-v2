import React, { useEffect, useRef } from "react";
import { MicOff, Mic, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ParticipantTile({
  participant,       // { email, name }
  stream,            // MediaStream | null
  isMuted,           // boolean
  isHost,            // ホストかどうか（ミュートボタン表示制御）
  connectionState,   // "connected" | "connecting" | "failed" | undefined
  onMute,            // (email) => void
  onUnmute,          // (email) => void
  compact = false,   // 小サイズ表示
}) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const isConnected = connectionState === "connected";
  const isFailed = connectionState === "failed";

  return (
    <div
      className={`relative bg-gray-900 rounded-xl overflow-hidden border ${
        isConnected ? "border-primary/30" : isFailed ? "border-red-500/40" : "border-white/10"
      } ${compact ? "aspect-video" : "aspect-video"}`}
    >
      {/* ビデオ映像 */}
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black text-lg">
            {participant?.name?.[0] || "?"}
          </div>
        </div>
      )}

      {/* 下部グラデーション + 名前 */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <p className="text-white text-xs font-bold truncate">{participant?.name || participant?.email}</p>
      </div>

      {/* ミュートインジケーター */}
      {isMuted && (
        <div className="absolute top-1.5 left-1.5 bg-red-600/90 rounded-full p-0.5">
          <MicOff className="w-3 h-3 text-white" />
        </div>
      )}

      {/* 接続状態 */}
      <div className="absolute top-1.5 right-1.5">
        {isConnected ? (
          <Wifi className="w-3 h-3 text-primary" />
        ) : isFailed ? (
          <WifiOff className="w-3 h-3 text-red-400" />
        ) : (
          <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
        )}
      </div>

      {/* 講師用: 個別ミュートボタン */}
      {isHost && (
        <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all group flex items-center justify-center">
          <Button
            size="sm"
            variant="secondary"
            className="opacity-0 group-hover:opacity-100 transition-opacity h-7 px-2 text-xs"
            onClick={() => isMuted ? onUnmute?.(participant.email) : onMute?.(participant.email)}
          >
            {isMuted ? <Mic className="w-3 h-3 mr-1" /> : <MicOff className="w-3 h-3 mr-1" />}
            {isMuted ? "解除" : "ミュート"}
          </Button>
        </div>
      )}
    </div>
  );
}