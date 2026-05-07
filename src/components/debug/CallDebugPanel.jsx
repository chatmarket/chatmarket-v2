/**
 * CallDebugPanel — ビデオ通話のブラウザ互換性デバッグパネル
 * 社長テスト用: カメラ/マイク/WebRTC/接続状態を一目で確認
 */
import React, { useState, useEffect, useRef } from "react";
import { Bug, ChevronDown, ChevronUp, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

function StatusBadge({ ok, warn, label }) {
  if (ok) return <span className="flex items-center gap-1 text-green-400 text-[10px] font-bold"><CheckCircle2 className="w-3 h-3" />{label}: OK</span>;
  if (warn) return <span className="flex items-center gap-1 text-yellow-400 text-[10px] font-bold"><AlertCircle className="w-3 h-3" />{label}: WARN</span>;
  return <span className="flex items-center gap-1 text-red-400 text-[10px] font-bold"><XCircle className="w-3 h-3" />{label}: NG</span>;
}

export default function CallDebugPanel({ call, localStream, remoteVideoRef, user }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const gather = async () => {
    setRefreshing(true);
    try {
      const ua = navigator.userAgent;
      const browser = ua.includes("Chrome") ? "Chrome"
        : ua.includes("Firefox") ? "Firefox"
        : ua.includes("Safari") ? "Safari"
        : ua.includes("Edge") ? "Edge" : "Unknown";

      // カメラ/マイク権限チェック
      let camPerm = "unknown", micPerm = "unknown";
      try {
        const cam = await navigator.permissions.query({ name: "camera" });
        const mic = await navigator.permissions.query({ name: "microphone" });
        camPerm = cam.state;
        micPerm = mic.state;
      } catch {}

      // ローカルストリーム情報
      const vTracks = localStream?.getVideoTracks() || [];
      const aTracks = localStream?.getAudioTracks() || [];
      const remoteEl = remoteVideoRef?.current;
      const remoteStream = remoteEl?.srcObject;
      const remoteVTracks = remoteStream instanceof MediaStream ? remoteStream.getVideoTracks() : [];
      const remoteATracks = remoteStream instanceof MediaStream ? remoteStream.getAudioTracks() : [];

      // ネットワーク
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;

      // WebRTC サポート確認
      const hasRTC = !!(window.RTCPeerConnection || window.webkitRTCPeerConnection);

      setInfo({
        browser,
        platform: navigator.platform || "unknown",
        ua: ua.slice(0, 80),
        online: navigator.onLine,
        camPerm,
        micPerm,
        hasRTC,
        localVideo: vTracks.length > 0 ? `${vTracks[0].label} (${vTracks[0].enabled ? "ON" : "OFF"})` : "なし",
        localAudio: aTracks.length > 0 ? `${aTracks[0].label} (${aTracks[0].enabled ? "ON" : "OFF"})` : "なし",
        remoteVideo: remoteVTracks.length > 0 ? `${remoteVTracks.length}トラック (${remoteVTracks[0].readyState})` : "なし",
        remoteAudio: remoteATracks.length > 0 ? `${remoteATracks.length}トラック (${remoteATracks[0].readyState})` : "なし",
        remoteVideoEl: remoteEl ? `readyState:${remoteEl.readyState} paused:${remoteEl.paused} muted:${remoteEl.muted} vol:${remoteEl.volume}` : "なし",
        networkType: conn?.effectiveType || "unknown",
        callStatus: call?.status || "N/A",
        callId: call?.id?.slice(0, 12) || "N/A",
        userEmail: user?.email || "N/A",
        ts: new Date().toLocaleTimeString("ja-JP"),
      });
    } catch (e) {
      console.error("[CallDebug] gather error:", e);
    }
    setRefreshing(false);
  };

  useEffect(() => {
    if (open) gather();
  }, [open, call?.status]);

  // エラー数カウント用（カメラ/マイクNG時にバッジ表示）
  const hasIssue = info && (
    info.camPerm === "denied" ||
    info.micPerm === "denied" ||
    !info.hasRTC ||
    info.localVideo === "なし" ||
    info.localAudio === "なし"
  );

  return (
    <div className="fixed bottom-36 left-4 z-50">
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all shadow-lg ${
          hasIssue
            ? "bg-red-500/30 border-red-500/70 animate-pulse"
            : "bg-zinc-800/90 border-zinc-600/50 hover:border-zinc-400/70"
        }`}
        title="デバッグパネル"
      >
        <Bug className={`w-4 h-4 ${hasIssue ? "text-red-400" : "text-zinc-400"}`} />
        {hasIssue && <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500" />}
      </button>

      {open && (
        <div className="absolute bottom-12 left-0 w-72 bg-black/95 border border-zinc-700/60 rounded-xl shadow-2xl backdrop-blur overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-zinc-900/80">
            <span className="text-[11px] font-black text-zinc-300 flex items-center gap-1.5">
              <Bug className="w-3.5 h-3.5 text-primary" /> 通話デバッグ情報
            </span>
            <div className="flex items-center gap-2">
              <button onClick={gather} disabled={refreshing} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              </button>
              <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors text-xs">✕</button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 space-y-3 max-h-96 overflow-y-auto font-mono text-[10px]">
            {!info ? (
              <p className="text-zinc-500 text-center py-4">読み込み中...</p>
            ) : (
              <>
                {/* ステータス一覧 */}
                <div className="space-y-1">
                  <StatusBadge ok={info.hasRTC} label="WebRTC" />
                  <StatusBadge ok={info.camPerm === "granted"} warn={info.camPerm === "prompt"} label="カメラ権限" />
                  <StatusBadge ok={info.micPerm === "granted"} warn={info.micPerm === "prompt"} label="マイク権限" />
                  <StatusBadge ok={info.localVideo !== "なし"} label="ローカル映像" />
                  <StatusBadge ok={info.localAudio !== "なし"} label="ローカル音声" />
                  <StatusBadge ok={info.remoteVideo !== "なし"} warn={info.callStatus !== "active"} label="リモート映像" />
                  <StatusBadge ok={info.remoteAudio !== "なし"} warn={info.callStatus !== "active"} label="リモート音声" />
                  <StatusBadge ok={info.online} label="ネット接続" />
                </div>

                <div className="border-t border-white/10 pt-2 space-y-1 text-zinc-500">
                  <p><span className="text-zinc-400">ブラウザ:</span> {info.browser}</p>
                  <p><span className="text-zinc-400">通話状態:</span> <span className={info.callStatus === "active" ? "text-green-400" : "text-yellow-400"}>{info.callStatus}</span></p>
                  <p><span className="text-zinc-400">ネットワーク:</span> {info.networkType}</p>
                  <p><span className="text-zinc-400">ローカル映像:</span> {info.localVideo}</p>
                  <p><span className="text-zinc-400">ローカル音声:</span> {info.localAudio}</p>
                  <p><span className="text-zinc-400">リモート映像:</span> {info.remoteVideo}</p>
                  <p><span className="text-zinc-400">リモート音声:</span> {info.remoteAudio}</p>
                  <p><span className="text-zinc-400">video要素:</span> {info.remoteVideoEl}</p>
                  <p><span className="text-zinc-400">更新:</span> {info.ts}</p>
                </div>

                {/* コピーボタン */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(info, null, 2));
                    // toast は使わず console に出力（通話画面を汚さない）
                    console.log("[CallDebug] デバッグ情報をコピーしました");
                  }}
                  className="w-full py-1.5 rounded-lg border border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-all text-[10px]"
                >
                  デバッグ情報をコピー
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}