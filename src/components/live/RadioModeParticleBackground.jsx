import React, { useEffect, useRef } from "react";

/**
 * ラジオモード用のパーティクル背景アニメーション
 * Canvas に描画し、captureStream で映像ストリームとして使用
 */
export default function RadioModeParticleBackground({ onStreamReady, width = 160, height = 90 }) {
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // パーティクル初期化
    const particles = [];
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.5 + 0.3,
      });
    }
    particlesRef.current = particles;

    // アニメーションループ
    const animate = () => {
      // 背景: グラデーション黒
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "#1a1a1a");
      gradient.addColorStop(1, "#0a0a0a");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // パーティクル描画
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        // バウンス
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.fillStyle = `rgba(255, 100, 100, ${p.opacity})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // ラジオアイコン描画
      ctx.fillStyle = "rgba(255, 100, 100, 0.5)";
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("🎙️", width / 2, height / 2);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    // ストリーム取得
    const stream = canvas.captureStream(1); // 1fps
    if (onStreamReady) {
      onStreamReady(stream);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [width, height, onStreamReady]);

  return <canvas ref={canvasRef} style={{ display: "none" }} />;
}