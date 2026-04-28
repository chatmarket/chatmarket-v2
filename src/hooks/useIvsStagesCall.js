import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * ████████████████████████████████████████████████████████████
 * ██  ██████  FROZEN — PRODUCTION LOCKED  ██████            ██
 * ██  実装完了日: 2026-04-28                                  ██
 * ██  検証済み: IVS Stages トークン生成 + 再接続ロジック      ██
 * ██                                                          ██
 * ██  変更禁止項目:                                           ██
 * ██    - 接続方式 (IVS Stages / Stage ARN)                  ██
 * ██    - onReconnecting / onReconnected / onReconnectFailed  ██
 * ██    - 指数バックオフ再接続ロジック (最大5回)              ██
 * ██    - トークンフィールド名 (chime_attendee_*)             ██
 * ██                                                          ██
 * ██  変更する場合は必ずレビュー・承認を経ること。            ██
 * ████████████████████████████████████████████████████████████
 *
 * IVS Stages を使った1対1ビデオ通話フック
 *
 * - window.IVSBroadcastClient は index.html で読み込み済み
 * - トークンは VideoCall.chime_attendee_caller / chime_attendee_callee に格納
 * - リモート映像を remoteVideoRef.current.srcObject にバインドする
 * - 切断時は最大5回・指数バックオフで自動再接続する
 * - onReconnecting(attempt) / onReconnected / onReconnectFailed コールバックで状態通知
 */
export function useIvsStagesCall({ call, localStream, remoteVideoRef, user, enabled, onReconnecting, onReconnected, onReconnectFailed }) {
  const stageRef = useRef(null);
  const cancelledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);

  const MAX_RECONNECT_ATTEMPTS = 5;

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (stageRef.current) {
      stageRef.current.leave().catch(() => {});
      stageRef.current = null;
      console.log('[IVS Stages] 🔒 Left stage (cleanup)');
    }
  }, []);

  const join = useCallback(async (stagesToken, IVSClient, isReconnect = false) => {
    if (cancelledRef.current) return;

    try {
      const attempt = reconnectAttemptRef.current;
      console.log(`[IVS Stages] 🚀 ${isReconnect ? `再接続 attempt ${attempt}` : 'Joining'}. User:`, user.email, '| Token prefix:', stagesToken.slice(0, 20) + '...');

      const Stage = IVSClient.Stage;
      const LocalStageStream = IVSClient.LocalStageStream;
      const SubscribeType = IVSClient.SubscribeType;
      const StageEvents = IVSClient.StageEvents;

      console.log('[IVS Stages] 🔍 API check:', {
        Stage: typeof Stage,
        LocalStageStream: typeof LocalStageStream,
        SubscribeType: typeof SubscribeType,
        StageEvents: typeof StageEvents,
      });

      if (!Stage || !LocalStageStream || !StageEvents) {
        console.error('[IVS Stages] ❌ Required Stages API classes missing from SDK!');
        console.error('[IVS Stages] SDK keys available:', Object.keys(IVSClient).join(', '));
        return;
      }

      // ローカルトラックをラップ（readyState=live のトラックのみ追加）
      const localStreams = [];
      const vt = localStream.getVideoTracks()[0];
      const at = localStream.getAudioTracks()[0];

      console.log('[IVS Stages] 📹 Adding tracks to publish:', {
        video: vt ? `${vt.label} [${vt.readyState}]` : 'none',
        audio: at ? `${at.label} [${at.readyState}]` : 'none',
      });

      if (vt && vt.readyState === 'live') {
        localStreams.push(new LocalStageStream(vt));
        console.log('[IVS Stages] ✅ Video track added to publish');
      } else {
        console.warn('[IVS Stages] ⚠️ Video track not live, skipping:', vt?.readyState);
      }
      if (at && at.readyState === 'live') {
        localStreams.push(new LocalStageStream(at));
        console.log('[IVS Stages] ✅ Audio track added to publish');
      } else {
        console.warn('[IVS Stages] ⚠️ Audio track not live, skipping:', at?.readyState);
      }

      if (localStreams.length === 0) {
        console.error('[IVS Stages] ❌ No live tracks to publish! Aborting join.');
        return;
      }

      const strategy = {
        stageStreamsToPublish: () => localStreams,
        shouldPublishParticipant: () => true,
        shouldSubscribeToParticipant: (participant) => {
          console.log('[IVS Stages] shouldSubscribeToParticipant:', participant.id, 'isLocal:', participant.isLocal);
          return participant.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO;
        },
      };

      const stage = new Stage(stagesToken, strategy);

      // リモートストリームを受信 → video 要素にバインド
      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
        console.log('[IVS Stages] STREAMS_ADDED:', { participantId: participant.id, isLocal: participant.isLocal, streamCount: streams.length });
        if (participant.isLocal || cancelledRef.current) return;

        const mediaStream = new MediaStream();
        streams.forEach(s => {
          console.log('[IVS Stages] Stream track:', s.streamType, s.mediaStreamTrack?.kind, s.mediaStreamTrack?.readyState);
          if (s.mediaStreamTrack) mediaStream.addTrack(s.mediaStreamTrack);
        });

        const videoEl = remoteVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          // スマホ対応: muted不要・再生保証
          videoEl.muted = false;
          videoEl.volume = 1.0;
          const playPromise = videoEl.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => console.log('[IVS Stages] ✅ Remote video playing. Video tracks exchanged successfully on mobile.'))
              .catch(e => {
                console.warn('[IVS Stages] ⚠️ Remote video play() failed (user gesture needed?):', e.name, e.message);
                // autoplay blocked: ユーザーの操作後に再試行
                document.addEventListener('click', () => videoEl.play().catch(() => {}), { once: true });
                document.addEventListener('touchstart', () => videoEl.play().catch(() => {}), { once: true });
              });
          }
          console.log('[IVS Stages] ✅ srcObject set on remoteVideoRef, tracks:', mediaStream.getTracks().length);
        } else {
          console.error('[IVS Stages] ❌ remoteVideoRef.current is null — cannot display remote video!');
        }
      });

      // 接続状態変化
      stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
        console.log('[IVS Stages] 🔄 Connection state changed:', state);

        if ((state === 'disconnected' || state === 'failed') && !cancelledRef.current) {
          console.warn('[IVS Stages] ⚠️ Disconnected. Scheduling reconnect...');
          stageRef.current = null;
          scheduleReconnect(stagesToken, IVSClient);
        }

        if (state === 'connected') {
          console.log('[IVS Stages] ✅ Stage connected!', isReconnect ? '(reconnect)' : '(initial)');
          if (isReconnect) {
            reconnectAttemptRef.current = 0;
            onReconnected?.();
            toast.success('通話に再接続しました');
          }
        }
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (p) => {
        console.log('[IVS Stages] 👤 Participant joined:', p.id, '| isLocal:', p.isLocal);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (p) => {
        console.log('[IVS Stages] 👋 Participant left:', p.id);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_PUBLISH_STATE_CHANGED, (p, state) => {
        console.log('[IVS Stages] 📡 Publish state changed:', p.id, state);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_SUBSCRIBE_STATE_CHANGED, (p, state) => {
        console.log('[IVS Stages] 📥 Subscribe state changed:', p.id, state);
      });

      console.log('[IVS Stages] ⏳ Calling stage.join()...');
      await stage.join();

      if (!cancelledRef.current) {
        stageRef.current = stage;
        reconnectAttemptRef.current = 0;
        console.log('[IVS Stages] ✅ stage.join() completed. Waiting for remote participant...');
      } else {
        stage.leave().catch(() => {});
      }
    } catch (e) {
      console.error('[IVS Stages] ❌ Join error:', e.name, e.message, e.stack);
      if (!cancelledRef.current) {
        scheduleReconnect(stagesToken, IVSClient);
      }
    }
  }, [localStream, user, remoteVideoRef, onReconnected]);

  const scheduleReconnect = useCallback((stagesToken, IVSClient) => {
    if (cancelledRef.current) return;

    reconnectAttemptRef.current += 1;
    const attempt = reconnectAttemptRef.current;

    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      console.error('[IVS Stages] ❌ Max reconnect attempts reached. Giving up.');
      onReconnectFailed?.();
      toast.error('通話の再接続に失敗しました。通話を終了してください。');
      return;
    }

    // 指数バックオフ: 2s, 4s, 8s, 16s, 30s（max）
    const delayMs = Math.min(2000 * Math.pow(2, attempt - 1), 30000);
    console.log(`[IVS Stages] 🔄 Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs}ms`);

    onReconnecting?.(attempt);
    toast.warning(`再接続中... (${attempt}/${MAX_RECONNECT_ATTEMPTS})`);

    reconnectTimerRef.current = setTimeout(() => {
      join(stagesToken, IVSClient, true);
    }, delayMs);
  }, [join, onReconnecting, onReconnectFailed]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SDK 存在確認 + Stages API の場所を特定
    // amazon-ivs-web-broadcast.js は window.IVSBroadcastClient を公開するが
    // Stages API は IVSBroadcastClient 自体または IVSBroadcastClient.Stage に存在する
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const rawClient = window.IVSBroadcastClient;
    console.log('[IVS Stages] 🔍 window.IVSBroadcastClient:', typeof rawClient);
    console.log('[IVS Stages] 🔍 keys:', rawClient ? Object.keys(rawClient).join(', ') : 'N/A');

    if (!rawClient) {
      console.error('[IVS Stages] ❌ SDK not loaded. Check index.html script tag for amazon-ivs-web-broadcast.js');
      return;
    }

    // Stages API の場所を探す: rawClient.Stage または rawClient 自体
    let IVSClient = rawClient;
    if (!rawClient.Stage && !rawClient.StageEvents) {
      console.warn('[IVS Stages] ⚠️ Stage API not found directly on IVSBroadcastClient. Checking sub-properties...');
      // 一部バージョンでは window 直下に Stage が存在する
      if (window.Stage && window.StageEvents) {
        IVSClient = window;
        console.log('[IVS Stages] ✅ Found Stage API on window directly');
      } else {
        console.error('[IVS Stages] ❌ Stage / StageEvents not found anywhere. SDK version mismatch.');
        console.error('[IVS Stages] Available on window:', Object.keys(window).filter(k => k.toLowerCase().includes('ivs') || k.toLowerCase().includes('stage')).join(', '));
        return;
      }
    } else {
      console.log('[IVS Stages] ✅ Stage API found on IVSBroadcastClient');
    }

    const stagesToken = user.email === call.caller_email
      ? call.chime_attendee_caller
      : call.chime_attendee_callee;

    console.log('[IVS Stages] 🔑 Token check:', {
      role: user.email === call.caller_email ? 'caller' : 'callee',
      hasCallerToken: !!call.chime_attendee_caller,
      hasCalleeToken: !!call.chime_attendee_callee,
      tokenPrefix: stagesToken ? stagesToken.slice(0, 30) + '...' : 'NULL',
    });

    if (!stagesToken) {
      console.error('[IVS Stages] ❌ No token available. chime_attendee_caller:', !!call.chime_attendee_caller, '| chime_attendee_callee:', !!call.chime_attendee_callee);
      return;
    }

    // ローカルストリームのトラック状態確認
    const vTracks = localStream.getVideoTracks();
    const aTracks = localStream.getAudioTracks();
    console.log('[IVS Stages] 📹 Local stream track state:', {
      videoTracks: vTracks.length,
      audioTracks: aTracks.length,
      videoEnabled: vTracks[0]?.enabled,
      audioEnabled: aTracks[0]?.enabled,
      videoReadyState: vTracks[0]?.readyState,
      audioReadyState: aTracks[0]?.readyState,
    });

    if (vTracks.length === 0 && aTracks.length === 0) {
      console.error('[IVS Stages] ❌ No local tracks available to publish!');
      return;
    }

    cancelledRef.current = false;
    reconnectAttemptRef.current = 0;

    join(stagesToken, IVSClient, false);

    return cleanup;
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}