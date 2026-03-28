import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

export default function ViewerStream({ streamId, stream }) {
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const pollRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [muted, setMuted] = useState(false);
  const [waitingForBroadcaster, setWaitingForBroadcaster] = useState(true);

  const startViewing = useCallback(async () => {
    // Poll until broadcaster sends offer
    const waitForOffer = async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (!s?.webrtc_offer) {
        pollRef.current = setTimeout(waitForOffer, 5000);
        return;
      }

      setWaitingForBroadcaster(false);

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.ontrack = (e) => {
        if (remoteVideoRef.current && e.streams[0]) {
          remoteVideoRef.current.srcObject = e.streams[0];
          setConnected(true);
        }
      };

      const offer = JSON.parse(s.webrtc_offer);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      // Add broadcaster ICE candidates
      if (s.webrtc_ice_candidates_broadcaster) {
        const candidates = JSON.parse(s.webrtc_ice_candidates_broadcaster);
        for (const c of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(c));
        }
      }

      const iceCandidates = [];
      pc.onicecandidate = (e) => {
        if (e.candidate) iceCandidates.push(e.candidate);
      };

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // Wait for ICE gathering
      await new Promise((resolve) => {
        const check = () => {
          if (pc.iceGatheringState === "complete") resolve();
          else setTimeout(check, 200);
        };
        setTimeout(resolve, 3000);
        check();
      });

      // Save answer to DB
      await base44.entities.LiveStream.update(streamId, {
        webrtc_answer: JSON.stringify(pc.localDescription),
        webrtc_ice_candidates_viewer: JSON.stringify(iceCandidates),
      });

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnected(true);
          toast.success("配信に接続しました！");
        } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          setConnected(false);
        }
      };
    };

    waitForOffer();
  }, [streamId]);

  useEffect(() => {
    // Only start WebRTC if stream has a webrtc_offer or is live
    if (stream?.status === "live") {
      startViewing();
    }
    return () => {
      clearTimeout(pollRef.current);
      pcRef.current?.close();
    };
  }, [stream?.status, startViewing]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-cover"
        style={{ display: connected ? "block" : "none" }}
      />

      {!connected && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <Radio className="w-16 h-16 text-red-400 animate-pulse" />
          <p className="text-lg font-semibold text-white">
            {waitingForBroadcaster ? "配信者の接続を待っています..." : "接続中..."}
          </p>
          <p className="text-sm text-white/50">しばらくお待ちください</p>
        </div>
      )}

      {connected && (
        <button
          onClick={() => setMuted(!muted)}
          className="absolute bottom-16 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}