import React, { useEffect, useRef, useState } from 'react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * AgoraVideoCall - Agora RTC の接続・映像描画を担当するコンポーネント
 * 
 * Props:
 *   channelId, userId, appId, token - Agora接続情報
 *   isPublisher - trueの場合カメラ/マイクをパブリッシュ
 *   remoteVideoRef - 相手映像を描画するDOMへのref (VideoCallPageから渡す)
 *   localVideoRef  - 自分映像を描画するDOMへのref (VideoCallPageから渡す)
 *   onCallActive   - 接続完了コールバック
 *   onCallEnd      - 終話コールバック
 *   micEnabled     - マイクのon/off
 *   camEnabled     - カメラのon/off
 */
export default function AgoraVideoCall({
  channelId,
  userId,
  appId,
  token,
  isPublisher = true,
  remoteVideoRef,
  localVideoRef,
  onCallActive,
  onCallEnd,
  micEnabled = true,
  camEnabled = true,
}) {
  const agoraClientRef = useRef(null);
  const audioTrackRef = useRef(null);
  const videoTrackRef = useRef(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!appId || !token || !channelId || !userId) return;

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    agoraClientRef.current = client;

    // ---- リモートユーザーが映像/音声を配信し始めたとき ----
    client.on('user-published', async (user, mediaType) => {
      console.log(`[Agora] user-published uid=${user.uid} type=${mediaType}`);
      await client.subscribe(user, mediaType);
      console.log(`[Agora] subscribed uid=${user.uid} type=${mediaType}`);

      if (mediaType === 'video') {
        const track = user.videoTrack;
        if (track && remoteVideoRef?.current) {
          // ★ここが核心: Agoraのplay()にDOMエレメントを渡す
          track.play(remoteVideoRef.current, { fit: 'cover' });
          console.log(`[Agora] ✓ Remote video playing in remoteVideoRef`);
        } else {
          console.warn('[Agora] remoteVideoRef.current is null — remote video cannot render');
        }
      }

      if (mediaType === 'audio') {
        user.audioTrack?.play();
        console.log(`[Agora] ✓ Remote audio playing`);
      }
    });

    client.on('user-unpublished', (user, mediaType) => {
      console.log(`[Agora] user-unpublished uid=${user.uid} type=${mediaType}`);
    });

    client.on('user-left', (user) => {
      console.log(`[Agora] user-left uid=${user.uid}`);
      if (remoteVideoRef?.current) remoteVideoRef.current.innerHTML = '';
    });

    const join = async () => {
      try {
        const uid = parseInt(userId, 10);
        if (isNaN(uid)) throw new Error(`Invalid userId: ${userId}`);

        await client.join(appId, channelId, token, uid);
        console.log(`[Agora] ✓ Joined channel=${channelId} uid=${uid}`);

        if (isPublisher) {
          const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig: 'high_quality' });
          const videoTrack = await AgoraRTC.createCameraVideoTrack({ encoderConfig: '720p_auto' });
          audioTrackRef.current = audioTrack;
          videoTrackRef.current = videoTrack;

          // ローカルプレビュー
          if (localVideoRef?.current) {
            videoTrack.play(localVideoRef.current, { fit: 'cover' });
            console.log(`[Agora] ✓ Local video preview started`);
          }

          await client.publish([audioTrack, videoTrack]);
          console.log(`[Agora] ✓ Published local tracks`);
        }

        setConnected(true);
        setError(null);
        onCallActive?.();
        toast.success('通話接続しました');
      } catch (err) {
        console.error('[Agora] setup error:', err);
        setError(err.message);
        toast.error(`通話接続エラー: ${err.message}`);
      }
    };

    join();

    return () => {
      audioTrackRef.current?.close();
      videoTrackRef.current?.close();
      client.leave().catch(() => {});
      agoraClientRef.current = null;
    };
  }, [appId, channelId, token, userId, isPublisher]);

  // マイクon/off
  useEffect(() => {
    audioTrackRef.current?.setEnabled(micEnabled);
  }, [micEnabled]);

  // カメラon/off
  useEffect(() => {
    videoTrackRef.current?.setEnabled(camEnabled);
  }, [camEnabled]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-center text-muted-foreground p-4">
        <div className="flex flex-col items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-destructive" />
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p className="text-sm">Agora接続中...</p>
      </div>
    );
  }

  // UIなし: 映像はVideoCallPage側のrefで描画する
  return null;
}