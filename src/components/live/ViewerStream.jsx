import React, { useEffect, useRef, useState } from "react";
import { Radio, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

export default function ViewerStream({ streamId, stream }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);

  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;
  const isWebRTC = stream?.stream_type === "webrtc";

  useEffect(() => {
    // WebRTC の場合はスキップ（AgoraVideoCall で別途処理）
    if (isWebRTC) return;
    if (!playbackUrl || stream?.status !== "live") return;

    let isMounted = true;

    (async () => {
      try {
        // Amazon IVS Player SDK (loaded from CDN script in index.html or dynamic import)
        const { create, isPlayerSupported } = await import("amazon-ivs-player");

        if (!isPlayerSupported) {
          setError("このブラウザはIVS Playerに対応していません");
          return;
        }

        const player = create({
          wasmWorker: "https://player.live-video.net/1.29.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.29.0/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;
        player.attachHTMLVideoElement(videoRef.current);
        player.load(playbackUrl);
        player.play();

        player.addEventListener("PlayerEventType.STATE_CHANGED" in player
          ? player.PlayerEventType?.STATE_CHANGED
          : "stateChanged", (state) => {
          if (!isMounted) return;
          if (state === "Playing" || state === "playing") setReady(true);
        });

        player.addEventListener("PlayerEventType.ERROR" in player
          ? player.PlayerEventType?.ERROR
          : "error", (err) => {
          if (!isMounted) return;
          console.error("IVS Player error:", err);
          setError("映像の読み込みに失敗しました");
        });

        if (isMounted) setReady(false);
      } catch (err) {
        if (!isMounted) return;
        setError("プレイヤーの初期化に失敗: " + err.message);
      }
    })();

    return () => {
      isMounted = false;
      playerRef.current?.delete?.();
      playerRef.current = null;
    };
  }, [playbackUrl, stream?.status]);

  // ミュート同期
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-contain"
        style={{ display: ready ? "block" : "none" }}
      />

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Radio className="w-16 h-16 text-red-400 animate-pulse" />
          <p className="text-lg font-semibold text-white">
            {stream?.status === "live" ? "接続中..." : "配信者の接続を待っています..."}
          </p>
          <p className="text-sm text-white/50">{isWebRTC ? "Agora WebRTC ストリーミング" : "Amazon IVS 超低遅延ストリーミング"}</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 font-bold">{error}</p>
          <button
            onClick={() => { setError(null); setReady(false); }}
            className="text-sm text-white/60 underline"
          >
            再試行
          </button>
        </div>
      )}

      {ready && (
        <button
          onClick={() => setMuted(!muted)}
          className="absolute bottom-16 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}