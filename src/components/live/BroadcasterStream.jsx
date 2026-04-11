import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Monitor, Settings, X, AlertTriangle, Zap, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// amazon-ivs-web-broadcast is loaded via CDN script tag approach via dynamic import
let IVSBroadcastClient = null;

async function loadIVSBroadcast() {
  if (IVSBroadcastClient) return IVSBroadcastClient;
  const mod = await import("amazon-ivs-web-broadcast");
  IVSBroadcastClient = mod.default || mod.IVSBroadcastClient || mod;
  return IVSBroadcastClient;
}

const QUALITY_PRESETS = [
  { label: "高画質 (1080p 30fps)", width: 1920, height: 1080, framerate: 30, bitrate: 4500000 },
  { label: "標準 (720p 30fps)", width: 1280, height: 720, framerate: 30, bitrate: 2500000 },
  { label: "軽量 (480p 30fps)", width: 854, height: 480, framerate: 30, bitrate: 1000000 },
  { label: "低帯域 (360p 15fps)", width: 640, height: 360, framerate: 15, bitrate: 500000 },
];

export default function BroadcasterStream({ streamId, ivsStreamKey, ivsIngestEndpoint, onEnd }) {
  const navigate = useNavigate();
  const previewVideoRef = useRef(null);
  const clientRef = useRef(null);
  const localStreamRef = useRef(null);

  const [status, setStatus] = useState("preview"); // "preview" | "live" | "ended"
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [goingLive, setGoingLive] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(1);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [copiedKey, setCopiedKey] = useState(false);

  const isLive = status === "live";

  // カメラをプレビューに表示
  useEffect(() => {
    (async () => {
      try {
        const preset = QUALITY_PRESETS[selectedQuality];
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: preset.width, height: preset.height, frameRate: preset.framerate },
          audio: true,
        });
        localStreamRef.current = stream;
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        toast.error("カメラ/マイクにアクセスできません: " + err.message);
      }
    })();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      clientRef.current?.stopBroadcast?.();
    };
  }, []);

  // 視聴者数ポーリング
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (s?.viewer_count !== undefined) setViewerCount(s.viewer_count);
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  const handleGoLive = useCallback(async () => {
    if (!ivsStreamKey || !ivsIngestEndpoint) {
      toast.error("IVSのストリーム情報がありません");
      return;
    }
    setGoingLive(true);
    try {
      const IVSClient = await loadIVSBroadcast();
      const preset = QUALITY_PRESETS[selectedQuality];

      const client = IVSClient.create({
        streamConfig: {
          maxResolution: { width: preset.width, height: preset.height },
          maxFramerate: preset.framerate,
          maxBitrate: preset.bitrate,
        },
        ingestEndpoint: ivsIngestEndpoint,
      });
      clientRef.current = client;

      // プレビュー映像から映像・音声を追加
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (videoTrack) {
          const videoDevice = await IVSClient.LocalStageStream
            ? null
            : videoTrack;
          await client.addVideoInputDevice(
            new MediaStream([videoTrack]),
            "camera",
            { index: 0 }
          );
        }
        if (audioTrack) {
          await client.addAudioInputDevice(
            new MediaStream([audioTrack]),
            "mic"
          );
        }
      }

      await client.startBroadcast(ivsStreamKey);

      await base44.entities.LiveStream.update(streamId, { status: "live", ivs_playback_url: ivsIngestEndpoint });
      setStatus("live");
      toast.success("AWS IVS 配信を開始しました！");
    } catch (err) {
      toast.error("配信開始に失敗: " + err.message);
    } finally {
      setGoingLive(false);
    }
  }, [ivsStreamKey, ivsIngestEndpoint, selectedQuality, streamId]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const handleEndConfirmed = async () => {
    clientRef.current?.stopBroadcast?.();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    await base44.entities.LiveStream.update(streamId, { status: "ended" });
    setStatus("ended");
    toast.success("配信を終了しました");
    if (onEnd) onEnd();
    else navigate(-1);
  };

  const copyStreamKey = () => {
    navigator.clipboard.writeText(ivsStreamKey || "");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("ストリームキーをコピーしました");
  };

  return (
    <div className="w-full bg-zinc-950 rounded-xl overflow-hidden border border-zinc-800">
      {/* 映像プレビュー (16:9) */}
      <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          ref={previewVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain bg-black"
          style={{ display: camOn ? "block" : "none" }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <CameraOff className="w-14 h-14 text-zinc-600" />
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isLive ? (
            <>
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </span>
              <span className="flex items-center gap-1.5 bg-black/70 text-white font-black px-3 py-1 rounded-full text-sm">
                <Eye className="w-4 h-4" />{viewerCount}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1.5 bg-zinc-700/80 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> PREVIEW
            </span>
          )}
        </div>

        {/* GoLive オーバーレイ（プレビュー中） */}
        {!isLive && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
            <button
              onClick={handleGoLive}
              disabled={goingLive}
              className="pointer-events-auto flex items-center gap-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-2xl shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
            >
              {goingLive
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Zap className="w-6 h-6" />}
              {goingLive ? "接続中..." : "配信を開始する"}
            </button>
          </div>
        )}
      </div>

      {/* コントロールバー */}
      <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
        {/* 左: マイク/カメラ/設定 */}
        <div className={`flex gap-2 ${isLive ? "opacity-30 pointer-events-none select-none" : ""}`}>
          <CtrlBtn
            icon={micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            onClick={toggleMic}
            danger={!micOn}
          />
          <CtrlBtn
            icon={camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            onClick={toggleCam}
            danger={!camOn}
          />
          <CtrlBtn icon={<Settings className="w-4 h-4" />} onClick={() => setShowQualityModal(true)} />
        </div>

        {/* 中央: ロック表示 */}
        {isLive && (
          <p className="text-[11px] text-zinc-600 text-center">🔒 配信中はロックされています</p>
        )}

        {/* 右: 配信終了 */}
        <button
          onClick={() => setShowEndConfirm(true)}
          className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shrink-0"
        >
          <PhoneOff className="w-3.5 h-3.5" /> 配信終了
        </button>
      </div>

      {/* IVSストリームキー表示（プレビュー中のみ・OBS用） */}
      {!isLive && ivsStreamKey && (
        <div className="px-4 pb-4 space-y-2">
          <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">OBSで配信する場合（RTMPS情報）</p>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500">Ingest Endpoint</p>
              <p className="text-xs text-zinc-300 font-mono truncate">rtmps://{ivsIngestEndpoint}:443/app/</p>
            </div>
          </div>
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500">Stream Key</p>
              <p className="text-xs text-zinc-300 font-mono truncate">{ivsStreamKey.slice(0, 30)}...</p>
            </div>
            <button onClick={copyStreamKey} className="shrink-0 text-zinc-400 hover:text-primary transition-colors">
              {copiedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* 配信終了確認モーダル */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg">配信を終了しますか？</h2>
                <p className="text-zinc-400 text-xs">この操作は取り消せません</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm">キャンセル</button>
              <button onClick={handleEndConfirmed} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm">終了する</button>
            </div>
          </div>
        </div>
      )}

      {/* 画質設定モーダル */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> 配信画質設定</h2>
              <button onClick={() => setShowQualityModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {QUALITY_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuality(i)}
                  disabled={isLive}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all disabled:opacity-40 ${selectedQuality === i ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-500"}`}
                >
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.width}×{p.height} / {p.framerate}fps / {(p.bitrate / 1000000).toFixed(1)}Mbps</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowQualityModal(false)} className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ icon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20"}`}
    >
      {icon}
    </button>
  );
}