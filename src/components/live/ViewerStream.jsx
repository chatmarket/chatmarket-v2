/**
 * ViewerStream — シンプル優先HLSプレイヤー
 * 映像表示を最優先。設定は軽量化、エラー時は自動リトライ（最大3回）。
 */
import React, { useEffect, useRef, useState } from "react";

const MAX_AUTO_RETRY = 3;

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const destroyedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(false);

  const playbackUrl = stream?.ivs_playback_url;

  useEffect(() => {
    if (!playbackUrl) return;

    destroyedRef.current = false;
    retryCountRef.current = 0;

    startPlayer();

    return () => {
      destroyedRef.current = true;
      clearTimeout(retryTimerRef.current);
      cleanupHls();
    };
  }, [playbackUrl]);

  function cleanupHls() {
    try {
      hlsRef.current?.destroy();
    } catch (_) {}
    hlsRef.current = null;
  }

  function scheduleRetry(delaySec) {
    clearTimeout(retryTimerRef.current);
    retryTimerRef.current = setTimeout(() => {
      if (destroyedRef.current) return;
      retryCountRef.current += 1;
      cleanupHls();
      startPlayer();
    }, delaySec * 1000);
  }

  async function startPlayer() {
    if (destroyedRef.current) return;
    const vid = videoRef.current;
    if (!vid) return;

    // ━━ iOS Safari: ネイティブHLS ━━
    if (!window.__hlsSupported && vid.canPlayType("application/vnd.apple.mpegurl")) {
      vid.src = playbackUrl;
      vid.preload = "auto";
      vid.addEventListener("canplay", () => {
        if (destroyedRef.current) return;
        setLoading(false);
        vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
      }, { once: true });
      vid.addEventListener("error", () => {
        if (destroyedRef.current) return;
        handleFatal();
      }, { once: true });
      vid.load();
      return;
    }

    // ━━ hls.js ━━
    try {
      const Hls = (await import("hls.js")).default;
      if (destroyedRef.current) return;

      if (!Hls.isSupported()) {
        setFatalError(true);
        setLoading(false);
        return;
      }

      window.__hlsSupported = true;

      const hls = new Hls({
        // 軽量設定 — ブラウザ負荷を下げて安定再生優先
        lowLatencyMode: false,           // LL-HLSは無効（安定性優先）
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,

        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        maxBufferSize: 20 * 1000 * 1000, // 20MB（軽量化）
        backBufferLength: 5,

        // ABR: シンプルな自動設定
        startLevel: -1,
        abrEwmaFastLive: 5,
        abrEwmaSlowLive: 15,
        abrBandWidthFactor: 0.8,
        abrBandWidthUpFactor: 0.5,

        // フラグメント
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 4,
        fragLoadingRetryDelay: 1000,

        // マニフェスト
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,

        enableWorker: true,
      });

      hlsRef.current = hls;
      hls.loadSource(playbackUrl);
      hls.attachMedia(vid);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyedRef.current) return;
        setLoading(false);
        setFatalError(false);
        vid.play().catch(() => {
          vid.muted = true;
          vid.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (destroyedRef.current) return;
        if (!data.fatal) return;

        console.warn(`[ViewerStream] fatal error: ${data.type}/${data.details} retry=${retryCountRef.current}`);

        if (retryCountRef.current < MAX_AUTO_RETRY) {
          // 自動リトライ（exponential backoff）
          scheduleRetry(2 * (retryCountRef.current + 1));
        } else {
          handleFatal();
        }
      });

    } catch (e) {
      console.error("[ViewerStream] init failed:", e);
      if (!destroyedRef.current) handleFatal();
    }
  }

  function handleFatal() {
    if (retryCountRef.current < MAX_AUTO_RETRY) {
      scheduleRetry(2 * (retryCountRef.current + 1));
    } else {
      setFatalError(true);
      setLoading(false);
    }
  }

  function manualRetry() {
    retryCountRef.current = 0;
    setFatalError(false);
    setLoading(true);
    cleanupHls();
    startPlayer();
  }

  if (!playbackUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <p className="text-white/50 text-sm">映像URLがありません</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-black">
      {/* ローディング */}
      {loading && !fatalError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
          <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/40 text-xs">映像を読み込み中...</p>
        </div>
      )}

      {/* 致命的エラー（自動リトライ失敗後のみ表示） */}
      {fatalError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-3">
          <p className="text-red-400 text-sm">映像の読み込みに失敗しました</p>
          <button
            onClick={manualRetry}
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
        className="w-full h-full object-contain"
        style={{ opacity: fatalError ? 0 : 1 }}
      />
    </div>
  );
}