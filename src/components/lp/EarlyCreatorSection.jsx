import React from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";

/**
 * EarlyCreatorSection
 * @param {string} mode - "link"（default）: /recruit へ遷移 | "scroll": フォームへスクロール | "none": CTAなし
 * @param {Function} onCtaClick - mode="scroll" のときに呼ぶスクロール関数
 */
export default function EarlyCreatorSection({ mode = "link", onCtaClick }) {
  return (
    <section className="rounded-2xl px-5 py-10 sm:px-10 sm:py-12 my-8"
      style={{
        background: "linear-gradient(135deg, rgba(124,58,237,0.12) 0%, rgba(0,212,170,0.08) 100%)",
        border: "1px solid rgba(124,58,237,0.25)",
      }}>
      <div className="max-w-2xl mx-auto text-center space-y-5">
        <div className="flex items-center justify-center gap-2 text-purple-400 font-black text-sm tracking-widest uppercase">
          <Sparkles className="w-4 h-4 shrink-0" />
          初期クリエイター募集
          <Sparkles className="w-4 h-4 shrink-0" />
        </div>

        <h2 className="text-xl sm:text-3xl font-black text-foreground leading-snug">
          Chat Marketを一緒に<br className="hidden sm:block" />育ててくれる仲間を募集しています
        </h2>

        <p className="text-sm text-muted-foreground leading-relaxed text-left sm:text-center">
          私たちは、配信者・占い師・講師・アイドル・クリエイターが、もっと自分らしく活動できる場所を作りたいと考えています。実際に活動する方の声を聞きながら、機能や使いやすさを少しずつ改善していきます。
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-left">
          {[
            "ライブ配信を始めたい",
            "1対1でファンや相談者とつながりたい",
            "チャット鑑定をオンラインで受け付けたい",
            "自分のスキルや作品を販売したい",
          ].map((item) => (
            <div key={item} className="flex items-start gap-2 rounded-xl px-4 py-3"
              style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
              <span className="text-purple-400 shrink-0 mt-0.5">✓</span>
              <span className="text-foreground/80">{item}</span>
            </div>
          ))}
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed">
          初期メンバーの方には、サービス改善に関するご意見を伺いながら、ページ作成や使い方のサポートも行います。完成された場所に登録するだけではなく、一緒に新しい活動の場を作っていく仲間を募集しています。
        </p>

        {mode === "link" && (
          <Link to="/recruit">
            <button className="mt-2 px-8 py-4 rounded-2xl font-black text-base w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                color: "#fff",
                boxShadow: "0 0 24px rgba(124,58,237,0.45)",
              }}>
              初期メンバーに参加する →
            </button>
          </Link>
        )}

        {mode === "scroll" && (
          <button
            onClick={onCtaClick}
            className="mt-2 px-8 py-4 rounded-2xl font-black text-base w-full sm:w-auto transition-all hover:scale-105 active:scale-95"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              color: "#fff",
              boxShadow: "0 0 24px rgba(124,58,237,0.45)",
            }}>
            申込フォームへ進む ↓
          </button>
        )}

        {/* mode="none" のときはCTAなし */}
      </div>
    </section>
  );
}