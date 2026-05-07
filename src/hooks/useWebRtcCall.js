/**
 * useWebRtcCall — WebRTC P2P 1対1通話フック
 *
 * 戦略: All-Candidates + 自動リトライ（最大3回）
 * - ICE収集完了後にOffer/Answerを一括送信
 * - 接続失敗時は自動でシグナリングをリセットして再試行
 * - onStatusChange コールバックで失敗理由を呼び出し側に通知
 * - スマホ（iOS Safari）でも動作するよう audio/video constraints を明示
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const MAX_RETRIES = 3;
const ICE_GATHER_TIMEOUT_MS = 8000;
const CALLEE_READY_TIMEOUT_MS = 12000;
const ANSWER_TIMEOUT_MS = 30000;
const OFFER_TIMEOUT_MS = 30000;

/** ICE収集が完了するまで待つ */
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
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, ICE_GATHER_TIMEOUT_MS);
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
  onStatusChange, // (status: string, detail?: string) => void
}) {
  const pcRef = useRef(null);
  const cleanedUpRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);
  const stopPollingRef = useRef(null);

  const reportStatus = useCallback((status, detail = '') => {
    console.log(`[WebRTC] 📊 STATUS: ${status}${detail ? ' — ' + detail : ''}`);
    onStatusChange?.(status, detail);
  }, [onStatusChange]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const isCaller = user.email === call.caller_email;
    cleanedUpRef.current = false;
    retryCountRef.current = 0;

    // ── 1つのPCを作って接続を試みる関数 ──
    const attemptConnection = async (attemptNum) => {
      if (cleanedUpRef.current) return;

      // 前回のPCを閉じる
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

      reportStatus('connecting', `試行 ${attemptNum}/${MAX_RETRIES}`);

      const pc = new RTCPeerConnection({
        iceServers: ICE_SERVERS,
        iceTransportPolicy: 'all',
        bundlePolicy: 'max-bundle',
        rtcpMuxPolicy: 'require',
        iceCandidatePoolSize: 10,
      });
      pcRef.current = pc;

      // ── ICEエラーログ ──
      pc.onicecandidateerror = (ev) => {
        const msg = `ICEエラー ${ev.errorCode}: ${ev.url}`;
        console.warn('[WebRTC]', msg);
        reportStatus('ice_error', msg);
      };
      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE gathering:', pc.iceGatheringState);
      };

      // ── ローカルトラック追加（スマホ対応: audio/video 両方確認）──
      const tracks = localStream.getTracks();
      if (tracks.length === 0) {
        reportStatus('error', 'カメラ・マイクが取得できていません');
        return;
      }
      tracks.forEach(track => {
        pc.addTrack(track, localStream);
        console.log('[WebRTC] 📹 Added local track:', track.kind, track.enabled);
      });

      // ── リモートトラック受信 ──
      pc.ontrack = (event) => {
        if (cleanedUpRef.current) return;
        const videoEl = remoteVideoRef.current;
        if (!videoEl) return;
        if (!videoEl.srcObject) videoEl.srcObject = new MediaStream();
        event.streams[0]?.getTracks().forEach(t => videoEl.srcObject.addTrack(t));
        // iOS Safari: muted=false + play() が必須
        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.play().catch(e => console.warn('[WebRTC] video.play() failed:', e.message));
        reportStatus('track_received', event.track.kind);
        console.log('[WebRTC] ✅ Remote track received:', event.track.kind);
      };

      // ── 接続状態監視 ──
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] connectionState:', state);

        if (state === 'connected') {
          reportStatus('connected', '映像・音声接続完了');
          onReconnected?.();
          retryCountRef.current = 0; // 成功したらリトライカウントリセット
        } else if (state === 'failed') {
          reportStatus('failed', 'ICE接続失敗（NAT超えに失敗）');
          onReconnecting?.();
          // 自動リトライ
          scheduleRetry(attemptNum, 'ICE connection failed');
        } else if (state === 'disconnected') {
          reportStatus('disconnected', '一時的な切断（回復待ち）');
          onReconnecting?.();
        }
      };

      // ── ICE接続状態もログ ──
      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        console.log('[WebRTC] ICE connection state:', s);
        if (s === 'failed') {
          reportStatus('ice_failed', 'ICEネゴシエーション失敗（STUNタイムアウトの可能性）');
        } else if (s === 'checking') {
          reportStatus('ice_checking', 'ICE経路チェック中...');
        } else if (s === 'connected' || s === 'completed') {
          reportStatus('ice_connected', 'ICE経路確立');
        }
      };

      if (isCaller) {
        return runAsCaller(pc, attemptNum);
      } else {
        return runAsCallee(pc);
      }
    };

    // ── 自動リトライスケジューラ ──
    const scheduleRetry = (lastAttempt, reason) => {
      if (cleanedUpRef.current) return;
      const next = lastAttempt + 1;
      if (next > MAX_RETRIES) {
        reportStatus('give_up', `${MAX_RETRIES}回試行しても接続できませんでした（原因: ${reason}）`);
        toast.error(`接続に失敗しました（${reason}）。通話を終了して再度お試しください。`);
        onReconnectFailed?.();
        return;
      }
      const delay = next * 2000; // 2秒、4秒、6秒
      reportStatus('retrying', `${delay / 1000}秒後に再試行... (${next}/${MAX_RETRIES})`);
      toast.info(`接続を再試行します... (${next}/${MAX_RETRIES})`);
      retryTimerRef.current = setTimeout(() => {
        stopPollingRef.current?.();
        attemptConnection(next).then(fn => { stopPollingRef.current = fn; });
      }, delay);
    };

    // ────────────────────────────────────────────────
    // CALLER
    // ────────────────────────────────────────────────
    const runAsCaller = async (pc, attemptNum) => {
      try {
        // 1. 古いシグナリングをクリア
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: null,
          webrtc_answer: null,
          webrtc_ice_candidates_broadcaster: null,
          webrtc_ice_candidates_viewer: null,
          webrtc_callee_ready: null,
        });
        reportStatus('cleared', 'シグナリングデータをリセット');
        if (cleanedUpRef.current) return;

        // 2. Calleeのready購読で即検知
        reportStatus('waiting_callee', 'ライバーの接続準備を待っています...');
        await new Promise((resolve) => {
          let done = false;
          const finish = (reason) => {
            if (done) return;
            done = true;
            console.log('[WebRTC] Callee ready:', reason);
            resolve();
          };

          base44.entities.VideoCall.filter({ id: call.id }).then(calls => {
            if (calls[0]?.webrtc_callee_ready) finish('already_ready');
          }).catch(() => {});

          const unsub = base44.entities.VideoCall.subscribe((ev) => {
            if (ev.id !== call.id && ev.data?.id !== call.id) return;
            if (ev.data?.webrtc_callee_ready) { unsub(); finish('subscribe'); }
          });

          setTimeout(() => { unsub(); finish('timeout'); }, CALLEE_READY_TIMEOUT_MS);
        });

        if (cleanedUpRef.current) return;
        reportStatus('offering', 'Offerを作成中（ICE収集待ち）...');

        // 3. Offer作成 → ICE収集完了待ち
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);
        if (cleanedUpRef.current) return;

        const iceCount = pc.localDescription?.sdp?.match(/a=candidate/g)?.length || 0;
        console.log('[WebRTC] ICE candidates in SDP:', iceCount);
        if (iceCount === 0) {
          reportStatus('warning', 'ICE候補が0件です（STUN到達不可の可能性）');
        }

        // 4. Offer一括送信
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: JSON.stringify(pc.localDescription),
        });
        reportStatus('offer_sent', `Offer送信完了（ICE候補: ${iceCount}件）`);

        // 5. Answer待ち
        let answered = false;
        const handleAnswer = async (answerJson) => {
          if (answered || pc.remoteDescription !== null || cleanedUpRef.current) return;
          answered = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(answerJson)));
            reportStatus('answer_applied', 'Answer受信・適用完了');
          } catch (e) {
            reportStatus('error', `Answer適用失敗: ${e.message}`);
            answered = false;
          }
        };

        const unsubAnswer = base44.entities.VideoCall.subscribe(async (ev) => {
          if (cleanedUpRef.current) { unsubAnswer(); return; }
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          if (ev.data?.webrtc_answer) await handleAnswer(ev.data.webrtc_answer);
        });

        let elapsed = 0;
        const pollAnswer = setInterval(async () => {
          if (cleanedUpRef.current || answered) { clearInterval(pollAnswer); return; }
          elapsed += 1000;
          if (elapsed >= ANSWER_TIMEOUT_MS) {
            clearInterval(pollAnswer);
            reportStatus('answer_timeout', `${ANSWER_TIMEOUT_MS / 1000}秒以内にAnswerが届かなかった`);
            scheduleRetry(attemptNum, 'Answer timeout');
            return;
          }
          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            if (calls[0]?.webrtc_answer) {
              clearInterval(pollAnswer);
              await handleAnswer(calls[0].webrtc_answer);
            }
          } catch {}
        }, 1000);

        return () => { clearInterval(pollAnswer); unsubAnswer(); };
      } catch (e) {
        reportStatus('error', `Caller例外: ${e.message}`);
        scheduleRetry(attemptNum, e.message);
      }
    };

    // ────────────────────────────────────────────────
    // CALLEE（スマホ優先: タイムアウトを短く＋即座にAnswer）
    // ────────────────────────────────────────────────
    const runAsCallee = async (pc) => {
      try {
        // 1. readyフラグを即座にセット（スマホは処理が遅いので最初に立てる）
        await base44.entities.VideoCall.update(call.id, { webrtc_callee_ready: true });
        reportStatus('callee_ready', 'Offerを待機中...');

        let offerApplied = false;

        const handleOffer = async (offerJson) => {
          if (offerApplied || pc.remoteDescription !== null || cleanedUpRef.current) return;
          offerApplied = true;
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(offerJson)));
            reportStatus('offer_received', 'Offer受信・適用完了');

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            reportStatus('answering', 'Answer作成・ICE収集中...');
            await waitForIceGathering(pc);
            if (cleanedUpRef.current) return;

            const iceCount = pc.localDescription?.sdp?.match(/a=candidate/g)?.length || 0;
            await base44.entities.VideoCall.update(call.id, {
              webrtc_answer: JSON.stringify(pc.localDescription),
            });
            reportStatus('answer_sent', `Answer送信完了（ICE候補: ${iceCount}件）`);
          } catch (e) {
            reportStatus('error', `Offer処理失敗: ${e.message}`);
            offerApplied = false;
          }
        };

        const unsubOffer = base44.entities.VideoCall.subscribe(async (ev) => {
          if (cleanedUpRef.current) { unsubOffer(); return; }
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          if (ev.data?.webrtc_offer) await handleOffer(ev.data.webrtc_offer);
        });

        // ポーリング（スマホはsubscribeが遅いことがあるので必須）
        let elapsed = 0;
        const pollOffer = setInterval(async () => {
          if (cleanedUpRef.current || offerApplied) { clearInterval(pollOffer); return; }
          elapsed += 1000;
          if (elapsed >= OFFER_TIMEOUT_MS) {
            clearInterval(pollOffer);
            reportStatus('offer_timeout', `${OFFER_TIMEOUT_MS / 1000}秒以内にOfferが届かなかった（CallerがまだOfferを送っていない可能性）`);
            toast.error('接続タイムアウト。通話を一度終了して再度お試しください。');
            return;
          }
          try {
            const calls = await base44.entities.VideoCall.filter({ id: call.id });
            if (calls[0]?.webrtc_offer) {
              clearInterval(pollOffer);
              await handleOffer(calls[0].webrtc_offer);
            }
          } catch {}
        }, 1000);

        return () => { clearInterval(pollOffer); unsubOffer(); };
      } catch (e) {
        reportStatus('error', `Callee例外: ${e.message}`);
      }
    };

    // ── 初回接続開始 ──
    attemptConnection(1).then(fn => { stopPollingRef.current = fn; });

    return () => {
      cleanedUpRef.current = true;
      clearTimeout(retryTimerRef.current);
      stopPollingRef.current?.();
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, [enabled, call?.id, localStream, user?.email]);
}