import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { Phone, PhoneOff, Mic, MicOff, Camera, CameraOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function AgoraVideoCall({
  channelId,
  userId,
  appId,
  token,
  isPublisher = true,
  onCallEnd,
  remoteUid,
}) {
  const agoraEngineRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [remoteUserCount, setRemoteUserCount] = useState(0);
  const [error, setError] = useState(null);
  const remoteUidRef = useRef(null);

  // Agoraエンジン初期化
  useEffect(() => {
    const setupAgoraEngine = async () => {
      try {
        if (!appId || !token) {
          console.warn('Agora setup: missing appId or token');
          setError('App ID またはトークンが不足しています');
          return;
        }

        if (!channelId || !userId) {
          console.warn('Agora setup: missing channelId or userId');
          setError('チャネルまたはユーザーIDが不足しています');
          return;
        }

        const agoraEngine = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraEngineRef.current = agoraEngine;
        console.log(`Agora client created. Joining channel: ${channelId} with token length: ${token.length}`);

        // リモートユーザーの参加を検出
        agoraEngine.on('user-published', async (user, mediaType) => {
          console.log(`✓ Remote user ${user.uid} published ${mediaType}`);
          remoteUidRef.current = user.uid;
          await agoraEngine.subscribe(user, mediaType);

          if (mediaType === 'video') {
            const remoteVideoTrack = user.videoTrack;
            if (remoteVideoRef.current && remoteVideoTrack) {
              remoteVideoTrack.play(remoteVideoRef.current, { fit: 'cover' });
              console.log(`✓ Remote video rendered for uid ${user.uid}`);
            }
          }

          if (mediaType === 'audio') {
            const remoteAudioTrack = user.audioTrack;
            if (remoteAudioTrack) {
              remoteAudioTrack.play();
              console.log(`✓ Remote audio playing for uid ${user.uid}`);
            }
          }
        });

        // リモートユーザーの退出を検出
        agoraEngine.on('user-unpublished', (user) => {
          console.log(`⚠ Remote user ${user.uid} unpublished`);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.innerHTML = '';
          }
          remoteUidRef.current = null;
          setRemoteUserCount(0);
        });

        // チャネルに参加（トークン検証付き）
        const uid = parseInt(userId, 10);
        if (isNaN(uid)) {
          throw new Error(`Invalid userId: ${userId}`);
        }

        await agoraEngine.join(appId, channelId, token, uid);
        console.log(`✓ Successfully joined channel: ${channelId} as uid: ${uid}`);

        // Publisherの場合はローカルビデオストリームをパブリッシュ
        if (isPublisher) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'high_quality' });
          const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p_auto' });
          console.log('✓ Audio & video tracks created');

          // ローカルビデオをプレビュー
          if (localVideoRef.current && videoTrack) {
            videoTrack.play(localVideoRef.current, { fit: 'cover' });
          }

          // パブリッシュ
          await agoraEngine.publish([audioTrack, videoTrack]);
          console.log('✓ Published local streams');

          // トラックをエンジンに保存（ミュート制御用）
          agoraEngine._audioTrack = audioTrack;
          agoraEngine._videoTrack = videoTrack;
        }

        setIsCallActive(true);
        setRemoteUserCount(1);
        setError(null);
        toast.success(`${isPublisher ? '配信者' : '視聴者'}として接続しました`);
      } catch (err) {
        console.error('❌ Agora setup error:', err);
        setError(err.message);
        toast.error(`通話接続エラー: ${err.message}`);
      }
    };

    setupAgoraEngine();

    return () => {
      if (agoraEngineRef.current) {
        agoraEngineRef.current._audioTrack?.close();
        agoraEngineRef.current._videoTrack?.close();
        agoraEngineRef.current.leave().catch((e) => console.warn('Leave error:', e));
      }
    };
  }, [appId, channelId, token, userId, isPublisher]);

  // マイク制御
  const toggleMic = async () => {
    try {
      if (agoraEngineRef.current?._audioTrack) {
        if (isMicOn) {
          await agoraEngineRef.current._audioTrack.setEnabled(false);
        } else {
          await agoraEngineRef.current._audioTrack.setEnabled(true);
        }
        setIsMicOn(!isMicOn);
      }
    } catch (err) {
      console.error('Mic toggle error:', err);
      toast.error('マイク制御エラー');
    }
  };

  // カメラ制御
  const toggleCamera = async () => {
    try {
      if (agoraEngineRef.current?._videoTrack) {
        if (isCamOn) {
          await agoraEngineRef.current._videoTrack.setEnabled(false);
        } else {
          await agoraEngineRef.current._videoTrack.setEnabled(true);
        }
        setIsCamOn(!isCamOn);
      }
    } catch (err) {
      console.error('Camera toggle error:', err);
      toast.error('カメラ制御エラー');
    }
  };

  // Agoraシグナリング送信（通知用）
  const sendSignalMessage = async (message) => {
    try {
      if (agoraEngineRef.current) {
        const rtmClient = agoraEngineRef.current._rtmClient;
        if (!rtmClient) {
          console.warn('RTM client not initialized for signaling');
          return;
        }
        await rtmClient.sendChannelMessage(message);
        console.log(`✓ Agora signal sent: ${message}`);
      }
    } catch (err) {
      console.warn('Agora signaling error (non-critical):', err);
    }
  };

  // 通話終了
  const handleEndCall = async () => {
    try {
      if (agoraEngineRef.current) {
        agoraEngineRef.current._audioTrack?.close();
        agoraEngineRef.current._videoTrack?.close();
        await agoraEngineRef.current.leave();
      }
      setIsCallActive(false);
      onCallEnd?.();
    } catch (err) {
      console.error('End call error:', err);
      toast.error('通話終了エラー');
    }
  };

  if (!isCallActive) {
    return (
      <div className="flex items-center justify-center h-full text-center text-muted-foreground">
        {error ? (
          <div className="flex flex-col items-center gap-2">
            <AlertTriangle className="w-8 h-8 text-destructive" />
            <p>{error}</p>
          </div>
        ) : (
          <p>接続中...</p>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-black">
      {/* リモートビデオ（全体） */}
      <div className="flex-1 relative bg-black/90 overflow-hidden">
        <div ref={remoteVideoRef} className="w-full h-full" />
      </div>

      {/* ローカルビデオ（PiP） */}
      {isPublisher && (
        <div className="absolute bottom-24 right-4 w-32 h-44 rounded-xl overflow-hidden border-2 border-white/20 shadow-lg bg-black/90 z-20">
          <div ref={localVideoRef} className="w-full h-full" />
          {!isCamOn && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <CameraOff className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>
      )}

      {/* コントロール */}
      <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-20">
        {isPublisher && (
          <>
            <Button
              size="icon"
              className={`w-12 h-12 rounded-full ${isMicOn ? 'bg-white/10 hover:bg-white/20' : 'bg-destructive'}`}
              onClick={toggleMic}
            >
              {isMicOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </Button>
            <Button
              size="icon"
              className={`w-12 h-12 rounded-full ${isCamOn ? 'bg-white/10 hover:bg-white/20' : 'bg-destructive'}`}
              onClick={toggleCamera}
            >
              {isCamOn ? <Camera className="w-5 h-5" /> : <CameraOff className="w-5 h-5" />}
            </Button>
          </>
        )}
        <Button
          size="icon"
          className="w-14 h-14 rounded-full bg-destructive hover:bg-destructive/90 shadow-lg"
          onClick={handleEndCall}
        >
          <PhoneOff className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}