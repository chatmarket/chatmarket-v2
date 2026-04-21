import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Settings, X, AlertTriangle, Zap, Copy, Check, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LiveTimer from "./LiveTimer";
import LiveCostTracker from "./LiveCostTracker";
import ViewerCountGraph from "./ViewerCountGraph";
import MicLevelMeter from "./MicLevelMeter";

export default function BroadcasterStream({ streamId, ivsStreamKey, ivsIngestEndpoint, onEnd, thumbnailUrl }) {
  const navigate = useNavigate();
  const previewVideoRef = useRef(null);
  const localStreamRef = useRef(null);

  const [status, setStatus] = useState("preview"); // "preview" | "checking" | "live"
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveStartedAt, setLiveStartedAt] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [streamQuality, setStreamQuality] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef(null);

  const isLive = status === "live";
  const isChecking = status === "checking"; // カメラプレビュー中

  // カメラ・マイク起動（プレビュー確認時 or 配信開始時）
  const startCamera = async () => {
    if (localStreamRef.current) return; // 既に起動済み
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (previewVideoRef.current) {
        previewVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = audioOnly;
        setCamOn(false);
      } catch (audioErr) {
        toast.error("マイク・カメラにアクセスできません: " + audioErr.message);
      }
    }
  };

  // カメラプレビュー確認モードに入る
  const handleStartChecking = async () => {
    setStatus("checking");
    await startCamera();
    if (previewVideoRef.current && localStreamRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
  };

  useEffect(() => {
    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // 視聴者数ポーリング（配信中のみ）
  useEffect(() => {
    if (!isLive) return;
    // 初回即座に画質も取得
    base44.entities.LiveStream.filter({ id: streamId }).then((streams) => {
      if (streams[0]?.viewer_count !== undefined) setViewerCount(streams[0].viewer_count);
      if (streams[0]?.max_bitrate_restriction) setStreamQuality(streams[0].max_bitrate_restriction);
    });
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      if (streams[0]?.viewer_count !== undefined) setViewerCount(streams[0].viewer_count);
      if (streams[0]?.max_bitrate_restriction) setStreamQuality(streams[0].max_bitrate_restriction);
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  // 配信開始（カメラが既に起動済みならそのまま使う）
  const handleGoLive = async () => {
    await startCamera(); // 未起動なら起動、起動済みならno-op
    if (previewVideoRef.current && localStreamRef.current) {
      previewVideoRef.current.srcObject = localStreamRef.current;
    }
    const now = new Date().toISOString();
    await base44.entities.LiveStream.update(streamId, {
      status: "live",
      live_started_at: now,
    });
    setLiveStartedAt(now);
    setStatus("live");
    toast.success("✅ 配信ステータスを LIVE に設定しました。OBS から配信を開始してください。");
  };

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const handleEndConfirmed = async () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    await base44.entities.LiveStream.update(streamId, { status: "ended" });
    setStatus("ended");
    toast.success("配信を終了しました");
    if (onEnd) onEnd();
    else navigate("/creator-dashboard");
  };

  const copyStreamKey = () => {
    navigator.clipboard.writeText(ivsStreamKey || "");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("ストリームキーをコピーしました");
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 bg-zinc-950 rounded-xl overflow-hidden">
      {/* 左側: 映像プレビュー */}
      <div
        ref={videoContainerRef}
        className="flex-1 flex flex-col bg-black rounded-xl overflow-hidden border border-zinc-800"
        style={isFullscreen ? { position: "fixed", inset: 0, zIndex: 9999, width: "100vw", height: "100vh", borderRadius: 0 } : {}}
      >
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
          {/* ── 配信前・サムネイル待機画面 ── */}
          {status === "preview" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
              {thumbnailUrl && (
                <img src={thumbnailUrl} alt="thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-40" />
              )}
              <div className="relative z-10 flex flex-col items-center gap-4 text-center px-6">
                <Camera className="w-12 h-12 text-zinc-400" />
                <p className="text-sm font-semibold text-zinc-300">カメラはまだ起動していません</p>
                <button
                  onClick={handleStartChecking}
                  className="flex items-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                >
                  <Camera className="w-4 h-4" />
                  カメラ・マイクを確認する（自分だけ見える）
                </button>
              </div>
            </div>
          )}

          {/* ── プレビュー確認中バナー ── */}
          {isChecking && (
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 bg-zinc-900/90 border border-yellow-500/50 text-yellow-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              視聴者には見えていません
            </div>
          )}

          {/* ── カメラ映像（確認中 or 配信中） ── */}
          <video
            ref={previewVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
            style={{ display: (isChecking || isLive) && camOn ? "block" : "none" }}
          />
          {(isChecking || isLive) && !camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <CameraOff className="w-14 h-14 text-zinc-600" />
            </div>
          )}

          {/* ステータスバッジ（配信中のみ表示） */}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap z-10">
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </span>
              <span className="flex items-center gap-1.5 bg-black/70 text-white font-black px-3 py-1 rounded-full text-sm">
                <Eye className="w-4 h-4" />{viewerCount}
              </span>
              <LiveTimer startedAt={liveStartedAt} />
              {/* 画質バッジ */}
              {streamQuality && (() => {
                const qualityMap = {
                  "480p":  { label: "SD 配信中", cls: "bg-zinc-600/90 text-zinc-100" },
                  "720p":  { label: "HD 配信中", cls: "bg-blue-600/90 text-white" },
                  "1080p": { label: "FHD 配信中", cls: "bg-primary/90 text-primary-foreground" },
                  "1080p+":{ label: "FHD+ 配信中", cls: "bg-primary/90 text-primary-foreground" },
                };
                const q = qualityMap[streamQuality] || { label: streamQuality + " 配信中", cls: "bg-zinc-600/90 text-zinc-100" };
                return (
                  <span className={`text-xs font-black px-2.5 py-1 rounded-full ${q.cls}`}>
                    📡 {q.label}
                  </span>
                );
              })()}
            </div>
          )}

          {isLive && (
            <div className="absolute top-3 right-3">
              <LiveCostTracker startedAt={liveStartedAt} viewerCount={viewerCount} priceCoins={150} />
            </div>
          )}

          {/* GoLive ボタン（配信前 & 確認中に表示） */}
          {!isLive && (
            <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
              <button
                onClick={handleGoLive}
                className="pointer-events-auto flex items-center gap-3 bg-red-500 hover:bg-red-600 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-2xl shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
              >
                <Zap className="w-6 h-6" />
                配信を開始する
              </button>
            </div>
          )}
        </div>

        {/* コントロールバー */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(isChecking || isLive) && (
              <>
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
                <MicLevelMeter micOn={micOn} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen((p) => !p)}
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setShowEndConfirm(true)}
              className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shrink-0"
            >
              <PhoneOff className="w-3.5 h-3.5" /> 配信終了
            </button>
          </div>
        </div>

        {/* OBS用 RTMPS 情報表示 */}
        {ivsStreamKey && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">OBS 配信情報 (RTMPS)</p>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2">
              <p className="text-[10px] text-zinc-500">Ingest Endpoint</p>
              <p className="text-xs text-zinc-300 font-mono truncate">rtmps://{ivsIngestEndpoint}:443/app/</p>
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
      </div>

      {/* 右側: 視聴者数グラフ + チャット */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        <ViewerCountGraph streamId={streamId} isLive={isLive} />

        <div className="flex-1 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-bold text-white">💬 チャット</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs text-zinc-500 text-center py-8">配信中にチャットが表示されます</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-bold text-yellow-400">⭐ エール・スーパーチャット</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs text-zinc-500 text-center py-8">応援メッセージが表示されます</p>
          </div>
        </div>
      </div>

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