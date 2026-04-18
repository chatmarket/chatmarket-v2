import React, { useEffect, useRef, useState } from "react";
import { Radio, Volume2, VolumeX, Wifi, WifiOff, Settings } from "lucide-react";
import { toast } from "sonner";

// 価格帯→解放画質マップ
const QUALITY_OPTIONS = [
  { label: "SD", value: "480p", minPrice: 0, color: "text-zinc-400", desc: "480p" },
  { label: "HD", value: "720p", minPrice: 55, color: "text-blue-400", desc: "720p" },
  { label: "FHD", value: "1080p", minPrice: 150, color: "text-yellow-400", desc: "1080p" },
];

export default function ViewerStream({ streamId, stream }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [quality, setQuality] = useState(null); // "good" | "poor" | null
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState("auto");

  // 価格から解放可能な画質を判定
  const streamPrice = stream?.price || 0;
  const availableQualities = QUALITY_OPTIONS.filter(q => streamPrice >= q.minPrice);

  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;
  const isWebRTC = stream?.stream_type === "webrtc";

  useEffect(() => {
    // WebRTC の場合はスキップ（Amazon IVS で別途処理）
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

        const { PlayerState, PlayerEventType } = await import("amazon-ivs-player");

        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;
        player.attachHTMLVideoElement(videoRef.current);

        player.addEventListener(PlayerEventType.STATE_CHANGED, (state) => {
          if (!isMounted) return;
          if (state === PlayerState.PLAYING) { setReady(true); setQuality("good"); }
          if (state === PlayerState.BUFFERING) setQuality("poor");
        });

        player.addEventListener(PlayerEventType.ERROR, (err) => {
          if (!isMounted) return;
          console.error("IVS Player error:", err);
          setError("映像の読み込みに失敗しました。再試行してください。");
        });

        player.load(playbackUrl);
        player.play();

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
          <p className="text-sm text-white/50">{isWebRTC ? "Amazon IVS WebRTC ストリーミング" : "Amazon IVS 超低遅延ストリーミング"}</p>
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
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {/* 接続品質インジケーター */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${quality === "poor" ? "bg-yellow-500/80 text-black" : "bg-black/50 text-green-400"}`}>
            {quality === "poor" ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {quality === "poor" ? "低品質" : "良好"}
          </div>

          {/* 画質選択ボタン */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(v => !v)}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 text-white text-xs font-bold hover:bg-black/80 transition-colors"
            >
              <Settings className="w-3 h-3" />
              {selectedQuality === "auto" ? "自動" : selectedQuality}
            </button>
            {showQualityMenu && (
              <div className="absolute bottom-8 right-0 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl py-1 min-w-[130px] z-50">
                <button
                  onClick={() => { setSelectedQuality("auto"); setShowQualityMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors ${selectedQuality === "auto" ? "text-primary" : "text-white hover:bg-zinc-800"}`}
                >
                  自動（推奨）
                </button>
                {QUALITY_OPTIONS.map(q => {
                  const unlocked = streamPrice >= q.minPrice;
                  return (
                    <button
                      key={q.value}
                      onClick={() => { if (unlocked) { setSelectedQuality(q.value); setShowQualityMenu(false); } }}
                      disabled={!unlocked}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                        selectedQuality === q.value ? "text-primary font-black" :
                        unlocked ? "text-white hover:bg-zinc-800" : "text-zinc-600 cursor-not-allowed"
                      }`}
                    >
                      <span className={`font-bold ${q.color}`}>{q.label}</span>
                      <span className="text-zinc-500 ml-1">{q.desc}</span>
                      {!unlocked && <span className="text-zinc-600 ml-1 text-[10px]">🔒{q.minPrice}円〜</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* ミュートボタン */}
          <button
            onClick={() => setMuted(!muted)}
            className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}