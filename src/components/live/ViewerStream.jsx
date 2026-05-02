/**
 * ViewerStream — シンプルHLSプレイヤー
 * - videoRef が確実にマウントされてから初期化
 * - 自動リトライ最大3回
 * - グローバル汚染なし
 */
import React, { useEffect, useRef, useState } from "react";

// リトライ上限なし（配信が始まるまで自動再接続し続ける）
const MAX_RETRY = Infinity;
const RETRY_DELAY_MS = 3000;

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryRef = useRef(0);
  const destroyedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  // 【修正】クエリパラメータから debug=true を検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === 'true');
  }, []);

  const playbackUrl = stream?.ivs_playback_url;

  useEffect(() => {
    if (!playbackUrl) return;

    destroyedRef.current = false;
    retryRef.current = 0;
    setLoading(true);
    setFatalError(false);

    // videoRefがDOMにマウントされるまで少し待つ
    const initTimer = setTimeout(() => {
      if (!destroyedRef.current) initPlayer();
    }, 100);

    return () => {
      destroyedRef.current = true;
      clearTimeout(initTimer);
      destroyHls();
    };
  }, [playbackUrl]);

  function destroyHls() {
    try { hlsRef.current?.destroy(); } catch (_) {}
    hlsRef.current = null;
  }

  function retry() {
    if (destroyedRef.current) return;
    retryRef.current += 1;
    // 回数が増えるほど待機時間を伸ばす（最大15秒）
    const delay = Math.min(RETRY_DELAY_MS * Math.ceil(retryRef.current / 3), 15000);
    console.log(`[ViewerStream] retry #${retryRef.current} in ${delay}ms`);
    destroyHls();
    setTimeout(() => {
      if (!destroyedRef.current) initPlayer();
    }, delay);
  }

  async function initPlayer() {
    const vid = videoRef.current;
    if (!vid) {
      console.warn("[ViewerStream] videoRef is null, retrying...");
      retry();
      return;
    }

    // iOS Safari ネイティブHLS
    if (vid.canPlayType("application/vnd.apple.mpegurl")) {
      // 毎回リスナーをクリーンにセット（once:true だと retry 後に再リッスンできない）
      const onCanPlay = () => {
        if (destroyedRef.current) return;
        setLoading(false);
        vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
      };
      const onError = (e) => {
        if (destroyedRef.current) return;
        const code = vid.error?.code ?? 'N/A';
        const msg  = vid.error?.message ?? '';
        console.warn(`[ViewerStream] native HLS error code=${code} msg=${msg}`);
        vid.removeEventListener("canplay", onCanPlay);
        vid.removeEventListener("error", onError);
        retry();
      };
      vid.removeEventListener("canplay", onCanPlay);
      vid.removeEventListener("error", onError);
      vid.addEventListener("canplay", onCanPlay);
      vid.addEventListener("error", onError);
      vid.src = playbackUrl;
      vid.load();
      return;
    }

    // hls.js
    try {
      const HlsModule = await import("hls.js");
      const Hls = HlsModule.default;

      if (destroyedRef.current) return;

      if (!Hls.isSupported()) {
        console.error("[ViewerStream] hls.js not supported");
        setFatalError(true);
        setLoading(false);
        return;
      }

      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDuration: 0.5,
        liveMaxLatencyDuration: 2,
        liveBackBufferLength: 0,
        maxBufferLength: 1,
        maxMaxBufferLength: 2,
        maxBufferSize: 2 * 1000 * 1000,
        backBufferLength: 0,
        startLevel: -1,
        abrBandWidthFactor: 0.7,
        fragLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 6,           // フラグメントは粘る
        fragLoadingRetryDelay: 1000,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 8,       // IVS起動中(404)でも諦めない
        manifestLoadingRetryDelay: 2000,  // 2秒おきに再試行
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 1500,
        enableWorker: true,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(vid);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyedRef.current) return;
        console.log("[ViewerStream] manifest parsed, playing");
        setLoading(false);
        setFatalError(false);
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch((e) => console.warn("[ViewerStream] play failed:", e));
        });
      });

      // 追いかけ再生: ライブエッジから1.5秒以上遅れたら自動追従
      hls.on(Hls.Events.FRAG_CHANGED, () => {
        if (destroyedRef.current || !vid) return;
        if (!hls.liveSyncPosition) return;
        const lag = hls.liveSyncPosition - vid.currentTime;
        if (lag > 1.5) {
          vid.currentTime = hls.liveSyncPosition - 0.2;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (destroyedRef.current) return;
        // non-fatal もログ（IVS起動待ちの404等を可視化）
        if (!data.fatal) {
          console.log(`[ViewerStream] non-fatal ${data.type}/${data.details} http=${data.response?.code}`);
          return;
        }
        console.warn(`[ViewerStream] fatal: ${data.type}/${data.details} http=${data.response?.code}`);
        retry();
      });

    } catch (e) {
      console.error("[ViewerStream] hls.js import/init error:", e);
      if (!destroyedRef.current) retry();
    }
  }

  function manualRetry() {
    retryRef.current = 0;
    setFatalError(false);
    setLoading(true);
    destroyHls();
    setTimeout(() => {
      if (!destroyedRef.current) initPlayer();
    }, 200);
  }

  if (!playbackUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center space-y-2">
          <p className="text-white/50 text-sm">映像URLがありません</p>
          {debugMode && <p className="text-red-400 text-xs font-mono">playbackUrl is undefined</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black rounded-xl overflow-hidden">
      {loading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3 pointer-events-none">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/40 text-xs">
            {retryRef.current > 0 ? `配信接続中... (${retryRef.current}回目)` : "映像を読み込み中..."}
          </p>
          {retryRef.current > 5 && (
            <p className="text-white/30 text-xs">配信開始をお待ちください</p>
          )}
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
        style={{ opacity: fatalError ? 0 : 1 }}
      />
    </div>
  );
}