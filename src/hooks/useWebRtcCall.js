/**
 * useWebRtcCall — WebRTC P2P 1対1通話フック
 *
 * 設計思想: 速度より確実性を最優先
 * - ICE収集は「完了まで待つ」（早切りしない）
 * - タイムアウトは余裕を持たせる
 * - iOS Safari: muted autoplay → unmute の2段階
 * - 自動リトライ最大3回（2秒・4秒・6秒）
 */
import { useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

const MAX_RETRIES = 3;
const ICE_GATHER_TIMEOUT_MS = 8000;   // 余裕を持たせる（モバイル回線考慮）
const CALLEE_READY_TIMEOUT_MS = 15000;
const ANSWER_TIMEOUT_MS = 30000;
const OFFER_TIMEOUT_MS = 30000;
const POLL_INTERVAL_MS = 500;          // 高速すぎず・遅すぎず

/** ICE収集完了まで待つ */
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
      resolve(); // タイムアウトしても収集済み候補で進む
    }, ICE_GATHER_TIMEOUT_MS);
  });
}

/**
 * iOS Safari 対応 play()
 * muted=true で autoplay してから unmute（音声ブロック回避）
 */
function playRemoteVideo(videoEl) {
  if (!videoEl) return;
  videoEl.muted = true;
  videoEl.play()
    .then(() => {
      setTimeout(() => {
        videoEl.muted = false;
        videoEl.volume = 1.0;
      }, 300);
    })
    .catch(() => {
      // ユーザージェスチャーが必要な端末: muted のまま映像だけ表示
      videoEl.muted = true;
      videoEl.play().catch(() => {});
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
  onStatusChange,
}) {
  const pcRef = useRef(null);
  const cleanedUpRef = useRef(false);
  const retryTimerRef = useRef(null);
  const stopPollingRef = useRef(null);

  const reportStatus = useCallback((status, detail = '') => {
    console.log(`[WebRTC] 📊 ${status}${detail ? ' — ' + detail : ''}`);
    onStatusChange?.(status, detail);
  }, [onStatusChange]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const isCaller = user.email === call.caller_email;
    cleanedUpRef.current = false;

    const attemptConnection = async (attemptNum) => {
      if (cleanedUpRef.current) return;

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

      pc.onicecandidateerror = (ev) => {
        console.warn('[WebRTC] ICE error:', ev.errorCode, ev.url);
      };
      pc.onicegatheringstatechange = () => {
        console.log('[WebRTC] ICE gathering:', pc.iceGatheringState);
        if (pc.iceGatheringState === 'gathering') {
          reportStatus('ice_gathering', 'ICE候補を収集中...');
        }
      };

      // ローカルトラックを全て追加
      const tracks = localStream.getTracks();
      if (tracks.length === 0) {
        reportStatus('error', 'カメラ・マイクが取得できていません');
        return;
      }
      tracks.forEach(track => {
        pc.addTrack(track, localStream);
        console.log('[WebRTC] Added track:', track.kind, 'enabled:', track.enabled);
      });

      // リモートトラック受信
      pc.ontrack = (event) => {
        if (cleanedUpRef.current) return;
        const videoEl = remoteVideoRef.current;
        if (!videoEl) return;

        // ストリームをそのまま srcObject にセット（最もシンプルで確実）
        if (event.streams && event.streams[0]) {
          videoEl.srcObject = event.streams[0];
        } else {
          if (!videoEl.srcObject) videoEl.srcObject = new MediaStream();
          videoEl.srcObject.addTrack(event.track);
        }

        playRemoteVideo(videoEl);
        reportStatus('track_received', event.track.kind);
        console.log('[WebRTC] ✅ Remote track:', event.track.kind);
      };

      // 接続状態
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('[WebRTC] connectionState:', state);
        if (state === 'connected') {
          reportStatus('connected', '映像・音声接続完了');
          onReconnected?.();
        } else if (state === 'failed') {
          reportStatus('failed', 'ICE接続失敗');
          onReconnecting?.();
          scheduleRetry(attemptNum, 'ICE connection failed');
        } else if (state === 'disconnected') {
          reportStatus('disconnected', '一時的な切断（回復待ち）');
          onReconnecting?.();
        }
      };

      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        console.log('[WebRTC] ICE state:', s);
        if (s === 'failed') {
          reportStatus('ice_failed', 'ICEネゴシエーション失敗');
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

    // ── リトライスケジューラ ──
    const scheduleRetry = (lastAttempt, reason) => {
      if (cleanedUpRef.current) return;
      const next = lastAttempt + 1;
      if (next > MAX_RETRIES) {
        reportStatus('give_up', `${MAX_RETRIES}回試行しても接続できませんでした`);
        toast.error(`接続に失敗しました。通話を終了して再度お試しください。`);
        onReconnectFailed?.();
        return;
      }
      const delay = next * 2000;
      reportStatus('retrying', `${delay / 1000}秒後に再試行... (${next}/${MAX_RETRIES})`);
      toast.info(`接続を再試行します... (${next}/${MAX_RETRIES})`);
      retryTimerRef.current = setTimeout(() => {
        stopPollingRef.current?.();
        attemptConnection(next).then(fn => { stopPollingRef.current = fn; });
      }, delay);
    };

    // ────────────────────────────────────────────
    // CALLER
    // ────────────────────────────────────────────
    const runAsCaller = async (pc, attemptNum) => {
      try {
        // 1. シグナリングをクリア
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: null,
          webrtc_answer: null,
          webrtc_ice_candidates_broadcaster: null,
          webrtc_ice_candidates_viewer: null,
          webrtc_callee_ready: null,
        });
        reportStatus('cleared', 'シグナリングデータをリセット');
        if (cleanedUpRef.current) return;

        // 2. Callee の ready を待つ
        reportStatus('waiting_callee', 'ライバーの接続準備を待っています...');
        await new Promise((resolve) => {
          let done = false;
          const finish = (reason) => {
            if (done) return;
            done = true;
            console.log('[WebRTC] Callee ready via:', reason);
            resolve();
          };

          // 即時チェック
          base44.entities.VideoCall.filter({ id: call.id }).then(calls => {
            if (calls[0]?.webrtc_callee_ready) finish('already_ready');
          }).catch(() => {});

          // リアルタイム購読
          const unsub = base44.entities.VideoCall.subscribe((ev) => {
            if (ev.id !== call.id && ev.data?.id !== call.id) return;
            if (ev.data?.webrtc_callee_ready) { unsub(); finish('subscribe'); }
          });

          // ポーリング（バックアップ）
          const poll = setInterval(async () => {
            if (done) { clearInterval(poll); return; }
            try {
              const calls = await base44.entities.VideoCall.filter({ id: call.id });
              if (calls[0]?.webrtc_callee_ready) { clearInterval(poll); unsub(); finish('poll'); }
            } catch {}
          }, POLL_INTERVAL_MS);

          setTimeout(() => {
            clearInterval(poll);
            unsub();
            finish('timeout');
          }, CALLEE_READY_TIMEOUT_MS);
        });

        if (cleanedUpRef.current) return;
        reportStatus('offering', 'Offerを作成中（ICE収集中）...');

        // 3. Offer 作成 → ICE 収集完了まで待つ
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);
        if (cleanedUpRef.current) return;

        const iceCount = pc.localDescription?.sdp?.match(/a=candidate/g)?.length || 0;
        console.log('[WebRTC] ICE candidates in SDP:', iceCount);
        if (iceCount === 0) {
          reportStatus('warning', 'ICE候補が0件です（STUN到達不可の可能性）');
        }

        // 4. Offer 送信
        await base44.entities.VideoCall.update(call.id, {
          webrtc_offer: JSON.stringify(pc.localDescription),
        });
        reportStatus('offer_sent', `Offer送信完了（ICE候補: ${iceCount}件）`);

        // 5. Answer 待ち
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
          elapsed += POLL_INTERVAL_MS;
          if (elapsed >= ANSWER_TIMEOUT_MS) {
            clearInterval(pollAnswer);
            reportStatus('answer_timeout', 'Answerが届きませんでした');
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
        }, POLL_INTERVAL_MS);

        return () => { clearInterval(pollAnswer); unsubAnswer(); };
      } catch (e) {
        reportStatus('error', `Caller例外: ${e.message}`);
        scheduleRetry(attemptNum, e.message);
      }
    };

    // ────────────────────────────────────────────
    // CALLEE（ready フラグを最初に立て、Offer既存時は即処理）
    // ────────────────────────────────────────────
    const runAsCallee = async (pc) => {
      try {
        // ready フラグ書き込みと既存 Offer チェックを並列
        const [, existingCalls] = await Promise.all([
          base44.entities.VideoCall.update(call.id, { webrtc_callee_ready: true }),
          base44.entities.VideoCall.filter({ id: call.id }),
        ]);
        reportStatus('callee_ready', 'Offer待機中...');

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

        // 既に Offer がある場合は即座に処理（待機ゼロ）
        if (existingCalls[0]?.webrtc_offer) {
          await handleOffer(existingCalls[0].webrtc_offer);
          return () => {};
        }

        // リアルタイム購読
        const unsubOffer = base44.entities.VideoCall.subscribe(async (ev) => {
          if (cleanedUpRef.current) { unsubOffer(); return; }
          if (ev.id !== call.id && ev.data?.id !== call.id) return;
          if (ev.data?.webrtc_offer) await handleOffer(ev.data.webrtc_offer);
        });

        // ポーリング（バックアップ）
        let elapsed = 0;
        const pollOffer = setInterval(async () => {
          if (cleanedUpRef.current || offerApplied) { clearInterval(pollOffer); return; }
          elapsed += POLL_INTERVAL_MS;
          if (elapsed >= OFFER_TIMEOUT_MS) {
            clearInterval(pollOffer);
            reportStatus('offer_timeout', 'Offerが届きませんでした');
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
        }, POLL_INTERVAL_MS);

        return () => { clearInterval(pollOffer); unsubOffer(); };
      } catch (e) {
        reportStatus('error', `Callee例外: ${e.message}`);
      }
    };

    // 初回接続開始
    attemptConnection(1).then(fn => { stopPollingRef.current = fn; });

    return () => {
      cleanedUpRef.current = true;
      clearTimeout(retryTimerRef.current);
      stopPollingRef.current?.();
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    };
  }, [enabled, call?.id, localStream, user?.email]);
}