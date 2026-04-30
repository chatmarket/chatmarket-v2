import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

const MAX_RECONNECT_ATTEMPTS = 10;

export function useIvsStagesCall({
  call,
  localStream,
  remoteVideoRef,
  user,
  enabled,
  onReconnecting,
  onReconnected,
  onReconnectFailed,
}) {
  const stageRef = useRef(null);
  const cancelledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const remoteVideoTimeoutRef = useRef(null);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (remoteVideoTimeoutRef.current) clearTimeout(remoteVideoTimeoutRef.current);
    if (stageRef.current) {
      stageRef.current.leave();
      stageRef.current = null;
    }
  }, []);

  const scheduleReconnectRef = useRef(null);

  const join = useCallback(async (stagesToken, isReconnect = false) => {
    if (cancelledRef.current) return;

    try {
      console.log(`[IVS Stages] 🚀 ${isReconnect ? 'Reconnect' : 'Joining'} as ${user?.email}`);

      const { Stage, LocalStageStream, SubscribeType, StageEvents } = window.IVSBroadcastClient;

      const vt = localStream?.getVideoTracks()[0];
      const at = localStream?.getAudioTracks()[0];

      if (!vt && !at) {
        console.error('[IVS Stages] ❌ No tracks');
        return;
      }

      // Create streams
      const publishStreams = [];
      if (at) {
        at.enabled = true;
        publishStreams.push(new LocalStageStream(at));
      }
      if (vt) {
        publishStreams.push(new LocalStageStream(vt));
      }

      const strategy = {
        stageStreamsToPublish: () => publishStreams,
        shouldPublishParticipant: () => true,
        shouldSubscribeToParticipant: (p) => p.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO,
      };

      const stage = new Stage(stagesToken, strategy);

      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
        if (participant.isLocal || cancelledRef.current) return;

        const videoEl = remoteVideoRef.current;
        if (!videoEl) return;

        let mediaStream = videoEl.srcObject instanceof MediaStream ? videoEl.srcObject : new MediaStream();
        streams.forEach(s => {
          const track = s.mediaStreamTrack;
          if (track && !mediaStream.getTracks().find(t => t.id === track.id)) {
            mediaStream.addTrack(track);
          }
        });

        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.srcObject = mediaStream;
        videoEl.play().catch(() => {});
        console.log('[IVS Stages] ✅ Remote video attached');
      });

      stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
        if ((state === 'disconnected' || state === 'failed') && !cancelledRef.current) {
          stageRef.current = null;
          scheduleReconnectRef.current?.();
        }
        if (state === 'connected') {
          if (isReconnect) { reconnectAttemptRef.current = 0; onReconnected?.(); toast.success('再接続成功'); }
        }
      });

      console.log('[IVS Stages] ⏳ Joining...');
      await stage.join();

      if (!cancelledRef.current) {
        stageRef.current = stage;
        console.log('[IVS Stages] ✅ Connected');
        remoteVideoTimeoutRef.current = setTimeout(() => {
          if (!cancelledRef.current) scheduleReconnectRef.current?.();
        }, 30000);
      } else {
        stage.leave();
      }
    } catch (e) {
      console.error('[IVS Stages] ❌ Error:', e.message);
      if (!cancelledRef.current) scheduleReconnectRef.current?.();
    }
  }, [localStream, user, remoteVideoRef, onReconnected]);

  const scheduleReconnect = useCallback(() => {
    if (cancelledRef.current) return;
    reconnectAttemptRef.current += 1;

    if (reconnectAttemptRef.current > MAX_RECONNECT_ATTEMPTS) {
      onReconnectFailed?.();
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current - 1), 30000);
    if (reconnectAttemptRef.current <= 3) onReconnecting?.(reconnectAttemptRef.current);

    reconnectTimerRef.current = setTimeout(() => {
      join(call?.chime_attendee_caller || call?.chime_attendee_callee, true);
    }, delay);
  }, [join, onReconnecting, onReconnectFailed, call?.chime_attendee_caller, call?.chime_attendee_callee]);

  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const token = user.email === call.caller_email ? call.chime_attendee_caller : call.chime_attendee_callee;
    if (!token) return;

    cancelledRef.current = false;
    reconnectAttemptRef.current = 0;
    join(token, false);

    return cleanup;
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email, join, cleanup]);
}