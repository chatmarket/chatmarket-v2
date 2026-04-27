/**
 * ViewerStream — IVS専用プレイヤー
 * Chime完全削除。ivs_playback_url があれば即再生。
 */
import React, { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

export default function ViewerStream({ streamId, stream }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [phase, setPhase] = useState("プレイヤー起動中...");

  const playbackUrl = stream?.ivs_playback_url?.trim();

  useEffect(() => {
    if (!playbackUrl) {
      setPhase("❌ 再生URLがありません (ivs_playback_url未設定)");
      return;
    }
    if (stream?.status !== "live") {
      setPhase("配信開始をお待ちください...");
      return;
    }

    let isMounted = true;

    console.log("[ViewerStream] ✅ IVS起動 url:", playbackUrl);
    setPhase("IVSプレイヤー起動中...");

    (async () => {
      try {
        const { create, isPlayerSupported, PlayerState, PlayerEventType } =
          await import("amazon-ivs-player");

        if (!isMounted) return;

        if (!isPlayerSupported) {
          setPhase("❌ このブラウザはIVS非対応です");
          return;
        }

        // video要素が描画されるまで待つ
        let wait = 0;
        while (!videoRef.current && wait < 30) {
          await new Promise(r => setTimeout(r, 100));
          wait++;
        }
        if (!videoRef.current) {
          setPhase("❌ video要素の取得タイムアウト");
          return;
        }

        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;
        player.attachHTMLVideoElement(videoRef.current);

        player.addEventListener(PlayerEventType.STATE_CHANGED, (s) => {
          if (!isMounted) return;
          console.log("[ViewerStream] IVS state:", s);
          if (s === PlayerState.PLAYING) {
            setReady(true);
            setPhase("再生中 🟢");
          } else if (s === PlayerState.BUFFERING) {
            setPhase("バッファリング中...");
          } else if (s === PlayerState.ENDED) {
            setPhase("配信終了");
            setReady(false);
          } else {
            setPhase(`IVS: ${s}`);
          }
        });

        player.addEventListener(PlayerEventType.ERROR, (err) => {
          console.error("[ViewerStream] IVS error:", err);
          if (isMounted) setPhase(`❌ IVSエラー: ${err.type} (${err.code})`);
        });

        player.setMuted(true);
        player.load(playbackUrl);
        player.play();

      } catch (err) {
        console.error("[ViewerStream] 初期化エラー:", err);
        if (isMounted) setPhase(`❌ 初期化エラー: ${err.message}`);
      }
    })();

    return () => {
      isMounted = false;
      try { playerRef.current?.pause(); } catch (_) {}
      try { playerRef.current?.delete(); } catch (_) {}
      playerRef.current = null;
    };
  }, [playbackUrl, stream?.status]);

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setMuted(muted);
    }
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block", background: "#000" }}
      />

      {/* ローディングオーバーレイ */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90">
          <div className="w-14 h-14 border-4 border-white/20 border-t-primary rounded-full animate-spin" />
          <p className="text-white/80 text-sm font-medium text-center px-6">{phase}</p>
          {stream?.status === "live" && (
            <p className="text-white/40 text-xs">OBSから映像が届くまで少々お待ちください</p>
          )}
        </div>
      )}

      {/* ミュートボタン */}
      {ready && (
        <button
          onClick={() => setMuted(v => !v)}
          className="absolute bottom-4 left-4 w-10 h-10 rounded-full bg-black/60 hover:bg-black/80 flex items-center justify-center text-white transition-all z-20"
        >
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
      )}

      {/* LIVE バッジ */}
      {ready && (
        <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold z-20">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          LIVE
        </div>
      )}

      {/* デバッグ情報（右上・常時表示） */}
      <div className="absolute top-4 right-4 bg-black/70 text-cyan-300 text-[10px] font-mono px-2 py-1 rounded z-30 pointer-events-none max-w-[60vw] break-all">
        {phase}
      </div>
    </div>
  );
}