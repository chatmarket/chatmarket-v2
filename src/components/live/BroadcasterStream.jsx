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

const QUALITY_PRESETS = [
  { label: "高画質 (1080p 30fps)", width: 1920, height: 1080, framerate: 30, bitrate: 4500000 },
  { label: "標準 (720p 30fps)", width: 1280, height: 720, framerate: 30, bitrate: 2500000 },
  { label: "軽量 (480p 30fps)", width: 854, height: 480, framerate: 30, bitrate: 1000000 },
  { label: "低帯域 (360p 15fps)", width: 640, height: 360, framerate: 15, bitrate: 500000 },
];

// ラジオモード専用：AWS IVS Basic チャンネル対応（Audio + Visualizer）
// 640x360 (16:9) / 30fps / 1500kbps 以下 で IVS Basic 公式推奨設定に準拠
const RADIO_MODE_PRESET = {
  label: "📻 ラジオ (Audio + Visualizer - 640x360 30fps)",
  width: 640,
  height: 360,
  framerate: 30,
  bitrate: 1200000, // 1200kbps (Basic チャンネル推奨上限)
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
  const radioDummyVideoRef = useRef(null); // ラジオモード用ダミー動画 <video> 要素

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
  const staticImageStreamRef = useRef(null);

  const isLive = status === "live";

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
  };

  // ダミー Canvas 動画をループ再生し、ストリームを取得（ラジオモード用）
  // 640x360 (16:9) AWS IVS Basic チャンネル準拠
  useEffect(() => {
    if (!isRadioMode) return;

    try {
      // Canvas で黒い 1 フレーム画像を生成（640x360 - AWS IVS Basic 推奨）
      const canvas = document.createElement("canvas");
      canvas.width = RADIO_MODE_PRESET.width; // 640
      canvas.height = RADIO_MODE_PRESET.height; // 360
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, RADIO_MODE_PRESET.width, RADIO_MODE_PRESET.height);

      // Canvas から WebM blob を生成（1フレーム黒画面）
      canvas.toBlob((blob) => {
        if (!blob) {
          console.error("Canvas blob 生成失敗");
          return;
        }

        const blobUrl = URL.createObjectURL(blob);

        // Video 要素を生成
        const videoEl = document.createElement("video");
        videoEl.src = blobUrl;
        videoEl.loop = true;
        videoEl.muted = true;
        videoEl.playsInline = true;
        videoEl.style.display = "none";

        document.body.appendChild(videoEl);
        radioDummyVideoRef.current = videoEl;

        // 動画再生開始
        videoEl.play().then(() => {
          console.log("✓ ラジオモード ダミー動画再生開始");
        }).catch((err) => {
          console.error("ダミー動画再生エラー:", err);
        });
      }, "video/webm");
    } catch (err) {
      console.error("ダミー動画生成エラー:", err);
    }

    return () => {
      if (radioDummyVideoRef.current) {
        radioDummyVideoRef.current.pause();
        document.body.removeChild(radioDummyVideoRef.current);
        radioDummyVideoRef.current = null;
      }
    };
  }, [isRadioMode]);

  // ラジオモード時は音声のみ、通常時はカメラ+マイクを取得
  useEffect(() => {
    (async () => {
      try {
        let stream;
        
        if (isRadioMode) {
          // ラジオモード: 音声のみをキャプチャ（カメラランプ一切点灯しない）
          stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false,
          });
          setCamOn(false);
        } else {
          // 通常配信: カメラ + マイクをキャプチャ
          const preset = QUALITY_PRESETS[selectedQuality];
          stream = await navigator.mediaDevices.getUserMedia({
            video: { width: preset.width, height: preset.height, frameRate: preset.framerate },
            audio: true,
          });
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
      return;
    }
    if (!localStreamRef.current) {
      toast.error("カメラ/マイクが取得できていません");
      return;
    }
    setGoingLive(true);

    // AWS チャンネル設定確認ガイドをコンソールに出力
    console.log("════════════════════════════════════════════════════════════");
    console.log("⚠️ AWS IVS チャンネル設定確認（必須）");
    console.log("════════════════════════════════════════════════════════════");
    console.log("以下の手順で AWS コンソール設定を確認してください:");
    console.log("1. AWS マネジメントコンソール → IVS → チャンネル");
    console.log("2. 対象チャンネルをクリック → 『チャンネル詳細』を確認");
    console.log("3. 『チャンネルタイプ』を記録（Standard または Basic）");
    console.log("4. 『推奨エンコーダー設定』を確認:");
    console.log("   Standard: 最大解像度 1920x1080、最大ビットレート 8.5 Mbps");
    console.log("   Basic: 最大解像度 1280x720、最大ビットレート 4.5 Mbps");
    console.log("5. 現在のコード設定（ラジオ: 480x360, 400kbps）が範囲内か確認");
    console.log("════════════════════════════════════════════════════════════");

    // 3回までリトライ
    let streamConfig = {}; // スコープを確保
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🔄 配信開始試行 ${attempt}/3`);
        const IVSClient = await loadIVSBroadcast();
        
        if (isRadioMode) {
          streamConfig = {
            maxResolution: { width: RADIO_MODE_PRESET.width, height: RADIO_MODE_PRESET.height },
            maxFramerate: RADIO_MODE_PRESET.framerate,
            maxBitrate: RADIO_MODE_PRESET.bitrate,
          };
          console.log(`📻 ラジオモード設定: ${streamConfig.maxResolution.width}x${streamConfig.maxResolution.height}, ${streamConfig.maxFramerate}fps, ${streamConfig.maxBitrate / 1000}kbps`);
        } else {
          const preset = QUALITY_PRESETS[selectedQuality];
          streamConfig = {
            maxResolution: { width: preset.width, height: preset.height },
            maxFramerate: preset.framerate,
            maxBitrate: preset.bitrate,
          };
          console.log(`📹 通常モード設定: ${preset.label}`);
        }

        const client = IVSClient.create({ streamConfig, ingestEndpoint: ivsIngestEndpoint });
        clientRef.current = client;

        // 音声トラック追加
        const audioTrack = localStreamRef.current.getAudioTracks()[0];
        if (audioTrack) {
          try {
            await client.addAudioInputDevice(new MediaStream([audioTrack]), "mic");
            console.log("✓ 音声トラック追加");
          } catch (audioErr) {
            console.warn("音声追加失敗（無視）:", audioErr);
          }
        }

        // ビデオ追加（ラジオモード時は動的マイクレベルメーター映像、通常モードはカメラ）
        if (isRadioMode) {
          try {
            const vizCanvas = await createAudioVisualizerCanvas(audioTrack, RADIO_MODE_PRESET.width, RADIO_MODE_PRESET.height, RADIO_MODE_PRESET.framerate);
            await client.addVideoInputDevice(vizCanvas, "visualizer", { index: 0 });
            console.log("✓ マイクレベルメーター映像追加");
          } catch (vizErr) {
            console.warn("ビジュアライザー失敗、カメラでフォールバック:", vizErr);
            if (previewVideoRef.current) {
              try {
                await client.addVideoInputDevice(previewVideoRef.current, "camera", { index: 0 });
              } catch (camErr) {
                console.warn("カメラもフォールバック失敗:", camErr);
              }
            }
          }
        } else {
          try {
            if (previewVideoRef.current) {
              await client.addVideoInputDevice(previewVideoRef.current, "camera", { index: 0 });
              console.log("✓ カメラ映像追加");
            }
          } catch (videoErr) {
            console.warn("ビデオ追加失敗（無視して続行）:", videoErr);
          }
        }

        // 配信開始（リトライ含むエラーハンドリング）
        try {
          await client.startBroadcast(ivsStreamKey);
          console.log("✓ IVS startBroadcast 成功");
        } catch (broadcastErr) {
          console.warn(`startBroadcast エラー試行${attempt}（リトライ中）:`, broadcastErr);
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
        
        // AWS リアルタイム監視ガイドを出力
        console.log("════════════════════════════════════════════════════════════");
        console.log("✅ 配信開始成功！AWS リアルタイム監視");
        console.log("════════════════════════════════════════════════════════════");
        console.log("📈 現在の配信設定:");
        console.log(`   - 解像度: ${isRadioMode ? "480x360 (ラジオメーター)" : QUALITY_PRESETS[selectedQuality].width + "x" + QUALITY_PRESETS[selectedQuality].height}`);
        console.log(`   - FPS: ${isRadioMode ? "30" : QUALITY_PRESETS[selectedQuality].framerate}`);
        console.log(`   - ビットレート: ${isRadioMode ? "400" : Math.round(QUALITY_PRESETS[selectedQuality].bitrate / 1000)} kbps`);
        console.log(`   - Ingest Endpoint: ${ivsIngestEndpoint}`);
        console.log("");
        console.log("🔍 AWS でリアルタイム監視:");
        console.log("1. AWS マネジメントコンソール → IVS → チャンネル");
        console.log("2. 対象チャンネル → 『Ingest Server』タブ");
        console.log("3. 『Health Events』でストリーム品質を確認");
        console.log("4. 『Network』セクションで実時間のビットレート・フレームレートを監視");
        console.log("");
        console.log("⚠️ もし切断された場合:");
        console.log("1. CloudWatch Logs → ロググループ: /aws/ivs");
        console.log("2. ストリームキー（上記 Endpoint）で検索");
        console.log("3. エラーコード・メッセージを記録");
        console.log("════════════════════════════════════════════════════════════");
        
        toast.success("✅ 配信開始成功！AWS で状況を監視してください。");
        break; // 成功したら抜ける

      } catch (err) {
        console.error(`❌ 配信開始フロー エラー（試行${attempt}）:`, err);
        logDetailedError(err, attempt, streamConfig, ivsIngestEndpoint);
        
        if (attempt < 3) {
          console.log(`⏳ ${2000 * attempt}ms 待機後、リトライします...`);
          await new Promise(r => setTimeout(r, 2000 * attempt));
        } else {
          console.error("════════════════════════════════════════════════════════════");
          console.error("🚨 3回のリトライ後も配信開始に失敗しました");
          console.error("════════════════════════════════════════════════════════════");
          console.error("次の項目をエンジニアに報告してください:");
          console.error("1. エラーメッセージ（上記 error.message）");
          console.error("2. AWS チャンネルタイプ（Standard / Basic）");
          console.error("3. AWS CloudWatch Logs でこのストリームキーを検索");
          console.error("4. エラーコード（StreamClosed, IngestError, BitrateExceeded 等）");
          console.error("════════════════════════════════════════════════════════════");
          toast.error("配信に失敗しました。コンソールを確認して、エンジニアに報告してください。");
        }
      }
    }

    setGoingLive(false);
  }, [ivsStreamKey, ivsIngestEndpoint, selectedQuality, streamId, isRadioMode]);

  // 詳細エラーログ出力関数
  const logDetailedError = (error, attempt, streamConfig, endpoint) => {
    console.group(`📋 詳細エラーログ（試行${attempt}）`);
    
    // エラーオブジェクト詳細
    console.log("Error Name:", error.name || "unknown");
    console.log("Error Message:", error.message || "no message");
    console.log("Error Code:", error.code || "no code");
    console.log("Full Error:", error);
    
    // 設定値の確認
    if (streamConfig) {
      console.log("━━━ 送信設定 ━━━");
      console.log("解像度:", `${streamConfig.maxResolution.width}x${streamConfig.maxResolution.height}`);
      console.log("FPS:", streamConfig.maxFramerate);
      console.log("ビットレート:", `${streamConfig.maxBitrate / 1000}kbps`);
      console.log("Ingest Endpoint:", endpoint);
    }
    
    // AWS CloudWatch Logs への誘導
    console.log("━━━ AWS CloudWatch Logs 確認手順 ━━━");
    console.log("1. AWS マネジメントコンソール → CloudWatch → ロググループ");
    console.log("2. 検索: /aws/ivs");
    console.log("3. ストリームキー（上記 Endpoint に含まれる）で検索");
    console.log("4. 最新のエラーログを確認");
    console.log("5. エラーコード・メッセージをコピーしてエンジニアに報告");
    
    console.groupEnd();
  };

  // マイクレベルメーター Canvas ビジュアライザー（640x360 - AWS IVS Basic 対応）
  const createAudioVisualizerCanvas = async (audioTrack, width, height, fps) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = width; // 640
      canvas.height = height; // 360
      const ctx = canvas.getContext("2d");

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      try {
        const mediaSource = audioContext.createMediaStreamSource(new MediaStream([audioTrack.clone()]));
        mediaSource.connect(analyser);
      } catch (connErr) {
        console.warn("Audio Analyzer 接続失敗、黒画面フォールバック:", connErr);
      }

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // FPS30 固定フレーム描画（16.67ms = 1000/60）
      const frameInterval = 1000 / 30;
      let lastFrameTime = Date.now();

      const draw = () => {
        const now = Date.now();
        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now;

          try {
            analyser.getByteFrequencyData(dataArray);
          } catch (e) {
            // Analyser エラーは無視して描画続行
          }

          // 背景: グラデーション（黒→濃紫）
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, "#0a0a1a");
          grad.addColorStop(1, "#1a0a3a");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);

          // マイクレベルメーター描画（周波数バー）
          const barWidth = Math.max(1, (width / dataArray.length) * 2.5);
          let x = 0;

          for (let i = 0; i < dataArray.length; i += 2) {
            const barHeight = (dataArray[i] / 255) * (height * 0.8);

            // グラデーション色（低音: 青→高音: 赤）
            const hue = (i / dataArray.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, height - barHeight, barWidth, barHeight);

            // 反射効果
            ctx.fillStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
            ctx.fillRect(x, height - barHeight - 5, barWidth, 5);

            x += barWidth + 1;
          }

          // 中央にマイク LIVE インジケータ
          ctx.fillStyle = "rgba(255, 100, 100, 0.8)";
          ctx.font = "bold 32px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🎙️", width / 2, 40);
          
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.font = "bold 18px Arial";
          ctx.fillText("LIVE ラジオ配信中", width / 2, height - 30);

          // 右下にビットレート表示
          ctx.fillStyle = "rgba(0, 255, 100, 0.6)";
          ctx.font = "12px monospace";
          ctx.textAlign = "right";
          ctx.textBaseline = "bottom";
          ctx.fillText("400 kbps", width - 10, height - 10);
        }

        requestAnimationFrame(draw);
      };

      draw();
      // Canvas ストリーム取得（FPS30 キャプチャ）
      const stream = canvas.captureStream(30);
      console.log("✓ Canvas ストリーム作成（30fps, 400kbps）");
      resolve(stream);
    });
  };

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
          width={RADIO_MODE_PRESET.width}
          height={RADIO_MODE_PRESET.height}
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