import React, { useEffect, useRef } from "react";
import confetti from "canvas-confetti";

export default function YellCoinEffect({ amount, onDone }) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (hasFired.current) return;
    hasFired.current = true;

    const colors =
      amount >= 10000
        ? ["#ff0000", "#ff6600", "#ffcc00"]
        : amount >= 5000
        ? ["#ff6600", "#ffcc00", "#ffffff"]
        : amount >= 1000
        ? ["#22c55e", "#facc15", "#ffffff"]
        : ["#22c55e", "#86efac"];

    const count = Math.min(Math.floor(amount / 50), 300);

    confetti({
      particleCount: count,
      spread: 120,
      origin: { y: 0.6 },
      colors,
      scalar: amount >= 5000 ? 1.4 : 1,
    });

    if (amount >= 5000) {
      setTimeout(() => {
        confetti({ particleCount: count / 2, angle: 60, spread: 80, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: count / 2, angle: 120, spread: 80, origin: { x: 1, y: 0.7 }, colors });
      }, 300);
    }

    const timer = setTimeout(onDone, 2500);
    return () => clearTimeout(timer);
  }, [amount, onDone]);

  return (
    <div className="fixed inset-0 z-[200] pointer-events-none flex items-center justify-center">
      <style>{`
        @keyframes coin-popup {
          0% {
            opacity: 0;
            transform: scale(0.3) translateY(30px);
          }
          50% {
            opacity: 1;
            transform: scale(1.3) translateY(-20px);
          }
          100% {
            opacity: 0;
            transform: scale(0.8) translateY(-60px);
          }
        }
        @keyframes coin-shine {
          0%, 100% { filter: drop-shadow(0 0 10px rgba(250, 204, 21, 0.5)); }
          50% { filter: drop-shadow(0 0 30px rgba(255, 165, 0, 1)); }
        }
        .coin-effect {
          animation: coin-popup 2.5s ease-out forwards, coin-shine 0.8s ease-in-out infinite;
        }
      `}</style>
      <div className="coin-effect bg-gradient-to-br from-yellow-300 via-yellow-400 to-orange-500 text-black font-black text-5xl md:text-7xl px-12 py-8 rounded-3xl shadow-2xl">
        🪙 ¥{amount.toLocaleString()} エールコイン！
      </div>
    </div>
  );
}