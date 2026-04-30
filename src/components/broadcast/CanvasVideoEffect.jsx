/**
 * CanvasVideoEffect
 * カメラ映像をCanvasに描画し、CSSフィルターや背景エフェクトをリアルタイム適用する。
 * props:
 *   sourceRef  — 元映像の<video>要素ref
 *   effect     — { type: "none"|"blur_bg"|"color"|"overlay", ...params }
 *   onStream   — Canvasから生成したMediaStreamを返すコールバック (stream) => void
 *   width, height — Canvas解像度（デフォルト 1280x720）
 */
import React, { useEffect, useRef, useImperativeHandle, forwardRef } from "react";

const EFFECTS = {
  none: null,
  // CSSフィルター系（Canvasに直接適用）
  vivid:   { filter: "saturate(1.8) contrast(1.1)" },
  cool:    { filter: "hue-rotate(200deg) saturate(1.4)" },
  warm:    { filter: "sepia(0.4) saturate(1.5) brightness(1.05)" },
  bw:      { filter: "grayscale(1)" },
  vintage: { filter: "sepia(0.6) contrast(1.1) brightness(0.9)" },
  dream:   { filter: "blur(0.5px) saturate(1.3) brightness(1.1)" },
  // オーバーレイ系
  dark:    { overlay: "rgba(0,0,0,0.35)" },
  pink:    { overlay: "rgba(255,100,150,0.25)" },
  blue:    { overlay: "rgba(0,100,255,0.22)" },
  green:   { overlay: "rgba(0,200,100,0.22)" },
};

const CanvasVideoEffect = forwardRef(function CanvasVideoEffect(
  { sourceRef, effectKey = "none", onStream, width = 1280, height = 720, className = "", style = {} },
  ref
) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);

  // 外部から停止できるようにする
  useImperativeHandle(ref, () => ({
    getStream: () => streamRef.current,
    stop: () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = width;
    canvas.height = height;

    let active = true;
    const effect = EFFECTS[effectKey] || null;

    const draw = () => {
      if (!active) return;
      const video = sourceRef?.current;
      if (video && video.readyState >= 2) {
        // フィルターセット
        ctx.filter = effect?.filter || "none";
        ctx.drawImage(video, 0, 0, width, height);
        // オーバーレイ色
        if (effect?.overlay) {
          ctx.filter = "none";
          ctx.fillStyle = effect.overlay;
          ctx.fillRect(0, 0, width, height);
        }
      } else {
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, width, height);
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    // Canvasからストリーム生成
    const stream = canvas.captureStream(30);
    streamRef.current = stream;
    onStream?.(stream);

    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [effectKey, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", ...style }}
    />
  );
});

export default CanvasVideoEffect;
export { EFFECTS };