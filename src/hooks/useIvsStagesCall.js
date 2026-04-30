import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

/**
 * ⚠️  TEMPORARY THAW FOR MOBILE VIDEO DEBUGGING
 * Frozen status: TEMPORARILY LIFTED for mobile video troubleshooting
 * Purpose: Fix video track exchange on 4G/5G networks
 * Will be re-frozen after successful mobile video test
 *
 * IVS Stages を使った1対1ビデオ通話フック
 *
 * - window.IVSBroadcastClient は index.html で読み込み済み
 * - トークンは VideoCall.chime_attendee_caller / chime_attendee_callee に格納
 * - リモート映像を remoteVideoRef.current.srcObject にバインドする
 * - 切断時は最大5回・指数バックオフで自動再接続する
 * - onReconnecting(attempt) / onReconnected / onReconnectFailed コールバックで状態通知
 */
export function useIvsStagesCall({ call, localStream, remoteVideoRef, user, enabled, onReconnecting, onReconnected, onReconnectFailed }) {
  const stageRef = useRef(null);
  const cancelledRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const remoteVideoTimeoutRef = useRef(null);
  const audioCtxListRef = useRef([]); // 全AudioContext参照を保持（Watchdog用）
  const audioWatchdogRef = useRef(null); // AudioWatchdog インターバル

  const MAX_RECONNECT_ATTEMPTS = 10;  // モバイル回線の不安定性に対応

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // AudioWatchdog: 1秒ごとに全AudioContextを監視しsuspendedなら即resume
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const startAudioWatchdog = useCallback(() => {
    if (audioWatchdogRef.current) return; // 二重起動防止
    audioWatchdogRef.current = setInterval(() => {
      audioCtxListRef.current.forEach(ctx => {
        if (ctx && ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
      });
      // remoteVideoRef の video要素のミュート状態も常時監視
      const videoEl = remoteVideoRef.current;
      if (videoEl && videoEl.muted) {
        videoEl.muted = false;
        videoEl.volume = 1.0;
      }
      if (videoEl?.srcObject instanceof MediaStream) {
        videoEl.srcObject.getAudioTracks().forEach(t => { if (!t.enabled) t.enabled = true; });
      }
    }, 1000);
    console.log('[AudioWatchdog] 🛡️ Started — monitoring AudioContext & remote audio tracks every 1s');
  }, [remoteVideoRef]);

  const stopAudioWatchdog = useCallback(() => {
    if (audioWatchdogRef.current) {
      clearInterval(audioWatchdogRef.current);
      audioWatchdogRef.current = null;
    }
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

  const join = useCallback(async (stagesToken, IVSClient, isReconnect = false) => {
    if (cancelledRef.current) return;

    try {
      const attempt = reconnectAttemptRef.current;
      console.log(`[IVS Stages] 🚀 ${isReconnect ? `再接続 attempt ${attempt}` : 'Joining'}. User:`, user.email, '| Token prefix:', stagesToken.slice(0, 20) + '...');

      const Stage = IVSClient.Stage;
      const LocalStageStream = IVSClient.LocalStageStream;
      const SubscribeType = IVSClient.SubscribeType;
      const StageEvents = IVSClient.StageEvents;

      // 🔍 API VERIFICATION — CRITICAL FOR MOBILE VIDEO
      const apiCheck = {
        Stage: typeof Stage,
        LocalStageStream: typeof LocalStageStream,
        SubscribeType: typeof SubscribeType,
        StageEvents: typeof StageEvents,
      };
      console.log('╔═══════════════════════════════════════════════════╗');
      console.log('║ 🔍 API CHECK: IVS STAGES SDK AVAILABILITY        ║');
      console.log('╠═══════════════════════════════════════════════════╣');
      console.log('║ Stage:', apiCheck.Stage.padEnd(39) + '║');
      console.log('║ LocalStageStream:', apiCheck.LocalStageStream.padEnd(32) + '║');
      console.log('║ SubscribeType:', apiCheck.SubscribeType.padEnd(34) + '║');
      console.log('║ StageEvents:', apiCheck.StageEvents.padEnd(36) + '║');
      console.log('╚═══════════════════════════════════════════════════╝');

      if (!Stage || !LocalStageStream || !StageEvents) {
        console.error('[IVS Stages] ❌❌❌ CRITICAL: Required Stages API classes missing from SDK!');
        console.error('[IVS Stages] ❌ SDK keys available:', Object.keys(IVSClient).join(', '));
        return;
      }
      console.log('[IVS Stages] ✅✅✅ ALL API CLASSES VERIFIED - PROCEEDING TO JOIN');

      // ローカルトラックをラップ（音声トラックを先に追加して優先確保）
      const vt = localStream.getVideoTracks()[0];
      const at = localStream.getAudioTracks()[0];

      console.log('[IVS Stages] 📹 Adding tracks to publish:', {
        video: vt ? `${vt.label} [${vt.readyState}] [enabled:${vt.enabled}]` : 'none',
        audio: at ? `${at.label} [${at.readyState}] [enabled:${at.enabled}]` : 'none',
      });

      if (!at && !vt) {
        console.error('[IVS Stages] ❌ No tracks to publish! Aborting join.');
        return;
      }

      // ★ CRITICAL FIX: stageStreamsToPublish は SDK から何度も呼ばれる。
      // 毎回 localStream から最新のトラックを取得して新しい LocalStageStream を生成する。
      // クロージャでキャプチャした古い配列を返すと SDK 内部の sort() がクラッシュする。
      const strategy = {
        stageStreamsToPublish: () => {
          const streams = [];
          const currentAt = localStream.getAudioTracks()[0];
          const currentVt = localStream.getVideoTracks()[0];
          // 🔊 音声を先に追加して CPU 割り当て優先確保
          if (currentAt && currentAt.readyState === 'live') {
            currentAt.enabled = true;
            streams.push(new LocalStageStream(currentAt, { simulcast: false }));
          }
          if (currentVt && currentVt.readyState === 'live') {
            streams.push(new LocalStageStream(currentVt, { simulcast: false }));
          }
          console.log('[IVS Stages] stageStreamsToPublish called → returning', streams.length, 'streams');
          return streams;
        },
        shouldPublishParticipant: () => true,
        shouldSubscribeToParticipant: (participant) => {
          console.log('[IVS Stages] shouldSubscribeToParticipant:', participant.id, 'isLocal:', participant.isLocal);
          return participant.isLocal ? SubscribeType.NONE : SubscribeType.AUDIO_VIDEO;
        },
      };

      // 初回ログ（join前の確認用）
      if (at) console.log('[IVS Stages] ✅ Audio track will be published. readyState:', at.readyState);
      else console.warn('[IVS Stages] ⚠️ No audio track available at join time');
      if (vt) console.log('[IVS Stages] ✅ Video track will be published. readyState:', vt.readyState);
      else console.warn('[IVS Stages] ⚠️ No video track available at join time');

      // 🔥 ICE SERVER CONFIGURATION — CRITICAL FOR MOBILE CONNECTIVITY
      // STUN: NAT穿孔 / TURN: Relay通信（Wi-Fi・企業ネットワーク対応）
      const rtcConfiguration = {
        iceServers: [
          // Google STUN（無料・高速）
          { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
          // AWS TURN Relay（IVS公式推奨）
          { 
            urls: ['turns:global.turn.aws:3478?transport=tcp'],
            username: 'aws',
            credential: 'aws'
          },
          // Fallback STUN
          { urls: ['stun:stun.stunprotocol.org:3478'] }
        ],
        iceCandidatePoolSize: 10,
      };
      console.log('[IVS Stages] 🌐 RTC Configuration (ICE Servers):', {
        stunServers: 3,
        turnServers: 1,
        iceCandidatePoolSize: rtcConfiguration.iceCandidatePoolSize,
      });

      const stage = new Stage(stagesToken, strategy, rtcConfiguration);

      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      // リモートストリームを受信 → video 要素へ強制アタッチ
      // IVS SDK v1.34.0 仕様: streams は LocalStageStream の配列
      // 各要素から mediaStreamTrack を取り出して MediaStream に追加する
      // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_ADDED, (participant, streams) => {
        console.log('[IVS Stages] 🎬 STREAMS_ADDED:', {
          participantId: participant.id,
          isLocal: participant.isLocal,
          streamCount: streams.length,
          streamTypes: streams.map(s => ({ type: s.streamType, trackKind: s.mediaStreamTrack?.kind, readyState: s.mediaStreamTrack?.readyState }))
        });

        if (participant.isLocal || cancelledRef.current) {
          console.log('[IVS Stages] ⏭ Skipping local participant or cancelled');
          return;
        }

        // 既存の srcObject があればトラックを追加、なければ新規作成
        const videoEl = remoteVideoRef.current;
        if (!videoEl) {
          console.error('[IVS Stages] ❌ remoteVideoRef.current is NULL — video element not mounted!');
          return;
        }

        // 現在の srcObject を再利用 or 新規作成
        let mediaStream = videoEl.srcObject instanceof MediaStream ? videoEl.srcObject : new MediaStream();
        
        let tracksAdded = 0;
        streams.forEach(stageStream => {
          const track = stageStream.mediaStreamTrack;
          if (!track) {
            console.warn('[IVS Stages] ⚠️ No mediaStreamTrack on stream:', stageStream.streamType);
            return;
          }
          // ★ 音声トラックのミュートを強制解除
          if (track.kind === 'audio') {
            track.enabled = true;
            console.log(`[IVS Stages] 🔊 Audio track muted=${track.muted} enabled=${track.enabled} readyState=${track.readyState}`);
          }
          // 重複追加を防ぐ
          const existingTrack = mediaStream.getTracks().find(t => t.id === track.id);
          if (!existingTrack) {
            mediaStream.addTrack(track);
            tracksAdded++;
            console.log(`[IVS Stages] ✅ Track added: ${track.kind} [${track.readyState}] id=${track.id.slice(0,8)}`);
          }
        });

        console.log(`[IVS Stages] 📊 Total tracks in MediaStream: ${mediaStream.getTracks().length} (+${tracksAdded} new) — audio:${mediaStream.getAudioTracks().length} video:${mediaStream.getVideoTracks().length}`);

        // video要素に強制アタッチ
        // ★ muted属性はHTMLの属性として残ると音が出ないため removeAttribute で完全除去
        videoEl.removeAttribute('muted');
        videoEl.muted = false;
        videoEl.volume = 1.0;
        videoEl.srcObject = mediaStream;

        // ★ 音声の強制開通: queueMicrotask でメインスレッドを圧迫せず実行
        queueMicrotask(() => {
          try {
            const audioTracks = mediaStream.getAudioTracks();
            if (audioTracks.length > 0) {
              const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
              // Watchdog に登録して常時監視対象にする
              audioCtxListRef.current.push(audioCtx);
              // statechange で即 resume（外部からスリープさせられた場合も対応）
              audioCtx.addEventListener('statechange', () => {
                if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
              });
              if (audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
              }
              const source = audioCtx.createMediaStreamSource(mediaStream);
              source.connect(audioCtx.destination);
              console.log('[IVS Stages] 🔊 AudioContext connected + registered to Watchdog');
            }
          } catch (e) {
            console.warn('[IVS Stages] ⚠️ AudioContext fallback failed:', e.message);
          }
        });

        // リトライ付き play() — 映像トラックが DOM に反映されるまで最大5回試みる
        let retryCount = 0;
        const MAX_RETRIES = 5;
        const attemptPlay = () => {
          const videoTracks = mediaStream.getVideoTracks();
          const audioTracks = mediaStream.getAudioTracks();
          console.log(`[IVS Stages] 🎬 attemptPlay #${retryCount + 1} — video:${videoTracks.length} audio:${audioTracks.length}`);

          // play前にも muted=false を再確認
          videoEl.muted = false;
          videoEl.volume = 1.0;

          const p = videoEl.play();
          if (p !== undefined) {
            p.then(() => {
              // play成功後も muted が復活しないよう再設定
              videoEl.muted = false;
              console.log('[IVS Stages] ✅✅✅ Remote video PLAYING! muted=', videoEl.muted, 'volume=', videoEl.volume);
              // 映像トラックはあるが映像が出ない場合 → srcObject を再設定してリトライ
              if (videoTracks.length > 0 && videoEl.videoWidth === 0 && retryCount < MAX_RETRIES) {
                retryCount++;
                console.warn(`[IVS Stages] ⚠️ videoWidth=0, re-attaching srcObject (retry ${retryCount})...`);
                videoEl.srcObject = null;
                setTimeout(() => {
                  videoEl.srcObject = mediaStream;
                  videoEl.load();
                  attemptPlay();
                }, 500 * retryCount);
              }
            }).catch(err => {
              console.warn('[IVS Stages] ⚠️ play() blocked:', err.name);
              const retry = () => {
                videoEl.muted = false;
                videoEl.play().catch(() => {});
              };
              document.addEventListener('click', retry, { once: true });
              document.addEventListener('touchstart', retry, { once: true });
            });
          }
        };

        if (videoEl.readyState >= 2) {
          attemptPlay();
        } else {
          videoEl.addEventListener('loadedmetadata', attemptPlay, { once: true });
          // loadedmetadata が来なくてもフォールバックで300ms後に試みる
          setTimeout(() => {
            if (videoEl.paused) {
              console.log('[IVS Stages] ⏩ loadedmetadata fallback play()');
              attemptPlay();
            }
          }, 300);
          console.log('[IVS Stages] ⏳ Waiting for loadedmetadata...');
        }
      });

      // トラック削除時の処理
      stage.on(StageEvents.STAGE_PARTICIPANT_STREAMS_REMOVED, (participant, streams) => {
        if (participant.isLocal || cancelledRef.current) return;
        console.log('[IVS Stages] 🗑 STREAMS_REMOVED:', participant.id, streams.map(s => s.streamType));
        const videoEl = remoteVideoRef.current;
        if (videoEl?.srcObject instanceof MediaStream) {
          streams.forEach(stageStream => {
            const track = stageStream.mediaStreamTrack;
            if (track) videoEl.srcObject.removeTrack(track);
          });
          if (videoEl.srcObject.getTracks().length === 0) {
            videoEl.srcObject = null;
          }
        }
      });

      // 接続状態変化
      stage.on(StageEvents.STAGE_CONNECTION_STATE_CHANGED, (state) => {
        // 🔥 MOBILE DEBUG: ネットワーク状態を詳細ログ
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        console.log('[IVS Stages] 🔄 Connection state changed:', state, {
          networkType: connection ? connection.effectiveType : 'unknown',
          bandwidth: connection ? connection.downlink + ' Mbps' : 'unknown',
          rtt: connection ? connection.rtt + ' ms' : 'unknown',
        });

        if ((state === 'disconnected' || state === 'failed') && !cancelledRef.current) {
          console.warn('[IVS Stages] ⚠️ Disconnected. Scheduling reconnect...');
          stageRef.current = null;
          scheduleReconnect(stagesToken, IVSClient);
        }

        if (state === 'connected') {
          console.log('[IVS Stages] ✅ Stage connected!', isReconnect ? '(reconnect)' : '(initial)');
          if (isReconnect) {
            reconnectAttemptRef.current = 0;
            onReconnected?.();
            toast.success('通話に再接続しました');
          }
        }
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_JOINED, (p) => {
        console.log('[IVS Stages] 👤 Participant joined:', p.id, '| isLocal:', p.isLocal);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_LEFT, (p) => {
        console.log('[IVS Stages] 👋 Participant left:', p.id);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_PUBLISH_STATE_CHANGED, (p, state) => {
        console.log('[IVS Stages] 📡 Publish state changed:', p.id, state);
      });

      stage.on(StageEvents.STAGE_PARTICIPANT_SUBSCRIBE_STATE_CHANGED, (p, state) => {
        console.log('[IVS Stages] 📥 Subscribe state changed:', p.id, state);
      });

      console.log('[IVS Stages] ⏳ Calling stage.join()...');
      await stage.join();

      if (!cancelledRef.current) {
        stageRef.current = stage;
        reconnectAttemptRef.current = 0;
        // AudioWatchdog 起動（stage参加成功時）
        startAudioWatchdog();
        console.log('[IVS Stages] ✅ stage.join() completed. Waiting for remote participant...');

        // 🔥 MOBILE FIX: リモート映像受信の監視タイムアウト（30秒）
        // 映像が既に再生中 or srcObject が存在する場合は再接続しない
        remoteVideoTimeoutRef.current = setTimeout(() => {
          if (cancelledRef.current) return;
          const videoEl = remoteVideoRef.current;
          if (!videoEl) return;
          const hasStream = videoEl.srcObject instanceof MediaStream && videoEl.srcObject.getTracks().length > 0;
          const isPlaying = !videoEl.paused && videoEl.readyState >= 2;
          if (hasStream || isPlaying) {
            console.log('[IVS Stages] ✅ Remote video timeout check: stream is active, no reconnect needed.');
            return;
          }
          console.warn('[IVS Stages] ⏱️ Remote video timeout (30s). No stream received — reconnecting...');
          scheduleReconnect(stagesToken, IVSClient);
        }, 30000);
      } else {
        stage.leave();
      }
    } catch (e) {
      console.error('[IVS Stages] ❌ Join error:', e.name, e.message, e.stack);
      if (!cancelledRef.current) {
        scheduleReconnect(stagesToken, IVSClient);
      }
    }
  }, [localStream, user, remoteVideoRef, onReconnected, startAudioWatchdog]);

  const scheduleReconnect = useCallback((stagesToken, IVSClient) => {
    if (cancelledRef.current) return;

    reconnectAttemptRef.current += 1;
    const attempt = reconnectAttemptRef.current;

    if (attempt > MAX_RECONNECT_ATTEMPTS) {
      console.error('[IVS Stages] ❌❌ Max reconnect attempts (10) reached. Giving up.');
      onReconnectFailed?.();
      toast.error('通話の再接続に失敗しました。通話を終了してください。');
      return;
    }

    // 🔥 EXPONENTIAL BACKOFF WITH MOBILE TOLERANCE
    // 指数バックオフ: 1s, 2s, 4s, 8s, 16s, 30s, 30s, 30s, 30s, 30s（最後は30s固定で粘る）
    const delayMs = attempt <= 6 
      ? Math.min(1000 * Math.pow(2, attempt - 1), 30000) 
      : 30000;
    
    console.log(`[IVS Stages] 🔄 Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS} in ${delayMs}ms`);

    // 最初の3回は通知 → 4回目以降は静かに（ユーザーを惑わさない）
    if (attempt <= 3) {
      onReconnecting?.(attempt);
      toast.warning(`再接続中... (${attempt}/${MAX_RECONNECT_ATTEMPTS})`);
    } else {
      console.log('[IVS Stages] 🔄 Reconnecting silently in background...');
    }

    reconnectTimerRef.current = setTimeout(() => {
      console.log(`[IVS Stages] 🔄 Attempting reconnect #${attempt}...`);
      join(stagesToken, IVSClient, true);
    }, delayMs);
  }, [join, onReconnecting, onReconnectFailed]);

  useEffect(() => {
    if (!enabled || !call || !localStream || !user) return;

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SDK 存在確認 + Stages API の場所を特定
    // amazon-ivs-web-broadcast.js は window.IVSBroadcastClient を公開するが
    // Stages API は IVSBroadcastClient 自体または IVSBroadcastClient.Stage に存在する
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const rawClient = window.IVSBroadcastClient;
    console.log('[IVS Stages] 🔍 window.IVSBroadcastClient:', typeof rawClient);
    console.log('[IVS Stages] 🔍 keys:', rawClient ? Object.keys(rawClient).join(', ') : 'N/A');

    if (!rawClient) {
      console.error('[IVS Stages] ❌ SDK not loaded. Check index.html script tag for amazon-ivs-web-broadcast.js');
      return;
    }

    // Stages API の場所を探す: rawClient.Stage または rawClient 自体
    let IVSClient = rawClient;
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║ 🔎 STAGE API LOCATION CHECK                       ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('[IVS Stages] Checking rawClient.Stage:', typeof rawClient.Stage);
    console.log('[IVS Stages] Checking rawClient.StageEvents:', typeof rawClient.StageEvents);

    if (!rawClient.Stage && !rawClient.StageEvents) {
      console.warn('[IVS Stages] ⚠️ Stage API not found on IVSBroadcastClient. Searching window...');
      if (window.Stage && window.StageEvents) {
        IVSClient = window;
        console.log('[IVS Stages] ✅✅ FOUND: Stage API on window directly');
      } else {
        console.error('[IVS Stages] ❌❌ CRITICAL: Stage / StageEvents not found anywhere!');
        console.error('[IVS Stages] ❌ SDK version mismatch or amazon-ivs-web-broadcast.js not loaded');
        console.error('[IVS Stages] Available on window:', Object.keys(window).filter(k => k.toLowerCase().includes('ivs') || k.toLowerCase().includes('stage')).join(', '));
        return;
      }
    } else {
      console.log('[IVS Stages] ✅✅ Stage API FOUND on IVSBroadcastClient');
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
      console.error('[IVS Stages] ❌ No token available. chime_attendee_caller:', !!call.chime_attendee_caller, '| chime_attendee_callee:', !!call.chime_attendee_callee);
      return;
    }

    // ローカルストリームのトラック状態確認
    const vTracks = localStream.getVideoTracks();
    const aTracks = localStream.getAudioTracks();
    console.log('[IVS Stages] 📹 Local stream track state:', {
      videoTracks: vTracks.length,
      audioTracks: aTracks.length,
      videoEnabled: vTracks[0]?.enabled,
      audioEnabled: aTracks[0]?.enabled,
      videoReadyState: vTracks[0]?.readyState,
      audioReadyState: aTracks[0]?.readyState,
    });

    if (vTracks.length === 0 && aTracks.length === 0) {
      console.error('[IVS Stages] ❌ No local tracks available to publish!');
      return;
    }

    cancelledRef.current = false;
    reconnectAttemptRef.current = 0;

    join(stagesToken, IVSClient, false);

    return cleanup;
  }, [enabled, call?.id, call?.chime_attendee_caller, call?.chime_attendee_callee, localStream, user?.email]);
}