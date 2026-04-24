import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Volume2, VolumeX } from "lucide-react";

export default function ViewerStream({ streamId, stream }) {
  const videoRef     = useRef(null);
  const sessionRef   = useRef(null);
  const isMountedRef = useRef(true);
  const retryTimerRef = useRef(null);

  const [ready, setReady]     = useState(false);
  const [muted, setMuted]     = useState(false);
  const [status, setStatus]   = useState("待機中...");
  const [retryKey, setRetryKey] = useState(0);

  const isWebRTC    = stream?.stream_type === "webrtc";
  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;

  // ─── Chime WebRTC 視聴者接続 ───────────────────────────────────────
  useEffect(() => {
    if (!isWebRTC || !streamId) return;

    isMountedRef.current = true;

    // 5秒後に自動トリガー（Socket通知を待たない）
    const forceStartTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      console.log("[ViewerStream] ⏱ 5秒経過 → 強制接続開始");
      initChime();
    }, 5000);

    // 即時も試みる
    initChime();

    async function initChime() {
      if (!isMountedRef.current) return;
      try {
        setStatus("Joining...");
        console.log("[ViewerStream] 🚀 Chime接続開始");

        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'viewer',
        });

        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res.data;
        if (!Meeting || !Attendee) throw new Error("Meeting/Attendee取得失敗");

        setStatus("SDK init...");

        const {
          DefaultMeetingSession,
          MeetingSessionConfiguration,
          DefaultDeviceController,
          ConsoleLogger,
          LogLevel,
        } = await import('amazon-chime-sdk-js');

        if (!isMountedRef.current) return;

        const logger           = new ConsoleLogger('ChimeViewer', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        const configuration    = new MeetingSessionConfiguration(Meeting, Attendee);
        const meetingSession   = new DefaultMeetingSession(configuration, logger, deviceController);
        sessionRef.current     = meetingSession;

        const audioVideo = meetingSession.audioVideo;

        // ─── 問答無用バインド ───────────────────────────────────
        audioVideo.addObserver({
          videoTileDidUpdate: (tileState) => {
            if (!isMountedRef.current) return;
            console.log("[ViewerStream] tile:", tileState.tileId, "local:", tileState.localTile, "active:", tileState.active);

            // localTile === false なら即バインド（IDもステータスも確認しない）
            if (!tileState.localTile && videoRef.current) {
              console.log("[ViewerStream] 🎯 即バインド! tileId:", tileState.tileId);
              audioVideo.bindVideoElement(tileState.tileId, videoRef.current);
              // ローディング強制解除
              setReady(true);
              setStatus("Joined ✅");
            }
          },
          videoTileWasRemoved: (tileId) => {
            console.log("[ViewerStream] tile removed:", tileId);
            setStatus("映像停止");
          },
          audioVideoDidStart: () => {
            setStatus("Connected");
            console.log("[ViewerStream] ✅ audioVideoDidStart");
          },
          audioVideoDidStop: (s) => {
            console.log("[ViewerStream] stop:", s?.statusCode());
            if (isMountedRef.current) setStatus("切断 → リトライ中...");
            retryTimerRef.current = setTimeout(() => {
              if (isMountedRef.current) setRetryKey(k => k + 1);
            }, 4000);
          },
        });

        // 音声出力
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
        audioVideo.bindAudioElement(audioEl);

        // マイク入力（視聴者は不要だが初期化）
        try {
          const inputs = await audioVideo.listAudioInputDevices();
          if (inputs.length > 0) await audioVideo.startAudioInput(inputs[0].deviceId);
        } catch (e) {
          console.warn("[ViewerStream] 音声入力スキップ:", e.message);
        }

        await audioVideo.start();
        setStatus("Joined");
        console.log("[ViewerStream] ✅ セッション開始");

        // Attendee記録
        try {
          await base44.functions.invoke('liveStreamAttendeeManager', {
            stream_id: streamId,
            action: 'join',
            attendee_id: Attendee.AttendeeId,
          });
        } catch (e) {}

      } catch (err) {
        if (!isMountedRef.current) return;
        console.error("[ViewerStream] ❌ 接続失敗:", err.message);
        setStatus(`失敗 → 5秒後リトライ`);
        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) setRetryKey(k => k + 1);
        }, 5000);
      }
    }

    return () => {
      isMountedRef.current = false;
      clearTimeout(forceStartTimer);
      clearTimeout(retryTimerRef.current);
      try { sessionRef.current?.audioVideo?.stop(); } catch (e) {}
      sessionRef.current = null;
    };
  }, [isWebRTC, streamId, retryKey]);

  // ─── IVS プレイヤー ────────────────────────────────────────────────
  useEffect(() => {
    if (isWebRTC) return;
    if (!playbackUrl || stream?.status !== "live") return;

    let isMounted = true;
    (async () => {
      try {
        const { create, isPlayerSupported } = await import("amazon-ivs-player");
        if (!isPlayerSupported) return;
        const { PlayerState, PlayerEventType } = await import("amazon-ivs-player");
        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });
        player.attachHTMLVideoElement(videoRef.current);
        player.addEventListener(PlayerEventType.STATE_CHANGED, (s) => {
          if (!isMounted) return;
          if (s === PlayerState.PLAYING) { setReady(true); setStatus("再生中"); }
        });
        player.load(playbackUrl);
        player.play();
      } catch (err) {
        if (isMounted) setStatus("IVSエラー: " + err.message);
      }
    })();
    return () => { isMounted = false; };
  }, [playbackUrl, stream?.status]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className="w-full h-full object-contain"
        style={{ display: ready ? "block" : "none" }}
      />

      {/* ローディング */}
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-red-400 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-white">
            {stream?.status === "live" ? "接続中..." : "配信者の接続を待っています..."}
          </p>
        </div>
      )}

      {/* ミュートボタン */}
      {ready && (
        <button
          onClick={() => setMuted(!muted)}
          className="absolute bottom-4 right-4 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70"
        >
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      )}

      {/* デバッグステータス（常時表示） */}
      <div className="absolute top-2 left-2 bg-black/70 border border-cyan-500/40 rounded px-2 py-1 text-[10px] font-mono text-cyan-300 pointer-events-none z-50">
        {status}
      </div>
    </div>
  );
}