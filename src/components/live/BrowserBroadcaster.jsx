/**
 * BrowserBroadcaster
 * ブラウザからカメラ・マイクをIVSに直接配信
 * amazon-ivs-web-broadcast を使用
 */
import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Camera, CameraOff, PhoneOff, AlertTriangle, Zap } from "lucide-react";
import { toast } from "sonner";

export default function BrowserBroadcaster({ streamKey, ingestEndpoint, onEnd }) {
  const videoRef = useRef(null);
  const broadcasterRef = useRef(null);
  const streamRef = useRef(null);

  const [phase, setPhase] = useState("カメラ起動中...");
  const [isLive, setIsLive] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!streamKey || !ingestEndpoint) {
      setPhase("❌ ストリームキーがありません");
      setLoading(false);
      return;
    }

    let isMounted = true;

    (async () => {
      try {
        setPhase("📦 IVS SDK読み込み中...");

        // amazon-ivs-web-broadcast の import
        const { IVSBroadcastClient, BroadcastException } = await import(
          "amazon-ivs-web-broadcast"
        );

        if (!isMounted) return;

        setPhase("🎥 カメラ・マイク起動中...");

        const broadcaster = IVSBroadcastClient.create({
          wasmModule: await (
            await fetch(
              "https://d1l3xqvbvlzz9.cloudfront.net/broadcast/wasm/amazon-ivs-web-broadcast.wasm"
            )
          ).arrayBuffer(),
        });

        broadcasterRef.current = broadcaster;

        // カメラ・マイク取得
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
          audio: true,
        });

        if (!isMounted) return;

        const videoTrack = mediaStream.getVideoTracks()[0];
        const audioTrack = mediaStream.getAudioTracks()[0];

        if (videoTrack) {
          const videoInputDevice = await broadcaster.createVideoInputDevice(videoTrack);
          broadcaster.addVideoInputDevice(videoInputDevice);
        }

        if (audioTrack) {
          const audioInputDevice = await broadcaster.createAudioInputDevice(audioTrack);
          broadcaster.addAudioInputDevice(audioInputDevice);
        }

        // プレビュー表示
        if (videoRef.current && videoTrack) {
          const canvas = await broadcaster.getVideoPreview();
          videoRef.current.appendChild(canvas);
        }

        setPhase("✅ 準備完了 — 配信開始ボタンを押してください");
        setLoading(false);

        // ストリーム開始時の処理
        broadcaster.on(
          IVSBroadcastClient.BroadcastClientState.CONNECTED,
          () => {
            if (isMounted) {
              setIsLive(true);
              setPhase("🔴 LIVE — 配信中");
              toast.success("配信開始しました");
            }
          }
        );

        broadcaster.on(
          IVSBroadcastClient.BroadcastClientState.DISCONNECTED,
          () => {
            if (isMounted) {
              setIsLive(false);
              setPhase("配信終了");
            }
          }
        );

        broadcaster.on(BroadcastException, (error) => {
          console.error("[BrowserBroadcaster] Error:", error);
          if (isMounted) setPhase(`❌ エラー: ${error.message}`);
        });

        streamRef.current = {
          start: async () => {
            try {
              await broadcaster.startBroadcast(
                streamKey,
                new URL(ingestEndpoint)
              );
            } catch (err) {
              toast.error(`配信開始エラー: ${err.message}`);
            }
          },
          stop: async () => {
            try {
              await broadcaster.stopBroadcast();
            } catch (err) {
              console.error("[BrowserBroadcaster] Stop error:", err);
            }
          },
        };
      } catch (err) {
        if (isMounted) {
          console.error("[BrowserBroadcaster] Init error:", err);
          setPhase(`❌ 初期化エラー: ${err.message}`);
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      if (broadcasterRef.current) {
        try {
          broadcasterRef.current.stopBroadcast();
        } catch (_) {}
      }
    };
  }, [streamKey, ingestEndpoint]);

  const handleToggleBroadcast = async () => {
    if (isLive) {
      await streamRef.current?.stop();
    } else {
      await streamRef.current?.start();
    }
  };

  const toggleMic = () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.getAudioInputDevices().forEach((device) => {
        device.setMuted(!micOn);
      });
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (broadcasterRef.current) {
      broadcasterRef.current.getVideoInputDevices().forEach((device) => {
        device.setMuted(!camOn);
      });
      setCamOn(!camOn);
    }
  };

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
      {/* プレビュー */}
      <div
        ref={videoRef}
        className="w-full h-full"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      />

      {/* ステータス */}
      <div className="absolute top-4 left-4 bg-black/70 px-3 py-2 rounded-lg border border-primary/30">
        <p
          className="text-sm font-bold"
          style={{ color: isLive ? "#ff4444" : "#ffaa44" }}
        >
          {phase}
        </p>
      </div>

      {/* コントロール */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        <button
          onClick={toggleMic}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            micOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {micOn ? (
            <Mic className="w-5 h-5 text-white" />
          ) : (
            <MicOff className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={toggleCam}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
            camOn ? "bg-white/20 hover:bg-white/30" : "bg-red-500 hover:bg-red-600"
          }`}
        >
          {camOn ? (
            <Camera className="w-5 h-5 text-white" />
          ) : (
            <CameraOff className="w-5 h-5 text-white" />
          )}
        </button>

        <button
          onClick={handleToggleBroadcast}
          className={`px-6 h-10 rounded-full font-bold flex items-center gap-2 transition-all ${
            isLive
              ? "bg-red-500 hover:bg-red-600"
              : "bg-green-500 hover:bg-green-600"
          }`}
        >
          {isLive ? (
            <>
              <PhoneOff className="w-4 h-4" />
              配信終了
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              配信開始
            </>
          )}
        </button>
      </div>
    </div>
  );
}