import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

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

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const token = user.email === call.caller_email
      ? call.chime_attendee_caller
      : call.chime_attendee_callee;

    if (!token) {
      console.error('[IVS Stages] ❌ No token available');
      return;
    }

    cancelledRef.current = false;

    const run = async () => {
      try {
        const IVS = window.IVSBroadcastClient;
        if (!IVS) { console.error('[IVS Stages] ❌ SDK not loaded'); return; }

        const { Stage, LocalStageStream, SubscribeType, StageEvents } = IVS;

        const vt = localStream.getVideoTracks()[0];
        const at = localStream.getAudioTracks()[0];

        const streams = [];
        if (at) { at.enabled = true; streams.push(new LocalStageStream(at)); }
        if (vt) { streams.push(new LocalStageStream(vt)); }

        const strategy = {
          stageStreamsToPublish() { return streams; },
          shouldPublishParticipant() { return true; },
          shouldSubscribeToParticipant(p) {
            return p.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO;
          },
        };

        const stage = new Stage(token, strategy);

        stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, stageStreams) => {
          if (participant.isLocal || cancelledRef.current) return;
          const videoEl = remoteVideoRef.current;
          if (!videoEl) return;

          const ms = new MediaStream();
          stageStreams.forEach(s => {
            if (s.mediaStreamTrack) ms.addTrack(s.mediaStreamTrack);
          });

          videoEl.srcObject = ms;
          videoEl.muted = false;
          videoEl.volume = 1.0;
          // iOS対応: 自動再生にはmutedが必須なため、再度assignして確保
          videoEl.onloadedmetadata = () => {
            if (videoEl.play) videoEl.play().catch(() => {});
          };
          if (videoEl.readyState >= 1) videoEl.play().catch(() => {});
          console.log('[IVS Stages] ✅ Remote video attached');
        });

        stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
          console.log('[IVS Stages] state:', state);
        });

        stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, p => {
          console.log('[IVS Stages] 👤 Joined:', p.id, 'local:', p.isLocal);
        });

        console.log('[IVS Stages] ⏳ joining...');
        await stage.join();

        if (!cancelledRef.current) {
          stageRef.current = stage;
          console.log('[IVS Stages] ✅ joined OK');
        } else {
          stage.leave();
        }
      } catch (e) {
        console.error('[IVS Stages] ❌', e.message);
      }
    };

    run();

    return () => {
      cancelledRef.current = true;
      if (stageRef.current) {
        stageRef.current.leave();
        stageRef.current = null;
      }
    };
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}