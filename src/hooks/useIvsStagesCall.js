import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * IVS Stages を使った1対1ビデオ通話フック
 *
 * - window.IVSBroadcastClient は index.html で読み込み済み
 * - トークンは VideoCall.chime_attendee_caller / chime_attendee_callee に格納
 * - リモート映像を remoteVideoRef.current.srcObject にバインドする
 * - 切断時は最大10回・指数バックオフで自動再接続する
 *
 * Stage クラスの探索:
 *   IVS SDK v1.34.0 は IVSBroadcastClient に Stage を直接または
 *   ネストして公開する。typeof === 'function' で確実に特定する。
 */

const MAX_RECONNECT_ATTEMPTS = 10;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// IVS SDK から Stage クラスを確実に見つける
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function resolveIVSClient() {
  const rawClient = window.IVSBroadcastClient;
  if (!rawClient) return null;

  // 候補1: IVSBroadcastClient 直下
  if (typeof rawClient.Stage === 'function') {
    console.log('[IVS Stages] ✅ Stage @ IVSBroadcastClient');
    return rawClient;
  }
  // 候補2: window 直下
  if (typeof window.Stage === 'function') {
    console.log('[IVS Stages] ✅ Stage @ window');
    return window;
  }
  // 候補3: IVSBroadcastClient のネストを全探索
  for (const key of Object.keys(rawClient)) {
    const val = rawClient[key];
    if (val && typeof val === 'object' && typeof val.Stage === 'function') {
      console.log('[IVS Stages] ✅ Stage @ IVSBroadcastClient.' + key);
      return val;
    }
  }

  // 見つからない場合は詳細ログを出力
  console.error('[IVS Stages] ❌ Stage not found. All IVSBroadcastClient keys:', Object.keys(rawClient).join(', '));
  console.error('[IVS Stages] ❌ window.Stage type:', typeof window.Stage);
  return null;
}

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
  const audioCtxListRef = useRef([]);
  const audioWatchdogRef = useRef(null);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AudioWatchdog: suspended な AudioContext を常時 resume
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startAudioWatchdog = useCallback(() => {
    if (audioWatchdogRef.current) return;
    audioWatchdogRef.current = setInterval(() => {
      audioCtxListRef.current.forEach(ctx => {
        if (ctx?.state === 'suspended') ctx.resume().catch(() => {});
      });
      const videoEl = remoteVideoRef.current;
      if (!videoEl) return;
      if (videoEl.muted) { videoEl.muted = false; videoEl.volume = 1.0; }
      if (videoEl.srcObject instanceof MediaStream) {
        videoEl.srcObject.getAudioTracks().forEach(t => { if (!t.enabled) t.enabled = true; });
      }
    }, 1000);
    console.log('[AudioWatchdog] 🛡️ Started');
  }, [remoteVideoRef]);

  const stopAudioWatchdog = useCallback(() => {
    if (audioWatchdogRef.current) { clearInterval(audioWatchdogRef.current); audioWatchdogRef.current = null; }
    audioCtxListRef.current = [];
  }, []);

  const cleanup = useCallback(() => {
    cancelledRef.current = true;
    stopAudioWatchdog();
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (remoteVideoTimeoutRef.current) clearTimeout(remoteVideoTimeoutRef.current);
    if (stageRef.current) {
      stageRef.current.leave();
      stageRef.current = null;
      console.log('[IVS Stages] 🔒 Left stage (cleanup)');
    }
  }, [stopAudioWatchdog]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // join() — Stage に参加してリモート映像をバインドする
  // ※ scheduleReconnect との循環を避けるため ref で保持
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const scheduleReconnectRef = useRef(null); // 循環依存を ref で解決

  const join = useCallback(async (stagesToken, IVSClient, isReconnect = false) => {
    if (cancelledRef.current) return;

    try {
      console.log(`[IVS Stages] 🚀 ${isReconnect ? `Reconnect #${reconnectAttemptRef.current}` : 'Joining'} as ${user?.email}`);

      const { Stage, LocalStageStream, SubscribeType, StageEvents } = IVSClient;

      console.log('[IVS Stages] 🔍 API check:', {
        Stage: typeof Stage,
        LocalStageStream: typeof LocalStageStream,
        SubscribeType: typeof SubscribeType,
        StageEvents: typeof StageEvents,
      });

      if (!Stage || !LocalStageStream || !StageEvents) {
        console.error('[IVS Stages] ❌ Missing SDK classes! Keys:', Object.keys(IVSClient).join(', '));
        return;
      }

      const vt = localStream?.getVideoTracks()[0];
      const at = localStream?.getAudioTracks()[0];

      if (!vt && !at) {
        console.error('[IVS Stages] ❌ No tracks to publish!');
        return;
      }

      console.log('[IVS Stages] 📹 Tracks:', {
        video: vt ? `${vt.label} [${vt.readyState}]` : 'none',
        audio: at ? `${at.label} [${at.readyState}]` : 'none',
      });

      // ★ CRITICAL: join前にインスタンスを一度だけ生成し同じ参照を返す
      //   毎回 new LocalStageStream() すると SDK 内部の sort() がクラッシュする
      const publishStreams = [];
      if (at) { at.enabled = true; publishStreams.push(new LocalStageStream(at, { simulcast: false })); }
      if (vt) { publishStreams.push(new LocalStageStream(vt, { simulcast: false })); }

      const strategy = {
        stageStreamsToPublish: () => publishStreams,
        shouldPublishParticipant: () => true,
        shouldSubscribeToParticipant: (p) => p.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO,
      };

      const stage = new Stage(stagesToken, strategy);

      // リモートストリーム受信 → video要素へバインド
      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
        console.log('[IVS Stages] 🎬 STREAMS_ADDED:', {
          participantId: participant.id,
          isLocal: participant.isLocal,
          streamCount: streams.length,
          streamTypes: streams.map(s => s.mediaStreamTrack?.kind),
        });

        if (participant.isLocal || cancelledRef.current) return;

        const videoEl = remoteVideoRef.current;
        if (!videoEl) { console.error('[IVS Stages] ❌ remoteVideoRef is null'); return; }

        let mediaStream = videoEl.srcObject instanceof MediaStream ? videoEl.srcObject : new MediaStream();

        streams.forEach(stageStream => {
          const track = stageStream.mediaStreamTrack;
          if (!track) return;
          if (track.kind === 'audio') track.enabled = true;
          if (!mediaStream.getTracks().find(t => t.id === track.id)) {
            mediaStream.addTrack(track);
            console.log(`[IVS Stages] ✅ Track added: ${track.kind} [${track.readyState}]`);
          }
        });

        console.log(`[IVS Stages] 📊 Tracks in stream: audio=${mediaStream.getAudioTracks().length} video=${mediaStream.getVideoTracks().length}`);

        videoEl.removeAttribute('muted');
        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.srcObject = mediaStream;

        // AudioContext でリモート音声を強制開通
        queueMicrotask(() => {
          try {
            if (mediaStream.getAudioTracks().length > 0) {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              audioCtxListRef.current.push(audioCtx);
              audioCtx.addEventListener('statechange', () => {
                if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
              });
              if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
              const source = audioCtx.createMediaStreamSource(mediaStream);
              source.connect(audioCtx.destination);
              console.log('[IVS Stages] 🔊 AudioContext connected');
            }
          } catch (e) {
            console.warn('[IVS Stages] ⚠️ AudioContext failed:', e.message);
          }
        });

        // play() — リトライ付き
        let retryCount = 0;
        const attemptPlay = () => {
          videoEl.muted = false;
          videoEl.volume = 1.0;
          videoEl.play().then(() => {
            videoEl.muted = false;
            console.log('[IVS Stages] ✅ Remote video PLAYING! videoWidth:', videoEl.videoWidth);
            // videoWidth=0 の場合は srcObject を再セットしてリトライ
            if (videoEl.videoWidth === 0 && mediaStream.getVideoTracks().length > 0 && retryCount < 5) {
              retryCount++;
              console.warn(`[IVS Stages] ⚠️ videoWidth=0, retry ${retryCount}...`);
              videoEl.srcObject = null;
              setTimeout(() => { videoEl.srcObject = mediaStream; videoEl.load(); attemptPlay(); }, 500 * retryCount);
            }
          }).catch(err => {
            console.warn('[IVS Stages] ⚠️ play() blocked:', err.name);
            const retry = () => { videoEl.muted = false; videoEl.play().catch(() => {}); };
            document.addEventListener('click', retry, { once: true });
            document.addEventListener('touchstart', retry, { once: true });
          });
        };

        if (videoEl.readyState >= 2) {
          attemptPlay();
        } else {
          videoEl.addEventListener('loadedmetadata', attemptPlay, { once: true });
          setTimeout(() => { if (videoEl.paused) attemptPlay(); }, 300);
        }
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED, (participant, streams) => {
        if (participant.isLocal || cancelledRef.current) return;
        const videoEl = remoteVideoRef.current;
        if (videoEl?.srcObject instanceof MediaStream) {
          streams.forEach(s => { if (s.mediaStreamTrack) videoEl.srcObject.removeTrack(s.mediaStreamTrack); });
          if (videoEl.srcObject.getTracks().length === 0) videoEl.srcObject = null;
        }
      });

      stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
        console.log('[IVS Stages] 🔄 Connection state:', state);
        if ((state === 'disconnected' || state === 'failed') && !cancelledRef.current) {
          stageRef.current = null;
          scheduleReconnectRef.current?.(stagesToken, IVSClient);
        }
        if (state === 'connected') {
          console.log('[IVS Stages] ✅ Connected!', isReconnect ? '(reconnect)' : '(initial)');
          if (isReconnect) { reconnectAttemptRef.current = 0; onReconnected?.(); toast.success('通話に再接続しました'); }
        }
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (p) => console.log('[IVS Stages] 👤 Joined:', p.id, 'local:', p.isLocal));
      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (p) => console.log('[IVS Stages] 👋 Left:', p.id));

      console.log('[IVS Stages] ⏳ stage.join()...');
      await stage.join();

      if (!cancelledRef.current) {
        stageRef.current = stage;
        reconnectAttemptRef.current = 0;
        startAudioWatchdog();
        console.log('[IVS Stages] ✅ join() done. Waiting for remote participant...');

        // 30秒以内にリモート映像が来なければ再接続
        remoteVideoTimeoutRef.current = setTimeout(() => {
          if (cancelledRef.current) return;
          const videoEl = remoteVideoRef.current;
          if (!videoEl) return;
          const hasStream = videoEl.srcObject instanceof MediaStream && videoEl.srcObject.getTracks().length > 0;
          const isPlaying = !videoEl.paused && videoEl.readyState >= 2;
          if (hasStream || isPlaying) { console.log('[IVS Stages] ✅ Remote video active, no timeout reconnect.'); return; }
          console.warn('[IVS Stages] ⏱️ Remote video timeout (30s) — reconnecting...');
          scheduleReconnectRef.current?.(stagesToken, IVSClient);
        }, 30000);
      } else {
        stage.leave();
      }
    } catch (e) {
      console.error('[IVS Stages] ❌ Join error:', e.name, e.message);
      if (!cancelledRef.current) scheduleReconnectRef.current?.(stagesToken, IVSClient);
    }
  }, [localStream, user, remoteVideoRef, onReconnected, startAudioWatchdog]);

  // scheduleReconnect を ref に保持（join との循環依存を断ち切る）
  const scheduleReconnect = useCallback((stagesToken, IVSClient) => {
    if (cancelledRef.current) return;
    reconnectAttemptRef.current += 1;
    const attempt = reconnectAttemptRef.current;

    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      console.error('[IVS Stages] ❌❌ Max reconnect attempts reached.');
      onReconnectFailed?.();
      toast.error('通話の再接続に失敗しました。通話を終了してください。');
      return;
    }

    const delayMs = attempt <= 6 ? Math.min(1000 * Math.pow(2, attempt - 1), 30000) : 30000;
    console.log(`[IVS Stages] 🔄 Reconnect ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs}ms`);

    if (attempt <= 3) { onReconnecting?.(attempt); toast.warning(`再接続中... (${attempt}/${MAX_RECONNECT_ATTEMPTS})`); }

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`[IVS Stages] 🔄 Reconnecting #${attempt}...`);
      join(stagesToken, IVSClient, true);
    }, delayMs);
  }, [join, onReconnecting, onReconnectFailed]);

  // ref を常に最新の scheduleReconnect に向ける（循環依存なし）
  useEffect(() => {
    scheduleReconnectRef.current = scheduleReconnect;
  }, [scheduleReconnect]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // メインエフェクト: enabled になったら IVSClient を解決して join
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    const IVSClient = resolveIVSClient();
    if (!IVSClient) {
      console.error('[IVS Stages] ❌ Cannot proceed — Stage class not found in SDK.');
      return;
    }

    const stagesToken = user.email === call.caller_email
      ? call.chime_attendee_caller
      : call.chime_attendee_callee;

    console.log('[IVS Stages] 🔑 Token check:', {
      role: user.email === call.caller_email ? 'caller' : 'callee',
      hasCallerToken: !!call.chime_attendee_caller,
      hasCalleeToken: !!call.chime_attendee_callee,
      tokenPrefix: stagesToken ? stagesToken.slice(0, 30) + '...' : 'NULL',
    });

    if (!stagesToken) {
      console.error('[IVS Stages] ❌ No token. caller:', !!call.chime_attendee_caller, '| callee:', !!call.chime_attendee_callee);
      return;
    }

    const vTracks = localStream.getVideoTracks();
    const aTracks = localStream.getAudioTracks();
    if (vTracks.length === 0 && aTracks.length === 0) {
      console.error('[IVS Stages] ❌ No local tracks!');
      return;
    }

    cancelledRef.current = false;
    reconnectAttemptRef.current = 0;

    join(stagesToken, IVSClient, false);

    return cleanup;
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}