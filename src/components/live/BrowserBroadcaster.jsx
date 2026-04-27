import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Camera, CameraOff, CheckCircle2, AlertCircle, Zap, Radio, Settings } from "lucide-react";
import { toast } from "sonner";

export default function BrowserBroadcaster({ streamId, channelId, onEnd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const whipClientRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [whipEndpoint, setWhipEndpoint] = useState(null);
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [selectedMic, setSelectedMic] = useState(null);
  const [micLevel, setMicLevel] = useState(0);

  // 【修正】マイクレベルメーター監視 — ストリーム取得直後から稼働
  useEffect(() => {
    if (!streamRef.current) return;

    const audioTracks = streamRef.current.getAudioTracks();
    if (audioTracks.length === 0) {
      console.warn('[BrowserBroadcaster] ⚠️  No audio tracks available for metering');
      return;
    }

    let audioContext = null;
    let analyzer = null;
    let animationFrameId = null;
    let alive = true;

    try {
      console.log('[BrowserBroadcaster] 🎤 Initializing mic level meter...');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContext.createMediaStreamSource(streamRef.current);
      analyzer = audioContext.createAnalyser();
      analyzer.fftSize = 256;
      source.connect(analyzer);

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);

      const updateLevel = () => {
        if (!alive) return;
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const levelPercent = Math.round((average / 255) * 100);
        console.log(`[BrowserBroadcaster] 🎤 Mic level: ${levelPercent}%`);
        setMicLevel(Math.max(0, levelPercent)); // 負の値を防ぐ
        animationFrameId = requestAnimationFrame(updateLevel);
      };

      console.log('[BrowserBroadcaster] ✅ Mic meter started');
      updateLevel();
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Audio context error:', err);
    }

    return () => {
      alive = false;
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (analyzer) analyzer.disconnect();
      if (audioContext) audioContext.close();
      console.log('[BrowserBroadcaster] 🛑 Mic meter stopped');
    };
  }, [streamRef.current]);

  // デバイス列挙
  const enumerateDevices = async () => {
    try {
      console.log('[BrowserBroadcaster] 📱 Enumerating devices...');
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === 'videoinput');
      const micDevices = devices.filter((d) => d.kind === 'audioinput');
      
      console.log(`[BrowserBroadcaster] 📷 Found ${cameraDevices.length} camera(s), 🎤 ${micDevices.length} microphone(s)`);
      cameraDevices.forEach((cam, i) => console.log(`  Camera ${i + 1}: ${cam.label || 'Unknown'}`));
      micDevices.forEach((mic, i) => console.log(`  Mic ${i + 1}: ${mic.label || 'Unknown'}`));
      
      setCameras(cameraDevices);
      setMicrophones(micDevices);
      
      if (cameraDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraDevices[0].deviceId);
      }
      if (micDevices.length > 0 && !selectedMic) {
        setSelectedMic(micDevices[0].deviceId);
      }
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Device enumeration error:', err);
      toast.error('デバイス列挙に失敗: ' + err.message);
    }
  };

  // 【修正】カメラ・マイク起動 + WHIP エンドポイント取得 — 強制接続＆初期化
  useEffect(() => {
    const initMedia = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('[BrowserBroadcaster] 🚀 Initializing media stream...');

        // デバイス列挙
        await enumerateDevices();

        // 【重要】既存ストリームを確実に停止
        if (streamRef.current) {
          console.log('[BrowserBroadcaster] 🛑 Stopping existing stream tracks...');
          streamRef.current.getTracks().forEach((t) => {
            console.log(`  → Stopping ${t.kind} track: ${t.label}`);
            t.stop();
          });
          streamRef.current = null;
        }

        // ユーザーメディアを取得（1080p 優先）
        const constraints = {
          video: selectedCamera
            ? {
                deviceId: { exact: selectedCamera },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
              }
            : { width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: selectedMic
            ? { deviceId: { exact: selectedMic } }
            : true,
        };

        console.log('[BrowserBroadcaster] 📍 Requesting user media with constraints:', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        // 【修正】ストリームを ref に保存してから video 要素に代入
        streamRef.current = stream;
        console.log('[BrowserBroadcaster] ✅ Stream acquired, assigning to video element...');
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('[BrowserBroadcaster] ✅ Video element srcObject assigned');
        } else {
          console.warn('[BrowserBroadcaster] ⚠️  videoRef not available');
        }

        // トラック確認
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        const videoSettings = videoTrack?.getSettings();
        console.log(`[BrowserBroadcaster] ✅ Video track acquired: ${videoSettings?.width}x${videoSettings?.height} @ ${videoSettings?.frameRate}fps`);
        console.log(`[BrowserBroadcaster] ✅ Audio track acquired: ${audioTrack?.label}`);

        setCameraReady(!!videoTrack && videoTrack.enabled);
        setMicReady(!!audioTrack && audioTrack.enabled);

        // WHIP エンドポイント取得
        console.log('[BrowserBroadcaster] 🌐 Fetching WHIP endpoint...');
        const whipRes = await base44.functions.invoke('getIvsWhipEndpoint', { streamId });
        if (whipRes?.data?.whipEndpoint) {
          setWhipEndpoint(whipRes.data.whipEndpoint);
          console.log('[BrowserBroadcaster] ✅ WHIP endpoint ready:', whipRes.data.whipEndpoint);
        }

        setLoading(false);
      } catch (err) {
        console.error('[BrowserBroadcaster] ❌ Initialization error:', err);
        setError(err.message);
        setLoading(false);
        toast.error("初期化に失敗しました: " + err.message);
      }
    };

    initMedia();

    return () => {
      streamRef.current?.getTracks().forEach((t) => {
        console.log(`[BrowserBroadcaster] 🛑 Stopping ${t.kind} track`);
        t.stop();
      });
      whipClientRef.current?.close();
    };
  }, [streamId, selectedCamera, selectedMic]);

  const handleStartBroadcast = async () => {
    if (!cameraReady || !micReady) {
      toast.error("カメラとマイクの両方が必要です");
      return;
    }

    if (!whipEndpoint) {
      toast.error("WHIP エンドポイントが見つかりません");
      return;
    }

    try {
      setIsBroadcasting(true);
      console.log('[BrowserBroadcaster] 🎬 Starting broadcast...');

      // ストリーム状態を 'live' に更新
      const now = new Date().toISOString();
      console.log('[BrowserBroadcaster] 💾 Updating stream status to "live"');
      await base44.entities.LiveStream.update(streamId, {
        status: "live",
        live_started_at: now,
      });

      // チャンネル is_live フラグ更新
      if (channelId) {
        console.log('[BrowserBroadcaster] 💾 Updating channel is_live flag');
        await base44.entities.Channel.update(channelId, { is_live: true });
      }

      // IVS WebRTC 接続開始（WHIP プロトコル）
      console.log('[BrowserBroadcaster] 🔌 Initiating WHIP connection...');
      await connectToWhip();

      toast.success("✅ ブラウザ配信開始 — AWS IVS へ接続中...");
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ Broadcast start error:', err);
      toast.error("配信開始に失敗しました: " + err.message);
      setIsBroadcasting(false);
    }
  };

  const connectToWhip = async (retryCount = 0, maxRetries = 3) => {
    try {
      console.log(`[BrowserBroadcaster] 🔌 Connecting to WHIP (attempt ${retryCount + 1}/${maxRetries + 1})...`);
      
      // PC (PeerConnection) 作成
      const pc = new RTCPeerConnection();

      // 接続状態を監視
      pc.onconnectionstatechange = () => {
        console.log(`[BrowserBroadcaster] WebRTC Connection State: ${pc.connectionState}`);
        if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          console.warn('[BrowserBroadcaster] ⚠️  Connection lost, attempting to reconnect...');
          if (retryCount < maxRetries) {
            setTimeout(() => connectToWhip(retryCount + 1, maxRetries), 2000);
          } else {
            console.error('[BrowserBroadcaster] ❌ Max retries reached');
            toast.error('配信接続が失敗しました。もう一度試してください。');
            setIsBroadcasting(false);
          }
        } else if (pc.connectionState === 'connected') {
          console.log('[BrowserBroadcaster] ✅ WebRTC Connection Established');
        }
      };

      // ローカルストリームのトラックを追加
      streamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current);
        console.log(`[BrowserBroadcaster] ➕ Added ${track.kind} track: ${track.label}`);
      });

      // Offer 生成
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log('[BrowserBroadcaster] 📝 Offer created and set as local description');

      // WHIP エンドポイントへ POST
      console.log(`[BrowserBroadcaster] 📤 Sending offer to WHIP endpoint: ${whipEndpoint}`);
      const response = await fetch(whipEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHIP HTTP Error: ${response.status} ${response.statusText}`);
      }

      const answerSdp = await response.text();
      const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
      await pc.setRemoteDescription(answer);
      console.log('[BrowserBroadcaster] ✅ Answer received and set as remote description');

      whipClientRef.current = pc;
      console.log('[BrowserBroadcaster] 🎬 WHIP connection established successfully');
    } catch (err) {
      console.error('[BrowserBroadcaster] ❌ WHIP connection error:', err);
      if (retryCount < maxRetries) {
        console.log(`[BrowserBroadcaster] 🔄 Retrying in 2 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return connectToWhip(retryCount + 1, maxRetries);
      }
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 rounded-2xl">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">カメラ・マイクを初期化中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-950 rounded-2xl">
        <div className="text-center space-y-4 px-6">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
          <div>
            <p className="font-bold text-white mb-1">初期化に失敗しました</p>
            <p className="text-xs text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary hover:bg-primary/90 rounded-lg text-sm font-semibold"
          >
            リトライ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* プレビュー */}
      <div className="relative rounded-2xl overflow-hidden bg-black shadow-2xl border border-zinc-800" style={{ aspectRatio: "16/9" }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />

        {/* テストパターン オーバーレイ */}
        {!isBroadcasting && (
          <div className="absolute inset-0 pointer-events-none">
            {/* グリッド線 */}
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Test Pattern テキスト */}
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-6xl font-black text-white opacity-5 pointer-events-none select-none">TEST</span>
            </div>
          </div>
        )}

        {/* プレビュー中バッジ（中央下部） */}
        {!isBroadcasting && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full border border-red-400/50 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <span className="text-xs font-black text-white tracking-wide">🔴 プレビュー中：視聴者には見えていません</span>
          </div>
        )}

        {/* ステータスバッジ */}
        <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-zinc-700/50">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-primary">ブラウザプレビュー</span>
        </div>

        {/* WHIP 接続ステータス */}
        {isBroadcasting && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 backdrop-blur px-3 py-2 rounded-lg border border-red-400/50 animate-pulse">
            <Radio className="w-4 h-4 text-white animate-pulse" />
            <span className="text-xs font-semibold text-white">配信中</span>
          </div>
        )}
      </div>

      {/* デバイス選択 */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-white">デバイス選択</h3>
        </div>

        {/* カメラ選択 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">カメラ</label>
          <select
            value={selectedCamera || ""}
            onChange={(e) => {
              console.log('[BrowserBroadcaster] 📷 Camera device changed, reinitializing...');
              setSelectedCamera(e.target.value);
            }}
            disabled={isBroadcasting}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cameras.map((cam) => (
              <option key={cam.deviceId} value={cam.deviceId}>
                {cam.label || `カメラ ${cameras.indexOf(cam) + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* マイク選択 */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-muted-foreground">マイク</label>
          <select
            value={selectedMic || ""}
            onChange={(e) => {
              console.log('[BrowserBroadcaster] 🎤 Microphone device changed, reinitializing...');
              setSelectedMic(e.target.value);
            }}
            disabled={isBroadcasting}
            className="w-full px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {microphones.map((mic) => (
              <option key={mic.deviceId} value={mic.deviceId}>
                {mic.label || `マイク ${microphones.indexOf(mic) + 1}`}
              </option>
            ))}
          </select>

          {/* マイクレベルメーター */}
          <div className="space-y-1.5 mt-3 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground">🎤 音量レベル</p>
              <span className="text-xs font-bold text-primary">{micLevel}%</span>
            </div>
            {/* 横棒メーター */}
            <div className="w-full h-2 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full transition-all duration-75 rounded-full ${
                  micLevel < 30
                    ? "bg-green-500"
                    : micLevel < 60
                    ? "bg-yellow-500"
                    : micLevel < 85
                    ? "bg-orange-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${Math.min(micLevel, 100)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground">
              {micLevel < 20 ? "📍 無音に近い" : micLevel < 50 ? "🟢 良好" : micLevel < 80 ? "🟡 大きめ" : "🔴 大きすぎる"}
            </p>
          </div>
        </div>
      </div>

      {/* ステータスチェック */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
        <h3 className="font-bold text-white mb-4">配信準備確認</h3>

        {/* カメラステータス */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-3">
            {cameraReady ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">カメラ</p>
              <p className="text-xs text-muted-foreground">
                {cameraReady ? "✅ 準備完了" : "❌ エラー"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const track = streamRef.current?.getVideoTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setCameraReady(track.enabled);
              }
            }}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {cameraReady ? (
              <Camera className="w-4 h-4 text-primary" />
            ) : (
              <CameraOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* マイクステータス */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
          <div className="flex items-center gap-3">
            {micReady ? (
              <CheckCircle2 className="w-5 h-5 text-green-400" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <p className="text-sm font-semibold text-white">マイク</p>
              <p className="text-xs text-muted-foreground">
                {micReady ? "✅ 準備完了" : "❌ エラー"}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const track = streamRef.current?.getAudioTracks()[0];
              if (track) {
                track.enabled = !track.enabled;
                setMicReady(track.enabled);
              }
            }}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
          >
            {micReady ? (
              <Mic className="w-4 h-4 text-primary" />
            ) : (
              <MicOff className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {/* 配信開始ボタン */}
      <div className="flex gap-3">
        <button
          onClick={onEnd}
          disabled={isBroadcasting}
          className="flex-1 py-4 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold transition-colors disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          onClick={handleStartBroadcast}
          disabled={!cameraReady || !micReady || isBroadcasting}
          className="flex-1 py-4 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Zap className="w-5 h-5" />
          {isBroadcasting ? "配信開始中..." : "配信を開始する"}
        </button>
      </div>
    </div>
  );
}