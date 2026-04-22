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
  const streamRef = useRef(null);
  const iceLoggedRef = useRef(false);

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
          
          // ★ iOS対策: リモート接続後、ローカルストリームを再アクティベーション
          if (streamRef.current) {
            console.log('[Chime] 🔄 Re-activating local stream (iOS workaround)');
            streamRef.current.getTracks().forEach(track => {
              track.enabled = true;
              console.log(`[Chime]   → Track ${track.kind} re-enabled`);
            });
          }
          
          onConnected?.();
        }
      },
      connectionDidBecomePoor: () => {
        console.warn('[Chime] ⚠️ Connection degraded - attempting stream reactivation');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            track.enabled = false;
            setTimeout(() => { track.enabled = true; }, 100);
          });
        }
      },
    });

    // ★ ICE Candidate ログ（iOSデバッグ）
    const pcObserver = {
      onicecandidate: (event) => {
        if (event.candidate) {
          console.log('[Chime] 🌐 ICE Candidate:', {
            type: event.candidate.type,
            address: event.candidate.address?.substring(0, 10) + '***',
            port: event.candidate.port,
            protocol: event.candidate.protocol,
          });
        }
      },
      oniceconnectionstatechange: (event) => {
        console.log('[Chime] 🔗 ICE Connection State:', event.target?.iceConnectionState);
      },
      onconnectionstatechange: (event) => {
        console.log('[Chime] 📡 RTCPeerConnection State:', event.target?.connectionState);
      },
    };
    // iOS対応: PeerConnectionのhookは Chime SDK内部で管理されているため、
    // ここでは ログレベルを上げてデバッグ情報を捕捉
    if (logger) logger.setLogLevel(LogLevel.INFO);

    const start = async () => {
      try {
        console.log('[Chime] 🚀 Starting session (getUserMedia in progress)');
        
        // ★ iOS対策: User Gesture内で明示的にgetUserMediaを呼び出す
        try {
          streamRef.current = await navigator.mediaDevices.getUserMedia({ 
            audio: true, 
            video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 }
            } 
          });
          console.log('[Chime] ✓ getUserMedia success - Tracks acquired:', {
            audio: streamRef.current.getAudioTracks().length > 0,
            video: streamRef.current.getVideoTracks().length > 0,
          });
        } catch (gumErr) {
          console.warn('[Chime] ⚠️ getUserMedia denied (iOS may require user approval):', gumErr.message);
          // フォールバック: Chimeの自動デバイス検出に委ねる
        }
        
        // マイク
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (audioInputs.length > 0) {
          await audioVideo.startAudioInput(audioInputs[0].deviceId);
          console.log('[Chime] ✓ Audio input started');
        }
        // カメラ
        const videoInputs = await audioVideo.listVideoInputDevices();
        if (videoInputs.length > 0) {
          await audioVideo.startVideoInput(videoInputs[0].deviceId);
          console.log('[Chime] ✓ Video input started');
        }

        // ローカルプレビュー
        audioVideo.startVideoPreviewForVideoInput(localVideoRef?.current);
        console.log('[Chime] ✓ Video preview bound');

        // 音声出力
        audioVideo.bindAudioElement(document.createElement('audio'));

        audioVideo.start();
        audioVideo.startLocalVideoTile();
        
        // ★ ストリーム確認ログ
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track, i) => {
            console.log(`[Chime] ✓ Track ${i} (${track.kind}): enabled=${track.enabled}, readyState=${track.readyState}`);
          });
        }
        
        console.log('[Chime] ✓ Session started - Ready to send/receive');
      } catch (err) {
        console.error('[Chime] ❌ Session start error:', err);
        setError(err.message);
      }
    };

    start();

    return () => {
      // ★ ストリーム停止時のクリーンアップ
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop();
          console.log(`[Chime] ✓ Track ${track.kind} stopped`);
        });
        streamRef.current = null;
      }
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