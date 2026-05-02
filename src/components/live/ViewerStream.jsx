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
  const [showManualPlay, setShowManualPlay] = useState(false);
  const manualPlayTimerRef = useRef(null);

  // 【修正】クエリパラメータから debug=true を検出
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebugMode(params.get('debug') === 'true');
  }, []);

  // ★ 手動再生ボタン自動トリガー（20秒無再生で自動表示）
  useEffect(() => {
    if (!stream?.ivs_playback_url || loading === false) return;
    manualPlayTimerRef.current = setTimeout(() => {
      if (loading && !fatalError) setShowManualPlay(true);
    }, 20000);
    return () => { if (manualPlayTimerRef.current) clearTimeout(manualPlayTimerRef.current); };
  }, [loading, stream?.ivs_playback_url]);

  const playbackUrl = stream?.ivs_playback_url;
  const noPlayLoadingRef = useRef(0); // ローディングが続いた時間（秒）
  const autoReloadTimerRef = useRef(null);
  const mediaSourceStartTimeRef = useRef(Date.now()); // 映像ロード開始時刻（ミリ秒精度同期）

  useEffect(() => {
    if (!playbackUrl) return;

    destroyedRef.current = false;
    retryRef.current = 0;
    setLoading(true);
    setFatalError(false);
    setShowManualPlay(false);
    noPlayLoadingRef.current = 0;
    mediaSourceStartTimeRef.current = Date.now(); // ★ ミリ秒精度ロード時刻を記録

    // videoRefがDOMにマウントされるまで少し待つ
    const initTimer = setTimeout(() => {
      if (!destroyedRef.current) initPlayer();
    }, 50); // ★ 100ms → 50ms に短縮（最速起動）

    // ★ 自動リロード: 20秒以上ローディングが続いた場合、ソース再読み込み（スマホ対応）
    autoReloadTimerRef.current = setInterval(() => {
    if (!destroyedRef.current && loading) {
      noPlayLoadingRef.current += 1;
      if (debugMode) console.log(`[ViewerStream] Loading state: ${noPlayLoadingRef.current}s`);
      if (noPlayLoadingRef.current >= 20) {
        console.warn('[ViewerStream] ⚠️ Loading timeout 20s — auto-reloading source');
        destroyHls();
        noPlayLoadingRef.current = 0;
        setTimeout(() => initPlayer(), 300);
      }
    }
    }, 1000);

    return () => {
      destroyedRef.current = true;
      clearTimeout(initTimer);
      if (autoReloadTimerRef.current) clearInterval(autoReloadTimerRef.current);
      destroyHls();
    };
  }, [playbackUrl, debugMode, loading]);

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
        // ★ ミリ秒同期: ライブ配信最前線を確保（1080pでも遅延なし）
        liveSyncDuration: 0.3,            // デフォルト3秒 → 300msに短縮
        liveMaxLatencyDuration: 1,        // バッファ上限1秒（追いかけ再生発動）
        liveBackBufferLength: 0,
        maxBufferLength: 0.5,             // バッファ長最小化
        maxMaxBufferLength: 1,
        maxBufferSize: 1 * 1000 * 1000,   // 1MBに制限（高速スタート）
        backBufferLength: 0,
        startLevel: -1,                   // 自動画質選択（1080p推奨をhls.jsに任せる）
        abrBandWidthFactor: 0.6,          // 帯域幅推定に対して60%で適応（止まらないこと最優先）
        abrMaxWithRealBitrate: true,      // 実測値をベースに天井を決定
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
        const timeToPlayReady = Date.now() - mediaSourceStartTimeRef.current;
        console.log(`[ViewerStream] ⚡ Manifest parsed in ${timeToPlayReady}ms — playing immediately`);
        setLoading(false);
        setFatalError(false);
        setShowManualPlay(false);
        noPlayLoadingRef.current = 0;
        if (manualPlayTimerRef.current) clearTimeout(manualPlayTimerRef.current);
        
        // ★ 再生開始（muted優先でSafari対応）
        const playPromise = vid.play();
        if (playPromise !== undefined) {
          playPromise
            .catch((err) => {
              console.warn("[ViewerStream] autoplay failed, muting and retrying:", err);
              vid.muted = true;
              return vid.play();
            })
            .catch((e) => {
              console.warn("[ViewerStream] muted autoplay also failed, showing manual play button:", e);
              setShowManualPlay(true);
            });
        }
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
    setShowManualPlay(false);
    destroyHls();
    setTimeout(() => {
      if (!destroyedRef.current) initPlayer();
    }, 200);
  }

  function handleManualPlay() {
    const vid = videoRef.current;
    if (!vid) return;
    setShowManualPlay(false);
    vid.muted = false;
    vid.play().catch(() => {
      vid.muted = true;
      vid.play().catch(() => manualRetry());
    });
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
      {loading && !showManualPlay && (
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

      {/* 手動再生ボタン — 自動再生失敗 or 20秒経過時に表示 */}
      {showManualPlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4 bg-black/60">
          <button
            onClick={handleManualPlay}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-white/20 hover:bg-white/30 border-2 border-white/60 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <p className="text-white/70 text-sm font-semibold">タップして再生</p>
          <button onClick={manualRetry} className="text-white/40 text-xs underline">再接続する</button>
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