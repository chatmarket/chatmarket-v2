import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Radio, VideoOff, MicOff, Mic, Camera, CameraOff, PhoneOff } from "lucide-react";
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

  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [status, setStatus] = useState("connecting"); // connecting | live | ended

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
        if (e.candidate) {
          iceCandidates.push(e.candidate);
        }
      };

      // Create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE gathering to complete (max 3s)
      await new Promise((resolve) => {
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            resolve();
          } else {
            setTimeout(check, 200);
          }
        };
        setTimeout(resolve, 3000); // fallback
        check();
      });

      // Save offer to DB
      await base44.entities.LiveStream.update(streamId, {
        webrtc_offer: JSON.stringify(pc.localDescription),
        webrtc_ice_candidates_broadcaster: JSON.stringify(iceCandidates),
        webrtc_answer: "",
        webrtc_ice_candidates_viewer: "",
      });

      setStatus("live");
      toast.success("配信を開始しました！視聴者の接続を待っています...");

      // Poll for answer from viewer
      pollRef.current = setInterval(async () => {
        const streams = await base44.entities.LiveStream.filter({ id: streamId });
        const s = streams[0];
        if (s?.webrtc_answer && pc.signalingState === "have-local-offer") {
          clearInterval(pollRef.current);

          const answer = JSON.parse(s.webrtc_answer);
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          // Add viewer ICE candidates
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
    <div className="space-y-4">
      {/* Local preview */}
      <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{ display: camOn ? "block" : "none" }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-secondary">
            <CameraOff className="w-12 h-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {status === "live" && (
            <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
            </span>
          )}
          {status === "connecting" && (
            <span className="text-xs bg-yellow-500/80 text-black font-bold px-2 py-1 rounded-full">
              接続中...
            </span>
          )}
        </div>
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={toggleMic}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${micOn ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCam}
              className={`w-9 h-9 rounded-full flex items-center justify-center ${camOn ? "bg-white/20 text-white" : "bg-red-500 text-white"}`}
            >
              {camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
            </button>
          </div>
          <button
            onClick={handleEnd}
            className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-bold px-4 py-2 rounded-full"
          >
            <PhoneOff className="w-4 h-4" /> 配信終了
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        ※ これはあなたのカメラプレビューです。視聴者にはリアルタイムで映像が届きます。
      </p>
    </div>
  );
}