import React, { useCallback, useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Camera, CameraOff, CheckCircle2, AlertCircle, Zap, Radio, Settings, Loader2 } from "lucide-react";
import { toast } from "sonner";

/**
 * BrowserBroadcaster — シンプルな放送機材
 * 
 * ❌ 削除：場当たり的な useEffect、自動リトライ、Canvas フォールバック、ストリーム自動復旧
 * ✅ 残す：Permission Dialog、マイクメーター、ビデオストリーム（optional）、配信ボタン
 * ✅ エラー時：ユーザーに「再試行しますか？」と聞いて停止
 */
export default function BrowserBroadcaster({ streamId, channelId, onEnd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyzerRef = useRef(null);
  const whipClientRef = useRef(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  
  const [cameras, setCameras] = useState([]);
  const [microphones, setMicrophones] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(() => sessionStorage.getItem('selectedCamera') || null);
  const [selectedMic, setSelectedMic] = useState(() => sessionStorage.getItem('selectedMic') || null);
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastStatus, setBroadcastStatus] = useState(null); // null | "connecting" | "live" | "error"
  const [broadcastError, setBroadcastError] = useState(null);
  
  const [error, setError] = useState(null);
  const [showErrorDialog, setShowErrorDialog] = useState(false);

  // 【最初にデバイス列挙】
  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameraDevices = devices.filter((d) => d.kind === 'videoinput');
      const micDevices = devices.filter((d) => d.kind === 'audioinput');
      
      setCameras(cameraDevices);
      setMicrophones(micDevices);
      
      if (cameraDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(cameraDevices[0].deviceId);
      }
      if (micDevices.length > 0 && !selectedMic) {
        setSelectedMic(micDevices[0].deviceId);
      }
    } catch (err) {
      console.error('[BrowserBroadcaster] Device enumeration error:', err);
    }
  }, [selectedCamera, selectedMic]);

  // 【マイクメーター独立稼働】映像と無関係に、ストリーム → AudioContext → 周波数解析
  const startMicMeter = useCallback((stream) => {
    if (!stream) return;
    
    try {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn('[BrowserBroadcaster] No audio tracks');
        return;
      }

      // AudioContext 作成
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // アナライザー設定
      if (!analyzerRef.current) {
        const source = ctx.createMediaStreamSource(stream);
        analyzerRef.current = ctx.createAnalyser();
        analyzerRef.current.fftSize = 256;
        source.connect(analyzerRef.current);
        analyzerRef.current.connect(ctx.destination);
      }

      // メーター解析ループ
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      const meterTick = () => {
        if (!analyzerRef.current) return;
        analyzerRef.current.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100)));
        requestAnimationFrame(meterTick);
      };
      meterTick();

      console.log('[BrowserBroadcaster] ✅ Mic meter started');
    } catch (err) {
      console.warn('[BrowserBroadcaster] Mic meter error:', err.message);
    }
  }, []);

  // 【初期化：Permission Dialog → デバイス確定 → ビデオ → マイクメーター】
  useEffect(() => {
    console.log('[BrowserBroadcaster] 🚀 Mount: Getting user permission');

    navigator.mediaDevices.getUserMedia({
      video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
      audio: selectedMic ? { deviceId: { exact: selectedMic } } : true,
    }).then((stream) => {
      console.log('[BrowserBroadcaster] ✅ Stream acquired');
      streamRef.current = stream;

      // ビデオ要素に流す
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((err) => {
          console.warn('[BrowserBroadcaster] Autoplay blocked:', err.name);
        });
      }

      // ステータス確定
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];
      
      setCameraReady(!!videoTrack && videoTrack.enabled);
      setMicReady(!!audioTrack && audioTrack.enabled);

      // マイクメーター起動（映像の有無と無関係）
      startMicMeter(stream);

      // デバイス再列挙（権限確定後）
      enumerateDevices();
    }).catch((err) => {
      console.error('[BrowserBroadcaster] Permission denied:', err.message);
      setError(err.message);
      setShowErrorDialog(true);
    });

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      whipClientRef.current?.close();
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [selectedCamera, selectedMic, startMicMeter, enumerateDevices]);

  // 【sessionStorage に選択状態を保存】
  useEffect(() => {
    if (selectedCamera) sessionStorage.setItem('selectedCamera', selectedCamera);
  }, [selectedCamera]);

  useEffect(() => {
    if (selectedMic) sessionStorage.setItem('selectedMic', selectedMic);
  }, [selectedMic]);

  // 【配信開始】streamId 確認 → 状態更新 → WHIP 接続
  const handleStartBroadcast = async () => {
    if (!streamId) {
      setError('配信IDが見つかりません');
      setShowErrorDialog(true);
      return;
    }

    console.log('[BrowserBroadcaster] 🚀 Starting broadcast for streamId:', streamId);
    setBroadcastStatus("connecting");
    setBroadcastError(null);

    try {
      // ライブストリーム状態を更新
      await base44.entities.LiveStream.update(streamId, {
        status: "live",
        live_started_at: new Date().toISOString(),
      });
      console.log('[BrowserBroadcaster] ✅ LiveStream status updated');

      if (channelId) {
        await base44.entities.Channel.update(channelId, { is_live: true });
        console.log('[BrowserBroadcaster] ✅ Channel is_live updated');
      }

      // WHIP 接続
      console.log('[BrowserBroadcaster] 🔌 Connecting to WHIP...');
      setIsBroadcasting(true);
      await connectToWhip();
      setBroadcastStatus("live");
      toast.success("✅ 配信開始 — 世界へ放送中");
    } catch (err) {
      console.error('[BrowserBroadcaster] Broadcast error:', err);
      setBroadcastStatus("error");
      setBroadcastError(err.message);
      setIsBroadcasting(false);
      setShowErrorDialog(true);
    }
  };

  // 【WHIP 接続】社長指定URL固定（一行も変更なし）
  const connectToWhip = async () => {
    const WHIP_ENDPOINT = "https://27b83d82b8a7.global-bm.whip.live-video.net";

    const pc = new RTCPeerConnection();

    // ローカルストリーム追加
    streamRef.current?.getTracks().forEach((track) => {
      pc.addTrack(track, streamRef.current);
    });

    // Offer 生成 → WHIP に POST
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const response = await fetch(WHIP_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdp' },
      body: offer.sdp,
    });

    if (!response.ok) {
      throw new Error(`WHIP error: ${response.status}`);
    }

    const answerSdp = await response.text();
    const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
    await pc.setRemoteDescription(answer);

    whipClientRef.current = pc;
    console.log('[BrowserBroadcaster] ✅ WHIP connected');
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col lg:flex-row gap-4 p-4 lg:p-6">
      {/* 左側：ビデオプレイヤー */}
      <div className="flex-1 flex flex-col gap-4">
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "16/9" }}>
          <video
            ref={videoRef}
            autoPlay={true}
            muted={true}
            playsInline={true}
            controls={false}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: 1,
              zIndex: 5,
              display: 'block',
              backgroundColor: '#000',
            }}
          />

          {!isBroadcasting && (
            <div className="absolute inset-0 pointer-events-none">
              <svg className="absolute inset-0 w-full h-full opacity-10">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-6xl font-black text-white opacity-5 pointer-events-none select-none">TEST</span>
              </div>
            </div>
          )}

          {!isBroadcasting && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-red-500/90 backdrop-blur px-4 py-2 rounded-full border border-red-400/50 shadow-lg">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
              <span className="text-xs font-black text-white tracking-wide">🔴 プレビュー中</span>
            </div>
          )}

          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur px-3 py-2 rounded-lg border border-zinc-700/50">
            <Camera className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold text-primary">ブラウザプレビュー</span>
          </div>

          {isBroadcasting && (
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500/80 backdrop-blur px-3 py-2 rounded-lg border border-red-400/50 animate-pulse">
              <Radio className="w-4 h-4 text-white animate-pulse" />
              <span className="text-xs font-semibold text-white">配信中</span>
            </div>
          )}
        </div>
      </div>

      {/* 右側パネル：コントロール + チャット + コイン */}
      <div className="w-full lg:w-80 flex flex-col gap-4 max-h-screen overflow-y-auto">
        {/* デバイス設定 */}
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-lg">
          <h3 className="font-bold text-white text-sm flex items-center gap-2">
            <Settings className="w-4 h-4 text-primary" />
            デバイス
          </h3>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">カメラ</label>
            <select
              value={selectedCamera || ""}
              onChange={(e) => setSelectedCamera(e.target.value)}
              disabled={isBroadcasting}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              {cameras.map((cam) => (
                <option key={cam.deviceId} value={cam.deviceId}>
                  {cam.label || `カメラ ${cameras.indexOf(cam) + 1}`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">マイク</label>
            <select
              value={selectedMic || ""}
              onChange={(e) => setSelectedMic(e.target.value)}
              disabled={isBroadcasting}
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-xs focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
            >
              {microphones.map((mic) => (
                <option key={mic.deviceId} value={mic.deviceId}>
                  {mic.label || `マイク ${microphones.indexOf(mic) + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* マイクメーター */}
          <div className="space-y-1.5 p-2.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-primary">🎤 {micLevel}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-700 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  micLevel < 30 ? "bg-green-500" : micLevel < 60 ? "bg-yellow-500" : "bg-red-500"
                }`}
                style={{ width: `${Math.min(micLevel, 100)}%` }}
              />
            </div>
          </div>

          {/* ステータス */}
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              {cameraReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-muted-foreground">カメラ {cameraReady ? "✅" : "❌"}</span>
            </div>
            <div className="flex items-center gap-2">
              {micReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-muted-foreground">マイク {micReady ? "✅" : "❌"}</span>
            </div>
          </div>
        </div>

        {/* 配信ボタン */}
        <button
          onClick={handleStartBroadcast}
          disabled={isBroadcasting}
          className={`w-full py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all shadow-lg ${
            broadcastStatus === "live"
              ? "bg-gradient-to-r from-green-500 to-green-600"
              : broadcastStatus === "connecting"
              ? "bg-gradient-to-r from-yellow-500 to-yellow-600 animate-pulse"
              : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {broadcastStatus === "live" && <CheckCircle2 className="w-5 h-5" />}
          {broadcastStatus === "connecting" && <Loader2 className="w-5 h-5 animate-spin" />}
          {!broadcastStatus && <Zap className="w-5 h-5" />}
          {broadcastStatus === "live" ? "配信中" : broadcastStatus === "connecting" ? "接続中..." : "配信を開始"}
        </button>

        <button
          onClick={onEnd}
          disabled={isBroadcasting}
          className="w-full py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-white font-bold text-sm transition-all disabled:opacity-50"
        >
          キャンセル
        </button>

        {/* チャット表示 */}
        {isBroadcasting && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary" />
              チャット
            </h3>
            <div className="text-xs text-muted-foreground text-center py-4">
              コメントが表示されます
            </div>
          </div>
        )}

        {/* コイン・ギフト通知 */}
        {isBroadcasting && (
          <div className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              ギフト
            </h3>
            <div className="text-xs text-muted-foreground text-center py-4">
              スーパーチャットが表示されます
            </div>
          </div>
        )}
      </div>

      {/* エラーダイアログ */}
      {showErrorDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border border-red-500/40 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <h2 className="font-bold text-white text-lg">エラーが発生しました</h2>
            </div>
            <p className="text-sm text-red-300">{error || broadcastError}</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowErrorDialog(false);
                  setError(null);
                  setBroadcastError(null);
                  setBroadcastStatus(null);
                }}
                className="flex-1 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-white font-bold text-sm"
              >
                閉じる
              </button>
              {broadcastStatus === "error" && (
                <button
                  onClick={() => {
                    setShowErrorDialog(false);
                    handleStartBroadcast();
                  }}
                  className="flex-1 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white font-bold text-sm"
                >
                  再試行
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}