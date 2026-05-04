/**
 * BrowserBroadcasterRtmps — RTMPS直送版（最小コスト）
 *
 * 【コスト最適化】
 *  - ブラウザ WebRTC → 標準チャンネル RTMPS に直送
 *  - Stage/Composition: 完全廃止（$0に）
 *  - コスト: $0.005/分のみ（データ入力費）
 *  - OBS と同じエンドポイント → 一元管理
 */

import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, Camera, Loader2, Zap } from "lucide-react";

export default function BrowserBroadcasterRtmps({ streamId, channelId, onEnd, onBroadcasting }) {
   // ★ ブラウザ発信：RTMPS直送は『OBS配信画面経由』で行う
   // 直接呼び出しされた場合は、OBS画面にフォールバック
   React.useEffect(() => {
     console.log('[BrowserBroadcasterRtmps] ⚠️ This component is DEPRECATED for direct use.');
     console.log('[BrowserBroadcasterRtmps] 📝 Redo: Use OBS broadcast screen instead.');
   }, []);

   const videoRef = useRef(null);
   const [isBroadcasting, setIsBroadcasting] = useState(false);
   const [broadcastStatus, setBroadcastStatus] = useState(null);
   const [broadcastError, setBroadcastError] = useState(null);
   const [cameraReady, setCameraReady] = useState(false);
   const [micReady, setMicReady] = useState(false);
   const [micLevel, setMicLevel] = useState(0);
   const [showTestPrompt, setShowTestPrompt] = useState(true);
   const streamRef = useRef(null);
   const audioContextRef = useRef(null);
   const analyzerRef = useRef(null);

  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: { echoCancellation: false, noiseSuppression: false },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      setCameraReady(stream.getVideoTracks().length > 0);
      setMicReady(stream.getAudioTracks().length > 0);
      startMicMeter(stream);
      setShowTestPrompt(false);

      console.log('[BrowserBroadcasterRtmps] ✅ Media initialized');
    } catch (err) {
      toast.error('カメラ・マイク取得失敗: ' + err.message);
      setBroadcastError(err.message);
    }
  };

  const startMicMeter = (stream) => {
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyzer = audioContextRef.current.createAnalyser();
      source.connect(analyzer);
      analyzerRef.current = analyzer;

      const dataArray = new Uint8Array(analyzer.frequencyBinCount);
      const updateLevel = () => {
        analyzer.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setMicLevel(Math.round(avg / 2.55));
        requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (err) {
      console.warn('Mic meter initialization failed:', err.message);
    }
  };

  const handleStartBroadcast = async () => {
     // ★ RTMPS直送は実装復雑 → OBS画面経由で対応
     toast.error('⚠️ ブラウザ発信は現在OBS画面経由をご利用ください');
     console.warn('[BrowserRTMPS] ⚠️ RTMPS direct send from browser requires complex setup. Use OBS broadcast screen.');
   };

  const handleEndBroadcast = async () => {
    setIsBroadcasting(false);
    setBroadcastStatus(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
    }

    try {
      await base44.entities.LiveStream.update(streamId, {
        status: 'ended',
        live_ended_at: new Date().toISOString(),
      });
      toast.success('配信を終了しました');
      onEnd?.();
    } catch (err) {
      console.error('End broadcast failed:', err);
    }
  };

  return (
    <div className="w-full min-h-screen bg-zinc-950 flex flex-col gap-4 p-4 lg:p-6">
      <div className="relative bg-black rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        {isBroadcasting && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-600 px-4 py-2 rounded-xl border-2 border-red-400" style={{ animation: 'pulse 1.5s infinite' }}>
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="text-sm font-black text-white">🔴 ON AIR</span>
          </div>
        )}
      </div>

      <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 space-y-4">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" /> ブラウザ RTMPS 配信
        </h3>

        {showTestPrompt ? (
          <button
            onClick={initializeMedia}
            className="w-full py-4 rounded-xl bg-primary hover:bg-primary/90 text-black font-black flex items-center justify-center gap-2"
          >
            <Camera className="w-5 h-5" /> カメラ・マイクテスト開始
          </button>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">🎤 マイクレベル</span>
                <span className="font-black text-primary">{micLevel}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    micLevel < 30 ? 'bg-green-500' : micLevel < 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(micLevel, 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                {cameraReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>カメラ {cameraReady ? '✅' : '❌'}</span>
              </div>
              <div className="flex items-center gap-2">
                {micReady ? <CheckCircle2 className="w-4 h-4 text-green-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
                <span>マイク {micReady ? '✅' : '❌'}</span>
              </div>
            </div>

            <button
              onClick={handleStartBroadcast}
              disabled={isBroadcasting || !cameraReady || !micReady}
              className={`w-full py-3 rounded-xl text-white font-black flex items-center justify-center gap-2 transition-all ${
                broadcastStatus === 'live'
                  ? 'bg-green-600'
                  : broadcastStatus === 'connecting'
                  ? 'bg-yellow-600 animate-pulse'
                  : !cameraReady || !micReady
                  ? 'bg-gray-600 opacity-50 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {broadcastStatus === 'live' && <CheckCircle2 className="w-5 h-5" />}
              {broadcastStatus === 'connecting' && <Loader2 className="w-5 h-5 animate-spin" />}
              {!broadcastStatus && <Zap className="w-5 h-5" />}
              {broadcastStatus === 'live' ? '配信中' : broadcastStatus === 'connecting' ? '接続中...' : '配信を開始'}
            </button>

            {isBroadcasting && (
              <button
                onClick={handleEndBroadcast}
                className="w-full py-2.5 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 font-bold text-sm"
              >
                ⏹ 配信を終了
              </button>
            )}
          </>
        )}

        {broadcastError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {broadcastError}
          </div>
        )}
      </div>
    </div>
  );
}