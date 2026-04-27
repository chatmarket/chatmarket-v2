/**
 * ViewerStream — IVS HLS プレイヤー
 * 戦略: まず <video> + HLS.js で再生、失敗時に amazon-ivs-player にフォールバック
 * Chime / EventEmitter / Chime SDK: ゼロ
 */
import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, RefreshCw } from "lucide-react";

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const ivsPlayerRef = useRef(null);

  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState("起動中...");
  const [retryCount, setRetryCount] = useState(0);

  const playbackUrl = stream?.ivs_playback_url?.trim();

  // クリーンアップ
  const cleanup = () => {
    try { hlsRef.current?.destroy(); } catch (_) {}
    hlsRef.current = null;
    try { ivsPlayerRef.current?.pause(); } catch (_) {}
    try { ivsPlayerRef.current?.delete(); } catch (_) {}
    ivsPlayerRef.current = null;
  };

  useEffect(() => {
    console.log("[ViewerStream] stream:", stream?.id, "status:", stream?.status, "url:", playbackUrl);

    if (!playbackUrl) {
      setPhase("❌ 再生URLなし (ivs_playback_url 未設定)");
      return;
    }
    if (stream?.status !== "live") {
      setPhase("配信開始をお待ちください...");
      return;
    }

    cleanup();
    setReady(false);
    setPhase("プレイヤー起動中...");

    let cancelled = false;

    // video要素が確実に存在するまで待つ
    const waitForVideo = () => new Promise((resolve) => {
      const check = () => {
        if (videoRef.current) { resolve(videoRef.current); return; }
        setTimeout(check, 100);
      };
      check();
    });

    (async () => {
      const videoEl = await waitForVideo();
      if (cancelled) return;

      // ── 方法1: ネイティブ HLS (Safari / iOS) ──
      if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
        console.log("[ViewerStream] ✅ ネイティブHLS (Safari/iOS)");
        setPhase("ネイティブHLSで接続中...");
        videoEl.src = playbackUrl;
        videoEl.muted = true;
        videoEl.playsInline = true;
        try {
          await videoEl.play();
          if (!cancelled) { setReady(true); setPhase("🟢 再生中"); }
        } catch (e) {
          console.warn("[ViewerStream] native play error:", e);
          if (!cancelled) setPhase(`再生エラー: ${e.message}`);
        }
        return;
      }

      // ── 方法2: HLS.js (Android Chrome / Desktop) ──
      try {
        setPhase("HLS.js をロード中...");
        const Hls = (await import("hls.js")).default;
        if (cancelled) return;

        if (Hls.isSupported()) {
          console.log("[ViewerStream] ✅ HLS.js モード");
          const hls = new Hls({
            lowLatencyMode: true,
            liveSyncDurationCount: 2,
            liveMaxLatencyDurationCount: 5,
          });
          hlsRef.current = hls;
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoEl);
          hls.on(Hls.Events.MANIFEST_PARSED, async () => {
            if (cancelled) return;
            setPhase("マニフェスト取得済み — 再生開始...");
            try {
              await videoEl.play();
              if (!cancelled) { setReady(true); setPhase("🟢 再生中"); }
            } catch (e) {
              console.warn("[ViewerStream] hls.js play error:", e);
            }
          });
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error("[ViewerStream] HLS.js error:", data);
            if (data.fatal && !cancelled) {
              setPhase(`❌ HLSエラー: ${data.type}`);
            }
          });
          return;
        }
      } catch (e) {
        console.warn("[ViewerStream] HLS.js load failed:", e.message);
      }

      // ── 方法3: amazon-ivs-player (フォールバック) ──
      try {
        setPhase("IVS Playerをロード中...");
        const { create, isPlayerSupported, PlayerState, PlayerEventType } =
          await import("amazon-ivs-player");
        if (cancelled) return;

        if (!isPlayerSupported) {
          setPhase("❌ このブラウザは再生非対応です");
          return;
        }
        console.log("[ViewerStream] ✅ amazon-ivs-player モード");
        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });
        ivsPlayerRef.current = player;
        player.attachHTMLVideoElement(videoEl);
        player.addEventListener(PlayerEventType.STATE_CHANGED, (s) => {
          if (cancelled) return;
          console.log("[ViewerStream] IVS state:", s);
          if (s === PlayerState.PLAYING) { setReady(true); setPhase("🟢 再生中"); }
          else if (s === PlayerState.BUFFERING) setPhase("バッファリング...");
          else if (s === PlayerState.ENDED) { setReady(false); setPhase("配信終了"); }
        });
        player.addEventListener(PlayerEventType.ERROR, (err) => {
          console.error("[ViewerStream] IVS error:", err);
          if (!cancelled) setPhase(`❌ IVSエラー: ${err.type}`);
        });
        player.setMuted(true);
        player.load(playbackUrl);
        player.play();
      } catch (e) {
        console.error("[ViewerStream] IVS Player load failed:", e);
        if (!cancelled) setPhase(`❌ プレイヤー起動失敗: ${e.message}`);
      }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [playbackUrl, stream?.status, retryCount]);

  // ミュート同期
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    if (ivsPlayerRef.current) { try { ivsPlayerRef.current.setMuted(muted); } catch (_) {} }
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black" style={{ minHeight: "200px" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />

      {/* ローディングオーバーレイ */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 z-10">
          <div className="w-14 h-14 border-4 border-white/20 border-t-primary rounded-full animate-spin" />
          <p className="text-white/80 text-sm font-medium text-center px-6">{phase}</p>
          {stream?.status === "live" && playbackUrl && (
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="flex items-center gap-2 text-xs text-primary/80 hover:text-primary mt-2"
            >
              <RefreshCw className="w-3 h-3" /> 再試行
            </button>
          )}
        </div>
      )}

      {/* ミュートボタン */}
      {ready && (
        <button
          onClick={() => setMuted(v => !v)}
          className="absolute bottom-16 left-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white z-20"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* デバッグステータス（右上） */}
      <div className="absolute top-0 right-0 bg-black/70 text-cyan-300 text-[10px] font-mono px-2 py-1 z-30 pointer-events-none max-w-[55vw] break-all">
        {phase}
      </div>
    </div>
  );
}