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
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState(null);
  const [connQuality, setConnQuality] = useState(null); // "good" | "poor"
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [chimeReady, setChimeReady] = useState(false);

  const streamPrice = stream?.price || 0;
  const availableQualities = QUALITY_OPTIONS.filter(q => streamPrice >= q.minPrice);
  const defaultQuality = getDefaultQuality(streamPrice);
  const upsellMsg = getUpsellMessage(streamPrice);

  const [selectedQuality, setSelectedQuality] = useState(defaultQuality);

  // 価格が変わったらデフォルト画質をリセット
  useEffect(() => {
    setSelectedQuality(getDefaultQuality(streamPrice));
  }, [streamPrice]);

  const playbackUrl = stream?.ivs_playback_url || stream?.vimeo_url;
  const isWebRTC = stream?.stream_type === "webrtc";

  // ★ Chime Meeting接続（WebRTC配信用）
  useEffect(() => {
    if (!isWebRTC || !streamId || !stream?.chime_meeting_id) return;

    let isMounted = true;
    const initChime = async () => {
      try {
        const res = await base44.functions.invoke('createLiveStreamChimeMeeting', {
          streamId,
          role: 'viewer',  // ★ 視聴者は受信専用ロール
        });

        if (!isMounted) return;

        const { Meeting, Attendee } = res.data;
        console.log('[ViewerStream] ✅ Chime session created:', { meetingId: Meeting.MeetingId, attendeeId: Attendee.AttendeeId });

        // ★ Attendeeマネージャーで入室を記録
        await base44.functions.invoke('liveStreamAttendeeManager', {
          stream_id: streamId,
          action: 'join',
          attendee_id: Attendee.AttendeeId,
        });

        chimeSessionRef.current = { Meeting, Attendee };
        setChimeReady(true);

        // 15秒後に配信者の映像タイルを探索開始
        setTimeout(() => {
          if (!isMounted) return;
          console.log('[ViewerStream] 🎯 Searching for broadcaster tile...');
        }, 15000);
      } catch (err) {
        if (!isMounted) return;
        console.error('[ViewerStream] Chime init failed:', err.message);
      }
    };

    initChime();
    return () => { isMounted = false; };
  }, [isWebRTC, streamId, stream?.chime_meeting_id]);

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

        player.addEventListener(PlayerEventType.STATE_CHANGED, (state) => {
          if (!isMounted) return;
          if (state === PlayerState.PLAYING) { setReady(true); setConnQuality("good"); }
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

  // 現在選択中の画質オブジェクト
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
          <p className="text-sm text-white/50">Amazon IVS 超低遅延ストリーミング</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <p className="text-red-400 font-bold">{error}</p>
          <button onClick={() => { setError(null); setReady(false); }} className="text-sm text-white/60 underline">
            再試行
          </button>
        </div>
      )}

      {ready && (
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          {/* 接続品質 */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${connQuality === "poor" ? "bg-yellow-500/80 text-black" : "bg-black/50 text-green-400"}`}>
            {connQuality === "poor" ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
            {connQuality === "poor" ? "低品質" : "良好"}
          </div>

          {/* 画質選択ボタン */}
          <div className="relative">
            <button
              onClick={() => setShowQualityMenu(v => !v)}
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
                  {QUALITY_OPTIONS.map(q => {
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
                          isSelected ? "bg-primary/15" :
                          unlocked ? "hover:bg-zinc-800" : "opacity-40 cursor-not-allowed"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* バッジ */}
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${q.badgeColor} text-white`}>
                            {q.label}
                          </span>
                          <div className="text-left">
                            <p className={`text-xs font-bold ${isSelected ? "text-primary" : unlocked ? "text-white" : "text-zinc-600"}`}>
                              {q.desc}
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              {q.minPrice === 0 ? "すべての配信で利用可能" : `¥${q.minPrice}以上の配信`}
                            </p>
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
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      )}
    </div>
  );
}