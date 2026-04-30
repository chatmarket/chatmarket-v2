import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * useIvsLiveStream
 * 1対多数ライブ配信用Hookの独立版
 * マスター: useIvsStagesCall.js は本ファイルと別線路（1対1は変更禁止）
 * 
 * 1対多数特有の設定:
 * - ライバー: audio + video を配信
 * - 視聴者: マイクオフ固定・ライバー映像のみ受信
 */
export function useIvsLiveStream({
  stream, // ライブストリーム entity
  localStream, // ライバーのメディアストリーム
  remoteVideoRef, // 視聴者用映像表示
  user, // 現在のユーザー（ライバー or 視聴者）
  enabled,
  userRole, // "broadcaster" | "viewer"
  onBroadcasterJoined,
  onViewerJoined,
  onStreamError,
}) {
  const stageRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled || !stream || !user) return;

    const token = stream.chime_attendee_id; // ライブストリーム用トークン

    if (!token) {
      console.error('[IVS LiveStream] ❌ No token available');
      onStreamError?.('No token');
      return;
    }

    cancelledRef.current = false;

    const run = async () => {
      try {
        const IVS = window.IVSBroadcastClient;
        if (!IVS) { 
          console.error('[IVS LiveStream] ❌ SDK not loaded');
          onStreamError?.('SDK not loaded');
          return;
        }

        const { Stage, LocalStageStream, SubscribeType, StageEvents } = IVS;

        let streams = [];

        // ──────────────────────────────────────────────────────────
        // ライバー: audio + video を配信
        // ──────────────────────────────────────────────────────────
        if (userRole === 'broadcaster' && localStream) {
          const vt = localStream.getVideoTracks()[0];
          const at = localStream.getAudioTracks()[0];

          if (at) { at.enabled = true; streams.push(new LocalStageStream(at)); }
          if (vt) { streams.push(new LocalStageStream(vt)); }
          console.log('[IVS LiveStream] 🎙️ Broadcaster mode: audio + video enabled');
        }

        // ──────────────────────────────────────────────────────────
        // 視聴者: マイク無し・ ライバー映像のみ受信
        // ──────────────────────────────────────────────────────────
        if (userRole === 'viewer') {
          console.log('[IVS LiveStream] 👁️ Viewer mode: receive-only');
        }

        const strategy = {
          stageStreamsToPublish() { 
            return userRole === 'broadcaster' ? streams : []; // 視聴者は配信なし
          },
          shouldPublishParticipant() { 
            return userRole === 'broadcaster'; // ライバーのみ配信
          },
          shouldSubscribeToParticipant(p) {
            // 視聴者は全員の映像を受信、ライバーは他のライバーのみ受信
            return p.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO;
          },
        };

        const stage = new Stage(token, strategy);

        stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, stageStreams) => {
          if (participant.isLocal || cancelledRef.current) return;

          console.log('[IVS LiveStream] 🎬 Participant streams added:', participant.id, 'isLocal:', participant.isLocal);

          // 視聴者向け: ライバー映像を表示
          if (remoteVideoRef?.current) {
            const videoEl = remoteVideoRef.current;
            const ms = new MediaStream();
            stageStreams.forEach(s => {
              if (s.mediaStreamTrack) ms.addTrack(s.mediaStreamTrack);
            });

            videoEl.srcObject = ms;
            videoEl.muted = false;
            videoEl.volume = 1.0;
            // iOS対応
            videoEl.onloadedmetadata = () => {
              if (videoEl.play) videoEl.play().catch(() => {});
            };
            if (videoEl.readyState >= 1) videoEl.play().catch(() => {});
            console.log('[IVS LiveStream] ✅ Broadcaster video attached');
          }

          onBroadcasterJoined?.(participant);
        });

        stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
          console.log('[IVS LiveStream] 🔌 Connection state:', state);
        });

        stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, p => {
          console.log('[IVS LiveStream] 👤 Participant joined:', p.id, 'isLocal:', p.isLocal);
          if (!p.isLocal) onViewerJoined?.(p);
        });

        console.log(`[IVS LiveStream] ⏳ joining as ${userRole}...`);
        await stage.join();

        if (!cancelledRef.current) {
          stageRef.current = stage;
          console.log('[IVS LiveStream] ✅ joined OK');
        } else {
          stage.leave();
        }
      } catch (e) {
        console.error('[IVS LiveStream] ❌', e.message);
        onStreamError?.(e.message);
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
  }, [enabled, stream?.id, stream?.chime_attendee_id, localStream, user?.email, userRole]);
}