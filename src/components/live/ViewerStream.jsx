/**
 * ViewerStream — 視聴者専用 Chime 受信エンジン
 * - 課金確認済み（hasTicket=true）の場合のみ親からマウントされる
 * - 入力デバイス（マイク/カメラ）は一切使用しない、受信専用
 * - デバッグステータスを常時画面表示
 */
import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Volume2, VolumeX } from "lucide-react";

export default function ViewerStream({ streamId, stream }) {
  const videoRef      = useRef(null);
  const audioElRef    = useRef(null);
  const sessionRef    = useRef(null);
  const isMountedRef  = useRef(true);
  const retryTimerRef = useRef(null);
  const initCalledRef = useRef(false);
  const bindTimerRef  = useRef(null);
  const currentTileRef = useRef(null);
  const deviceConflictRef = useRef(false);

  const tileTimeoutRef = useRef(null);
  const [ready, setReady]       = useState(false);
  const [muted, setMuted]       = useState(true); // 最初はミュート→autoplay突破
  const [phase, setPhase]       = useState("チケット確認済み ✅ — Meeting入室中...");
  const [retryKey, setRetryKey] = useState(0);
  const [bindAttempt, setBindAttempt] = useState(0);
  const [deviceConflict, setDeviceConflict] = useState(false);

  const isWebRTC    = stream?.stream_type === "webrtc" || !stream?.ivs_playback_url;
  const playbackUrl = stream?.ivs_playback_url;

  // ─── Chime WebRTC 受信専用 ────────────────────────────────────────
  useEffect(() => {
    if (!isWebRTC || !streamId) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;

    isMountedRef.current = true;

    async function initChime() {
      if (!isMountedRef.current) return;
      try {
        setPhase("Meeting入室中... 🔄");
        console.log("[ViewerStream] 🚀 Chime接続開始 streamId:", streamId);

        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'viewer',
        });

        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res?.data || {};
        if (!Meeting || !Attendee) {
          throw new Error(`Meeting/Attendee取得失敗: ${JSON.stringify(res?.data)}`);
        }

        setPhase("SDK初期化中... 🔧");
        console.log("[ViewerStream] Meeting:", Meeting.MeetingId, "Attendee:", Attendee.AttendeeId);

        const {
          DefaultMeetingSession,
          MeetingSessionConfiguration,
          DefaultDeviceController,
          ConsoleLogger,
          LogLevel,
        } = await import('amazon-chime-sdk-js');

        if (!isMountedRef.current) return;

        const logger      = new ConsoleLogger('ChimeViewer', LogLevel.INFO);
        const deviceCtrl  = new DefaultDeviceController(logger);
        const config      = new MeetingSessionConfiguration(Meeting, Attendee);

        // ★ TURN強制中継：5G/NAT環境でP2Pが失敗してもAWS中継サーバー経由で必ず繋ぐ
        config.iceTransportPolicy = 'relay'; // 'relay' = TURN経由強制
        console.log("[ViewerStream] 🔧 ICE Transport Policy: relay（TURN強制中継モード）");

        const session     = new DefaultMeetingSession(config, logger, deviceCtrl);
        sessionRef.current = session;

        const av = session.audioVideo;

        av.addObserver({
          videoTileDidUpdate: (tileState) => {
            if (!isMountedRef.current) return;
            console.log("[ViewerStream] 🎯 tileDidUpdate FIRED:", {
              tileId: tileState.tileId,
              localTile: tileState.localTile,
              active: tileState.active,
              isContent: tileState.isContent,
            });

            // リモートタイル（localTile=false）を検出
            if (!tileState.localTile && tileState.tileId) {
              currentTileRef.current = tileState.tileId;
              console.log(`[ViewerStream] 🎯 リモートタイル確定！ ID: ${tileState.tileId}`);
              
              // ★ 執拗な再バインド開始（0.5秒おきに10回）
              setPhase("映像バインド中（ストーカー・モード）...");
              let attempts = 0;
              clearInterval(bindTimerRef.current);
              bindTimerRef.current = setInterval(() => {
                if (!isMountedRef.current || !videoRef.current) {
                  clearInterval(bindTimerRef.current);
                  return;
                }
                attempts++;
                console.log(`[ViewerStream] 🔥 再バインド試行 #${attempts}/10 - tileId: ${tileState.tileId}`);
                try {
                  av.bindVideoElement(tileState.tileId, videoRef.current);
                  console.log(`[ViewerStream] ✅ bindVideoElement 成功 (#${attempts})`);
                  setPhase("映像受信中 🟢");
                  setReady(true);
                  setBindAttempt(attempts);
                } catch (err) {
                  console.error(`[ViewerStream] ❌ bind失敗 (#${attempts}):`, err.message);
                }
                if (attempts >= 10) {
                  clearInterval(bindTimerRef.current);
                  console.log(`[ViewerStream] 🛑 10回の再バインド終了`);
                }
              }, 500); // 0.5秒ごと
            } else {
              console.warn(`[ViewerStream] ⚠️ tileState条件不満たす: localTile=${tileState.localTile}, tileId=${tileState.tileId}`);
            }
          },
          videoTileWasRemoved: (tileId) => {
            console.log("[ViewerStream] tile removed:", tileId);
            setPhase("映像停止 — 配信者の映像が止まりました");
          },
          audioVideoDidStart: () => {
            console.log("[ViewerStream] ✅ audioVideoDidStart FIRED");
            setPhase("映像受信待機中... 📡");

            // ★ ビデオ受信を明示的に有効化
            try {
              av.startVideoSubscriptions?.();
              console.log("[ViewerStream] ✅ startVideoSubscriptions 呼び出し成功");
            } catch (e) {
              console.warn("[ViewerStream] startVideoSubscriptions N/A:", e.message);
            }

            // ★ 100msごとにタイル強制検索（5G速度対応）
            const searchTimer = setInterval(() => {
              if (!isMountedRef.current) { clearInterval(searchTimer); return; }
              try {
                const activeTiles = av.getAllRemoteVideoTiles?.() || [];
                console.log(`[ViewerStream] 🔍 タイル検索: ${activeTiles.length}個`);
                activeTiles.forEach(tile => {
                  const state = tile.state?.();
                  console.log(`  tileId: ${state?.tileId}, active: ${state?.active}, local: ${state?.localTile}`);
                  if (state?.tileId && !state?.localTile && !currentTileRef.current) {
                    currentTileRef.current = state.tileId;
                    console.log(`[ViewerStream] 🎯 強制タイル取得: ${state.tileId}`);
                    if (videoRef.current) {
                      av.bindVideoElement(state.tileId, videoRef.current);
                      setPhase("映像バインド完了 🟢");
                      setReady(true);
                    }
                  }
                });
              } catch (e) {
                console.warn("[ViewerStream] タイル検索失敗:", e.message);
              }
              if (currentTileRef.current) clearInterval(searchTimer);
            }, 100); // 100ms間隔（5G対応）

            // ★ 10秒待ってもtileが来なければセッション再接続
            clearTimeout(tileTimeoutRef.current);
            tileTimeoutRef.current = setTimeout(() => {
              if (!isMountedRef.current || currentTileRef.current) return;
              console.warn("[ViewerStream] ⏰ 10秒タイムアウト → セッション再接続");
              setPhase("タイルタイムアウト → 再接続中...");
              try { sessionRef.current?.audioVideo?.stop(); } catch (_) {}
              sessionRef.current = null;
              initCalledRef.current = false;
              setRetryKey(k => k + 1);
            }, 10000);
          },
          audioVideoDidStartConnecting: (reconnecting) => {
            setPhase(reconnecting ? "再接続中... 🔄" : "Meeting接続確立中... 🔌");
          },
          audioVideoDidStop: (sessionStatus) => {
            const code = sessionStatus?.statusCode?.();
            console.log("[ViewerStream] ⚠️ audioVideoDidStop statusCode:", code);
            if (isMountedRef.current) {
              setPhase(`接続終了(${code})`);
              setReady(false);
            }
          },
          audioJoinedFromAnotherDevice: () => {
            console.error("[ViewerStream] 🚨🚨🚨 AudioJoinedFromAnotherDevice: 別デバイスで接続検出！");
            deviceConflictRef.current = true;
            setDeviceConflict(true);
            setPhase("🚨 エラー: 別のデバイスで既に接続中です。すべてのデバイスを閉じてください。");
            setReady(false);
            // 無限ループ防止：再接続禁止
            clearTimeout(retryTimerRef.current);
            clearInterval(bindTimerRef.current);
          },
        });

        // ★ 音声出力専用エレメント（入力は一切しない）
        if (!audioElRef.current) {
          const audioEl = document.createElement('audio');
          audioEl.autoplay = true;
          audioEl.style.display = 'none';
          document.body.appendChild(audioEl);
          audioElRef.current = audioEl;
        }
        av.bindAudioElement(audioElRef.current);

        // ★ マイク・カメラ入力は完全スキップ（視聴者は不要）
        // startAudioInput / startVideoInput は呼ばない

        setPhase("Meeting接続中... ⏳");
        await av.start();
        console.log("[ViewerStream] ✅ av.start() 完了");

        // 入場記録
        try {
          await base44.functions.invoke('liveStreamAttendeeManager', {
            stream_id: streamId,
            action: 'join',
            attendee_id: Attendee.AttendeeId,
          });
        } catch (_) {}

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("[ViewerStream] ❌ 接続失敗:", err.message);
        setPhase(`接続失敗: ${err.message} → 5秒後リトライ 🔄`);
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            initCalledRef.current = false;
            setRetryKey(k => k + 1);
          }
        }, 5000);
      }
    }

    initChime();

    return () => {
      isMountedRef.current = false;
      clearTimeout(retryTimerRef.current);
      clearTimeout(tileTimeoutRef.current);
      clearInterval(bindTimerRef.current);
      
      // ★ クライアント完全破棄：セッション・タイル完全削除
      try {
        if (sessionRef.current?.audioVideo) {
          console.log("[ViewerStream] 🧹 audioVideo.stop() 実行");
          sessionRef.current.audioVideo.stop();
        }
      } catch (_) {}
      
      // メモリから完全削除
      if (sessionRef.current) {
        console.log("[ViewerStream] 🗑️ meetingSession をメモリから完全削除");
        sessionRef.current = null;
      }
      
      currentTileRef.current = null;
      
      // 音声エレメント後片付け
      if (audioElRef.current) {
        audioElRef.current.remove();
        audioElRef.current = null;
      }
    };
  }, [isWebRTC, streamId, retryKey]);

  // ─── IVS プレイヤー（WebRTC以外の場合） ──────────────────────────
  useEffect(() => {
    if (isWebRTC) return;
    if (!playbackUrl || stream?.status !== "live") return;

    setPhase("IVSプレイヤー起動中... 📺");
    let isMounted = true;

    (async () => {
      try {
        const { create, isPlayerSupported } = await import("amazon-ivs-player");
        if (!isPlayerSupported) { setPhase("IVS非対応ブラウザ"); return; }
        const { PlayerState, PlayerEventType } = await import("amazon-ivs-player");
        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });
        player.attachHTMLVideoElement(videoRef.current);
        player.addEventListener(PlayerEventType.STATE_CHANGED, (s) => {
          if (!isMounted) return;
          if (s === PlayerState.PLAYING) { setReady(true); setPhase("IVS再生中 🟢"); }
          else setPhase(`IVS状態: ${s}`);
        });
        player.load(playbackUrl);
        player.play();
      } catch (err) {
        if (isMounted) setPhase("IVSエラー: " + err.message);
      }
    })();

    return () => { isMounted = false; };
  }, [playbackUrl, stream?.status, isWebRTC]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* ★ シンプルな video タグ直結：極限までシンプル */}
      <video
        ref={videoRef}
        id="chime-video"
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "#000",
          display: "block", // 常時表示（映像が来たら即見える）
        }}
      />

      {/* ローディング表示 */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-black">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <div className="absolute inset-3 rounded-full bg-red-500/20 flex items-center justify-center">
              <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-1 px-6">
            <p className="text-white font-semibold text-sm">
              {stream?.status === "live" ? "接続中..." : "配信開始を待っています"}
            </p>
            <p className="text-white/50 text-xs">
              {stream?.status !== "live" && "配信者が開始するとすぐに繋がります"}
            </p>
          </div>
        </div>
      )}

      {/* ミュートボタン */}
      {ready && (
        <button
          onClick={() => setMuted(v => !v)}
          className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors z-10"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}

      {/* ★ デバッグステータス＆デバイスコンフリクト警告 */}
      <div className={`absolute top-2 left-2 max-w-[85%] rounded px-2.5 py-1.5 text-[10px] font-mono pointer-events-none z-50 leading-relaxed ${deviceConflict ? 'bg-red-900/90 border-2 border-red-500' : 'bg-black/90 border-2 border-cyan-400'}`}>
        <div className={deviceConflict ? 'text-red-300' : 'text-cyan-300'}>{phase}</div>
        {!deviceConflict && (
          <div className="text-[9px] text-cyan-500 mt-0.5">
            tileId: {currentTileRef.current || "pending"} | bind試行: {bindAttempt}/10
          </div>
        )}
      </div>
    </div>
  );
}