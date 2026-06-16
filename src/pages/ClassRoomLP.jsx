/**
 * ClassRoomLP — 全方位クラスルームLPブランド統合
 * ルート: /classroom-lp
 *
 * ブランドは統合・技術は分離
 * 1対1: VideoCall (WebRTC P2P) ← 既存ロジック維持
 * 1対9: ClassRoom (Amazon Chime) ← 既存ロジック維持
 */
import React from "react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users, Video, Star, CheckCircle, ArrowRight, Zap, Shield, Clock,
  User, GraduationCap, MessageCircle, Dumbbell, Briefcase, Globe, Heart,
} from "lucide-react";
import EarlyCreatorSection from "@/components/lp/EarlyCreatorSection";

// 固定の自社管理画像のみ使用
const CLASSROOM_IMG_GROUP = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/2896090d7_generated_image.png";
const CLASSROOM_IMG_YOGA = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/05b9e7271_generated_image.png";

const USE_CASES = [
  { emoji: "📚", label: "家庭教師・学習指導" },
  { emoji: "🌏", label: "語学レッスン" },
  { emoji: "🧘", label: "ヨガ・フィットネス" },
  { emoji: "💪", label: "パーソナルトレーニング" },
  { emoji: "💼", label: "キャリア・ビジネスコーチング" },
  { emoji: "🎓", label: "専門講座・資格対策" },
  { emoji: "🌱", label: "ライフコーチ・相談" },
  { emoji: "🎸", label: "音楽・楽器レッスン" },
];

const SESSION_TYPES = [
  {
    icon: User,
    label: "1対1\nプライベートセッション",
    desc: "講師とマンツーマンで、自分のペースと課題に集中。",
    color: "from-primary/20 to-primary/5",
    border: "border-primary/30",
  },
  {
    icon: Users,
    label: "1対2〜最大9名\nグループレッスン",
    desc: "講師1名に対して2〜9名の少人数クラス。仲間と学ぶ双方向授業。",
    color: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/30",
  },
];

const TEACHER_FEATURES = [
  { icon: Shield, title: "初期費用0円", desc: "無料プランからすぐにクラスを開設できます。" },
  { icon: Video, title: "HD高画質・低遅延", desc: "スタジオに近い映像品質。スマホからでも高品質配信。" },
  { icon: Zap, title: "招待制・安全な空間", desc: "6桁コードで参加者を管理。不正入室ゼロ。" },
  { icon: Clock, title: "チケット制で確実収益", desc: "事前購入チケット制で、ドタキャンをなくせます。" },
  { icon: Star, title: "柔軟なプライシング", desc: "授業時間・内容に合わせて自由に価格設定。" },
  { icon: MessageCircle, title: "あらゆる分野に対応", desc: "語学・ヨガ・コーチング・専門講座まで。" },
];

export default function ClassRoomLP() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MetaHelmet page="classroom-lp" />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-20 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/30 via-background to-primary/10 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto text-center space-y-6">
          <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-sm px-4 py-1.5">
            🎓 オンラインレッスン・コーチング
          </Badge>
          <h1 className="font-serif text-4xl md:text-6xl font-black leading-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-primary">
              1対2〜最大9名の少人数グループレッスン。
            </span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            家庭教師、語学、ヨガ、トレーニング、キャリア相談、専門講座など。<br className="hidden sm:block" />
            目的に合わせて、自分だけの個別セッションも、仲間と学ぶ少人数クラスも選べます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/recruit")}
              className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-lg px-8 py-6 rounded-2xl shadow-lg shadow-violet-500/30"
            >
              無料でクラスを始める
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => document.getElementById("for-student").scrollIntoView({ behavior: "smooth" })}
              className="text-lg px-8 py-6 rounded-2xl border-white/20"
            >
              受講したい方はこちら
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            ✓ 初期費用0円 ✓ 月額0円から開始 ✓ 生徒1名あたり15分150円から
          </p>
        </div>
      </section>

      {/* ── セッション形式 ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl font-black text-center mb-3">2つのセッション形式</h2>
          <p className="text-center text-muted-foreground mb-10 text-sm">
            講師とじっくり向き合う個別指導と、仲間と学ぶグループレッスン。どちらも同じプラットフォームで開催できます。
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            {SESSION_TYPES.map((t) => (
              <div
                key={t.label}
                className={`bg-gradient-to-br ${t.color} border ${t.border} rounded-2xl p-7 space-y-3`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                  <t.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-bold text-lg whitespace-pre-line leading-snug">{t.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-muted-foreground mt-6">
            ※ 1対1と少人数グループは、それぞれ独立した仕組みで動作しています。
          </p>
        </div>
      </section>

      {/* ── 画像 ── */}
      <section className="py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-2xl group">
              <img
                src={CLASSROOM_IMG_GROUP}
                alt="グループオンライン授業の様子"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/70 text-white border-white/20 backdrop-blur-sm">
                  👨‍🏫 語学・学習 グループレッスン
                </Badge>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-2xl group">
              <img
                src={CLASSROOM_IMG_YOGA}
                alt="ヨガ・フィットネスコーチングの様子"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4">
                <Badge className="bg-black/70 text-white border-white/20 backdrop-blur-sm">
                  🧘 ヨガ・フィットネス指導
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 活用シーン ── */}
      <section className="py-12 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">こんな指導・レッスンに使われています</p>
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

      {/* ── 先生向け機能 ── */}
      <section id="for-teacher" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">先生・講師の方へ</Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-black mb-4">
              教えることに、<span className="text-primary">集中できる設計</span>
            </h2>
            <p className="text-muted-foreground text-lg">システム管理や集金トラブルをなくし、授業に専念。</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TEACHER_FEATURES.map((f) => (
              <div key={f.title} className="bg-card border border-border rounded-2xl p-6 hover:border-primary/40 transition-all">
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

      {/* ── 生徒向け ── */}
      <section id="for-student" className="py-16 px-4 bg-secondary/30">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 mb-4">受講したい方へ</Badge>
            <h2 className="font-serif text-3xl font-black mb-3">受けたい授業だけ、受講できます</h2>
            <p className="text-muted-foreground">月額プランの加入は不要。受けたい授業のチケット代だけお支払いください。</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                <h3 className="font-bold">1対1プライベートセッションを探す</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                各講師のチャンネルから直接申し込み。相性の合う先生と、自分だけの時間を作れます。
              </p>
              <Button
                variant="outline"
                className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
                onClick={() => navigate("/search")}
              >
                講師を探す
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-400" />
                <h3 className="font-bold">少人数グループレッスンを探す</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                開催予定の授業一覧からチケットを購入。招待コードをもらって当日参加するだけ。
              </p>
              <Button
                variant="outline"
                className="w-full gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10"
                onClick={() => navigate("/school-tickets")}
              >
                グループレッスンを探す
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-5 text-center">
            <p className="font-bold text-base mb-1">生徒1名あたり、15分150円から受講できます</p>
            <p className="text-sm text-muted-foreground">※ 15分あたり150円は最低価格です。授業時間・内容によって料金は異なります。</p>
          </div>
        </div>
      </section>

      {/* ── 仕組み（先生向け） ── */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-serif text-3xl font-black text-center mb-12">
            グループレッスン開始まで<span className="text-primary">3ステップ</span>
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "クラスを作成", desc: "タイトルと招待コードを設定。30秒で完了。" },
              { step: "02", title: "生徒に招待リンクを共有", desc: "6桁コード付きURLを送るだけ。チケット購入後に入室可能。" },
              { step: "03", title: "ライブ授業スタート", desc: "2〜最大9名が同時接続。HD映像でリアルタイム指導。" },
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

      {/* ── 料金（先生向け） ── */}
      <section className="py-20 px-4 bg-secondary/20">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-2">
            <Badge className="bg-primary/20 text-primary border-primary/30 mb-4">先生・講師向け料金</Badge>
            <h2 className="font-serif text-3xl md:text-4xl font-black">
              無料から始めて、<span className="text-primary">収益を最大化</span>
            </h2>
          </div>
          <p className="text-center text-muted-foreground">初期費用0円。まずは無料プランで試してみてください。</p>

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
                  "少人数レッスン開設・運営（1対2〜最大9名）",
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
              <Button
                size="lg"
                onClick={() => navigate("/recruit")}
                variant="outline"
                className="w-full py-5 rounded-2xl border-white/20"
              >
                無料でクラスを始める
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
                <p className="text-xs text-violet-300/80 mt-1 font-bold">★ 初期メンバー向け：Basicプラン12か月無料（条件あり）</p>
              </div>
              <ul className="space-y-2.5">
                {[
                  "無料プランの全機能",
                  ["収益還元率", "85%", "text-primary"],
                  "1対1プライベートセッション（ビデオ通話）",
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
              <Button
                size="lg"
                onClick={() => navigate("/recruit")}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-500 text-white py-5 rounded-2xl shadow-lg shadow-violet-500/30"
              >
                BASICで始める
                <ArrowRight className="w-5 h-5" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">通常月額3,300円 ／ 解約いつでも可 ／ キャンペーン対象者は12か月無料</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-16 px-4 border-t border-border/50">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl font-black text-center mb-10">よくある質問</h2>
          <div className="space-y-4">
            {[
              { q: "無料プランでも少人数レッスンを開催できますか？", a: "はい。無料プランからすぐに1対2〜最大9名のクラスを開設・開催できます。収益還元率は70%です。" },
              { q: "1対1と少人数グループの両方を使えますか？", a: "はい。BASICプランなら1対1プライベートセッション（ビデオ通話）と1対2〜最大9名の少人数グループレッスンの両方が利用できます。" },
              { q: "生徒は月額プランに加入する必要がありますか？", a: "いいえ。生徒は無料登録後、受講したい授業のチケット代を支払うだけで参加できます。月額プランへの加入は不要です。" },
              { q: "生徒はどうやって入室しますか？", a: "招待リンク（6桁コード付き）と事前購入チケットがあれば入室できます。チケット未購入の生徒は自動ブロックされます。" },
              { q: "スマホでも使えますか？", a: "はい。PCブラウザ・スマホブラウザ（Chrome/Safari）に対応しています。" },
              { q: "Basicプランの月額料金はいつから発生しますか？", a: "通常は申し込み直後から月額3,300円が発生します。キャンペーン対象の方には12か月間の無料期間が適用されます。解約はいつでも可能です。" },
            ].map((faq) => (
              <div key={faq.q} className="bg-card border border-border rounded-xl p-5">
                <p className="font-bold text-sm mb-2">Q. {faq.q}</p>
                <p className="text-sm text-muted-foreground">A. {faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 初期クリエイター募集 ── */}
      <section className="py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <EarlyCreatorSection />
        </div>
      </section>

      {/* ── 最終CTA ── */}
      <section className="py-16 px-4 bg-gradient-to-br from-violet-900/20 to-primary/10 border-t border-border/50">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <h2 className="font-serif text-3xl font-black">あなたの教室、今日から開設</h2>
          <p className="text-muted-foreground">初期費用0円。最短5分でクラスを作り、授業を始められます。</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/recruit")}
              variant="outline"
              className="gap-2 text-lg px-8 py-6 rounded-2xl border-white/20"
            >
              無料で始める
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/recruit")}
              className="gap-2 bg-violet-600 hover:bg-violet-500 text-white text-lg px-8 py-6 rounded-2xl shadow-lg shadow-violet-500/30"
            >
              BASICで始める（12か月無料）
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}