import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";

export default function RevenueBanner() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [transform, setTransform] = useState({ rotateX: 0, rotateY: 0, scale: 1 });

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;
    setTransform({ rotateX, rotateY, scale: 1.02 });
  };

  const handleMouseLeave = () => {
    setTransform({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => navigate("/plan-select")}
      style={{
        transform: `perspective(800px) rotateX(${transform.rotateX}deg) rotateY(${transform.rotateY}deg) scale(${transform.scale})`,
        transition: transform.scale === 1 ? "transform 0.5s ease" : "transform 0.1s ease",
        cursor: "pointer",
      }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent border border-primary/30 px-6 py-5 flex flex-col items-center justify-center gap-2 text-center select-none"
    >
      {/* 背景グロー */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 pointer-events-none" />
      <div
        className="absolute -top-10 -right-10 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none transition-opacity duration-300"
        style={{ opacity: transform.scale > 1 ? 0.8 : 0.3 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary" />
          <p className="text-muted-foreground text-xs font-medium tracking-widest uppercase">A platform for unbounded free speech</p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          <span className="text-primary font-black text-lg leading-tight">無料登録でも70％の収益還元</span>
          <span className="text-muted-foreground hidden sm:block">|</span>
          <span className="text-foreground font-semibold text-sm">
            プランを組み合わせ最大
            <span
              className="text-primary font-black text-2xl mx-1"
              style={{
                textShadow: transform.scale > 1 ? "0 0 20px hsl(160 84% 39% / 0.6)" : "none",
                transition: "text-shadow 0.2s ease",
              }}
            >
              95％
            </span>
            の収益還元率を実現！
          </span>
        </div>

        <p className="text-muted-foreground text-xs">必要なプランを組み合わせてご利用ください</p>
        <p className="text-muted-foreground text-xs">＊プログレッシブ・インセンティブに自動参加出来るBASICプラン以上へのお申し込みが必要です</p>

        <span className="mt-1 text-xs font-semibold text-primary/70 border border-primary/30 px-3 py-1 rounded-full hover:bg-primary/10 transition-colors">
          プランを見る →
        </span>
      </div>
    </div>
  );
}