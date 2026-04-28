import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * シンプルWebRTC P2P フック
 * - VideoCallエンティティの webrtc_offer / webrtc_answer / webrtc_ice_candidates_* をシグナリングに使用
 * - caller = offer側, callee = answer側
 */
export function useWebRtcCall({ call, localStream, remoteVideoRef, user, enabled }) {
  const pcRef = useRef(null);
  const initdRef = useRef(false);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user || !remoteVideoRef) return;
    if (initdRef.current) return;
    initdRef.current = true;

    const isCaller = user.email === call.caller_email;
    console.log(`[WebRTC] 🚀 P2P start. Role: ${isCaller ? 'CALLER' : 'CALLEE'}`);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pcRef.current = pc;

    // ローカルトラック追加
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // リモート映像受信 → video要素へバインド
    pc.ontrack = (event) => {
      console.log('[WebRTC] 🎥 Remote track received:', event.track.kind);
      const videoEl = remoteVideoRef.current;
      if (!videoEl) return;
      if (!videoEl.srcObject) {
        videoEl.srcObject = new MediaStream();
      }
      videoEl.srcObject.addTrack(event.track);
      videoEl.play().catch(() => {});
    };

    // ICE candidate バッファ
    const iceBuf = [];
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        iceBuf.push(e.candidate);
      } else {
        // gathering完了 → DB書き込み
        const field = isCaller
          ? 'webrtc_ice_candidates_broadcaster'
          : 'webrtc_ice_candidates_viewer';
        base44.entities.VideoCall.update(call.id, {
          [field]: JSON.stringify(iceBuf),
        }).catch(() => {});
        console.log(`[WebRTC] 📤 ICE written (${iceBuf.length})`);
      }
    };

    const intervals = [];

    const run = async () => {
      if (isCaller) {
        // --- Caller: create offer ---
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: JSON.stringify(offer),
          webrtc_answer: null,
        });
        console.log('[WebRTC] 📤 Offer written');

        // Poll for answer
        const t = setInterval(async () => {
          if (pc.signalingState !== 'have-local-offer') return;
          const res = await base44.entities.VideoCall.filter({ id: call.id });
          const c = res[0];
          if (!c?.webrtc_answer) return;
          clearInterval(t);
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(c.webrtc_answer)));
          console.log('[WebRTC] ✅ Answer applied');
          if (c.webrtc_ice_candidates_viewer) {
            JSON.parse(c.webrtc_ice_candidates_viewer).forEach(cand =>
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            );
          }
        }, 1500);
        intervals.push(t);
      } else {
        // --- Callee: wait for offer then answer ---
        const t = setInterval(async () => {
          if (pc.signalingState !== 'stable') return;
          const res = await base44.entities.VideoCall.filter({ id: call.id });
          const c = res[0];
          if (!c?.webrtc_offer) return;
          clearInterval(t);
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(c.webrtc_offer)));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await base44.entities.VideoCall.update(call.id, {
            webrtc_answer: JSON.stringify(answer),
          });
          console.log('[WebRTC] 📤 Answer written');
          if (c.webrtc_ice_candidates_broadcaster) {
            JSON.parse(c.webrtc_ice_candidates_broadcaster).forEach(cand =>
              pc.addIceCandidate(new RTCIceCandidate(cand)).catch(() => {})
            );
          }
        }, 1500);
        intervals.push(t);
      }
    };

    run();

    return () => {
      intervals.forEach(clearInterval);
      pc.close();
      pcRef.current = null;
      initdRef.current = false;
      console.log('[WebRTC] 🔒 PC closed');
    };
  }, [enabled, call?.id, call?.status, localStream, user?.email]);
}