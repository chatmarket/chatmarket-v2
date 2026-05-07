/**
 * useWebRtcCall — 純粋WebRTC（ブラウザ直接P2P）による1対1通話フック
 *
 * 改善点:
 * - Caller は Offer 前に古いシグナリングデータをクリアする
 * - Callee の Offer 待ちを延長 (120秒) + リトライで諦めない
 * - Caller は Callee が ready になってから Offer を送る (DB購読で検知)
 * - ICE候補を即時 (デバウンスなし) DB書き込み → Trickle ICE 高速化
 * - ICE候補は増分マージ (累積配列) して unsub せずに継続購読
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' },
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
  const appliedCallerCandidatesRef = useRef(new Set());
  const appliedCalleeCandidatesRef = useRef(new Set());

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const isCaller = user.email === call.caller_email;
    cleanedUpRef.current = false;
    appliedCallerCandidatesRef.current = new Set();
    appliedCalleeCandidatesRef.current = new Set();

    const cleanup = () => {
      cleanedUpRef.current = true;
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
    };

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
    });
    pcRef.current = pc;

    pc.onicecandidateerror = (ev) => {
      console.warn('[WebRTC] ICE candidate error:', ev.errorCode, ev.errorText, ev.url);
    };

    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering state:', pc.iceGatheringState);
    };

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

    // ── ICE候補収集 → DBに即時書き込み（Trickle ICE: デバウンスなし）──
    const localCandidates = [];
    pc.onicecandidate = async (event) => {
      if (!event.candidate || cleanedUpRef.current) return;
      localCandidates.push(event.candidate.toJSON());

      // 即時書き込み（デバウンスなし → Trickle ICE 高速化）
      try {
        const field = isCaller
          ? 'webrtc_ice_candidates_broadcaster'
          : 'webrtc_ice_candidates_viewer';
        await base44.entities.VideoCall.update(call.id, {
          [field]: JSON.stringify(localCandidates),
        });
        console.log('[WebRTC] 📡 ICE candidate written instantly:', localCandidates.length);
      } catch (e) {
        console.warn('[WebRTC] ICE write failed:', e.message);
      }
    };

    // ── 相手のICE候補を増分適用する（重複スキップ）──
    const applyRemoteIceCandidates = async (candidatesJson, appliedSet) => {
      if (!candidatesJson || !pc || pc.remoteDescription === null) return;
      try {
        const candidates = JSON.parse(candidatesJson);
        for (const c of candidates) {
          const key = `${c.candidate}`;
          if (appliedSet.has(key)) continue;
          appliedSet.add(key);
          await pc.addIceCandidate(new RTCIceCandidate(c)).catch((e) => {
            console.warn('[WebRTC] addIceCandidate failed:', e.message);
          });
        }
        console.log('[WebRTC] ✅ Remote ICE candidates applied total:', appliedSet.size);
      } catch (e) {
        console.warn('[WebRTC] ICE parse failed:', e.message);
      }
    };

    // ── Caller: 古いシグナリングをクリア → Offer作成 → DB書き込み ──
    const runAsCaller = async () => {
      try {
        // 古いシグナリングデータをクリア（再接続時の競合防止）
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: null,
          webrtc_answer: null,
          webrtc_ice_candidates_broadcaster: null,
          webrtc_ice_candidates_viewer: null,
        });
        console.log('[WebRTC] 🧹 Cleared old signaling data');

        // 少し待ってCalleeが購読を開始するのを確認
        await new Promise(r => setTimeout(r, 500));
        if (cleanedUpRef.current) return;

        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: JSON.stringify(offer),
        });
        console.log('[WebRTC] 📤 Offer written to DB');

        // Callee の Answer を待つ（最大120秒・リアルタイム購読 + ポーリング併用）
        let answered = false;

        const handleAnswer = async (answerJson) => {
          if (answered || pc.remoteDescription !== null || cleanedUpRef.current) return;
          answered = true;
          try {
            const answer = JSON.parse(answerJson);
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            console.log('[WebRTC] ✅ Remote Answer applied');
          } catch (e) {
            console.warn('[WebRTC] setRemoteDescription(answer) failed:', e.message);
          }
        };

        // リアルタイム購読でAnswerを受け取る
        const unsubAnswer = base44.entities.VideoCall.subscribe(async (ev) => {
          if (cleanedUpRef.current) { unsubAnswer(); return; }
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          const updated = ev.data;
          if (updated?.webrtc_answer) {
            await handleAnswer(updated.webrtc_answer);
          }
          // Callee のICE候補も継続適用
          if (updated?.webrtc_ice_candidates_viewer) {
            await applyRemoteIceCandidates(updated.webrtc_ice_candidates_viewer, appliedCalleeCandidatesRef.current);
          }
        });

        // ポーリングでバックアップ（購読ラグ対策）
        let retries = 0;
        const pollAnswer = setInterval(async () => {
          if (cleanedUpRef.current || answered) { clearInterval(pollAnswer); return; }
          retries++;
          if (retries > 120) {
            clearInterval(pollAnswer);
            console.error('[WebRTC] ❌ Answer timeout after 120s');
            return;
          }
          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            const latest = calls[0];
            if (latest?.webrtc_answer) {
              clearInterval(pollAnswer);
              await handleAnswer(latest.webrtc_answer);
              await applyRemoteIceCandidates(latest.webrtc_ice_candidates_viewer, appliedCalleeCandidatesRef.current);
            }
          } catch (e) {
            console.warn('[WebRTC] Poll answer error:', e.message);
          }
        }, 1000);

        return () => {
          clearInterval(pollAnswer);
          unsubAnswer();
        };
      } catch (e) {
        console.error('[WebRTC] Caller setup failed:', e.message);
        toast.error('WebRTC接続の準備に失敗しました');
      }
    };

    // ── Callee: Offer受信 → Answer作成 → DB書き込み ──
    const runAsCallee = async () => {
      try {
        let offerApplied = false;

        const handleOffer = async (offerJson, callerCandidatesJson) => {
          if (offerApplied || pc.remoteDescription !== null || cleanedUpRef.current) return;
          offerApplied = true;
          try {
            const offer = JSON.parse(offerJson);
            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('[WebRTC] ✅ Remote Offer applied');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await base44.entities.VideoCall.update(call.id, {
              webrtc_answer: JSON.stringify(answer),
            });
            console.log('[WebRTC] 📤 Answer written to DB');

            // Caller の ICE候補を適用
            if (callerCandidatesJson) {
              await applyRemoteIceCandidates(callerCandidatesJson, appliedCallerCandidatesRef.current);
            }
          } catch (e) {
            console.warn('[WebRTC] handleOffer failed:', e.message);
            offerApplied = false; // リトライ許可
          }
        };

        // リアルタイム購読でOfferを受け取る（シグナリングラグ対策の主軸）
        const unsubOffer = base44.entities.VideoCall.subscribe(async (ev) => {
          if (cleanedUpRef.current) { unsubOffer(); return; }
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          const updated = ev.data;
          if (updated?.webrtc_offer) {
            await handleOffer(updated.webrtc_offer, updated.webrtc_ice_candidates_broadcaster);
          }
          // Caller のICE候補も継続適用
          if (updated?.webrtc_ice_candidates_broadcaster) {
            await applyRemoteIceCandidates(updated.webrtc_ice_candidates_broadcaster, appliedCallerCandidatesRef.current);
          }
        });

        // ポーリングでバックアップ（最大120秒・1秒間隔）
        let retries = 0;
        const pollOffer = setInterval(async () => {
          if (cleanedUpRef.current || offerApplied) { clearInterval(pollOffer); return; }
          retries++;
          if (retries > 120) {
            clearInterval(pollOffer);
            console.error('[WebRTC] ❌ Offer timeout after 120s');
            toast.error('接続タイムアウト。通話を一度終了して再度お試しください。');
            return;
          }
          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            const latest = calls[0];
            if (latest?.webrtc_offer) {
              clearInterval(pollOffer);
              await handleOffer(latest.webrtc_offer, latest.webrtc_ice_candidates_broadcaster);
            }
          } catch (e) {
            console.warn('[WebRTC] Poll offer error:', e.message);
          }
        }, 1000);

        return () => {
          clearInterval(pollOffer);
          unsubOffer();
        };
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