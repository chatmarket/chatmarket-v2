import React, { useEffect, useRef, useState } from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  VideoTileState,
} from 'amazon-chime-sdk-js';

/**
 * ChimeVideoCall - Amazon Chime SDK によるビデオ通話エンジン
 * ローカル映像 → localVideoRef
 * リモート映像 → remoteVideoRef
 */
export default function ChimeVideoCall({
  meetingResponse,
  attendeeResponse,
  localVideoRef,
  remoteVideoRef,
  micEnabled = true,
  camEnabled = true,
  onConnected,
}) {
  const sessionRef = useRef(null);
  const localTileIdRef = useRef(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!meetingResponse || !attendeeResponse) return;

    let mounted = true;
    const logger = new ConsoleLogger('Chime', LogLevel.INFO);
    const deviceController = new DefaultDeviceController(logger);
    const configuration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);
    const session = new DefaultMeetingSession(configuration, logger, deviceController);
    sessionRef.current = session;
    const audioVideo = session.audioVideo;

    const observer = {
      videoTileDidUpdate: (tileState) => {
        if (!mounted) return;
        console.log('[Chime] videoTileDidUpdate:', {
          tileId: tileState.tileId,
          localTile: tileState.localTile,
          isContent: tileState.isContent,
          boundAttendeeId: tileState.boundAttendeeId,
          active: tileState.active,
        });

        if (tileState.localTile) {
          // ローカル映像
          localTileIdRef.current = tileState.tileId;
          if (localVideoRef?.current) {
            audioVideo.bindVideoElement(tileState.tileId, localVideoRef.current);
            console.log('[Chime] ✓ Local video bound to tileId:', tileState.tileId);
          } else {
            console.warn('[Chime] ⚠️ localVideoRef is null!');
          }
        } else if (!tileState.isContent) {
          // ★ リモート映像 - 配信者 ID（boundAttendeeId）と一致したら即座にバインド
          const broadcasterAttendeeId = sessionStorage.getItem('broadcasterAttendeeId');
          if (broadcasterAttendeeId && tileState.boundAttendeeId === broadcasterAttendeeId) {
            // ★ 配信者の映像タイル確定 → 迷わずバインド
            console.log('[Chime] 🎯 Broadcaster tile identified, binding immediately...');
            if (remoteVideoRef?.current) {
              audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
              console.log('[Chime] ✓ Broadcaster video bound to tileId:', tileState.tileId);
              onConnected?.();
            } else {
              console.warn('[Chime] ⚠️ remoteVideoRef is null, retrying...');
              const retryBind = () => {
                if (remoteVideoRef?.current) {
                  audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
                  console.log('[Chime] ✓ Broadcaster video bound (retry) to tileId:', tileState.tileId);
                  onConnected?.();
                } else {
                  setTimeout(retryBind, 500);
                }
              };
              retryBind();
            }
          } else {
            // 配信者特定待機中 → バインドせず様子見
            console.log('[Chime] 👥 Remote tile detected (not broadcaster), waiting...');
          }
        }
      },
      videoTileWasRemoved: (tileId) => {
        console.log('[Chime] videoTileWasRemoved:', tileId);
      },
      audioVideoDidStart: () => {
        console.log('[Chime] ✓ audioVideoDidStart');
      },
      audioVideoDidStop: (sessionStatus) => {
        console.log('[Chime] audioVideoDidStop, status:', sessionStatus?.statusCode());
      },
      connectionDidBecomePoor: () => {
        console.warn('[Chime] ⚠️ Connection poor');
      },
      connectionDidBecomeGood: () => {
        console.log('[Chime] ✓ Connection good');
      },
    };

    audioVideo.addObserver(observer);

    const start = async () => {
      try {
        // 音声デバイス
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (audioInputs.length > 0) {
          await audioVideo.startAudioInput(audioInputs[0].deviceId);
          console.log('[Chime] ✓ Audio input:', audioInputs[0].label);
        }

        // ビデオデバイス
        const videoInputs = await audioVideo.listVideoInputDevices();
        if (videoInputs.length > 0) {
          await audioVideo.startVideoInput(videoInputs[0].deviceId);
          console.log('[Chime] ✓ Video input:', videoInputs[0].label);
        }

        // 音声出力
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
        audioVideo.bindAudioElement(audioEl);

        // セッション開始
        await audioVideo.start();
        console.log('[Chime] ✓ Session started');

        // マイクを強制ON（ライバー側でミュートになる問題を防止）
        audioVideo.realtimeUnmuteLocalAudio();
        console.log('[Chime] ✓ Mic force-unmuted');

        // ローカルビデオタイル開始
        audioVideo.startLocalVideoTile();
        console.log('[Chime] ✓ Local video tile started');

      } catch (err) {
        console.error('[Chime] ❌ Start failed:', err.message);
        if (mounted) setError(err.message);
      }
    };

    start();

    return () => {
      mounted = false;
      audioVideo.removeObserver(observer);
      audioVideo.stopLocalVideoTile();
      audioVideo.stop();
      sessionRef.current = null;
    };
  }, [meetingResponse?.MeetingId, attendeeResponse?.AttendeeId]);

  // マイク ON/OFF
  useEffect(() => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (micEnabled) {
      av.realtimeUnmuteLocalAudio();
    } else {
      av.realtimeMuteLocalAudio();
    }
  }, [micEnabled]);

  // カメラ ON/OFF
  useEffect(() => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (camEnabled) {
      av.startLocalVideoTile();
    } else {
      av.stopLocalVideoTile();
    }
  }, [camEnabled]);

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-red-400 text-xs p-4 text-center z-10">
        通話接続エラー: {error}
      </div>
    );
  }

  return null;
}