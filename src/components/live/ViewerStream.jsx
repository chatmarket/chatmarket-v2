/**
 * ViewerStream — HLS専用プレイヤー
 * amazon-ivs-player は完全排除（v1.50.0のEventEmitterバグのため）
 * Safari/iOS: ネイティブHLS / Chrome/Android: HLS.js CDN
 */
import React, { useEffect, useRef, useState } from "react";

export default function ViewerStream({ stream }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [status, setStatus] = useState("起動中...");
  const [retryKey, setRetryKey] = useState(0);

  const playbackUrl = stream?.ivs_playback_url?.trim();

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playbackUrl) {
      setStatus(playbackUrl ? "video要素なし" : "再生URL未設定");
      return;
    }

    let destroyed = false;

    const destroyHls = () => {
      if (hlsRef.current) {
        try { hlsRef.current.destroy(); } catch (_) {}
        hlsRef.current = null;
      }
    };

    destroyHls();
    video.src = "";
    setStatus("接続中...");

    // ── Safari / iOS: ネイティブHLS ──
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      setStatus("ネイティブHLS接続中...");
      video.src = playbackUrl;
      video.muted = true;
      video.playsInline = true;
      video.play()
        .then(() => { if (!destroyed) setStatus("再生中 ✅"); })
        .catch((e) => { if (!destroyed) setStatus("再生エラー: " + e.message); });
      return () => { destroyed = true; video.src = ""; };
    }

    // ── Chrome / Android / Desktop: HLS.js ──
    const loadHlsJs = () => {
      if (window.Hls) return Promise.resolve(window.Hls);
      return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js";
        s.onload = () => resolve(window.Hls);
        s.onerror = () => reject(new Error("HLS.js load failed"));
        document.head.appendChild(s);
      });
    };

    loadHlsJs()
      .then((Hls) => {
        if (destroyed) return;
        if (!Hls || !Hls.isSupported()) {
          setStatus("❌ HLS非対応ブラウザ");
          return;
        }
        setStatus("HLS.js接続中...");
        const hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 2 });
        hlsRef.current = hls;
        hls.loadSource(playbackUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (destroyed) return;
          video.muted = true;
          video.play()
            .then(() => { if (!destroyed) setStatus("再生中 ✅"); })
            .catch((e) => { if (!destroyed) setStatus("再生エラー: " + e.message); });
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal && !destroyed) setStatus("❌ HLSエラー: " + data.type);
        });
      })
      .catch((e) => { if (!destroyed) setStatus("❌ " + e.message); });

    return () => {
      destroyed = true;
      destroyHls();
      video.src = "";
    };
  }, [playbackUrl, retryKey]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", background: "#000" }}>
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
      />
      {/* ステータス表示（右上） */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        background: "rgba(0,0,0,0.75)", color: "#0ff",
        fontSize: "11px", fontFamily: "monospace",
        padding: "4px 8px", zIndex: 50, maxWidth: "60vw",
        wordBreak: "break-all", pointerEvents: "none"
      }}>
        {status}
      </div>
      {/* 再試行ボタン */}
      {status.includes("❌") && (
        <div style={{ position: "absolute", bottom: 60, left: "50%", transform: "translateX(-50%)", zIndex: 50 }}>
          <button
            onClick={() => setRetryKey(k => k + 1)}
            style={{ background: "#10b981", color: "#fff", border: "none", padding: "10px 24px", borderRadius: "8px", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}
          >
            再試行
          </button>
        </div>
      )}
    </div>
  );
}