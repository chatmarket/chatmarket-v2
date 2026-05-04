/**
 * ViewerStream — HLSプレイヤー
 * - 3回リトライ失敗 → DBから playbackUrl を強制再取得
 * - playbackUrl が変わったら即座に再初期化
 * - iOS Safari ネイティブHLS / hls.js 両対応
 */
import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";

const RETRY_DELAY_MS = 3000;
const DB_REFRESH_EVERY = 3; // 3回リトライごとにDBから再取得
const URL_POLL_INTERVAL_MS = 300;  // ① URL未確定時のポーリング間隔
const URL_POLL_MAX_ATTEMPTS = 10;  // ① 最大10回

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const retryRef = useRef(0);
  const destroyedRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [showManualPlay, setShowManualPlay] = useState(false);
  const [urlPolling, setUrlPolling] = useState(false);

  // ★ playbackUrl は state で管理 — DBから強制再取得できるよう
  const [playbackUrl, setPlaybackUrl] = useState(stream?.ivs_playback_url || null);

  // ① URLが空の場合: 300ms×最大10回ポーリングしてURLを待つ
  useEffect(() => {
    if (playbackUrl || !stream?.id || destroyedRef.current) return;

    let attempts = 0;
    setUrlPolling(true);
    console.log(`[ViewerStream] 🔍 No URL yet — polling DB (300ms × max ${URL_POLL_MAX_ATTEMPTS})`);

    const poll = setInterval(async () => {
      if (destroyedRef.current) { clearInterval(poll); return; }
      attempts++;
      try {
        const records = await base44.entities.LiveStream.filter({ id: stream.id });
        const fresh = records[0];
        const url = fresh?.ivs_playback_url;
        console.log(`[ViewerStream] 🔍 Poll #${attempts}: url=${url ? "OK" : "empty"}, status=${fresh?.status}`);
        if (url) {
          clearInterval(poll);
          setUrlPolling(false);
          setPlaybackUrl(url);
        } else if (attempts >= URL_POLL_MAX_ATTEMPTS) {
          clearInterval(poll);
          setUrlPolling(false);
          console.warn(`[ViewerStream] ⚠️ URL未取得 — ${URL_POLL_MAX_ATTEMPTS}回試みたが空のまま`);
        }
      } catch (e) {
        console.error("[ViewerStream] Poll error:", e);
      }
    }, URL_POLL_INTERVAL_MS);

    return () => { clearInterval(poll); setUrlPolling(false); };
  }, [stream?.id, playbackUrl]);

  // stream props が更新されたら最新URLに追従
  useEffect(() => {
    if (stream?.ivs_playback_url && stream.ivs_playback_url !== playbackUrl) {
      console.log(`[ViewerStream] 🔄 Stream prop updated — new URL:`, stream.ivs_playback_url);
      setPlaybackUrl(stream.ivs_playback_url);
    }
  }, [stream?.ivs_playback_url]);

  // ★ DBから最新の playbackUrl を強制再取得
  const refreshUrlFromDB = useCallback(async () => {
    if (!stream?.id) return;
    console.log(`[ViewerStream] 🔃 Force-refreshing playbackUrl from DB for stream: ${stream.id}`);
    try {
      const records = await base44.entities.LiveStream.filter({ id: stream.id });
      const fresh = records[0];
      if (!fresh) { console.warn("[ViewerStream] ❌ Stream not found in DB"); return; }
      console.log(`[ViewerStream] ✅ Fresh URL from DB:`, {
        url: fresh.ivs_playback_url,
        status: fresh.status,
        stream_id: fresh.id,
      });
      if (fresh.ivs_playback_url && fresh.ivs_playback_url !== playbackUrl) {
        setPlaybackUrl(fresh.ivs_playback_url);
      } else if (fresh.ivs_playback_url) {
        // 同じURLでも強制リセットしてHLSを再初期化
        destroyHls();
        retryRef.current = 0;
        setTimeout(() => { if (!destroyedRef.current) initPlayer(fresh.ivs_playback_url); }, 300);
      }
    } catch (e) {
      console.error("[ViewerStream] DB refresh failed:", e);
    }
  }, [stream?.id, playbackUrl]);

  function destroyHls() {
    try { hlsRef.current?.destroy(); } catch (_) {}
    hlsRef.current = null;
  }

  function retry(urlToUse) {
    if (destroyedRef.current) return;
    retryRef.current += 1;
    const count = retryRef.current;
    console.log(`[ViewerStream] 🔁 retry #${count}`);

    // ★ 3回ごとにDBから再取得
    if (count % DB_REFRESH_EVERY === 0) {
      console.log(`[ViewerStream] 🔃 ${count} retries — triggering DB refresh`);
      refreshUrlFromDB();
      return;
    }

    const delay = Math.min(RETRY_DELAY_MS * Math.ceil(count / 3), 12000);
    destroyHls();
    setTimeout(() => {
      if (!destroyedRef.current) initPlayer(urlToUse);
    }, delay);
  }

  async function initPlayer(url) {
    const vid = videoRef.current;
    if (!vid) { console.warn("[ViewerStream] ❌ videoRef is null"); return; }

    // ★ 常にフル URL をコンソールに出力（昨日のURLか今日のURLか一目でわかる）
    console.log(`[ViewerStream] 🎥 initPlayer — URL FULL:`, url);
    console.log(`[ViewerStream] 🕐 Timestamp: ${new Date().toISOString()}`);

    // iOS Safari ネイティブHLS
    if (vid.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[ViewerStream] 📱 iOS Native HLS");
      const onCanPlay = () => {
        if (destroyedRef.current) return;
        setLoading(false);
        setShowManualPlay(false);
        vid.play().catch(() => { vid.muted = true; vid.play().catch(() => {}); });
      };
      const onError = () => {
        if (destroyedRef.current) return;
        console.warn(`[ViewerStream] ❌ Native HLS error code=${vid.error?.code}`);
        vid.removeEventListener("canplay", onCanPlay);
        vid.removeEventListener("error", onError);
        retry(url);
      };
      vid.removeEventListener("canplay", onCanPlay);
      vid.removeEventListener("error", onError);
      vid.addEventListener("canplay", onCanPlay);
      vid.addEventListener("error", onError);
      vid.src = url;
      vid.load();
      return;
    }

    // hls.js (Android Chrome / Desktop)
    try {
      const { default: Hls } = await import("hls.js");
      if (destroyedRef.current) return;
      if (!Hls.isSupported()) { console.error("[ViewerStream] hls.js not supported"); return; }

      const hls = new Hls({
        lowLatencyMode: true,
        liveSyncDuration: 1,
        liveMaxLatencyDuration: 4,
        maxBufferLength: 3,
        maxMaxBufferLength: 6,
        fragLoadingTimeOut: 15000,
        fragLoadingMaxRetry: 6,
        manifestLoadingTimeOut: 12000,
        manifestLoadingMaxRetry: 8,
        manifestLoadingRetryDelay: 2000,
        enableWorker: true,
        liveDurationInfinity: true,
      });

      hlsRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(vid);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (destroyedRef.current) return;
        console.log(`[ViewerStream] ✅ Manifest parsed — playing`);
        setLoading(false);
        setShowManualPlay(false);
        vid.play().catch(() => { vid.muted = true; vid.play().catch(() => setShowManualPlay(true)); });
      });

      hls.on(Hls.Events.FRAG_CHANGED, () => {
        if (!hls.liveSyncPosition || !vid) return;
        if (hls.liveSyncPosition - vid.currentTime > 2) {
          vid.currentTime = hls.liveSyncPosition - 0.3;
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (destroyedRef.current) return;
        if (!data.fatal) {
          console.log(`[ViewerStream] non-fatal ${data.details} http=${data.response?.code}`);
          return;
        }
        console.warn(`[ViewerStream] ❌ fatal ${data.details}`);
        retry(url);
      });

    } catch (e) {
      console.error("[ViewerStream] hls.js error:", e);
      if (!destroyedRef.current) retry(url);
    }
  }

  // playbackUrl が変わるたびに再初期化
  useEffect(() => {
    if (!playbackUrl) return;

    destroyedRef.current = false;
    retryRef.current = 0;
    setLoading(true);
    setShowManualPlay(false);

    const t = setTimeout(() => {
      if (!destroyedRef.current) initPlayer(playbackUrl);
    }, 50);

    // ★ 15秒ごとに生存確認 — ローディングが続いていたら自動リフレッシュ
    const watchdog = setInterval(() => {
      if (!destroyedRef.current && loading) {
        console.warn("[ViewerStream] ⏰ Watchdog: still loading after 15s — DB refresh");
        refreshUrlFromDB();
      }
    }, 15000);

    return () => {
      destroyedRef.current = true;
      clearTimeout(t);
      clearInterval(watchdog);
      destroyHls();
    };
  }, [playbackUrl]); // ← loading を依存配列から除去（無限ループ防止）

  // playbackUrl なし（DBにURLが入っていない）— ポーリング中
  if (!playbackUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          <p className="text-white/50 text-sm">
            {urlPolling ? "配信開始を待機中... (自動確認中)" : "配信URLを取得中..."}
          </p>
          {urlPolling && (
            <p className="text-yellow-400/70 text-xs">🔍 300ms間隔でDBを確認しています</p>
          )}
          <p className="text-white/30 text-xs font-mono">{stream?.id ? `stream: ${stream.id.slice(0,8)}...` : "stream ID なし"}</p>
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
          {retryRef.current >= DB_REFRESH_EVERY && (
            <p className="text-yellow-400/60 text-xs">🔃 最新URLを再取得中...</p>
          )}
        </div>
      )}

      {showManualPlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 gap-4 bg-black/60 backdrop-blur">
          <button
            onClick={() => { setShowManualPlay(false); refreshUrlFromDB(); }}
            className="flex items-center justify-center w-20 h-20 rounded-full bg-white/25 hover:bg-white/40 border-2 border-white/80 transition-all active:scale-95 shadow-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="white">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
          </button>
          <p className="text-white/90 text-sm font-semibold">タップして映像を開始</p>
          <p className="text-white/40 text-xs">最新の配信URLを再取得します</p>
        </div>
      )}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />
    </div>
  );
}