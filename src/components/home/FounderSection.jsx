import React from "react";
import { ExternalLink, PenLine, ArrowRight } from "lucide-react";

export default function FounderSection() {
  return (
    <section className="relative overflow-hidden rounded-3xl">
      {/* 背景グラデーション */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, #0a0f1e 0%, #0d1a12 50%, #0a0e1a 100%)",
          borderImage: "linear-gradient(135deg, rgba(0,255,157,0.3), rgba(120,80,255,0.3)) 1",
        }}
      />
      <div
        className="absolute inset-0 rounded-3xl"
        style={{ border: "1px solid rgba(0,255,157,0.15)" }}
      />

      {/* 装飾光 */}
      <div
        className="absolute top-0 left-1/3 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(0,255,157,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div
        className="absolute bottom-0 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, rgba(120,80,255,0.08) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      <div className="relative z-10 px-6 sm:px-10 py-10 sm:py-14 flex flex-col sm:flex-row items-center gap-8 sm:gap-12">
        {/* アバター */}
        <div className="shrink-0 flex flex-col items-center gap-3">
          <div
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl flex items-center justify-center text-5xl sm:text-6xl"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,157,0.12), rgba(120,80,255,0.12))",
              border: "1.5px solid rgba(0,255,157,0.25)",
              boxShadow: "0 0 30px rgba(0,255,157,0.1)",
            }}
          >
            🧭
          </div>
          <div className="text-center">
            <p className="text-xs font-black text-white/80 tracking-widest uppercase">Founder</p>
            <p
              className="text-sm font-black mt-0.5"
              style={{ color: "#00ff9d" }}
            >
              小野 宙
            </p>
          </div>
        </div>

        {/* テキスト */}
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.2em] mb-2"
              style={{ color: "rgba(0,255,157,0.5)" }}
            >
              Founder's Note
            </p>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-white leading-tight">
              誰が、どんな想いで<br className="hidden sm:block" />
              <span
                style={{
                  background: "linear-gradient(135deg, #00ff9d, #7c3aed)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                作ったか。
              </span>
            </h2>
          </div>

          <p className="text-sm sm:text-base text-white/55 leading-relaxed max-w-lg mx-auto sm:mx-0">
            このプラットフォームに込めた想い、ビジョン、そして私たちが目指す未来を、
            noteで綴っています。数字ではなく、言葉で伝えたいことがあります。
          </p>

          {/* CTAボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start pt-2">
            <a
              href="https://note.com/ono_chatmarket/"
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-2xl font-black text-sm transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #00ff9d, #00d4aa)",
                color: "#0a0f1e",
                boxShadow: "0 0 20px rgba(0,255,157,0.3)",
              }}
            >
              <PenLine className="w-4 h-4" />
              社長のnoteを読む
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </a>
            <a
              href="https://note.com/ono_chatmarket/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm transition-all hover:opacity-80"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              ChatMarketについて
            </a>
          </div>
        </div>
      </div>

      {/* 下部ライン装飾 */}
      <div
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent, rgba(0,255,157,0.2), rgba(120,80,255,0.2), transparent)",
        }}
      />
    </section>
  );
}