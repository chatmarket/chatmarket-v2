import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Volume2, VolumeX, Wifi, WifiOff, Settings, Lock, ChevronRight } from "lucide-react";

// 価格帯 → 画質定義
const QUALITY_OPTIONS = [
  { label: "SD", value: "480p", minPrice: 0,   color: "text-zinc-300", badgeColor: "bg-zinc-600",    desc: "480p / 標準画質" },
  { label: "HD", value: "720p", minPrice: 55,  color: "text-blue-300", badgeColor: "bg-blue-600",    desc: "720p / 高画質" },
  { label: "FHD",value: "1080p",minPrice: 150, color: "text-yellow-300",badgeColor:"bg-yellow-500",  desc: "1080p / フルHD" },
];

// 価格から「デフォルト（最高）画質」を決定
function getDefaultQuality(price) {
  const available = QUALITY_OPTIONS.filter(q => price >= q.minPrice);
  return available[available.length - 1]?.value ?? "480p";
}

// アップグレード誘導メッセージ
function getUpsellMessage(price) {
  if (price < 55)  return "高画質（HD以上）は55円以上の配信で体験できます ✨";
  if (price < 150) return "最高画質（FHD）は150円以上の配信でご利用いただけます 🌟";
  return null;
}

export default function ViewerStream({ streamId, stream }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const chimeSessionRef = useRef(null);
  const retryRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [connQuality, setConnQuality] = useState(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [chimeReady, setChimeReady] = useState(false);
  
  // デバッグ情報
  const [debugInfo, setDebugInfo] = useState({
    meetingId: null,
    attendeeId: null,
    tileCount: 0,
    status: "初期化待機中..."
  });

  const streamPrice = stream?.price || 0;
  const availableQualities = QUALITY_OPTIONS.filter(q => streamPrice >= q.minPrice);
  const defaultQuality = getDefaultQuality(streamPrice);
  const upsellMsg = getUpsellMessage(streamPrice);

  const [selectedQuality, setSelectedQuality] = useState(defaultQuality);

  useEffect(() => {
    setSelectedQuality(getDefaultQuality(streamPrice));
  }, [streamPrice]);

  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;
  const isWebRTC = stream?.stream_type === "webrtc";

  // ★ 強制開通ロジック: Socket.io イベント待たずに3秒後に強制接続
  useEffect(() => {
    if (!isWebRTC || !streamId || !stream?.chime_meeting_id) return;

    let isMounted = true;
    let retryCount = 0;

    const initChime = async () => {
      try {
        console.log('[ViewerStream] 🚀 強制Chime初期化開始...');
        setDebugInfo(prev => ({ ...prev, status: "Chime初期化中..." }));

        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'viewer',
        });

        if (!isMounted) return;

        const { Meeting, Attendee } = res.data;
        console.log('[ViewerStream] ✅ Chime接続成功:', {
          meetingId: Meeting.MeetingId,
          attendeeId: Attendee.AttendeeId
        });

        // Attendee記録
        try {
          await base44.functions.invoke('liveStreamAttendeeManager', {
            stream_id: streamId,
            action: 'join',
            attendee_id: Attendee.AttendeeId,
          });
        } catch (e) {
          console.warn('[ViewerStream] Attendee記録失敗（非致命的）:', e.message);
        }

        chimeSessionRef.current = {
          Meeting,
          Attendee,
          audioVideo: null // 後から設定
        };

        setDebugInfo(prev => ({
          ...prev,
          meetingId: Meeting.MeetingId.substring(0, 8),
          attendeeId: Attendee.AttendeeId.substring(0, 8),
          status: "接続待機中..."
        }));

        // Chime SDK初期化（簡易版）
        try {
          const { DefaultMeetingSession, MeetingSessionConfiguration, ConsoleLogger, LogLevel } = await import('amazon-chime-sdk-js');
          
          const configuration = new MeetingSessionConfiguration(Meeting, Attendee);
          const logger = new ConsoleLogger('Chime', LogLevel.INFO);
          const session = new DefaultMeetingSession(configuration, logger);
          const audioVideo = session.audioVideo;

          // ★ videoTileDidUpdate: 自分以外の映像を即座に bind
          const observer = {
            videoTileDidUpdate: (tileState) => {
              if (!isMounted || !videoRef.current) return;

              console.log('[Chime] videoTileDidUpdate:', {
                tileId: tileState.tileId,
                localTile: tileState.localTile,
                isContent: tileState.isContent,
                active: tileState.active
              });

              // ローカル映像（自分）
              if (tileState.localTile) {
                console.log('[Chime] ✓ ローカルタイル: ', tileState.tileId);
                return;
              }

              // ★ 脳筋ロジック: 自分以外の映像 = 配信者 → 即座に bind
              if (!tileState.isContent && tileState.active) {
                console.log('[Chime] 🎯 リモート映像検知! tileId:', tileState.tileId, ' → 即座にバインド');
                audioVideo.bindVideoElement(tileState.tileId, videoRef.current);
                setChimeReady(true);
                setReady(true);
                setDebugInfo(prev => ({ ...prev, status: "📡 映像配信中" }));
                
                // リトライをクリア
                if (retryRef.current) clearInterval(retryRef.current);
              }
            },
            videoTileWasRemoved: (tileId) => {
              console.log('[Chime] videoTileWasRemoved:', tileId);
            }
          };

          audioVideo.addObserver(observer);
          chimeSessionRef.current.audioVideo = audioVideo;

          // Session開始
          await audioVideo.start();
          console.log('[Chime] ✓ Session started');
          audioVideo.startLocalVideoTile();

        } catch (sdkErr) {
          console.warn('[ViewerStream] Chime SDK初期化失敗（非致命的）:', sdkErr.message);
          // SDK失敗でも socket イベント待たずに表示を継続
        }

      } catch (err) {
        retryCount++;
        if (!isMounted) return;
        console.error(`[ViewerStream] ❌ Chime初期化失敗 (試行${retryCount}):`, err.message);
        setDebugInfo(prev => ({ ...prev, status: `接続失敗（${retryCount}回目）、リトライ中...` }));

        // ★ 無限リトライ: 映像が出るまで5秒ごとに永遠に試行
        if (retryRef.current) clearInterval(retryRef.current);
        retryRef.current = setInterval(() => {
          if (isMounted) initChime();
        }, 5000);
      }
    };

    // ★ 3秒後に強制開通
    const timeoutId = setTimeout(() => {
      if (isMounted) initChime();
    }, 3000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      if (retryRef.current) clearInterval(retryRef.current);
    };
  }, [isWebRTC, streamId, stream?.chime_meeting_id]);

  // IVS プレイヤー（WebRTC でない場合）
  useEffect(() => {
    if (isWebRTC) return;
    if (!playbackUrl || stream?.status !== "live") return;

    let isMounted = true;

    (async () => {
      try {
        const { create, isPlayerSupported } = await import("amazon-ivs-player");
        if (!isPlayerSupported) {
          setError("このブラウザはIVS Playerに対応していません");
          return;
        }

        const { PlayerState, PlayerEventType } = await import("amazon-ivs-player");

        const player = create({
          wasmWorker: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.js",
          wasmBinary: "https://player.live-video.net/1.36.0/amazon-ivs-wasmworker.min.wasm",
        });

        playerRef.current = player;
        player.attachHTMLVideoElement(videoRef.current);

        player.addEventListener(PlayerEventType.STATE_CHANGED, (state) => {
          if (!isMounted) return;
          if (state === PlayerState.PLAYING) {
            setReady(true);
            setConnQuality("good");
          }
          if (state === PlayerState.BUFFERING) setConnQuality("poor");
        });

        player.addEventListener(PlayerEventType.ERROR, () => {
          if (!isMounted) return;
          setError("映像の読み込みに失敗しました。再試行してください。");
        });

        player.load(playbackUrl);
        player.play();

        if (isMounted) setReady(false);
      } catch (err) {
        if (!isMounted) return;
        setError("プレイヤーの初期化に失敗: " + err.message);
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

      {!ready && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <span className="w-4 h-4 rounded-full bg-red-400 animate-pulse" />
          </div>
          <p className="text-lg font-semibold text-white">
            {stream?.status === "live" ? "接続中..." : "配信者の接続を待っています..."}
          </p>
          <p className="text-sm text-white/50">Amazon IVS / Chime 強制開通中</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 font-bold">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setReady(false);
            }}
            className="text-sm text-white/60 underline"
          >
            再試行
          </button>
        </div>
      )}

      {ready && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {/* 接続品質 */}
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${
              connQuality === "poor" ? "bg-yellow-500/80 text-black" : "bg-black/50 text-green-400"
            }`}
          >
            {connQuality === "poor" ? (
              <WifiOff className="w-3.5 h-3.5" />
            ) : (
              <Wifi className="w-3.5 h-3.5" />
            )}
            {connQuality === "poor" ? "低品質" : "良好"}
          </div>

          {/* 画質選択ボタン */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu((v) => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 text-white text-xs font-bold hover:bg-black/90 transition-colors border border-white/10"
            >
              <Settings className="w-3 h-3" />
              <span className={currentQ.color}>{currentQ.label}</span>
            </button>

            {showQualityMenu && (
              <div className="absolute bottom-9 right-0 bg-zinc-950 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden z-50 w-64">
                {/* ヘッダー */}
                <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900">
                  <p className="text-xs font-black text-white">画質設定</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">
                    現在の配信価格: <span className="text-primary font-bold">¥{streamPrice}</span>
                  </p>
                </div>

                {/* アップグレード誘導 */}
                {upsellMsg && (
                  <div className="px-4 py-2.5 bg-primary/10 border-b border-zinc-800 flex items-start gap-2">
                    <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <p className="text-[10px] text-primary leading-relaxed">{upsellMsg}</p>
                  </div>
                )}

                {/* 画質選択肢 */}
                <div className="py-1">
                  {QUALITY_OPTIONS.map((q) => {
                    const unlocked = streamPrice >= q.minPrice;
                    const isSelected = selectedQuality === q.value;
                    return (
                      <button
                        key={q.value}
                        onClick={() => {
                          if (!unlocked) return;
                          setSelectedQuality(q.value);
                          setShowQualityMenu(false);
                        }}
                        disabled={!unlocked}
                        className={`w-full flex items-center justify-between px-4 py-3 transition-colors ${
                          isSelected
                            ? "bg-primary/15"
                            : unlocked
                            ? "hover:bg-zinc-800"
                            : "opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded ${q.badgeColor} text-white`}
                          >
                            {q.label}
                          </span>
                          <div className="text-left">
                            <p
                              className={`text-xs font-bold ${
                                isSelected
                                  ? "text-primary"
                                  : unlocked
                                  ? "text-white"
                                  : "text-zinc-600"
                              }`}
                            >
                              {q.desc}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {q.minPrice === 0
                                ? "すべての配信で利用可能"
                                : `¥${q.minPrice}以上の配信`}
                            </p>
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected && (
                            <span className="text-primary text-xs font-black">✓</span>
                          )}
                          {!unlocked && (
                            <Lock className="w-3.5 h-3.5 text-zinc-600" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* SD固定の場合のメッセージ */}
                {availableQualities.length === 1 && (
                  <div className="px-4 py-2.5 bg-zinc-900 border-t border-zinc-800">
                    <p className="text-[10px] text-zinc-500 text-center">
                      この価格帯ではSD画質となります
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ミュートボタン */}
          <button
            onClick={() => setMuted(!muted)}
            className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            {muted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      {/* ★ デバッグ情報表示 */}
      <div className="absolute top-4 left-4 bg-black/70 border border-cyan-500/40 rounded-lg px-3 py-2 text-[10px] font-mono text-cyan-300 space-y-0.5 pointer-events-none">
        <div>🎯 Meeting: {debugInfo.meetingId || "---"}</div>
        <div>👤 Attendee: {debugInfo.attendeeId || "---"}</div>
        <div>📊 Status: {debugInfo.status}</div>
      </div>
    </div>
  );
}