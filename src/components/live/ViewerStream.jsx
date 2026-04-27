/**
 * ViewerStream — Ultra-Low Latency HLS Player
 * YouTube以上のスムーズさを目指した最適化プレイヤー
 *
 * 主な最適化:
 * - CMAF/LL-HLS対応の積極的なセグメント先読み
 * - ABR自動画質切替を滑らか＆高速に
 * - バッファストール時の自動回復（3段階）
 * - 遅延蓄積を自動検知して再生速度を微調整（1.0〜1.08x）
 * - iOS Safari ネイティブHLS完全対応
 */
import React, { useEffect, useRef, useState, useCallback } from "react";

// 遅延が何秒以上になったら追いかけ再生するか
const CATCH_UP_THRESHOLD_SEC = 3.0;
// 追いかけ再生の速度倍率
const CATCH_UP_RATE = 1.08;
// 正常時の再生速度
const NORMAL_RATE = 1.0;

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const catchUpTimerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [latency, setLatency] = useState(null); // デバッグ用遅延表示

  const playbackUrl = stream?.ivs_playback_url;

  // 遅延を監視して自動追いかけ再生
  const startCatchUpMonitor = useCallback((hls, vid) => {
    if (catchUpTimerRef.current) clearInterval(catchUpTimerRef.current);
    catchUpTimerRef.current = setInterval(() => {
      if (!hls || !vid || vid.paused) return;
      try {
        const liveSyncPos = hls.liveSyncPosition;
        if (liveSyncPos == null) return;
        const currentPos = vid.currentTime;
        const lag = liveSyncPos - currentPos;
        setLatency(Math.round(lag * 10) / 10);

        if (lag > CATCH_UP_THRESHOLD_SEC) {
          // 遅延大: 速度上げて追いかける
          if (vid.playbackRate !== CATCH_UP_RATE) {
            vid.playbackRate = CATCH_UP_RATE;
          }
        } else if (lag > 0.5) {
          // 遅延小: 微速で追いかける
          if (vid.playbackRate !== 1.04) {
            vid.playbackRate = 1.04;
          }
        } else {
          // 正常: 速度を戻す
          if (vid.playbackRate !== NORMAL_RATE) {
            vid.playbackRate = NORMAL_RATE;
          }
        }
      } catch (_) {}
    }, 1000);
  }, []);

  useEffect(() => {
    if (!playbackUrl || !videoRef.current) return;

    let hls;
    let destroyed = false;
    let stallCount = 0;

    const loadingTimeout = setTimeout(() => {
      if (!destroyed) setLoading(false);
    }, 12000);

    async function initHls() {
      try {
        const Hls = (await import("hls.js")).default;
        if (destroyed) return;

        if (Hls.isSupported()) {
          hls = new Hls({
            // ━━ LL-HLS / CMAF ━━
            lowLatencyMode: true,
            liveSyncDurationCount: 2,          // 2セグメント分のライブ同期点
            liveMaxLatencyDurationCount: 5,    // 最大5セグメントまで許容
            liveMaxLatencyDuration: 8,

            // ━━ バッファ ━━
            maxBufferLength: 8,                // 8秒先読み（YouTube相当）
            maxMaxBufferLength: 30,
            maxBufferSize: 60 * 1000 * 1000,   // 60MB
            backBufferLength: 10,              // 10秒の後方バッファ

            // ━━ ABR（自動画質切替）━━
            abrEwmaDefaultEstimate: 500000,    // 初期帯域幅推定: 500kbps
            abrEwmaFastLive: 3,               // ライブ時の高速EWMAウィンドウ
            abrEwmaSlowLive: 9,               // ライブ時の低速EWMAウィンドウ
            abrBandWidthFactor: 0.95,          // 帯域の95%を使う（余裕を持たせる）
            abrBandWidthUpFactor: 0.7,         // 画質UP判断を保守的に
            startLevel: -1,                    // 自動で最適レベルから開始

            // ━━ フラグメント読み込み ━━
            fragLoadingTimeOut: 20000,
            fragLoadingMaxRetry: 6,
            fragLoadingRetryDelay: 500,
            fragLoadingMaxRetryTimeout: 4000,

            // ━━ マニフェスト ━━
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 4,
            manifestLoadingRetryDelay: 500,

            // ━━ ストール回復 ━━
            nudgeMaxRetry: 5,
            nudgeOffset: 0.2,
            stallDetected: true,

            // ━━ Workerオフロード ━━
            enableWorker: true,
            enableSoftwareAES: true,
          });

          hlsRef.current = hls;
          hls.loadSource(playbackUrl);
          hls.attachMedia(videoRef.current);

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setLoading(false);
            const playPromise = videoRef.current?.play();
            if (playPromise) {
              playPromise.catch(() => {
                // autoplay blocked: mute and retry
                if (videoRef.current) {
                  videoRef.current.muted = true;
                  videoRef.current.play().catch(() => {});
                }
              });
            }
            startCatchUpMonitor(hls, videoRef.current);
          });

          // バッファストール自動回復
          hls.on(Hls.Events.ERROR, (_, data) => {
            if (destroyed) return;
            if (!data.fatal) return;

            stallCount++;
            console.warn(`[ViewerStream] HLS fatal error: ${data.type} / ${data.details} (stall #${stallCount})`);

            if (stallCount <= 3) {
              // 1〜3回目: 自動回復
              setTimeout(() => {
                if (destroyed) return;
                if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                  hls.startLoad();
                } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                  hls.recoverMediaError();
                }
              }, 1000 * stallCount);
            } else {
              clearTimeout(loadingTimeout);
              setError("映像の読み込みに失敗しました");
              setLoading(false);
            }
          });

          // バッファレベルのロギング（開発用）
          hls.on(Hls.Events.FRAG_BUFFERED, () => {
            if (destroyed) return;
            // バッファが途切れたら即再生
            if (videoRef.current?.paused && !videoRef.current?.ended) {
              videoRef.current.play().catch(() => {});
            }
          });

        } else if (videoRef.current?.canPlayType("application/vnd.apple.mpegurl")) {
          // ━━ iOS Safari ネイティブHLS ━━
          const vid = videoRef.current;
          vid.src = playbackUrl;
          vid.preload = "auto";

          const onReady = () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setLoading(false);
            vid.play().catch(() => {
              vid.muted = true;
              vid.play().catch(() => {});
            });

            // iOSでも遅延監視（liveSyncPositionはないので近似）
            const iosMonitor = setInterval(() => {
              if (destroyed) { clearInterval(iosMonitor); return; }
              if (!vid.paused && vid.seekable.length > 0) {
                const liveEdge = vid.seekable.end(vid.seekable.length - 1);
                const lag = liveEdge - vid.currentTime;
                setLatency(Math.round(lag * 10) / 10);
                if (lag > CATCH_UP_THRESHOLD_SEC + 1) {
                  vid.currentTime = liveEdge - 0.5; // ライブエッジにジャンプ
                }
              }
            }, 2000);
            catchUpTimerRef.current = iosMonitor;
          };

          vid.addEventListener("loadedmetadata", onReady, { once: true });
          vid.addEventListener("canplay", onReady, { once: true });
          vid.addEventListener("error", () => {
            if (destroyed) return;
            clearTimeout(loadingTimeout);
            setError("映像の読み込みに失敗しました");
            setLoading(false);
          }, { once: true });

          // ストール自動復帰
          vid.addEventListener("stalled", () => {
            if (destroyed) return;
            setTimeout(() => { vid.load(); }, 2000);
          });

          vid.load();

        } else {
          clearTimeout(loadingTimeout);
          setError("このブラウザはHLS再生に対応していません");
          setLoading(false);
        }
      } catch (e) {
        if (!destroyed) {
          clearTimeout(loadingTimeout);
          setError("プレイヤーの初期化に失敗しました");
          setLoading(false);
        }
      }
    }

    initHls();

    return () => {
      destroyed = true;
      clearTimeout(loadingTimeout);
      if (catchUpTimerRef.current) clearInterval(catchUpTimerRef.current);
      hls?.destroy();
      hlsRef.current = null;
    };
  }, [playbackUrl, startCatchUpMonitor]);

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

      {/* 遅延インジケーター（latency > 0のときのみ表示） */}
      {latency !== null && latency > 0 && (
        <div className="absolute bottom-2 right-2 z-20 pointer-events-none">
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{
              background: latency > CATCH_UP_THRESHOLD_SEC ? "rgba(239,68,68,0.7)" : "rgba(0,0,0,0.5)",
              color: latency > CATCH_UP_THRESHOLD_SEC ? "#fff" : "rgba(255,255,255,0.5)",
            }}
          >
            {latency}s
          </span>
        </div>
      )}
    </div>
  );
}