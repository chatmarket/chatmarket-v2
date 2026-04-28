import { useEffect, useRef } from 'react';

/**
 * ██████████████████████████████████████████████████████
 * ██  FROZEN — DO NOT MODIFY                          ██
 * ██  IVS Stages 1対1通話フック（凍結済み）            ██
 * ██  接続方式の変更は一切禁止。承認なく変更不可。      ██
 * ██████████████████████████████████████████████████████
 *
 * IVS Stages を使った1対1ビデオ通話フック
 *
 * - window.IVSBroadcastClient は index.html で読み込み済み
 * - トークンは VideoCall.chime_attendee_caller / chime_attendee_callee に格納
 * - リモート映像を remoteVideoRef.current.srcObject にバインドする
 */
export function useIvsStagesCall({ call, localStream, remoteVideoRef, user, enabled }) {
  const stageRef = useRef(null);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const IVSClient = window.IVSBroadcastClient;
    if (!IVSClient) {
      console.warn('[IVS Stages] SDK not available (window.IVSBroadcastClient undefined). Check index.html script tag.');
      return;
    }

    // caller / callee それぞれ自分のトークンを使う
    const stagesToken = user.email === call.caller_email
      ? call.chime_attendee_caller
      : call.chime_attendee_callee;

    if (!stagesToken) {
      console.warn('[IVS Stages] No token in VideoCall record. Fields: chime_attendee_caller / chime_attendee_callee must be set before joining.');
      return;
    }

    let cancelled = false;

    const join = async () => {
      try {
        console.log('[IVS Stages] 🚀 Joining. User:', user.email, '| Token prefix:', stagesToken.slice(0, 20) + '...');

        const { Stage, LocalStageStream, SubscribeType, StageEvents, StreamType } = IVSClient;

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
          if (participant.isLocal || cancelled) return;
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
            console.warn('[IVS Stages] ⚠️ remoteVideoRef.current is null — cannot bind srcObject');
          }
        });

        stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
          console.log('[IVS Stages] Connection state changed:', state);
        });

        stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (p) => {
          console.log('[IVS Stages] Participant joined:', p.id, '| isLocal:', p.isLocal);
        });

        stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (p) => {
          console.log('[IVS Stages] Participant left:', p.id);
        });

        await stage.join();
        if (!cancelled) {
          stageRef.current = stage;
          console.log('[IVS Stages] ✅ Joined stage successfully');
        } else {
          // cleanup中にjoinが完了した場合は即leave
          stage.leave().catch(() => {});
        }
      } catch (e) {
        console.error('[IVS Stages] ❌ Join error:', e.message, e);
      }
    };

    join();

    return () => {
      cancelled = true;
      if (stageRef.current) {
        stageRef.current.leave().catch(() => {});
        stageRef.current = null;
        console.log('[IVS Stages] 🔒 Left stage (cleanup)');
      }
    };
  }, [enabled, call?.id, call?.status, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}