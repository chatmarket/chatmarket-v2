/**
 * ClassRoomLP — クラスルーム（1対9配信）ランディングページ
 * ルート: /classroom-lp
 */
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Video, Star, CheckCircle, ArrowRight, Zap, Shield, Clock } from "lucide-react";

const CLASSROOM_IMAGE_1 = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/2896090d7_generated_image.png";
const CLASSROOM_IMAGE_2 = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/05b9e7271_generated_image.png";

const FEATURES = [
  { icon: Users, title: "最大9名に同時配信", desc: "講師1名 + 生徒9名のリアルタイム双方向授業。全員の顔を見ながら指導できます。" },
  { icon: Video, title: "HD高画質・低遅延", desc: "Amazon Chime SDK採用。720p HDの鮮明な映像でプロ級のオンライン授業体験。" },
  { icon: Shield, title: "招待制・プライベート", desc: "6桁の招待コードで管理。不正入室ゼロ・安全な学習空間を保証。" },
  { icon: Zap, title: "ミュート・退出管理", desc: "講師が全員ミュートや個別退出を瞬時に操作。授業の主導権は常に講師側に。" },
  { icon: Clock, title: "チケット制で収益化", desc: "事前購入チケットで参加管理。生徒のドタキャンゼロ、確実な収益を保証。" },
  { icon: Star, title: "あらゆる分野に対応", desc: "語学・ヨガ・料理・音楽・ビジネスなど、どんなジャンルのコーチングにも最適。" },
];

const USE_CASES = [
  { emoji: "📚", label: "語学・学習指導" },
  { emoji: "🧘", label: "ヨガ・フィットネス" },
  { emoji: "🎸", label: "音楽・楽器レッスン" },
  { emoji: "🍳", label: "料理・クッキング" },
  { emoji: "💼", label: "ビジネスコーチング" },
  { emoji: "🎨", label: "アート・デザイン" },
];

export default function ClassRoomLP() {
  const navigate = useNavigate();

  const handleApply = () => {
    navigate("/recruit");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-background to-primary/10 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-sm px-4 py-1.5">
            🎓 NEW — クラスルーム機能
          </Badge>
          <h1 className="font-serif text-4xl md:text-6xl font-black leading-tight">
            <span className="text-white">1対9のリアルタイム</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-primary">
              グループ授業・コーチング
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            講師1名が最大9名の生徒に同時配信。<br className="hidden sm:block" />
            語学・ヨガ・コーチング…どんな分野でもオンライン教室を即開設。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              size="lg"
              onClick={handleApply}
              className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-lg px-8 py-6 rounded-2xl shadow-lg shadow-violet-500/30"
            >
              無料で今すぐ始める
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("features").scrollIntoView({ behavior: "smooth" })}
              className="text-lg px-8 py-6 rounded-2xl border-white/20"
            >
              詳しく見る
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">✓ 初期費用0円 ✓ 月額0円から開始 ✓ 最短5分でクラス開設</p>
        </div>
      </section>

      {/* ── 画像セクション ── */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-2xl group">
              <img
                src={CLASSROOM_IMAGE_1}
                alt="オンライン授業の様子"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/70 text-white border-white/20 backdrop-blur-sm">
                  📚 オンライン授業・語学レッスン
                </Badge>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-2xl group">
              <img
                src={CLASSROOM_IMAGE_2}
                alt="ヨガコーチングの様子"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/70 text-white border-white/20 backdrop-blur-sm">
                  🧘 ヨガ・フィットネスコーチング
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 活用シーン ── */}
      <section className="py-12 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">こんな授業・コーチングに使われています</p>
          <div className="flex flex-wrap justify-center gap-3">
            {USE_CASES.map((u) => (
              <div key={u.label} className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2.5 text-sm font-semibold">
                <span className="text-lg">{u.emoji}</span>
                {u.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 機能一覧 ── */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="font-serif text-3xl md:text-4xl font-black mb-4">
              クラスルームの<span className="text-primary">6つの強み</span>
            </h2>
            <p className="text-muted-foreground text-lg">教える側のストレスをゼロに。収益に集中できる設計。</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all hover:shadow-lg hover:shadow-primary/5">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-bold text-base mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 仕組み ── */}
      <section className="py-16 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl font-black text-center mb-12">
            授業開始まで<span className="text-primary">3ステップ</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "クラスを作成", desc: "タイトルと招待コードを設定。30秒で完了。" },
              { step: "02", title: "生徒に招待リンクを共有", desc: "6桁コード付きURLを送るだけ。チケット購入後に入室可能。" },
              { step: "03", title: "ライブ授業スタート", desc: "最大9名が同時接続。HD映像でリアルタイム指導。" },
            ].map((s) => (
              <div key={s.step} className="text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto">
                  <span className="text-primary font-black text-xl">{s.step}</span>
                </div>
                <h3 className="font-bold text-lg">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 料金・CTA ── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="font-serif text-3xl md:text-4xl font-black text-center mb-2">
            シンプルな<span className="text-primary">料金設計</span>
          </h2>
          <p className="text-center text-muted-foreground mb-8">初期費用0円。月額0円からクラスを開催できます。</p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* 無料プラン */}
            <div className="bg-card border border-border rounded-3xl p-8 space-y-5">
              <div>
                <Badge className="bg-secondary text-muted-foreground border-border mb-3">無料プラン</Badge>
                <div className="flex items-end gap-1">
                  <span className="font-serif text-4xl font-black">¥0</span>
                  <span className="text-muted-foreground text-sm mb-1">/月（永続）</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">初期費用なし・月額なし</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "クラスルーム開設・運営",
                  "最大9名に同時配信",
                  "チケット販売による収益化",
                  ["収益還元率", "70%", "text-yellow-400"],
                ].map((item) => (
                  <li key={Array.isArray(item) ? item[0] : item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                    {Array.isArray(item)
                      ? <span>{item[0]}：<strong className={item[2]}>{item[1]}</strong></span>
                      : <span>{item}</span>}
                  </li>
                ))}
              </ul>
              <Button size="lg" onClick={handleApply} variant="outline" className="w-full py-5 rounded-2xl border-white/20">
                無料で始める
              </Button>
            </div>

            {/* BASICプラン */}
            <div className="bg-gradient-to-br from-violet-900/40 via-card to-primary/10 border border-violet-500/40 rounded-3xl p-8 space-y-5 shadow-xl shadow-violet-500/10 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <Badge className="bg-violet-500 text-white border-0 text-xs">おすすめ</Badge>
              </div>
              <div>
                <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 mb-3">BASICプラン</Badge>
                <div className="flex items-end gap-1">
                  <span className="font-serif text-4xl font-black text-violet-300">¥3,300</span>
                  <span className="text-muted-foreground text-sm mb-1">/月</span>
                </div>
                <p className="text-xs text-violet-300/70 mt-1 font-bold">★ 登録から12か月間は月額無料</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "無料プランの全機能",
                  ["収益還元率", "85%", "text-primary"],
                  "1対1ビデオ通話",
                  "ライブ配信（PPV）",
                  "プログレッシブ還元率（最大95%）",
                  "解約いつでも可",
                ].map((item) => (
                  <li key={Array.isArray(item) ? item[0] : item} className="flex items-center gap-2.5 text-sm">
                    <CheckCircle className="w-4 h-4 text-violet-400 shrink-0" />
                    {Array.isArray(item)
                      ? <span>{item[0]}：<strong className={item[2]}>{item[1]}</strong></span>
                      : <span>{item}</span>}
                  </li>
                ))}
              </ul>
              <Button size="lg" onClick={handleApply} className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white py-5 rounded-2xl shadow-lg shadow-violet-500/30">
                BASICで始める（12か月無料）
                <ArrowRight className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 生徒側 */}
          <div className="bg-secondary/40 border border-border rounded-2xl p-6 text-center space-y-2">
            <p className="font-bold text-sm text-muted-foreground uppercase tracking-widest">生徒側</p>
            <p className="font-bold text-base">生徒は無料登録後、授業料を支払うだけで受講できます。</p>
            <p className="text-sm text-muted-foreground">月額プランへの加入は一切不要。受けたい授業のチケット代だけお支払いください。</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl font-black text-center mb-10">よくある質問</h2>
          <div className="space-y-4">
            {[
              { q: "1対9は同時に9名まで繋げられますか？", a: "はい。講師1名 + 生徒最大9名の合計10名が同時接続できます。" },
              { q: "生徒はどうやって入室しますか？", a: "招待リンク（6桁コード付き）と事前購入チケットがあれば入室できます。チケット未購入の生徒は自動ブロックされます。" },
              { q: "授業中に生徒をミュートや退出させられますか？", a: "はい。講師は全員一括ミュート・個別ミュート・強制退出（再入室禁止）が可能です。" },
              { q: "スマホでも使えますか？", a: "はい。PCブラウザ・スマホブラウザ（Chrome/Safari）に対応しています。" },
              { q: "解約はいつでもできますか？", a: "はい。翌月の更新前であればいつでも解約できます。違約金はありません。" },
            ].map((faq) => (
              <div key={faq.q} className="bg-card border border-border rounded-xl p-5">
                <p className="font-bold text-sm mb-2">Q. {faq.q}</p>
                <p className="text-sm text-muted-foreground">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="py-16 px-4 bg-gradient-to-br from-violet-900/20 to-primary/10 border-t border-border/50">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-serif text-3xl font-black">あなたの教室、今日から開設</h2>
          <p className="text-muted-foreground">最短5分でクラスを作り、最大9名に授業を届けましょう。</p>
          <Button
            size="lg"
            onClick={handleApply}
            className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-lg px-10 py-6 rounded-2xl"
          >
            月額3,300円で申し込む
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      </section>
    </div>
  );
}