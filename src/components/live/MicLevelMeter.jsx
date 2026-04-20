import React, { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";

/**
 * マイクレベルメーター
 * リアルタイムでマイクの音量レベルを視覚的に表示
 */
export default function MicLevelMeter({ audioStream }) {
  const [level, setLevel] = useState(0);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const animationRef = useRef(null);

  useEffect(() => {
    if (!audioStream) return;

    try {
      // AudioContext を初期化（既に存在していれば再利用）
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      // マイクのオーディオトラックを取得
      const audioTracks = audioStream.getAudioTracks();
      if (audioTracks.length === 0) return;

      const source = audioContext.createMediaStreamAudioSource(audioStream);
      source.connect(analyser);

      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

      // フレームごとにレベルを更新
      const updateLevel = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          
          // 平均レベルを計算（0-255）
          const sum = dataArrayRef.current.reduce((a, b) => a + b, 0);
          const average = sum / dataArrayRef.current.length;
          
          // 0-100% にスケーリング
          setLevel(Math.min(100, (average / 255) * 150));
        }
        animationRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    } catch (err) {
      console.error("マイクレベルメーター初期化エラー:", err);
    }
  }, [audioStream]);

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Mic className="w-4 h-4 text-white" />
        <div className="flex gap-0.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-6 rounded-sm transition-all ${
                level > i * 16.67
                  ? i < 2
                    ? "bg-green-500"
                    : i < 4
                    ? "bg-yellow-500"
                    : "bg-red-500"
                  : "bg-zinc-700"
              }`}
              style={{
                height: level > i * 16.67 ? "24px" : "16px",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}