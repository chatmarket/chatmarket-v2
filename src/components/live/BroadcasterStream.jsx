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

  const [status, setStatus] = useState("preview");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveStartedAt, setLiveStartedAt] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef(null);

  const isLive = status === "live";

  // カメラ・マイクは配信開始後のみ起動
  useEffect(() => {
    if (!isLive) return;

    (async () => {
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
    })();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isLive]);

  // 視聴者数ポーリング（配信中のみ）
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      if (streams[0]?.viewer_count !== undefined) {
        setViewerCount(streams[0].viewer_count);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  // 配信開始（OBSで配信する前提 — ステータスのみ更新）
  const handleGoLive = async () => {
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
          {/* 配信開始前: サムネイル or 待機画面 */}
          {!isLive && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="thumbnail" className="w-full h-full object-cover opacity-50" />
              ) : (
                <div className="flex flex-col items-center gap-3 text-zinc-600">
                  <Camera className="w-16 h-16" />
                  <p className="text-sm font-semibold">配信開始ボタンを押すとカメラが起動します</p>
                </div>
              )}
              {thumbnailUrl && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <Camera className="w-10 h-10 text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-300">配信開始ボタンを押すとカメラが起動します</p>
                </div>
              )}
            </div>
          )}

          {/* 配信中: カメラ映像 */}
          <video
            ref={previewVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
            style={{ display: isLive && camOn ? "block" : "none" }}
          />
          {isLive && !camOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <CameraOff className="w-14 h-14 text-zinc-600" />
            </div>
          )}

          {/* ステータスバッジ */}
          <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
            {isLive ? (
              <>
                <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                </span>
                <span className="flex items-center gap-1.5 bg-black/70 text-white font-black px-3 py-1 rounded-full text-sm">
                  <Eye className="w-4 h-4" />{viewerCount}
                </span>
                <LiveTimer startedAt={liveStartedAt} />
              </>
            ) : (
              <span className="flex items-center gap-1.5 bg-zinc-700/80 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> PREVIEW
              </span>
            )}
          </div>

          {isLive && (
            <div className="absolute top-3 right-3">
              <LiveCostTracker startedAt={liveStartedAt} viewerCount={viewerCount} priceCoins={150} />
            </div>
          )}

          {/* GoLive ボタン */}
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