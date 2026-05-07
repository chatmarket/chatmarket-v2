/**
 * useWebRtcCall — WebRTC P2P 1対1通話フック
 *
 * 戦略: All-Candidates（ICE収集完了後にOfferを1回送る）
 * - ICE収集完了を待ってからOfferをDBへ書き込む → Trickle ICEの複雑さを排除
 * - CallerはCalleeのreadyフラグを購読で即検知（ポーリング不要）
 * - Callee readyが来たら即Offer送信 → 0遅延
 */
import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

/** ICE収集が完了するまで待つ（最大8秒） */
function waitForIceGathering(pc) {
  return new Promise((resolve) => {
    if (pc.iceGatheringState === 'complete') { resolve(); return; }
    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };
    pc.addEventListener('icegatheringstatechange', check);
    // 最大8秒でタイムアウト（収集できたものだけで進む）
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, 8000);
  });
}

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

    const pc = new RTCPeerConnection({
      iceServers: ICE_SERVERS,
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10, // ICE収集を事前開始
    });
    pcRef.current = pc;

    pc.onicecandidateerror = (ev) => {
      console.warn('[WebRTC] ICE error:', ev.errorCode, ev.url);
    };
    pc.onicegatheringstatechange = () => {
      console.log('[WebRTC] ICE gathering:', pc.iceGatheringState);
    };

    // ── ローカルトラック追加 ──
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    // ── リモートトラック受信 ──
    pc.ontrack = (event) => {
      if (cleanedUpRef.current) return;
      const videoEl = remoteVideoRef.current;
      if (!videoEl) return;
      if (!videoEl.srcObject) videoEl.srcObject = new MediaStream();
      event.streams[0]?.getTracks().forEach(track => videoEl.srcObject.addTrack(track));
      videoEl.muted = false;
      videoEl.volume = 1.0;
      videoEl.play().catch(() => {});
      console.log('[WebRTC] ✅ Remote track received:', event.track.kind);
    };

    // ── 接続状態監視 ──
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      console.log('[WebRTC] connectionState:', state);
      if (state === 'connected') onReconnected?.();
      else if (state === 'disconnected' || state === 'failed') onReconnecting?.();
    };

    // ────────────────────────────────────────────────
    // CALLER: Calleeのready検知 → ICE収集完了まで待つ → Offer+ICE一括送信
    // ────────────────────────────────────────────────
    const runAsCaller = async () => {
      // 1. 古いシグナリングをクリア
      await base44.entities.VideoCall.update(call.id, {
        webrtc_offer: null,
        webrtc_answer: null,
        webrtc_ice_candidates_broadcaster: null,
        webrtc_ice_candidates_viewer: null,
        webrtc_callee_ready: null,
      });
      console.log('[WebRTC] 🧹 Cleared old signaling data');

      if (cleanedUpRef.current) return;

      // 2. Calleeのreadyを購読で即検知（ポーリングしない）
      await new Promise((resolve) => {
        let resolved = false;
        const done = () => { if (!resolved) { resolved = true; resolve(); } };

        // まず既にreadyになっていないか確認
        base44.entities.VideoCall.filter({ id: call.id }).then(calls => {
          if (calls[0]?.webrtc_callee_ready) { console.log('[WebRTC] ✅ Callee already ready'); done(); }
        }).catch(() => {});

        // リアルタイム購読
        const unsub = base44.entities.VideoCall.subscribe((ev) => {
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          if (ev.data?.webrtc_callee_ready) {
            console.log('[WebRTC] ✅ Callee ready detected via subscribe');
            unsub();
            done();
          }
        });

        // 最大10秒で諦める
        setTimeout(() => {
          unsub();
          console.warn('[WebRTC] ⚠️ Callee ready timeout, proceeding anyway');
          done();
        }, 10000);
      });

      if (cleanedUpRef.current) return;

      // 3. Offer作成 → ICE収集完了まで待つ
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      console.log('[WebRTC] ⏳ Waiting for ICE gathering to complete...');
      await waitForIceGathering(pc);
      if (cleanedUpRef.current) return;

      // 4. ICE候補込みのLocalDescriptionを取得して一括送信
      const finalSdp = pc.localDescription;
      const allCandidates = [];
      // SDP からICEを抽出する代わりに収集済みを使用
      // onicecandidate で収集したものを送る（setLocalDescription後に収集済み）
      await base44.entities.VideoCall.update(call.id, {
        webrtc_offer: JSON.stringify(finalSdp),
      });
      console.log('[WebRTC] 📤 Offer (with ICE) written to DB');

      // 5. Answerを待つ（購読 + ポーリングのバックアップ）
      let answered = false;
      const handleAnswer = async (answerJson, calleeCandidatesJson) => {
        if (answered || pc.remoteDescription !== null || cleanedUpRef.current) return;
        answered = true;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerJson)));
          console.log('[WebRTC] ✅ Remote Answer applied');
          // Calleeのローカル候補も適用
          if (calleeCandidatesJson) {
            try {
              const candidates = JSON.parse(calleeCandidatesJson);
              for (const c of candidates) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
            } catch {}
          }
        } catch (e) {
          console.warn('[WebRTC] setRemoteDescription(answer) failed:', e.message);
          answered = false;
        }
      };

      const unsubAnswer = base44.entities.VideoCall.subscribe(async (ev) => {
        if (cleanedUpRef.current) { unsubAnswer(); return; }
        if (ev.id !== call.id && ev.data?.id !== call.id) return;
        const d = ev.data;
        if (d?.webrtc_answer) await handleAnswer(d.webrtc_answer, d.webrtc_ice_candidates_viewer);
      });

      let retries = 0;
      const pollAnswer = setInterval(async () => {
        if (cleanedUpRef.current || answered) { clearInterval(pollAnswer); return; }
        if (++retries > 120) { clearInterval(pollAnswer); console.error('[WebRTC] ❌ Answer timeout'); return; }
        try {
          const calls = await base44.entities.VideoCall.filter({ id: call.id });
          const latest = calls[0];
          if (latest?.webrtc_answer) {
            clearInterval(pollAnswer);
            await handleAnswer(latest.webrtc_answer, latest.webrtc_ice_candidates_viewer);
          }
        } catch {}
      }, 1000);

      return () => { clearInterval(pollAnswer); unsubAnswer(); };
    };

    // ────────────────────────────────────────────────
    // CALLEE: readyフラグ設定 → Offer受信 → ICE収集完了まで待つ → Answer+ICE一括送信
    // ────────────────────────────────────────────────
    const runAsCallee = async () => {
      // 1. Callerに「準備完了」を通知
      await base44.entities.VideoCall.update(call.id, { webrtc_callee_ready: true });
      console.log('[WebRTC] 📣 Callee ready flag set');

      let offerApplied = false;

      const handleOffer = async (offerJson, callerCandidatesJson) => {
        if (offerApplied || pc.remoteDescription !== null || cleanedUpRef.current) return;
        offerApplied = true;
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
          console.log('[WebRTC] ✅ Remote Offer applied');

          // Callerのローカル候補を適用
          if (callerCandidatesJson) {
            try {
              const candidates = JSON.parse(callerCandidatesJson);
              for (const c of candidates) {
                await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
            } catch {}
          }

          // Answer作成 → ICE収集完了まで待つ
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log('[WebRTC] ⏳ Waiting for ICE gathering (callee)...');
          await waitForIceGathering(pc);
          if (cleanedUpRef.current) return;

          // Answer一括送信
          await base44.entities.VideoCall.update(call.id, {
            webrtc_answer: JSON.stringify(pc.localDescription),
          });
          console.log('[WebRTC] 📤 Answer (with ICE) written to DB');
        } catch (e) {
          console.warn('[WebRTC] handleOffer failed:', e.message);
          offerApplied = false;
        }
      };

      const unsubOffer = base44.entities.VideoCall.subscribe(async (ev) => {
        if (cleanedUpRef.current) { unsubOffer(); return; }
        if (ev.id !== call.id && ev.data?.id !== call.id) return;
        const d = ev.data;
        if (d?.webrtc_offer) await handleOffer(d.webrtc_offer, d.webrtc_ice_candidates_broadcaster);
      });

      let retries = 0;
      const pollOffer = setInterval(async () => {
        if (cleanedUpRef.current || offerApplied) { clearInterval(pollOffer); return; }
        if (++retries > 120) {
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
        } catch {}
      }, 1000);

      return () => { clearInterval(pollOffer); unsubOffer(); };
    };

    let stopPolling = null;
    if (isCaller) {
      runAsCaller().then(fn => { stopPolling = fn; }).catch(e => console.error('[WebRTC] Caller error:', e));
    } else {
      runAsCallee().then(fn => { stopPolling = fn; }).catch(e => console.error('[WebRTC] Callee error:', e));
    }

    return () => {
      stopPolling?.();
      cleanup();
    };
  }, [enabled, call?.id, localStream, user?.email]);
}