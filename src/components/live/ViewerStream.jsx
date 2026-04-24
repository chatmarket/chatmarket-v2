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

  const [ready, setReady]       = useState(false);
  const [muted, setMuted]       = useState(false);
  const [phase, setPhase]       = useState("チケット確認済み ✅ — Meeting入室中...");
  const [retryKey, setRetryKey] = useState(0);
  const [bindAttempt, setBindAttempt] = useState(0);

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

        const logger      = new ConsoleLogger('ChimeViewer', LogLevel.WARN);
        // ★ 視聴者は NullDeviceController ではなく DefaultDeviceController を使うが
        //   入力デバイスは一切 start しない（受信のみ）
        const deviceCtrl  = new DefaultDeviceController(logger);
        const config      = new MeetingSessionConfiguration(Meeting, Attendee);
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
            setPhase("映像受信待機中... 📡 (タイルID待機中)");
            
            // ★ 強制的にアクティブなタイルを探す（1秒ごと）
            const searchTimer = setInterval(async () => {
              if (!isMountedRef.current) { clearInterval(searchTimer); return; }
              try {
                // Chime SDK が内部的に保持しているタイル情報を取得
                const activeTiles = av.getAllRemoteVideoTiles?.() || [];
                console.log(`[ViewerStream] 🔍 アクティブなリモートタイル検索: ${activeTiles.length}個`);
                activeTiles.forEach(tile => {
                  console.log(`  - tileId: ${tile.tileId}, state: ${JSON.stringify(tile)}`);
                  if (tile.tileId && !currentTileRef.current) {
                    currentTileRef.current = tile.tileId;
                    console.log(`[ViewerStream] 🎯 強制取得したタイルID: ${tile.tileId}`);
                  }
                });
              } catch (err) {
                console.warn(`[ViewerStream] ⚠️ タイル検索失敗: ${err.message}`);
              }
              if (currentTileRef.current) clearInterval(searchTimer);
            }, 1000);
          },
          audioVideoDidStartConnecting: (reconnecting) => {
            setPhase(reconnecting ? "再接続中... 🔄" : "Meeting接続確立中... 🔌");
          },
          audioVideoDidStop: (sessionStatus) => {
            const code = sessionStatus?.statusCode?.();
            console.log("[ViewerStream] stop statusCode:", code);
            if (isMountedRef.current) {
              setPhase(`接続終了(${code}) → 5秒後リトライ`);
              setReady(false);
              retryTimerRef.current = setTimeout(() => {
                if (isMountedRef.current) {
                  initCalledRef.current = false;
                  setRetryKey(k => k + 1);
                }
              }, 5000);
            }
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
      clearInterval(bindTimerRef.current);
      try { sessionRef.current?.audioVideo?.stop(); } catch (_) {}
      sessionRef.current = null;
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
        autoPlay={true}
        playsInline={true}
        muted={muted}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          backgroundColor: "#000",
          display: ready ? "block" : "none"
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

      {/* ★ デバッグステータス（常時表示・詳細） */}
      <div className="absolute top-2 left-2 max-w-[85%] bg-black/90 border-2 border-cyan-400 rounded px-2.5 py-1.5 text-[10px] font-mono text-cyan-300 pointer-events-none z-50 leading-relaxed">
        <div>{phase}</div>
        <div className="text-[9px] text-cyan-500 mt-0.5">
          tileId: {currentTileRef.current || "pending"} | bind試行: {bindAttempt}/10
        </div>
      </div>
    </div>
  );
}