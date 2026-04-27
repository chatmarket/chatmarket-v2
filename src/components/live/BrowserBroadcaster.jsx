import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, Camera, CameraOff, CheckCircle2, AlertCircle, Zap, Radio } from "lucide-react";
import { toast } from "sonner";

export default function BrowserBroadcaster({ streamId, channelId, onEnd }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const whipClientRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [micReady, setMicReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [whipEndpoint, setWhipEndpoint] = useState(null);

  // カメラ・マイク起動 + WHIP エンドポイント取得
  useEffect(() => {
    const initMedia = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // トラック確認
        const videoTrack = stream.getVideoTracks()[0];
        const audioTrack = stream.getAudioTracks()[0];

        setCameraReady(!!videoTrack && videoTrack.enabled);
        setMicReady(!!audioTrack && audioTrack.enabled);

        // WHIP エンドポイント取得
        const whipRes = await base44.functions.invoke('getIvsWhipEndpoint', { streamId });
        if (whipRes?.data?.whipEndpoint) {
          setWhipEndpoint(whipRes.data.whipEndpoint);
          console.log('[BrowserBroadcaster] WHIP endpoint ready:', whipRes.data.whipEndpoint);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        toast.error("初期化に失敗しました: " + err.message);
      }
    };

    initMedia();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      whipClientRef.current?.disconnect();
    };
  }, [streamId]);

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

      // ストリーム状態を 'live' に更新
      const now = new Date().toISOString();
      await base44.entities.LiveStream.update(streamId, {
        status: "live",
        live_started_at: now,
      });

      // チャンネル is_live フラグ更新
      if (channelId) {
        await base44.entities.Channel.update(channelId, { is_live: true });
      }

      // IVS WebRTC 接続開始（WHIP プロトコル）
      await connectToWhip();

      toast.success("✅ ブラウザ配信開始 — AWS IVS へ接続中...");
    } catch (err) {
      console.error('[BrowserBroadcaster] Broadcast start error:', err);
      toast.error("配信開始に失敗しました");
      setIsBroadcasting(false);
    }
  };

  const connectToWhip = async () => {
    try {
      // PC (PeerConnection) 作成
      const pc = new RTCPeerConnection();

      // ローカルストリームのトラックを追加
      streamRef.current?.getTracks().forEach((track) => {
        pc.addTrack(track, streamRef.current);
      });

      // Offer 生成
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // WHIP エンドポイントへ POST
      const response = await fetch(whipEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error(`WHIP connection failed: ${response.statusText}`);
      }

      const answerSdp = await response.text();
      const answer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
      await pc.setRemoteDescription(answer);

      whipClientRef.current = pc;
      console.log('[BrowserBroadcaster] ✅ WHIP connection established');
    } catch (err) {
      console.error('[BrowserBroadcaster] WHIP connection error:', err);
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