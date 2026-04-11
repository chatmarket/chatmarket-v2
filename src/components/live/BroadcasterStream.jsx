import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Radio, VideoOff, MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Users } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
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
  const [status, setStatus] = useState("connecting"); // connecting | live | ended
  const [viewerCount, setViewerCount] = useState(0);
  const [comments, setComments] = useState([]);

  // Poll stream data (viewer count)
  useEffect(() => {
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (s?.viewer_count !== undefined) setViewerCount(s.viewer_count);
    }, 5000);
    return () => clearInterval(interval);
  }, [streamId]);

  // Subscribe to comments/superchats in real-time
  useEffect(() => {
    const unsubComment = base44.entities.Comment.subscribe((event) => {
      if (event.type === "create" && event.data?.target_id === streamId) {
        setComments((prev) => [...prev.slice(-99), { ...event.data, id: event.id, type: "comment" }]);
      }
    });
    const unsubSuper = base44.entities.SuperChat.subscribe((event) => {
      if (event.type === "create" && event.data?.livestream_id === streamId) {
        setComments((prev) => [...prev.slice(-99), { ...event.data, id: event.id, type: "superchat" }]);
      }
    });
    return () => { unsubComment(); unsubSuper(); };
  }, [streamId]);

  // Auto-scroll comments to bottom
  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const startBroadcast = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      const iceCandidates = [];
      pc.onicecandidate = (e) => {
        if (e.candidate) iceCandidates.push(e.candidate);
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      await new Promise((resolve) => {
        const check = () => {
          if (pc.iceGatheringState === "complete") resolve();
          else setTimeout(check, 200);
        };
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
            for (const c of viewerCandidates) {
              await pc.addIceCandidate(new RTCIceCandidate(c));
            }
          }
          toast.success("視聴者が接続しました！");
        }
      }, 5000);

    } catch (err) {
      toast.error("カメラ/マイクにアクセスできません: " + err.message);
    }
  }, [streamId]);

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

  const handleEnd = async () => {
    if (!window.confirm("配信を終了しますか？")) return;
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
    <div className="flex flex-col h-[calc(100vh-56px)] bg-black">
      {/* ===== 上部: カメラ映像 (65%) ===== */}
      <div className="relative flex-[65]">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ display: camOn ? "block" : "none" }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <CameraOff className="w-16 h-16 text-zinc-600" />
          </div>
        )}

        {/* 待機中: 待機人数 */}
        {status === "connecting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-8 py-5 text-center">
              <Users className="w-8 h-8 text-white/60 mx-auto mb-2" />
              <p className="text-white/70 text-sm">現在の待機人数</p>
              <p className="text-white text-4xl font-black">{viewerCount}<span className="text-2xl ml-1">人</span></p>
            </div>
          </div>
        )}

        {/* LIVE中: バッジ類 */}
        {status === "live" && (
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
            </span>
            <span className="flex items-center gap-1.5 bg-black/70 text-white font-bold px-3 py-1 rounded-full" style={{ fontSize: "18px" }}>
              <Eye className="w-5 h-5" />
              {viewerCount}
            </span>
          </div>
        )}
      </div>

      {/* ===== 下部: コメント + コントロール (35%) ===== */}
      <div className="flex-[35] flex flex-col bg-zinc-950">
        {/* コメントスクロールエリア */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 min-h-0">
          {comments.length === 0 && (
            <p className="text-zinc-600 text-xs text-center pt-4">コメント・エールがここに流れます</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className={`flex items-start gap-2 text-sm ${c.type === "superchat" ? "bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-2 py-1.5" : ""}`}>
              {c.type === "superchat" ? (
                <>
                  <span className="text-yellow-400 font-black shrink-0">🪙</span>
                  <div className="min-w-0">
                    <span className="text-yellow-300 font-bold text-xs">{c.user_name || c.user_email} </span>
                    <span className="text-yellow-400 font-black text-xs">+{c.coin_amount}コイン</span>
                    {c.message && <p className="text-white/80 text-xs mt-0.5">{c.message}</p>}
                  </div>
                </>
              ) : (
                <>
                  <span className="text-primary font-bold text-xs shrink-0 mt-0.5">{c.author_name || c.author_email || "匿名"}</span>
                  <span className="text-white/80 text-xs leading-relaxed">{c.content}</span>
                </>
              )}
            </div>
          ))}
          <div ref={commentEndRef} />
        </div>

        {/* コントロールバー */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={toggleMic}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${micOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCam}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${camOn ? "bg-white/10 text-white hover:bg-white/20" : "bg-red-500 text-white"}`}
            >
              {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleEnd}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-5 py-2 rounded-full transition-colors"
          >
            <PhoneOff className="w-4 h-4" /> 配信終了
          </button>
        </div>
      </div>
    </div>
  );
}