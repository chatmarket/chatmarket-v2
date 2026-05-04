import React, { useEffect } from "react";
import confetti from "canvas-confetti";

/**
 * ConfettiEffect
 * canvas-confetti を使った紙吹雪エフェクト
 */
export default function ConfettiEffect({ onComplete }) {
  useEffect(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const defaults = {
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      zIndex: 0,
    };

    const randomInRange = (min, max) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        onComplete?.();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
        colors: ["#fbbf24", "#f59e0b", "#fbbf24", "#ffffff"],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [onComplete]);

  return null;
}