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

  // ★ IVS URLがあれば必ずIVSプレイヤーを使う（stream_type問わず）
  const playbackUrl = stream?.ivs_playback_url;
  const isWebRTC    = !playbackUrl || playbackUrl.trim() === ""; // IVS URLなし（空文字列含む）= Chimeモード
  
  // デバッグ
  useEffect(() => {
    console.log("[ViewerStream] 📊 stream data:", {
      streamId,
      status: stream?.status,
      ivs_playback_url: stream?.ivs_playback_url,
      stream_type: stream?.stream_type,
      isWebRTC,
    });
  }, [stream, streamId]);

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

            // ★ 500msごとにタイル強制サブスクライブ（配信者がまだ送信開始していない場合も対応）
            let pollCount = 0;
            const searchTimer = setInterval(() => {
              if (!isMountedRef.current) { clearInterval(searchTimer); return; }
              pollCount++;

              // タイル既に確定済みなら終了
              if (currentTileRef.current) { clearInterval(searchTimer); return; }

              try {
                // 方法1: getAllRemoteVideoTiles でスキャン
                const activeTiles = av.getAllRemoteVideoTiles?.() || [];
                if (activeTiles.length > 0) {
                  console.log(`[ViewerStream] 🔍 タイルスキャン #${pollCount}: ${activeTiles.length}個発見`);
                  activeTiles.forEach(tile => {
                    const state = tile.state?.();
                    if (state?.tileId && !state?.localTile && !currentTileRef.current) {
                      currentTileRef.current = state.tileId;
                      console.log(`[ViewerStream] 🎯 タイル取得: tileId=${state.tileId}`);
                      if (videoRef.current) {
                        av.bindVideoElement(state.tileId, videoRef.current);
                        setPhase(`映像バインド完了 tileId=${state.tileId} 🟢`);
                        setReady(true);
                      }
                    }
                  });
                }
              } catch (e) {
                console.warn("[ViewerStream] タイルスキャン失敗:", e.message);
              }

              // 30秒（60回）待ってもタイルが来なければ再接続
              if (pollCount >= 60 && !currentTileRef.current) {
                clearInterval(searchTimer);
                console.warn("[ViewerStream] ⏰ 30秒タイムアウト → 再接続");
                setPhase("タイムアウト → 再接続中...");
                try { sessionRef.current?.audioVideo?.stop(); } catch (_) {}
                sessionRef.current = null;
                initCalledRef.current = false;
                setRetryKey(k => k + 1);
              }
            }, 500); // 0.5秒間隔
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
      {/* ★ プロフェッショナル video プレイヤー */}
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
          display: "block",
        }}
      />

      {/* ローディング表示 - プロ仕様 */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-black via-black/80 to-black/95">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-white/20 border-t-primary border-r-primary animate-spin" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-primary/30 to-transparent flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-primary animate-pulse" />
            </div>
          </div>
          <div className="text-center space-y-2 px-6">
            <h3 className="text-white font-bold text-base">
              {stream?.status === "live" ? "配信に接続中" : "配信を待機中"}
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              {stream?.status === "live" 
                ? "配信者と接続しています。少々お待ちください..." 
                : "配信者が配信を開始するとすぐに接続されます"}
            </p>
          </div>
        </div>
      )}

      {/* コントロールバー - プロ仕様 */}
      {ready && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent h-20 flex items-end px-4 py-3 z-20 group hover:from-black hover:via-black/80">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setMuted(v => !v)}
                className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all"
                title={muted ? "ミュート解除" : "ミュート"}
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div className="text-xs text-white/70 font-medium">
                {muted ? "ミュート中" : "音声あり"}
              </div>
            </div>
            <div className="text-xs text-white/60 font-mono">
              {stream?.status === "live" && "● LIVE"}
            </div>
          </div>
        </div>
      )}

      {/* ステータスバッジ - 左上 */}
      {ready && stream?.status === "live" && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500 text-white text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            LIVE
          </div>
          {stream?.viewer_count !== undefined && (
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold border border-white/20">
              👁 {stream.viewer_count}
            </div>
          )}
        </div>
      )}

      {/* デバッグ情報 - 右上（開発時のみ表示） */}
      {!ready && (
        <div className={`absolute top-4 right-4 rounded-lg px-3 py-2 text-xs font-mono pointer-events-none z-50 ${deviceConflict ? 'bg-red-900/95 text-red-200 border border-red-500' : 'bg-black/80 text-cyan-300 border border-cyan-500/50'}`}>
          <div className="font-bold mb-1">{phase}</div>
          {!deviceConflict && (
            <div className="text-[10px] text-cyan-400 opacity-70">
              tileId: {currentTileRef.current || "pending"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}