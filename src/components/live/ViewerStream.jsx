/**
 * ViewerStream — HLS.js プレイヤー（IVS SDK完全排除）
 * 映像を最優先で初期化する。エール機能とは完全分離。
 */
import React, { useEffect, useRef, useState } from "react";

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const playbackUrl = stream?.ivs_playback_url;

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;

    let hls;
    let destroyed = false;

    // タイムアウト: 15秒でローディング解除（映像は映るが音だけの場合など）
    const loadingTimeout = setTimeout(() => {
      if (!destroyed) setLoading(false);
    }, 15000);

    async function initHls() {
      try {
        const Hls = (await import("hls.js")).default;
        if (destroyed) return;

        if (Hls.isSupported()) {
          hls = new Hls({
            liveSyncDurationCount: 1,
            liveMaxLatencyDurationCount: 3,
            liveMaxLatencyDuration: 5,
            maxBufferLength: 3,
            maxMaxBufferLength: 5,
            liveDurationInfinity: true,
            lowLatencyMode: true,
          });
          hlsRef.current = hls;

          hls.loadSource(playbackUrl);
          hls.attachMedia(videoRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setLoading(false);
            videoRef.current?.play().catch(() => {});
          });

          hls.on(Hls.Events.ERROR, (_, data) => {
            if (destroyed) return;
            if (data.fatal) {
              clearTimeout(loadingTimeout);
              setError("映像の読み込みに失敗しました");
              setLoading(false);
            }
          });

        } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
          // Safari / iOS ネイティブHLS
          const vid = videoRef.current;
          vid.src = playbackUrl;

          const onReady = () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setLoading(false);
            vid.play().catch(() => {});
          };
          const onError = () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setError("映像の読み込みに失敗しました");
            setLoading(false);
          };

          vid.addEventListener("loadedmetadata", onReady, { once: true });
          vid.addEventListener("canplay", onReady, { once: true });
          vid.addEventListener("error", onError, { once: true });
          vid.load();

        } else {
          clearTimeout(loadingTimeout);
          setError("このブラウザはHLS再生に対応していません");
          setLoading(false);
        }
      } catch (e) {
        clearTimeout(loadingTimeout);
        setError("プレイヤーの初期化に失敗しました");
        setLoading(false);
      }
    }

    initHls();

    return () => {
      destroyed = true;
      clearTimeout(loadingTimeout);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [playbackUrl]);

  if (!playbackUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-white/50 text-sm">映像URLがありません</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
          <p className="text-red-400 text-sm">{error}</p>
          <button
            onClick={() => { setError(null); setLoading(true); }}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm"
          >
            再試行
          </button>
        </div>
      )}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={false}
        className="w-full h-full object-contain"
        style={{ display: error ? "none" : "block" }}
      />
    </div>
  );
}