import React from "react";
import { MessageSquare, Video, Clock, Star } from "lucide-react";

export default function FortunePagePreview() {
  return (
    <section className="relative px-5 py-20">
      <div className="max-w-3xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "#D4AF37" }}>
            ✨ 登録後のイメージ
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white">
            あなたの鑑定ページは<br />このように表示されます
          </h2>
          <p className="text-sm text-white/50">相談者が見る実際のページイメージです（サンプル）</p>
        </div>

        <div className="rounded-3xl overflow-hidden"
          style={{ background: "rgba(20,12,40,0.9)", border: "1px solid rgba(212,175,55,0.3)", boxShadow: "0 0 40px rgba(107,33,168,0.2)" }}>
          <div className="h-20 w-full" style={{ background: "linear-gradient(135deg, rgba(107,33,168,0.6), rgba(212,175,55,0.2))" }} />

          <div className="p-5 space-y-5">
            <div className="flex items-start gap-4 -mt-10">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shrink-0 border-2"
                style={{ background: "rgba(107,33,168,0.5)", borderColor: "rgba(212,175,55,0.4)" }}>
                🔮
              </div>
              <div className="pt-2 space-y-1.5">
                <p className="font-black text-white text-lg">星詠み 紫苑（サンプル）</p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">💬 チャット鑑定</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">📹 ビデオ鑑定</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 rounded-xl p-3 space-y-1">
                <p className="text-white/50 font-bold">占術</p>
                <p className="text-white">タロット・西洋占星術</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 space-y-1">
                <p className="text-white/50 font-bold">得意な相談</p>
                <p className="text-white">恋愛・復縁・仕事</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-white/60">
              <Clock className="w-3.5 h-3.5 text-yellow-400" />
              <span>返信目安：24時間以内</span>
              <div className="flex items-center gap-1 ml-2">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-yellow-400">4.9</span>
                <span className="text-white/40">（レビュー例）</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-black text-white/70 uppercase tracking-widest">チャット鑑定メニュー</p>
              {[
                { title: "恋愛相談チャット鑑定", price: "¥3,000", hours: "24時間以内" },
                { title: "総合運チャット鑑定", price: "¥2,500", hours: "48時間以内" },
              ].map((menu, i) => (
                <div key={i} className="rounded-2xl p-4 flex items-center justify-between gap-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div>
                    <p className="font-bold text-sm text-white">{menu.title}</p>
                    <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {menu.hours}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-base" style={{ color: "#D4AF37" }}>{menu.price}</p>
                    <div className="mt-1 text-[10px] px-3 py-1 rounded-full font-bold text-black text-center"
                      style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)" }}>
                      申し込む
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm text-black"
                style={{ background: "linear-gradient(135deg, #D4AF37, #A0760F)" }}>
                <MessageSquare className="w-4 h-4" /> チャット鑑定を申し込む
              </div>
              <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm border border-white/20 text-white/70"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Video className="w-4 h-4" /> 1対1ビデオ鑑定
              </div>
            </div>

            <p className="text-center text-[10px] text-white/30">
              ※ これはサンプル表示です。実際のページは登録後に自分で設定できます。
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}