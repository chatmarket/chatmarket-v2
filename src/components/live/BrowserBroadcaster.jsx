/**
 * BrowserBroadcaster
 * ブラウザ（WebカメラPC・スマホ）からIVSに直接配信
 * amazon-ivs-web-broadcast SDK を正しいAPIで使用
 */
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, PhoneOff, Zap } from "lucide-react";
import { toast } from "sonner";

export default function BrowserBroadcaster({ streamKey, ingestEndpoint, onEnd }) {
  const previewContainerRef = useRef(null);
  const broadcasterRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const [phase, setPhase] = useState("初期化中...");
  const [isLive, setIsLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!streamKey || !ingestEndpoint) {
      setError("ストリームキーまたはエンドポイントがありません");
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setPhase("📦 IVS SDKロード中...");
        const IVSModule = await import("amazon-ivs-web-broadcast");
        const IVSBroadcastClient = IVSModule.default || IVSModule.IVSBroadcastClient;

        if (!isMounted) return;

        // ★ 正しいAPI: wasmWorker/wasmBinary はURLを文字列で渡す
        const client = IVSBroadcastClient.create({
          streamConfig: IVSBroadcastClient.BASIC_LANDSCAPE,
          ingestEndpoint: ingestEndpoint,
        });

        broadcasterRef.current = client;

        setPhase("🎥 カメラ・マイク起動中...");

        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });

        if (!isMounted) {
          mediaStream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = mediaStream;

        const videoTrack = mediaStream.getVideoTracks()[0];
        const audioTrack = mediaStream.getAudioTracks()[0];

        if (videoTrack) {
          await client.addVideoInputDevice(mediaStream, "camera", { index: 0 });
        }
        if (audioTrack) {
          await client.addAudioInputDevice(mediaStream, "mic");
        }

        // プレビュー表示
        if (previewContainerRef.current) {
          const preview = client.getVideoPreview();
          preview.style.width = "100%";
          preview.style.height = "100%";
          preview.style.objectFit = "contain";
          previewContainerRef.current.innerHTML = "";
          previewContainerRef.current.appendChild(preview);
        }

        // 状態イベント
        client.on("connectionStateChange", (state) => {
          if (!isMounted) return;
          console.log("[BrowserBroadcaster] state:", state);
          if (state === "CONNECTED") {
            setIsLive(true);
            setPhase("🔴 LIVE配信中");
            toast.success("配信開始しました！");
          } else if (state === "DISCONNECTED") {
            setIsLive(false);
            setPhase("配信終了");
          } else {
            setPhase(`接続状態: ${state}`);
          }
        });

        client.on("error", (err) => {
          console.error("[BrowserBroadcaster] error:", err);
          if (isMounted) setPhase(`❌ エラー: ${err.message}`);
        });

        setPhase("✅ 準備完了 — 配信開始ボタンを押してください");
        setLoading(false);

      } catch (err) {
        console.error("[BrowserBroadcaster] 初期化エラー:", err);
        if (isMounted) {
          setError(`初期化エラー: ${err.message}`);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      try { broadcasterRef.current?.stopBroadcast(); } catch (_) {}
      mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [streamKey, ingestEndpoint]);

  const handleToggleBroadcast = async () => {
    const client = broadcasterRef.current;
    if (!client) return;
    if (isLive) {
      try {
        await client.stopBroadcast();
        setIsLive(false);
        setPhase("配信終了");
      } catch (err) {
        toast.error("停止エラー: " + err.message);
      }
    } else {
      try {
        setPhase("接続中...");
        // ★ 正しいAPI: startBroadcast(streamKey) のみ（ingestEndpoint はcreate時に設定済み）
        await client.startBroadcast(streamKey);
      } catch (err) {
        toast.error("配信開始エラー: " + err.message);
        setPhase("❌ 配信開始失敗: " + err.message);
      }
    }
  };

  const toggleMic = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach(t => { t.enabled = !micOn; });
    setMicOn(!micOn);
  };

  const toggleCam = () => {
    const stream = mediaStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach(t => { t.enabled = !camOn; });
    setCamOn(!camOn);
  };

  if (error) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <p className="text-red-400 font-bold text-lg">❌ {error}</p>
          <p className="text-zinc-400 text-sm">カメラ・マイクのアクセス許可を確認してください</p>
          {onEnd && (
            <button onClick={onEnd} className="px-4 py-2 bg-zinc-700 rounded-lg text-white text-sm">
              戻る
            </button>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto" />
          <p className="text-white font-semibold">{phase}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black">
      {/* カメラプレビュー */}
      <div
        ref={previewContainerRef}
        className="w-full h-full"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      />

      {/* ステータス */}
      <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg border border-primary/30">
        <p className="text-sm font-bold" style={{ color: isLive ? "#ff4444" : "#ffaa44" }}>
          {phase}
        </p>
      </div>

      {/* コントロールバー */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        <button
          onClick={toggleMic}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${micOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"}`}
        >
          {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={toggleCam}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${camOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"}`}
        >
          {camOn ? <Camera className="w-5 h-5 text-white" /> : <CameraOff className="w-5 h-5 text-white" />}
        </button>

        <button
          onClick={handleToggleBroadcast}
          className={`px-6 h-10 rounded-full font-bold flex items-center gap-2 transition-all ${isLive ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"}`}
        >
          {isLive ? <><PhoneOff className="w-4 h-4" />配信終了</> : <><Zap className="w-4 h-4" />配信開始</>}
        </button>

        {onEnd && (
          <button onClick={onEnd} className="w-10 h-10 rounded-full bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-white text-xs">
            ✕
          </button>
        )}
      </div>
    </div>
  );
}