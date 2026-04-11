import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Pause, Play, Monitor, Settings, X, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

const QUALITY_PRESETS = [
  { label: "高画質 (1080p 30fps)", width: 1920, height: 1080, frameRate: 30, bitrate: 4000000 },
  { label: "標準 (720p 30fps)", width: 1280, height: 720, frameRate: 30, bitrate: 2000000 },
  { label: "軽量 (480p 30fps)", width: 854, height: 480, frameRate: 30, bitrate: 1000000 },
  { label: "低帯域 (360p 15fps)", width: 640, height: 360, frameRate: 15, bitrate: 500000 },
];

export default function BroadcasterStream({ streamId, onEnd }) {
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const pollRef = useRef(null);
  const commentEndRef = useRef(null);

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [paused, setPaused] = useState(false);
  const [screenSharing, setScreenSharing] = useState(false);
  // "preview" | "live" | "ended"
  const [status, setStatus] = useState("preview");
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(1);
  const [goingLive, setGoingLive] = useState(false);

  const isLive = status === "live";

  // カメラ起動（プレビュー用・配信前から表示）
  const startCamera = useCallback(async () => {
    const preset = QUALITY_PRESETS[selectedQuality];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: preset.width, height: preset.height, frameRate: preset.frameRate },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;
    } catch (err) {
      toast.error("カメラ/マイクにアクセスできません: " + err.message);
    }
  }, [selectedQuality]);

  useEffect(() => {
    startCamera();
    return () => {
      clearInterval(pollRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, [startCamera]);

  // 視聴者数ポーリング（配信中のみ）
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (s?.viewer_count !== undefined) setViewerCount(s.viewer_count);
    }, 5000);
    return () => clearInterval(interval);
  }, [streamId, isLive]);

  // コメント購読
  useEffect(() => {
    const unsubComment = base44.entities.Comment.subscribe((event) => {
      if (event.type === "create" && event.data?.target_id === streamId) {
        setComments((prev) => [...prev.slice(-99), { ...event.data, id: event.id, _type: "comment" }]);
      }
    });
    const unsubSuper = base44.entities.SuperChat.subscribe((event) => {
      if (event.type === "create" && event.data?.livestream_id === streamId) {
        setComments((prev) => [...prev.slice(-99), { ...event.data, id: event.id, _type: "superchat" }]);
      }
    });
    return () => { unsubComment(); unsubSuper(); };
  }, [streamId]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // 配信開始（GoLiveボタン押下時）
  const handleGoLive = useCallback(async () => {
    if (!localStreamRef.current) return;
    setGoingLive(true);
    try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current));

      const iceCandidates = [];
      pc.onicecandidate = (e) => { if (e.candidate) iceCandidates.push(e.candidate); };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise((resolve) => {
        const check = () => pc.iceGatheringState === "complete" ? resolve() : setTimeout(check, 200);
        setTimeout(resolve, 3000);
        check();
      });

      await base44.entities.LiveStream.update(streamId, {
        webrtc_offer: JSON.stringify(pc.localDescription),
        webrtc_ice_candidates_broadcaster: JSON.stringify(iceCandidates),
        webrtc_answer: "",
        webrtc_ice_candidates_viewer: "",
      });

      setStatus("live");
      toast.success("配信を開始しました！");

      pollRef.current = setInterval(async () => {
        const streams = await base44.entities.LiveStream.filter({ id: streamId });
        const s = streams[0];
        if (s?.webrtc_answer && pc.signalingState === "have-local-offer") {
          clearInterval(pollRef.current);
          const answer = JSON.parse(s.webrtc_answer);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          if (s.webrtc_ice_candidates_viewer) {
            const viewerCandidates = JSON.parse(s.webrtc_ice_candidates_viewer);
            for (const c of viewerCandidates) await pc.addIceCandidate(new RTCIceCandidate(c));
          }
          toast.success("視聴者が接続しました！");
        }
      }, 5000);
    } catch (err) {
      toast.error("配信開始に失敗しました: " + err.message);
    } finally {
      setGoingLive(false);
    }
  }, [streamId]);

  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const togglePause = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = paused));
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = paused));
    setPaused(!paused);
    toast(paused ? "配信を再開しました" : "配信を一時停止しました");
  };

  const toggleScreenShare = async () => {
    if (screenSharing) {
      const preset = QUALITY_PRESETS[selectedQuality];
      const camStream = await navigator.mediaDevices.getUserMedia({ video: { width: preset.width, height: preset.height }, audio: true });
      localStreamRef.current = camStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = camStream;
      setScreenSharing(false);
    } else {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      localStreamRef.current = displayStream;
      if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;
      setScreenSharing(true);
    }
  };

  const handleEndConfirmed = async () => {
    clearInterval(pollRef.current);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    pcRef.current?.close();
    await base44.entities.LiveStream.update(streamId, { status: "ended" });
    setStatus("ended");
    toast.success("配信を終了しました");
    if (onEnd) onEnd();
    else navigate(-1);
  };

  return (
    <div className="w-full bg-black rounded-xl overflow-hidden" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 56px)" }}>
      <div className="flex h-full w-full">

        {/* ===== 左: 映像エリア (65%) ===== */}
        <div className="relative flex-[65] h-full bg-zinc-900">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain bg-black"
            style={{ display: camOn && !paused ? "block" : "none" }}
          />
          {(!camOn || paused) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
              <CameraOff className="w-14 h-14 text-zinc-600" />
              {paused && <p className="mt-3 text-white/50 text-sm font-bold">一時停止中</p>}
            </div>
          )}

          {/* ステータスバッジ */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {isLive ? (
              <>
                <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                </span>
                <span className="flex items-center gap-1.5 bg-black/70 text-white font-black px-3 py-1 rounded-full text-base">
                  <Eye className="w-4 h-4" />{viewerCount}
                </span>
              </>
            ) : (
              <span className="flex items-center gap-1.5 bg-zinc-700/80 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> PREVIEW
              </span>
            )}
          </div>

          {/* GoLiveボタン（プレビュー中のみ） */}
          {!isLive && (
            <div className="absolute inset-0 flex items-end justify-center pb-10 pointer-events-none">
              <button
                onClick={handleGoLive}
                disabled={goingLive}
                className="pointer-events-auto flex items-center gap-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-2xl shadow-red-500/40 transition-all scale-100 hover:scale-105 active:scale-95"
              >
                {goingLive ? (
                  <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Zap className="w-6 h-6" />
                )}
                {goingLive ? "接続中..." : "配信を開始する"}
              </button>
            </div>
          )}
        </div>

        {/* ===== 右: コメント + コントロール (35%) ===== */}
        <div className="flex-[35] flex flex-col bg-zinc-950 h-full">

          {/* コメントスクロール */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
            {comments.length === 0 && (
              <p className="text-zinc-600 text-xs text-center pt-6">コメント・エールがここに流れます</p>
            )}
            {comments.map((c) => (
              <div key={c.id} className={`flex items-start gap-1.5 text-xs ${c._type === "superchat" ? "bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-2 py-1.5" : ""}`}>
                {c._type === "superchat" ? (
                  <>
                    <span className="text-yellow-400 font-black shrink-0">🪙</span>
                    <div className="min-w-0">
                      <span className="text-yellow-300 font-bold">{c.user_name || "匿名"} </span>
                      <span className="text-yellow-400 font-black">+{c.coin_amount}コイン</span>
                      {c.message && <p className="text-white/80 mt-0.5">{c.message}</p>}
                    </div>
                  </>
                ) : (
                  <>
                    <span className="text-primary font-bold shrink-0 mt-0.5">{c.author_name || "匿名"}</span>
                    <span className="text-white/80 leading-relaxed">{c.content}</span>
                  </>
                )}
              </div>
            ))}
            <div ref={commentEndRef} />
          </div>

          {/* コントロールバー */}
          <div className="border-t border-zinc-800 shrink-0 px-3 py-3">
            {/* ロック中の注意書き（配信中のみ） */}
            {isLive && (
              <p className="text-[10px] text-zinc-600 text-center mb-2">🔒 配信中 — ボタンはロックされています</p>
            )}

            <div className="flex items-center justify-between gap-2">
              {/* コントロールボタン群 */}
              <div className={`flex gap-2 ${isLive ? "opacity-30 pointer-events-none" : ""}`}>
                <CtrlBtn active={micOn} icon={micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} onClick={toggleMic} danger={!micOn} />
                <CtrlBtn active={camOn} icon={camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />} onClick={toggleCam} danger={!camOn} />
                <CtrlBtn icon={paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} onClick={togglePause} active={!paused} />
                <CtrlBtn icon={<Monitor className="w-4 h-4" />} onClick={toggleScreenShare} active={!screenSharing} accent={screenSharing} />
                <CtrlBtn icon={<Settings className="w-4 h-4" />} onClick={() => setShowQualityModal(true)} active />
              </div>

              {/* 配信終了ボタン（常に表示） */}
              <button
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shrink-0"
              >
                <PhoneOff className="w-3.5 h-3.5" /> 配信終了
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== 配信終了確認モーダル ===== */}
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
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleEndConfirmed}
                className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm transition-colors"
              >
                終了する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 高画質設定モーダル ===== */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> 配信画質設定
              </h2>
              <button onClick={() => setShowQualityModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            {isLive && <p className="text-zinc-500 text-xs mb-3">※ 配信中は画質変更できません</p>}
            <div className="space-y-2">
              {QUALITY_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => !isLive && setSelectedQuality(i)}
                  disabled={isLive}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${selectedQuality === i ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-500"}`}
                >
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.width}×{p.height} / {p.frameRate}fps / {(p.bitrate / 1000000).toFixed(1)}Mbps</p>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowQualityModal(false)}
              className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ icon, onClick, active = true, danger, accent }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white
        ${danger ? "bg-red-500 hover:bg-red-600" : ""}
        ${accent ? "bg-blue-500 hover:bg-blue-600" : ""}
        ${!danger && !accent ? "bg-white/10 hover:bg-white/20" : ""}
      `}
    >
      {icon}
    </button>
  );
}