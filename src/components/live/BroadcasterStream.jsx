import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Users, Pause, Play, Monitor, Settings, X, AlertTriangle } from "lucide-react";
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
  const [status, setStatus] = useState("connecting");
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(1); // index into QUALITY_PRESETS

  // Poll viewer count
  useEffect(() => {
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (s?.viewer_count !== undefined) setViewerCount(s.viewer_count);
    }, 5000);
    return () => clearInterval(interval);
  }, [streamId]);

  // Subscribe to comments & superchats
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

  // Auto-scroll comments
  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const startBroadcast = useCallback(async () => {
    const preset = QUALITY_PRESETS[selectedQuality];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: preset.width, height: preset.height, frameRate: preset.frameRate },
        audio: true,
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) localVideoRef.current.srcObject = stream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

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
      toast.error("カメラ/マイクにアクセスできません: " + err.message);
    }
  }, [streamId, selectedQuality]);

  useEffect(() => {
    startBroadcast();
    return () => {
      clearInterval(pollRef.current);
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      pcRef.current?.close();
    };
  }, [startBroadcast]);

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

  const isLive = status === "live";

  return (
    <div className="w-full bg-black" style={{ aspectRatio: "16/9", maxHeight: "calc(100vh - 56px)" }}>
      <div className="flex h-full w-full">

        {/* ===== 左: 映像エリア (65%) ===== */}
        <div className="relative flex-[65] h-full bg-zinc-900">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ display: camOn && !paused ? "block" : "none" }}
          />
          {(!camOn || paused) && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <CameraOff className="w-14 h-14 text-zinc-600" />
              {paused && <p className="absolute mt-20 text-white/50 text-sm font-bold">一時停止中</p>}
            </div>
          )}

          {/* 待機中: 待機人数 */}
          {!isLive && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/70 backdrop-blur-sm rounded-2xl px-8 py-5 text-center">
                <Users className="w-8 h-8 text-white/50 mx-auto mb-2" />
                <p className="text-white/60 text-sm mb-1">現在の待機人数</p>
                <p className="text-white text-5xl font-black">{viewerCount}<span className="text-2xl ml-1 font-normal">人</span></p>
              </div>
            </div>
          )}

          {/* LIVE中: バッジ */}
          {isLive && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </span>
              <span className="flex items-center gap-2 bg-black/70 text-white font-black px-3 py-1 rounded-full" style={{ fontSize: "20px" }}>
                <Eye className="w-5 h-5" />
                {viewerCount}
              </span>
            </div>
          )}
        </div>

        {/* ===== 右: コメント + コントロール (35%) ===== */}
        <div className="flex-[35] flex flex-col bg-zinc-950 h-full relative">

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
          <div className="relative border-t border-zinc-800 shrink-0">
            {/* ボタン群 */}
            <div className="flex items-center justify-between px-3 py-3 gap-2">
              <div className="flex gap-2">
                <CtrlBtn active={micOn} icon={micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} onClick={toggleMic} danger={!micOn} />
                <CtrlBtn active={camOn} icon={camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />} onClick={toggleCam} danger={!camOn} />
                <CtrlBtn icon={paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />} onClick={togglePause} active={!paused} />
                <CtrlBtn icon={<Monitor className="w-4 h-4" />} onClick={toggleScreenShare} active={!screenSharing} accent={screenSharing} />
                <CtrlBtn icon={<Settings className="w-4 h-4" />} onClick={() => !isLive && setShowQualityModal(true)} active={!isLive} faded={isLive} />
              </div>
              <button
                onClick={() => setShowEndConfirm(true)}
                className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors"
              >
                <PhoneOff className="w-3.5 h-3.5" /> 配信終了
              </button>
            </div>

            {/* LIVE中: 誤操作防止オーバーレイ（配信終了ボタン以外を無効化） */}
            {isLive && (
              <div className="absolute inset-0 bg-black/70 backdrop-blur-[1px] flex items-center justify-end pr-3 pointer-events-auto rounded-sm">
                <div className="flex-1 text-center">
                  <p className="text-white/40 text-[10px]">🔒 配信中 — 誤操作防止ロック中</p>
                </div>
                <button
                  onClick={() => setShowEndConfirm(true)}
                  className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-black px-5 py-2.5 rounded-full transition-colors shadow-lg shadow-red-500/30"
                >
                  <PhoneOff className="w-4 h-4" /> 配信終了
                </button>
              </div>
            )}
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

      {/* ===== 高画質設定モーダル（配信前のみ） ===== */}
      {showQualityModal && !isLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white text-lg flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> 高画質配信設定
              </h2>
              <button onClick={() => setShowQualityModal(false)} className="text-zinc-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-zinc-500 text-xs mb-4">配信画質を選択してください（配信開始前のみ変更可）</p>
            <div className="space-y-2">
              {QUALITY_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuality(i)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedQuality === i ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-500"}`}
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
              設定を保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ icon, onClick, active = true, danger, accent, faded }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white
        ${danger ? "bg-red-500 hover:bg-red-600" : ""}
        ${accent ? "bg-blue-500 hover:bg-blue-600" : ""}
        ${!danger && !accent && active ? "bg-white/10 hover:bg-white/20" : ""}
        ${faded ? "opacity-30 cursor-not-allowed" : ""}
      `}
    >
      {icon}
    </button>
  );
}