import React, { useEffect, useRef, useState } from 'react';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
} from 'amazon-chime-sdk-js';

/**
 * ChimeVideoCall - Amazon Chime SDK による1対1ビデオ通話エンジン
 * UIなし。映像はVideoCallPageのrefに描画する。
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
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!meetingResponse || !attendeeResponse) return;

    const logger = new ConsoleLogger('Chime', LogLevel.WARN);
    const deviceController = new DefaultDeviceController(logger);
    const configuration = new MeetingSessionConfiguration(meetingResponse, attendeeResponse);
    const session = new DefaultMeetingSession(configuration, logger, deviceController);
    sessionRef.current = session;

    const audioVideo = session.audioVideo;

    // リモート映像タイル追加時
    audioVideo.addObserver({
      videoTileDidUpdate: (tileState) => {
        if (!tileState.localTile && !tileState.isContent && remoteVideoRef?.current) {
          audioVideo.bindVideoElement(tileState.tileId, remoteVideoRef.current);
          console.log('[Chime] ✓ Remote video bound to DOM');
          onConnected?.();
        }
      },
    });

    const start = async () => {
      try {
        // マイク
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (audioInputs.length > 0) {
          await audioVideo.startAudioInput(audioInputs[0].deviceId);
        }
        // カメラ
        const videoInputs = await audioVideo.listVideoInputDevices();
        if (videoInputs.length > 0) {
          await audioVideo.startVideoInput(videoInputs[0].deviceId);
        }

        // ローカルプレビュー
        audioVideo.startVideoPreviewForVideoInput(localVideoRef?.current);

        // 音声出力
        audioVideo.bindAudioElement(document.createElement('audio'));

        audioVideo.start();
        audioVideo.startLocalVideoTile();
        console.log('[Chime] ✓ Session started');
      } catch (err) {
        console.error('[Chime] Error:', err);
        setError(err.message);
      }
    };

    start();

    return () => {
      audioVideo.stopLocalVideoTile();
      audioVideo.stop();
      sessionRef.current = null;
    };
  }, [meetingResponse, attendeeResponse]);

  // マイクon/off
  useEffect(() => {
    const av = sessionRef.current?.audioVideo;
    if (!av) return;
    if (micEnabled) {
      av.realtimeUnmuteLocalAudio();
    } else {
      av.realtimeMuteLocalAudio();
    }
  }, [micEnabled]);

  // カメラon/off
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
      <div className="absolute inset-0 flex items-center justify-center text-red-400 text-xs p-4 text-center">
        通話接続エラー: {error}
      </div>
    );
  }

  return null;
}