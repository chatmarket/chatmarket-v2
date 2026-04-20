import React, { useEffect, useRef, useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Radio, MicOff, Mic, Camera, CameraOff, PhoneOff, Eye, Monitor, Settings, X, AlertTriangle, Zap, Copy, Check, Maximize, Minimize } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import LiveTimer from "./LiveTimer";
import LiveCostTracker from "./LiveCostTracker";
import ViewerCountGraph from "./ViewerCountGraph";
import RadioModeToggle from "./RadioModeToggle";
import MicLevelMeter from "./MicLevelMeter";
import RadioModeParticleBackground from "./RadioModeParticleBackground";

// amazon-ivs-web-broadcast is loaded via CDN script tag approach via dynamic import
let IVSBroadcastClient = null;

async function loadIVSBroadcast() {
  if (IVSBroadcastClient) return IVSBroadcastClient;
  const mod = await import("amazon-ivs-web-broadcast");
  IVSBroadcastClient = mod.default || mod.IVSBroadcastClient || mod;
  return IVSBroadcastClient;
}

// AWS IVS Basic チャンネル専用
// 他の設定は一切使用禁止
const QUALITY_PRESETS = [
  { label: "Basic チャンネル (640x360 30fps 600kbps)", width: 640, height: 360, framerate: 30, bitrate: 600000 },
];

// ===== AWS IVS Basic チャンネル専用設定 =====
// Basic チャンネルは以下の仕様に完全固定：
// 解像度: 640x360 / フレームレート: 30fps / ビットレート: 600kbps 以下
// これ以外を送った瞬間に 12000 エラーで接続切断
const BASIC_CHANNEL_PRESET = {
  width: 640,
  height: 360,
  framerate: 30,
  maxBitrate: 600000, // 600kbps 絶対厳守
};

// 視聴者数ランクアップ推奨ポップアップの定義
const RANKUP_THRESHOLDS = [
  {
    quality: "480p",
    trigger: 100,
    message: "🎉 視聴者が100名を超えました！大盛況ですね！次回の配信は 55円（高画質HD） に設定して、さらなるファン満足度と収益アップを目指しませんか？",
    color: "green",
  },
  {
    quality: "720p",
    trigger: 300,
    message: "🚀 300名があなたの配信を視聴中！トップライバーの仲間入りです。次は 150円（最高画質FHD） 設定で、プロ品質の配信を届けましょう！",
    color: "blue",
  },
];

export default function BroadcasterStream({ streamId, ivsStreamKey, ivsIngestEndpoint, onEnd, streamQuality, initialRadioMode = false }) {
  const navigate = useNavigate();
  const previewVideoRef = useRef(null);
  const clientRef = useRef(null);
  const localStreamRef = useRef(null);
  const rankupShownRef = useRef(false);

  const [status, setStatus] = useState("preview"); // "preview" | "live" | "ended"
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(!initialRadioMode);
  const [goingLive, setGoingLive] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState(1);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveStartedAt, setLiveStartedAt] = useState(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [rankupPopup, setRankupPopup] = useState(null); // { message, color }
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef(null);
  const [isRadioMode, setIsRadioMode] = useState(initialRadioMode);
  const [radioModeProcessing, setRadioModeProcessing] = useState(false);
  const particleStreamRef = useRef(null);

  const isLive = status === "live";

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };



  // ラジオモード時は音声のみ、通常時はカメラ+マイクを取得
  useEffect(() => {
    (async () => {
      try {
        let stream;
        
        // Basic チャンネル専用：常に 640x360 30fps で固定
        // ラジオ/通常モード切り替えに関わらず同じ仕様
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: BASIC_CHANNEL_PRESET.width, height: BASIC_CHANNEL_PRESET.height, frameRate: BASIC_CHANNEL_PRESET.framerate },
          audio: true,
        });
        
        if (isRadioMode) {
          setCamOn(false);
        } else {
          setCamOn(true);
          if (previewVideoRef.current) {
            previewVideoRef.current.srcObject = stream;
          }
        }
        
        localStreamRef.current = stream;
      } catch (err) {
        toast.error("カメラ/マイクにアクセスできません: " + err.message);
      }
    })();

    return () => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      clientRef.current?.stopBroadcast?.();
    };
  }, [isRadioMode]);

  // 視聴者数ポーリング + ランクアップ推奨チェック
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(async () => {
      const streams = await base44.entities.LiveStream.filter({ id: streamId });
      const s = streams[0];
      if (s?.viewer_count !== undefined) {
        const count = s.viewer_count;
        setViewerCount(count);

        // ランクアップ推奨チェック（1回のみ表示）
        if (!rankupShownRef.current && streamQuality) {
          const threshold = RANKUP_THRESHOLDS.find(t => t.quality === streamQuality && count >= t.trigger);
          if (threshold) {
            rankupShownRef.current = true;
            setRankupPopup({ message: threshold.message, color: threshold.color });
          }
        }
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [streamId, isLive, streamQuality]);

  const handleGoLive = useCallback(async () => {
    if (!ivsStreamKey || !ivsIngestEndpoint) {
      toast.error("IVSのストリーム情報がありません");
      console.error("❌ ストリーム情報が不足:");
      console.error("  ivsStreamKey:", ivsStreamKey);
      console.error("  ivsIngestEndpoint:", ivsIngestEndpoint);
      return;
    }
    if (!localStreamRef.current) {
      toast.error("カメラ/マイクが取得できていません");
      return;
    }

    // ストリーム情報を詳細ログ出力（社長の「一文字ずつ照合」対応）
    console.log("=".repeat(60));
    console.log("📡 IVS ストリーム情報（設定画面と照合してください）");
    console.log("=".repeat(60));
    console.log(`ストリームキー: ${ivsStreamKey}`);
    console.log(`エンドポイント: ${ivsIngestEndpoint}`);
    console.log("=".repeat(60));

    setGoingLive(true);

    // 3回までリトライ
    let streamConfig = {}; // スコープを確保
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 配信開始試行 ${attempt}/3`);
        const IVSClient = await loadIVSBroadcast();

        // Basic チャンネルは品質設定を適用しない（SDK側で自動調整）
        if (isRadioMode) {
          console.log(`📻 ラジオモード開始（Basic チャンネル）`);
        } else {
          console.log(`📹 通常モード開始（Basic チャンネル）`);
        }

        console.log(`IVS SDK create() 呼び出し (Basic チャンネル専用):`);
            console.log(`  ingestEndpoint: "${ivsIngestEndpoint}"`);

            // Basic チャンネル用：最小限の初期化のみ
            const client = IVSClient.create({ 
              ingestEndpoint: ivsIngestEndpoint 
            });
            clientRef.current = client;
            console.log("✓ IVS クライアント作成成功");

        // 音声トラック追加
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
        try {
        await client.addAudioInputDevice(new MediaStream([audioTrack]), "mic");
        console.log("✓ 音声トラック追加");
        } catch (audioErr) {
        console.warn("⚠️ 音声追加失敗（無視）:", audioErr.message);
        }
        }

        // ビデオ追加：Basic チャンネル用にシンプル化
        // ラジオモード時は静止画（背景）のみ、通常モードはカメラ映像
        try {
          if (isRadioMode) {
              // ラジオモード：音声のみ（Basic チャンネル対応）
            // 映像は静止画または背景に固定
            console.log("✓ ラジオモード：音声のみで配信 (640x360 固定)");
          } else {
            // 通常モード：カメラ映像
            if (previewVideoRef.current) {
              await client.addVideoInputDevice(previewVideoRef.current, "camera", { index: 0 });
              console.log("✓ カメラ映像追加");
            }
          }
        } catch (videoErr) {
          console.warn("⚠️ ビデオ追加失敗（配信は続行）:", videoErr.message);
        }

        // 配信開始（リトライ含むエラーハンドリング）
        try {
          console.log(`startBroadcast() 呼び出し:`);
          console.log(`  streamKey: "${ivsStreamKey}"`);
          console.log(`  streamKey 型: ${typeof ivsStreamKey}`);
          console.log(`  streamKey 長さ: ${ivsStreamKey?.length}`);

          await client.startBroadcast(ivsStreamKey);
          console.log("✅ IVS startBroadcast 成功 - LIVE オンエアー！");
        } catch (broadcastErr) {
          console.warn(`⚠️ startBroadcast エラー試行${attempt}（リトライ中）:`, broadcastErr.message);
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, 2000 * attempt)); // 指数バックオフ
            continue;
          }
          throw broadcastErr;
        }

        // ラジオモード時: 配信開始後にカメラ映像トラックを停止（ビジュアライザーは継続）
        if (isRadioMode) {
          const videoTracks = localStreamRef.current.getVideoTracks();
          videoTracks.forEach(track => {
            try {
              track.enabled = false;
              console.log("✓ カメラ映像トラック無効化（ビジュアライザー継続）");
            } catch (err) {
              console.warn("カメラトラック無効化失敗:", err);
            }
          });
          setCamOn(false);
        }

        const now = new Date().toISOString();
        await base44.entities.LiveStream.update(streamId, { status: "live", ivs_playback_url: ivsIngestEndpoint, live_started_at: now });
        setLiveStartedAt(now);
        setStatus("live");
        
        console.log("✅ 配信開始成功！");
        
        toast.success("✅ 配信開始成功！AWS で状況を監視してください。");
        break; // 成功したら抜ける

      } catch (err) {
        console.error(`❌ 試行${attempt} エラー:`, err.message);
        console.error(`エラー詳細:`, err);
        
        if (err.message?.includes("StreamConfiguration")) {
          console.error("💡 StreamConfigurationError の原因：");
          console.error("  → ストリームキーまたはエンドポイントが間違っている可能性");
          console.error("  → 設定画面で確認してください");
        }
        
        if (attempt < 3) {
          console.log(`⏳ ${2000 * attempt}ms 待機後、リトライします...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        } else {
          console.error("🚨 配信開始に失敗（3回リトライ完了）");
          console.error("次の項目を設定画面で確認してください：");
          console.error(`  1. ストリームキー: ${ivsStreamKey}`);
          console.error(`  2. エンドポイント: ${ivsIngestEndpoint}`);
          toast.error("配信に失敗しました。設定を確認してください。");
        }
      }
    }

    setGoingLive(false);
  }, [ivsStreamKey, ivsIngestEndpoint, selectedQuality, streamId, isRadioMode]);





  const toggleMic = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !micOn));
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !camOn));
    setCamOn(!camOn);
  };

  const handleEndConfirmed = async () => {
    clientRef.current?.stopBroadcast?.();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    await base44.entities.LiveStream.update(streamId, { status: "ended" });
    setStatus("ended");
    toast.success("配信を終了しました");
    if (onEnd) onEnd();
    else navigate(-1);
  };

  const copyStreamKey = () => {
    navigator.clipboard.writeText(ivsStreamKey || "");
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
    toast.success("ストリームキーをコピーしました");
  };

  const handleToggleRadioMode = async () => {
    setRadioModeProcessing(true);
    try {
      const newRadioMode = !isRadioMode;
      setIsRadioMode(newRadioMode);

      // ①映像停止：camOnを自動的にfalseに切り替え
      if (newRadioMode && camOn) {
        toggleCam();
      } else if (!newRadioMode && !camOn) {
        toggleCam();
      }

      // ②LiveStreamを更新（視聴者側に通知）
      await base44.entities.LiveStream.update(streamId, { is_radio_mode: newRadioMode });

      // ③15分タイマーリセット
      // これはラジオモード中の購入フローで自動的に新規リセットされる
    } catch (err) {
      toast.error("ラジオモード切り替えに失敗: " + err.message);
      setIsRadioMode(!isRadioMode); // ロールバック
    } finally {
      setRadioModeProcessing(false);
    }
  };

  return (
    <div className="w-full flex flex-col lg:flex-row gap-4 bg-zinc-950 rounded-xl overflow-hidden">
      {/* 左側: 映像プレビュー（大きく表示） */}
      <div
        ref={videoContainerRef}
        className="flex-1 flex flex-col bg-black rounded-xl overflow-hidden border border-zinc-800"
        style={isFullscreen ? { position: "fixed", inset: 0, zIndex: 9999, width: "100vw", height: "100vh", borderRadius: 0 } : {}}
      >
        {/* 映像プレビュー (16:9) */}
        <div className="relative w-full bg-black" style={{ aspectRatio: "16/9" }}>
        <video
          ref={previewVideoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-contain bg-black"
          style={{ display: camOn ? "block" : "none" }}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
            <CameraOff className="w-14 h-14 text-zinc-600" />
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-3 left-3 flex items-center gap-2 flex-wrap">
          {isLive ? (
            <>
              <span className="flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
              </span>
              <span className="flex items-center gap-1.5 bg-black/70 text-white font-black px-3 py-1 rounded-full text-sm">
                <Eye className="w-4 h-4" />{viewerCount}
              </span>
              <LiveTimer startedAt={liveStartedAt} />
            </>
          ) : (
            <span className="flex items-center gap-1.5 bg-zinc-700/80 text-zinc-300 text-xs font-bold px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" /> PREVIEW
            </span>
          )}
        </div>
        {/* コスト・利益トラッカー（右上） */}
        {isLive && (
          <div className="absolute top-3 right-3">
            <LiveCostTracker startedAt={liveStartedAt} viewerCount={viewerCount} priceCoins={150} />
          </div>
        )}

        {/* GoLive オーバーレイ（プレビュー中） */}
        {!isLive && (
          <div className="absolute inset-0 flex items-end justify-center pb-8 pointer-events-none">
            <button
              onClick={handleGoLive}
              disabled={goingLive}
              className="pointer-events-auto flex items-center gap-3 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-black text-lg px-10 py-4 rounded-2xl shadow-2xl shadow-red-500/40 transition-all hover:scale-105 active:scale-95"
            >
              {goingLive
                ? <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <Zap className="w-6 h-6" />}
              {goingLive ? "接続中..." : "配信を開始する"}
            </button>
          </div>
        )}
        </div>

        {/* コントロールバー */}
        <div className="px-4 py-3 border-t border-zinc-800 flex items-center justify-between gap-3">
        {/* 左: マイク/カメラ/設定 + マイクレベルメーター */}
        <div className={`flex items-center gap-3 ${isLive && !isRadioMode ? "opacity-30 pointer-events-none select-none" : ""}`}>
          <div className="flex gap-2">
            <CtrlBtn
              icon={micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
              onClick={toggleMic}
              danger={!micOn}
            />
            <CtrlBtn
              icon={camOn ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
              onClick={toggleCam}
              danger={!camOn}
            />
            <CtrlBtn icon={<Settings className="w-4 h-4" />} onClick={() => setShowQualityModal(true)} />
          </div>
          {/* マイクレベルメーター */}
          {micOn && localStreamRef.current && (
            <MicLevelMeter audioStream={localStreamRef.current} />
          )}
        </div>

        {/* 中央: ロック表示 */}
        {isLive && (
          <p className="text-[11px] text-zinc-600 text-center">🔒 配信中はロックされています</p>
        )}

        {/* 右: ラジオモード + 全画面 + 配信終了 */}
        <div className="flex items-center gap-2">
          {isLive && (
            <RadioModeToggle
              isRadioMode={isRadioMode}
              onToggle={handleToggleRadioMode}
              isProcessing={radioModeProcessing}
            />
          )}
          <button
            onClick={toggleFullscreen}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            title={isFullscreen ? "全画面解除" : "全画面表示"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setShowEndConfirm(true)}
            className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-full transition-colors shrink-0"
          >
            <PhoneOff className="w-3.5 h-3.5" /> 配信終了
          </button>
        </div>
        </div>

        {/* IVSストリームキー表示（プレビュー中のみ・OBS用） */}
        {!isLive && ivsStreamKey && (
          <div className="px-4 pb-4 space-y-2">
            <p className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider">OBSで配信する場合（RTMPS情報）</p>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500">Ingest Endpoint</p>
                <p className="text-xs text-zinc-300 font-mono truncate">rtmps://{ivsIngestEndpoint}:443/app/</p>
              </div>
            </div>
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-zinc-500">Stream Key</p>
                <p className="text-xs text-zinc-300 font-mono truncate">{ivsStreamKey.slice(0, 30)}...</p>
              </div>
              <button onClick={copyStreamKey} className="shrink-0 text-zinc-400 hover:text-primary transition-colors">
                {copiedKey ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ラジオモード: パーティクル背景ストリーム生成 */}
      {isRadioMode && (
        <RadioModeParticleBackground
          onStreamReady={(stream) => {
            particleStreamRef.current = stream;
          }}
          width={BASIC_CHANNEL_PRESET.width}
          height={BASIC_CHANNEL_PRESET.height}
        />
      )}

      {/* 右側: チャット・エール表示エリア */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        {/* 視聴者数グラフ */}
        <ViewerCountGraph streamId={streamId} isLive={isLive} />

        {/* チャットセクション */}
        <div className="flex-1 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-bold text-white">💬 チャット</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <p className="text-xs text-zinc-500 text-center py-8">配信中にチャットが表示されます</p>
          </div>
        </div>

        {/* エール・スーパーチャットセクション */}
        <div className="flex-1 flex flex-col bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-sm font-bold text-yellow-400">⭐ エール・スーパーチャット</p>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            <p className="text-xs text-zinc-500 text-center py-8">応援メッセージが表示されます</p>
          </div>
        </div>
      </div>

      {/* ランクアップ推奨ポップアップ（配信者のみ表示） */}
      {rankupPopup && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-md">
          <div className={`rounded-2xl p-5 shadow-2xl border-2 ${
            rankupPopup.color === "blue"
              ? "bg-blue-900/95 border-blue-400/60"
              : "bg-green-900/95 border-green-400/60"
          }`}>
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className={`text-sm font-bold leading-relaxed ${rankupPopup.color === "blue" ? "text-blue-200" : "text-green-200"}`}>
                  {rankupPopup.message}
                </p>
              </div>
              <button
                onClick={() => setRankupPopup(null)}
                className="shrink-0 text-white/50 hover:text-white transition-colors mt-0.5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 配信終了確認モーダル */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h2 className="font-black text-white text-lg">配信を終了しますか？</h2>
                <p className="text-zinc-400 text-xs">この操作は取り消せません</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowEndConfirm(false)} className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm">キャンセル</button>
              <button onClick={handleEndConfirmed} className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-sm">終了する</button>
            </div>
          </div>
        </div>
      )}

      {/* 画質設定モーダル */}
      {showQualityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black text-white text-lg flex items-center gap-2"><Settings className="w-5 h-5 text-primary" /> 配信画質設定</h2>
              <button onClick={() => setShowQualityModal(false)} className="text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-2">
              {QUALITY_PRESETS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedQuality(i)}
                  disabled={isLive}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all disabled:opacity-40 ${selectedQuality === i ? "border-primary bg-primary/10 text-primary" : "border-zinc-700 bg-zinc-800 text-white hover:border-zinc-500"}`}
                >
                  <p className="font-bold text-sm">{p.label}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{p.width}×{p.height} / {p.framerate}fps / {(p.bitrate / 1000000).toFixed(1)}Mbps</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowQualityModal(false)} className="w-full mt-4 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">閉じる</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ icon, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors text-white ${danger ? "bg-red-500 hover:bg-red-600" : "bg-white/10 hover:bg-white/20"}`}
    >
      {icon}
    </button>
  );
}