import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * ██████████████████████████████████████████████████████
 * ██  FROZEN — DO NOT MODIFY (接続方式)               ██
 * ██  IVS Stages 1対1通話フック                        ██
 * ██  再接続ロジック追加 2026-04-28                     ██
 * ██  接続方式・Stage ARN の変更は承認なく禁止。        ██
 * ██████████████████████████████████████████████████████
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

      const { Stage, LocalStageStream, SubscribeType, StageEvents } = IVSClient;

      // ローカルトラックをラップ
      const localStreams = [];
      const vt = localStream.getVideoTracks()[0];
      const at = localStream.getAudioTracks()[0];
      if (vt) localStreams.push(new LocalStageStream(vt));
      if (at) localStreams.push(new LocalStageStream(at));

      const strategy = {
        stageStreamsToPublish: () => localStreams,
        shouldPublishParticipant: () => true,
        shouldSubscribeToParticipant: (participant) =>
          participant.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO,
      };

      const stage = new Stage(stagesToken, strategy);

      // リモートストリームを受信 → video 要素にバインド
      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
        if (participant.isLocal || cancelledRef.current) return;
        console.log('[IVS Stages] ✅ Remote streams received:', streams.length);

        const mediaStream = new MediaStream();
        streams.forEach(s => {
          if (s.mediaStreamTrack) mediaStream.addTrack(s.mediaStreamTrack);
        });

        const videoEl = remoteVideoRef.current;
        if (videoEl) {
          videoEl.srcObject = mediaStream;
          videoEl.play().catch(() => {});
          console.log('[IVS Stages] ✅ srcObject set on remoteVideoRef');
        } else {
          console.warn('[IVS Stages] ⚠️ remoteVideoRef.current is null');
        }
      });

      // 接続状態変化 → 切断検知 → 自動再接続
      stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
        console.log('[IVS Stages] Connection state:', state);

        if ((state === 'disconnected' || state === 'failed') && !cancelledRef.current) {
          console.warn('[IVS Stages] ⚠️ Disconnected. Scheduling reconnect...');
          stageRef.current = null;
          scheduleReconnect(stagesToken, IVSClient);
        }

        if (state === 'connected' && isReconnect) {
          console.log('[IVS Stages] ✅ Reconnected successfully');
          reconnectAttemptRef.current = 0;
          onReconnected?.();
          toast.success('通話に再接続しました');
        }
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (p) => {
        console.log('[IVS Stages] Participant joined:', p.id, '| isLocal:', p.isLocal);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (p) => {
        console.log('[IVS Stages] Participant left:', p.id);
      });

      await stage.join();

      if (!cancelledRef.current) {
        stageRef.current = stage;
        reconnectAttemptRef.current = 0;
        console.log('[IVS Stages] ✅ Joined stage successfully');
      } else {
        stage.leave().catch(() => {});
      }
    } catch (e) {
      console.error('[IVS Stages] ❌ Join error:', e.message);
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

    const IVSClient = window.IVSBroadcastClient;
    if (!IVSClient) {
      console.warn('[IVS Stages] SDK not available. Check index.html script tag.');
      return;
    }

    const stagesToken = user.email === call.caller_email
      ? call.chime_attendee_caller
      : call.chime_attendee_callee;

    if (!stagesToken) {
      console.warn('[IVS Stages] No token in VideoCall record (chime_attendee_caller / chime_attendee_callee).');
      return;
    }

    cancelledRef.current = false;
    reconnectAttemptRef.current = 0;

    join(stagesToken, IVSClient, false);

    return cleanup;
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}