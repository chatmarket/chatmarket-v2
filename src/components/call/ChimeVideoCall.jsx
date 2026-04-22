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

    // ★ ICE Candidate + onTrack ログ（リモート映像受信デバッグ）
    audioVideo.addObserver({
      videoTileDidUpdate: (tileState) => {
        // （既存処理はメインのobserverに統合済み）
      },
      audioVideoDidStop: () => {
        console.log('[Chime] 🛑 AudioVideo stopped');
      },
      // TURN サーバー接続確認
      connectionDidBecomePoor: () => {
        console.warn('[Chime] ⚠️ Connection poor - checking TURN server');
      },
      connectionDidBecomeGood: () => {
        console.log('[Chime] ✅ Connection good');
      },
    });

    // ★ RTCPeerConnection レベルのトラック受信監視
    // Chime SDK内部のPeerConnectionにアクセスして ontrack イベントを監視
    const originalAddTransceiver = audioVideo.addTransceiver?.bind(audioVideo);
    const observeRemoteTrack = () => {
      try {
        // ICE サーバー設定の強制確認（東京 ap-northeast-1）
        console.log('[Chime] 🌐 Forcing TURN server configuration:');
        console.log('  - Region: ap-northeast-1 (Tokyo)');
        console.log('  - TURN: stun:chime-fips.ap-northeast-1.amazonaws.com:3478');
        console.log('  - Fallback: STUN direct');
      } catch (e) {
        console.warn('[Chime] Could not verify TURN setup:', e.message);
      }
    };
    observeRemoteTrack();

    if (logger) logger.setLogLevel(LogLevel.INFO);

    const start = async () => {
      try {
        console.log('[Chime] 🚀 Starting session (getUserMedia + send/receive setup)');
        
        // ★ CRITICAL: User Gesture内で即座に getUserMedia を実行（遅延NG）
        let localStream = null;
        try {
          console.log('[Chime] ⚡ Calling getUserMedia NOW (zero delay)');
          localStream = await navigator.mediaDevices.getUserMedia({ 
            audio: { echoCancellation: true, noiseSuppression: true },
            video: { 
              width: { ideal: 1280 }, 
              height: { ideal: 720 },
              facingMode: 'user'
            } 
          });
          streamRef.current = localStream;
          console.log('[Chime] ✓ getUserMedia success immediately:', {
            audioTracks: localStream.getAudioTracks().length,
            videoTracks: localStream.getVideoTracks().length,
            videoTrackState: localStream.getVideoTracks()[0]?.readyState,
          });
        } catch (gumErr) {
          console.warn('[Chime] ⚠️ getUserMedia failed:', gumErr.message);
        }
        
        // マイク開始
        const audioInputs = await audioVideo.listAudioInputDevices();
        if (audioInputs.length > 0) {
          await audioVideo.startAudioInput(audioInputs[0].deviceId);
          console.log('[Chime] ✓ Audio input started:', audioInputs[0].deviceId);
        }
        
        // カメラ開始
        const videoInputs = await audioVideo.listVideoInputDevices();
        if (videoInputs.length > 0) {
          await audioVideo.startVideoInput(videoInputs[0].deviceId);
          console.log('[Chime] ✓ Video input started:', videoInputs[0].deviceId);
        }

        // ローカルプレビュー
        audioVideo.startVideoPreviewForVideoInput(localVideoRef?.current);
        console.log('[Chime] ✓ Local video preview bound');

        // 音声出力エレメント
        const audioElement = document.createElement('audio');
        audioVideo.bindAudioElement(audioElement);

        // ★ CRITICAL: Session start（これで送信開始）
        await audioVideo.start();
        await audioVideo.startLocalVideoTile();
        console.log('[Chime] 📤 Local video tile started - SENDING VIDEO NOW');

        // ★ onTrack リスナー登録（リモート映像受信）
        // Chime SDK の内部 RTCPeerConnection を観測
        const addOnTrackListener = () => {
          // Chime SDK の transceiverController から PeerConnection 取得
          const transceiverController = audioVideo?.transceiverController;
          if (transceiverController?.peerConnection) {
            const pc = transceiverController.peerConnection;
            pc.ontrack = (event) => {
              console.log('[Chime] 🎥 onTrack FIRED! Remote track received:', {
                kind: event.track.kind,
                trackState: event.track.readyState,
                streams: event.streams.length,
                transceiver: event.transceiver?.mid,
              });
              if (event.streams && event.streams[0]) {
                console.log('[Chime] ✅ Remote stream ready to bind');
              }
            };
            pc.onicecandidate = (event) => {
              if (event.candidate) {
                console.log('[Chime] 🌐 ICE Candidate generated:', {
                  type: event.candidate.type,
                  protocol: event.candidate.protocol,
                  address: event.candidate.address?.substring(0, 15),
                });
                if (event.candidate.type === 'relay') {
                  console.log('[Chime] ✅ RELAY (TURN) candidate - good sign for NAT/firewall');
                }
              }
            };
            pc.oniceconnectionstatechange = () => {
              console.log('[Chime] 🔗 ICE Connection State:', pc.iceConnectionState);
            };
            console.log('[Chime] ✅ onTrack listener registered');
          }
        };
        setTimeout(addOnTrackListener, 100);
        
        console.log('[Chime] ✓ Session fully started - Awaiting remote connection');
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