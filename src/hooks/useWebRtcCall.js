/**
 * useWebRtcCall — 純粋WebRTC（ブラウザ直接P2P）による1対1通話フック
 *
 * VideoCallエンティティのフィールドをシグナリングチャネルとして使用:
 *   webrtc_offer     — Caller が書く SDP Offer (JSON文字列)
 *   webrtc_answer    — Callee が書く SDP Answer (JSON文字列)
 *   webrtc_ice_candidates_broadcaster — Caller の ICE候補 (JSON配列文字列)
 *   webrtc_ice_candidates_viewer      — Callee の ICE候補 (JSON配列文字列)
 *
 * 呼び出し方:
 *   useWebRtcCall({ call, localStream, remoteVideoRef, user, enabled })
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function useWebRtcCall({
  call,
  localStream,
  remoteVideoRef,
  user,
  enabled,
  onReconnecting,
  onReconnected,
  onReconnectFailed,
}) {
  const pcRef = useRef(null);
  const cleanedUpRef = useRef(false);
  const iceCandidatesQueueRef = useRef([]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const isCaller = user.email === call.caller_email;
    cleanedUpRef.current = false;

    const cleanup = () => {
      cleanedUpRef.current = true;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // ── ローカルストリームのトラックを追加 ──
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // ── リモートトラック受信 → video要素にアタッチ ──
    pc.ontrack = (event) => {
      if (cleanedUpRef.current) return;
      const videoEl = remoteVideoRef.current;
      if (!videoEl) return;

      if (!videoEl.srcObject) {
        videoEl.srcObject = new MediaStream();
      }
      event.streams[0]?.getTracks().forEach(track => {
        videoEl.srcObject.addTrack(track);
      });
      videoEl.muted = false;
      videoEl.volume = 1.0;
      videoEl.play().catch(() => {});
      console.log('[WebRTC] ✅ Remote track received:', event.track.kind);
    };

    // ── 接続状態監視 ──
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] connectionState:', state);
      if (state === 'connected') {
        onReconnected?.();
        console.log('[WebRTC] ✅ Peer-to-peer connection established!');
      } else if (state === 'disconnected' || state === 'failed') {
        onReconnecting?.();
        console.warn('[WebRTC] ⚠️ Connection lost:', state);
      }
    };

    // ── ICE候補収集 → DBに書き込む ──
    const localCandidates = [];
    pc.onicecandidate = async (event) => {
      if (!event.candidate || cleanedUpRef.current) return;
      localCandidates.push(event.candidate.toJSON());

      // デバウンス: 200ms後にまとめて書き込む
      clearTimeout(pc._iceWriteTimer);
      pc._iceWriteTimer = setTimeout(async () => {
        if (cleanedUpRef.current) return;
        try {
          const field = isCaller
            ? 'webrtc_ice_candidates_broadcaster'
            : 'webrtc_ice_candidates_viewer';
          await base44.entities.VideoCall.update(call.id, {
            [field]: JSON.stringify(localCandidates),
          });
          console.log('[WebRTC] 📡 ICE candidates written:', localCandidates.length);
        } catch (e) {
          console.warn('[WebRTC] ICE write failed:', e.message);
        }
      }, 200);
    };

    // ── 相手のICE候補を監視・適用する ──
    const applyRemoteIceCandidates = async (candidatesJson) => {
      if (!candidatesJson || !pc || pc.remoteDescription === null) return;
      try {
        const candidates = JSON.parse(candidatesJson);
        for (const c of candidates) {
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        console.log('[WebRTC] ✅ Remote ICE candidates applied:', candidates.length);
      } catch (e) {
        console.warn('[WebRTC] ICE parse failed:', e.message);
      }
    };

    // ── Caller: Offer作成 → DB書き込み ──
    const runAsCaller = async () => {
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: JSON.stringify(offer),
        });
        console.log('[WebRTC] 📤 Offer written to DB');

        // Callee の Answer を待つ（ポーリング）
        let retries = 0;
        const pollAnswer = setInterval(async () => {
          if (cleanedUpRef.current) { clearInterval(pollAnswer); return; }
          retries++;
          if (retries > 60) { clearInterval(pollAnswer); console.error('[WebRTC] ❌ Answer timeout'); return; }

          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            const latest = calls[0];
            if (latest?.webrtc_answer && pc.remoteDescription === null) {
              clearInterval(pollAnswer);
              const answer = JSON.parse(latest.webrtc_answer);
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              console.log('[WebRTC] ✅ Remote Answer applied');

              // Callee の ICE候補も適用
              await applyRemoteIceCandidates(latest.webrtc_ice_candidates_viewer);

              // 以降の ICE候補をリアルタイム購読で受け取る
              const unsub = base44.entities.VideoCall.subscribe(async (ev) => {
                if (ev.id !== call.id && ev.data?.id !== call.id) return;
                const updated = ev.data;
                if (updated?.webrtc_ice_candidates_viewer) {
                  await applyRemoteIceCandidates(updated.webrtc_ice_candidates_viewer);
                  unsub();
                }
              });
            }
          } catch (e) {
            console.warn('[WebRTC] Poll answer error:', e.message);
          }
        }, 1000);

        return () => clearInterval(pollAnswer);
      } catch (e) {
        console.error('[WebRTC] Caller setup failed:', e.message);
        toast.error('WebRTC接続の準備に失敗しました');
      }
    };

    // ── Callee: Offer受信 → Answer作成 → DB書き込み ──
    const runAsCallee = async () => {
      try {
        // Offer がまだ無ければポーリングで待つ
        let retries = 0;
        const pollOffer = setInterval(async () => {
          if (cleanedUpRef.current) { clearInterval(pollOffer); return; }
          retries++;
          if (retries > 60) { clearInterval(pollOffer); console.error('[WebRTC] ❌ Offer timeout'); return; }

          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            const latest = calls[0];
            if (latest?.webrtc_offer && pc.remoteDescription === null) {
              clearInterval(pollOffer);
              const offer = JSON.parse(latest.webrtc_offer);
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              console.log('[WebRTC] ✅ Remote Offer applied');

              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await base44.entities.VideoCall.update(call.id, {
                webrtc_answer: JSON.stringify(answer),
              });
              console.log('[WebRTC] 📤 Answer written to DB');

              // Caller の ICE候補も適用
              await applyRemoteIceCandidates(latest.webrtc_ice_candidates_broadcaster);

              // 以降の ICE候補をリアルタイム購読で受け取る
              const unsub = base44.entities.VideoCall.subscribe(async (ev) => {
                if (ev.id !== call.id && ev.data?.id !== call.id) return;
                const updated = ev.data;
                if (updated?.webrtc_ice_candidates_broadcaster) {
                  await applyRemoteIceCandidates(updated.webrtc_ice_candidates_broadcaster);
                  unsub();
                }
              });
            }
          } catch (e) {
            console.warn('[WebRTC] Poll offer error:', e.message);
          }
        }, 1000);

        return () => clearInterval(pollOffer);
      } catch (e) {
        console.error('[WebRTC] Callee setup failed:', e.message);
        toast.error('WebRTC接続の応答に失敗しました');
      }
    };

    let stopPolling = null;
    if (isCaller) {
      runAsCaller().then(fn => { stopPolling = fn; });
    } else {
      runAsCallee().then(fn => { stopPolling = fn; });
    }

    return () => {
      stopPolling?.();
      cleanup();
    };
  }, [enabled, call?.id, localStream, user?.email]);
}