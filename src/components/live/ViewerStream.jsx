import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Volume2, VolumeX, Wifi, WifiOff, Settings, Lock, ChevronRight } from "lucide-react";

const QUALITY_OPTIONS = [
  { label: "SD",  value: "480p",  minPrice: 0,   color: "text-zinc-300",   badgeColor: "bg-zinc-600",   desc: "480p / 標準画質" },
  { label: "HD",  value: "720p",  minPrice: 55,  color: "text-blue-300",   badgeColor: "bg-blue-600",   desc: "720p / 高画質" },
  { label: "FHD", value: "1080p", minPrice: 150, color: "text-yellow-300", badgeColor: "bg-yellow-500", desc: "1080p / フルHD" },
];

// デフォルトは常に720p（SD）に強制 — 確実に映ることを最優先
function getDefaultQuality(price) {
  if (price >= 55) return "720p";
  return "480p";
}

function getUpsellMessage(price) {
  if (price < 55)  return "高画質（HD以上）は55円以上の配信で体験できます ✨";
  if (price < 150) return "最高画質（FHD）は150円以上の配信でご利用いただけます 🌟";
  return null;
}

export default function ViewerStream({ streamId, stream }) {
  const videoRef     = useRef(null);
  const playerRef    = useRef(null);
  const sessionRef   = useRef(null);
  const retryTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const [ready, setReady]               = useState(false);
  const [muted, setMuted]               = useState(false);
  const [error, setError]               = useState(null);
  const [connQuality, setConnQuality]   = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [status, setStatus]             = useState("初期化待機中...");
  const [retryKey, setRetryKey]         = useState(0); // 自動リフレッシュ用
  const videoTimeoutRef                 = useRef(null);

  const streamPrice      = stream?.price || 0;
  const availableQualities = QUALITY_OPTIONS.filter(q => streamPrice >= q.minPrice);
  const upsellMsg        = getUpsellMessage(streamPrice);
  const [selectedQuality, setSelectedQuality] = useState(getDefaultQuality(streamPrice));

  useEffect(() => {
    setSelectedQuality(getDefaultQuality(streamPrice));
  }, [streamPrice]);

  const isWebRTC   = stream?.stream_type === "webrtc";
  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;

  // ─── 10秒タイムアウト → 自動リセット ──────────────────────────────
  useEffect(() => {
    if (!isWebRTC || ready) return;
    videoTimeoutRef.current = setTimeout(() => {
      if (!ready && isMountedRef.current) {
        console.warn('[ViewerStream] ⏱ 10秒タイムアウト → 接続リセット');
        setStatus("タイムアウト - 再接続中...");
        try { sessionRef.current?.audioVideo?.stop(); } catch (e) {}
        sessionRef.current = null;
        setRetryKey(k => k + 1);
      }
    }, 10000);
    return () => clearTimeout(videoTimeoutRef.current);
  }, [isWebRTC, ready, retryKey]);

  // ─── Chime WebRTC 視聴者接続 ───────────────────────────────────────
  useEffect(() => {
    if (!isWebRTC || !streamId) return;

    isMountedRef.current = true;
    let retryCount = 0;

    const initChime = async () => {
      if (!isMountedRef.current) return;
      try {
        setStatus(`Chime接続中... (試行${retryCount + 1})`);
        console.log(`[ViewerStream] 🚀 Chime接続開始 (試行${retryCount + 1})`);

        // ── Step1: バックエンドからMeeting/Attendee情報を取得 ──
        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'viewer',
        });

        if (!isMountedRef.current) return;

        const { Meeting, Attendee } = res.data;
        if (!Meeting || !Attendee) throw new Error("Meeting/Attendee情報が取得できません");

        console.log('[ViewerStream] ✅ Meeting取得:', Meeting.MeetingId, '| Attendee:', Attendee.AttendeeId);
        setStatus("SDK初期化中...");

        // ── Step2: Chime SDK セッション構築 ──
        const {
          DefaultMeetingSession,
          MeetingSessionConfiguration,
          DefaultDeviceController,
          ConsoleLogger,
          LogLevel,
        } = await import('amazon-chime-sdk-js');

        const logger           = new ConsoleLogger('ChimeViewer', LogLevel.WARN);
        const deviceController = new DefaultDeviceController(logger);
        const configuration    = new MeetingSessionConfiguration(Meeting, Attendee);
        const meetingSession   = new DefaultMeetingSession(configuration, logger, deviceController);
        sessionRef.current     = meetingSession;

        const audioVideo = meetingSession.audioVideo;

        // ── Step3: タイルオブザーバー（リモート映像を即バインド）──
        audioVideo.addObserver({
          videoTileDidUpdate: (tileState) => {
            if (!isMountedRef.current) return;
            console.log('[ViewerStream] videoTileDidUpdate:', {
              tileId: tileState.tileId,
              localTile: tileState.localTile,
              active: tileState.active,
              isContent: tileState.isContent,
            });

            // ローカルタイルは無視、リモートタイルを即バインド
            if (tileState.localTile || tileState.isContent) return;
            if (!videoRef.current) return;

            console.log('[ViewerStream] 🎯 リモートタイル検知 → 即バインド tileId:', tileState.tileId);
            audioVideo.bindVideoElement(tileState.tileId, videoRef.current);
            setReady(true);
            setConnQuality("good");
            setStatus("📡 映像受信中");
            if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
          },
          videoTileWasRemoved: (tileId) => {
            console.log('[ViewerStream] videoTileWasRemoved:', tileId);
            setReady(false);
            setStatus("配信者が映像を停止しました");
          },
          audioVideoDidStart: () => {
            console.log('[ViewerStream] ✅ audioVideoDidStart');
            setStatus("接続完了 - 映像待機中...");
          },
          audioVideoDidStop: (sessionStatus) => {
            console.log('[ViewerStream] audioVideoDidStop:', sessionStatus?.statusCode());
          },
        });

        // ── Step4: 音声出力バインド ──
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        document.body.appendChild(audioEl);
        audioVideo.bindAudioElement(audioEl);

        // ── Step5: 音声入力（視聴者はマイク不要だが初期化は必要） ──
        try {
          const audioInputs = await audioVideo.listAudioInputDevices();
          if (audioInputs.length > 0) {
            await audioVideo.startAudioInput(audioInputs[0].deviceId);
          }
        } catch (e) {
          console.warn('[ViewerStream] 音声入力スキップ:', e.message);
        }

        // ── Step6: セッション開始（視聴者はビデオ送信しない）──
        await audioVideo.start();
        console.log('[ViewerStream] ✅ セッション開始完了');

        // 視聴者は映像送信しない（startLocalVideoTile は呼ばない）
        // リモートタイルの受信は自動的に開始される

        // Attendee入室記録
        try {
          await base44.functions.invoke('liveStreamAttendeeManager', {
            stream_id: streamId,
            action: 'join',
            attendee_id: Attendee.AttendeeId,
          });
        } catch (e) {
          console.warn('[ViewerStream] Attendee記録失敗（非致命的）:', e.message);
        }

      } catch (err) {
        retryCount++;
        if (!isMountedRef.current) return;
        console.error(`[ViewerStream] ❌ 接続失敗 (試行${retryCount}):`, err.message);
        setStatus(`接続失敗 (${retryCount}回目) - 5秒後リトライ...`);

        retryTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) initChime();
        }, 5000);
      }
    };

    // chime_meeting_id の存在を待たず即時接続（バックエンドが作成してくれる）
    initChime();

    return () => {
      isMountedRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try {
        sessionRef.current?.audioVideo?.stop();
      } catch (e) {}
      sessionRef.current = null;
    };
  }, [isWebRTC, streamId, retryKey]); // retryKey が変わると再接続

  // ─── IVS プレイヤー（WebRTC でない場合）────────────────────────────
  useEffect(() => {
    if (isWebRTC) return;
    if (!playbackUrl || stream?.status !== "live") return;

    let isMounted = true;
    (async () => {
      try {
        const { create, isPlayerSupported } = await import("amazon-ivs-player");
        if (!isPlayerSupported) { setError("このブラウザはIVS Playerに対応していません"); return; }
        const { PlayerState, PlayerEventType } = await import("amazon-ivs-player");
        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });
        playerRef.current = player;
        player.attachHTMLVideoElement(videoRef.current);
        player.addEventListener(PlayerEventType.STATE_CHANGED, (s) => {
          if (!isMounted) return;
          if (s === PlayerState.PLAYING) { setReady(true); setConnQuality("good"); }
          if (s === PlayerState.BUFFERING) setConnQuality("poor");
        });
        player.addEventListener(PlayerEventType.ERROR, () => {
          if (!isMounted) return;
          setError("映像の読み込みに失敗しました。");
        });
        player.load(playbackUrl);
        player.play();
      } catch (err) {
        if (!isMounted) return;
        setError("プレイヤー初期化失敗: " + err.message);
      }
    })();
    return () => {
      isMounted = false;
      playerRef.current?.delete?.();
      playerRef.current = null;
    };
  }, [playbackUrl, stream?.status]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  const currentQ = QUALITY_OPTIONS.find(q => q.value === selectedQuality) ?? QUALITY_OPTIONS[0];

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
      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-red-400 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-white">
            {stream?.status === "live" ? "接続中..." : "配信者の接続を待っています..."}
          </p>
          <p className="text-sm text-white/50">{status}</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 font-bold">{error}</p>
          <button onClick={() => { setError(null); setReady(false); }} className="text-sm text-white/60 underline">再試行</button>
        </div>
      )}

      {/* 視聴中コントロール */}
      {ready && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${connQuality === "poor" ? "bg-yellow-500/80 text-black" : "bg-black/50 text-green-400"}`}>
            {connQuality === "poor" ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {connQuality === "poor" ? "低品質" : "良好"}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-bold hover:bg-black/90 border border-white/10"
            >
              <Settings className="w-3 h-3" />
              <span className={currentQ.color}>{currentQ.label}</span>
            </button>
            {showQualityMenu && (
              <div className="absolute bottom-9 right-0 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 w-64">
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                  <p className="text-xs font-black text-white">画質設定</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">現在の配信価格: <span className="text-primary font-bold">¥{streamPrice}</span></p>
                </div>
                {upsellMsg && (
                  <div className="px-4 py-2.5 bg-primary/10 border-b border-zinc-800 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary leading-relaxed">{upsellMsg}</p>
                  </div>
                )}
                <div className="py-1">
                  {QUALITY_OPTIONS.map(q => {
                    const unlocked = streamPrice >= q.minPrice;
                    const isSelected = selectedQuality === q.value;
                    return (
                      <button
                        key={q.value}
                        onClick={() => { if (unlocked) { setSelectedQuality(q.value); setShowQualityMenu(false); } }}
                        disabled={!unlocked}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${isSelected ? "bg-primary/15" : unlocked ? "hover:bg-zinc-800" : "opacity-40 cursor-not-allowed"}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${q.badgeColor} text-white`}>{q.label}</span>
                          <div className="text-left">
                            <p className={`text-xs font-bold ${isSelected ? "text-primary" : unlocked ? "text-white" : "text-zinc-600"}`}>{q.desc}</p>
                            <p className="text-[10px] text-zinc-500">{q.minPrice === 0 ? "すべての配信で利用可能" : `¥${q.minPrice}以上の配信`}</p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected && <span className="text-primary text-xs font-black">✓</span>}
                          {!unlocked && <Lock className="w-3.5 h-3.5 text-zinc-600" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
                {availableQualities.length === 1 && (
                  <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-500 text-center">この価格帯ではSD画質となります</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button onClick={() => setMuted(!muted)} className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70">
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* デバッグ情報 */}
      <div className="absolute top-4 left-4 bg-black/70 border border-cyan-500/40 rounded-lg px-3 py-2 text-[10px] font-mono text-cyan-300 pointer-events-none">
        📊 {status}
      </div>
    </div>
  );
}