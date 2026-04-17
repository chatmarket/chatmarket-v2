import React from "react";
import { AlertTriangle } from "lucide-react";

export default function ServerLimitBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border-2 border-cyan-400/60 bg-cyan-950/30 backdrop-blur-sm px-4 py-4 sm:px-6 sm:py-5">
      {/* ネオン管グロー背景 */}
      <div className="absolute inset-0 opacity-20" style={{
        background: "radial-gradient(circle at 30% 50%, #00ffff 0%, transparent 50%), radial-gradient(circle at 70% 50%, #ff00ff 0%, transparent 50%)",
        filter: "blur(40px)",
      }} />

      {/* コンテンツ */}
      <div className="relative z-10 flex items-start gap-3 sm:gap-4">
        <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-300 shrink-0 mt-0.5 animate-pulse" style={{
          textShadow: "0 0 10px #00ffff, 0 0 20px #00ffff",
        }} />
        
        <div className="flex-1 min-w-0">
          <p className="font-black text-base sm:text-lg text-transparent bg-clip-text" style={{
            color: "#ffffff",
            textShadow: "0 0 20px #00ffff, 0 0 10px #ff00ff",
            filter: "drop-shadow(0 0 8px #00ffff)",
          }}>
            ⚡ サーバー安定化のため当面の間の制限 ⚡
          </p>
          <p className="text-xs sm:text-sm text-cyan-200 mt-1.5 leading-relaxed" style={{
            textShadow: "0 0 10px rgba(0, 255, 255, 0.5)",
          }}>
            ビデオ通話、アップロード動画、ライブ配信は <span className="font-bold text-cyan-300">1日最大1時間</span> までのご利用とさせていただいております。<br className="hidden sm:inline" />
            ご不便をおかけして申し訳ございません。サーバー増強後、制限を解除いたします。
          </p>
          <p className="text-[10px] text-cyan-400/60 mt-2 leading-relaxed">
            🛡️ インフラ：AWS IVS + Chime による自動スケール対応済み。急増アクセスにも対応できる要塞設計を構築中です。
          </p>
        </div>
      </div>

      {/* ネオン管フレーム */}
      <style>{`
        @keyframes neonFlicker {
          0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
            opacity: 1;
            box-shadow: 0 0 10px #00ffff, 0 0 20px #00ffff, inset 0 0 10px rgba(0, 255, 255, 0.2);
          }
          20%, 24%, 55% {
            opacity: 0.8;
            box-shadow: 0 0 5px #00ffff, 0 0 10px #00ffff, inset 0 0 5px rgba(0, 255, 255, 0.1);
          }
        }
        @media (prefers-reduced-motion: no-preference) {
          .server-limit-banner {
            animation: neonFlicker 3s infinite;
          }
        }
      `}</style>
      <div className="server-limit-banner absolute inset-0 rounded-xl pointer-events-none" />
    </div>
  );
}