import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Shield, Clock, TrendingUp, BookOpen, Award, ArrowRight, ChevronDown } from "lucide-react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import ActiveCreatorsSection from "@/components/lp/ActiveCreatorsSection";
import EarlyCreatorSection from "@/components/lp/EarlyCreatorSection";

const STATS = [
  { value: "85%", label: "講師収益還元率", sub: "業界最高水準" },
  { value: "0円", label: "初期費用", sub: "完全無料スタート" },
  { value: "最大9名", label: "少人数レッスン対応", sub: "1対2〜最大9名まで" },
];

const COMPARISON = [
  {
    label: "Chat Market",
    highlight: true,
    items: [
      "✓ 講師収益還元率 85%（最大95%）を実現",
      "✓ 1対1個別指導から1対2〜最大9名の少人数レッスンまで",
      "✓ 即時性の高い精算と透明な報酬体系",
      "✓ 初期メンバー向けBasicプラン12か月無料",
    ],
  },
  {
    label: "既存モデルの課題",
    highlight: false,
    items: [
      "✗ 30%～50%に及ぶ高額な中間マージン",
      "✗ 講師の個性が埋もれる一律的なシステム",
      "✗ 支払いの遅延や複雑な精算フロー",
      "✗ 厳しい契約による自由な教育機会の喪失",
    ],
  },
];

const FEATURES = [
  {
    icon: "👤",
    title: "1対1個別指導",
    desc: "生徒とマンツーマンで丁寧に指導。個別の課題に集中した指導ができます。",
  },
  {
    icon: "👥",
    title: "1対2〜最大9名の少人数レッスン",
    desc: "小グループでの授業に対応。兄弟・友人グループ・少人数補習にも使えます。",
  },
  {
    icon: "☑️",
    title: "受付・決済・指導まで完結",
    desc: "スケジュール、決済、授業管理をワンストップ。事務作業を極限まで削減し、教えることに集中。",
  },
];

const REASONS = [
  {
    icon: "✓",
    title: "業界最高の還元率 85%",
    desc: "業界の追随を許しません。",
  },
  {
    icon: "⭐",
    title: "ブランド構築",
    desc: "自分の得意分野を特化させた専門チャンネルを持てます。",
  },
  {
    icon: "🔒",
    title: "安心のプライバシー設計",
    desc: "本名・住所不要で活動できる安心の設計。個人情報を守りながら指導に集中できます。",
  },
  {
    icon: "⏰",
    title: "自分のペースで指導できる",
    desc: "予約システムで、自分のスケジュールに合わせて生徒を受け付けられます。",
  },
  {
    icon: "🚀",
    title: "将来の拡張性",
    desc: "占い、音楽、家庭教師。多角的な集客導線を共有。",
  },
];

export default function TutorLP() {
  const navigate = useNavigate();
  const [expandedFAQ, setExpandedFAQ] = useState(null);

  useEffect(() => {
    document.title = "家庭教師プロジェクト | Chat Market";
  }, []);

  const handleRegisterClick = () => {
    navigate("/recruit", { state: { category: "tutor" } });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-inter">
      {/* Meta Tags */}
      <MetaHelmet
        title="家庭教師・オンライン講師向けプラットフォーム | ChatMarket（チャットマーケット）"
        description="家庭教師・オンライン講師・塾講師向け高還元率プラットフォーム。講師収益還元率85%・12ヶ月間完全無料・1対1ビデオ授業対応。既存モデルの高額中間マージンを排除し、あなたの収益を最大化。今すぐ無料登録。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/bb603a708_generated_image.png"
      />

      {/* HERO */}
      <section className="py-12 sm:py-20 px-5 text-center bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-5xl mx-auto space-y-8">
          {/* Hero Image */}
          <div className="w-full rounded-2xl overflow-hidden shadow-lg mb-8">
            <img 
              src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/bb603a708_generated_image.png" 
              alt="オンライン授業を受ける学生"
              className="w-full h-auto object-cover"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-blue-900 leading-tight tracking-tight">
            あなたの教え方が、<br />生徒に届く場所。
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 leading-relaxed">
            1対1個別指導から、1対2〜最大9名の少人数レッスンまで。<br />
            個別指導にも、オンライン塾にも使える教育者向けプラットフォーム。
          </p>
          <div className="pt-8">
            <button
              onClick={handleRegisterClick}
              className="px-10 py-4 rounded-full text-lg font-black text-white transition-all hover:scale-105 active:scale-95 shadow-lg"
              style={{ background: "#1F4A9D" }}
            >
              講師として登録する
            </button>
            <p className="text-sm text-slate-500 mt-4">
              ※Basicプラン12か月無料の適用には条件があります。
            </p>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 px-5 bg-slate-50">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-6 bg-white rounded-2xl shadow-sm border border-slate-100">
              <p className="text-4xl font-black text-blue-900">{s.value}</p>
              <p className="text-sm font-bold text-slate-700 mt-2">{s.label}</p>
              <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 教育市場の再定義 */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
            <h2 className="text-4xl font-black text-blue-900">教育市場の再定義</h2>
            <p className="text-lg text-slate-600 leading-relaxed mt-4">
              既存のプラットフォームが抱える「高額手数料」の壁を打ち破り、講師が正当な報酬を受け取れる世界へ。
            </p>
          </div>
        </div>
      </section>

      {/* 既存モデル vs Chat Market */}
      <section className="py-20 px-5 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
          <h2 className="text-3xl font-black text-blue-900 mb-10">既存モデル vs Chat Market</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {COMPARISON.map((comp) => (
              <div
                key={comp.label}
                className={`p-8 rounded-2xl border-2 ${
                  comp.highlight
                    ? "border-green-400 bg-green-50"
                    : "border-red-300 bg-red-50"
                }`}
              >
                <p className={`text-xl font-bold mb-6 ${comp.highlight ? "text-green-700" : "text-red-700"}`}>
                  {comp.highlight ? "✓ Chat Market" : "✗ 既存モデル"}
                </p>
                <ul className="space-y-3">
                  {comp.items.map((item, i) => (
                    <li key={i} className="text-sm font-medium text-slate-700 leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* プロ講師のための「聖域」 */}
      <section className="py-16 sm:py-20 px-5">
       <div className="max-w-5xl mx-auto">
         <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
         <h2 className="text-3xl font-black text-blue-900 mb-10">プロ講師のための「聖域」</h2>

         <div className="flex flex-col md:flex-row gap-8 items-center">
           <div className="flex-1 order-2 md:order-1">
             <p className="text-slate-700 leading-relaxed mb-4">
               <strong>エリート講師のブランド化</strong>
             </p>
             <p className="text-slate-600 leading-relaxed mb-6">
               Chat Marketは、単なるマッチングサイトではありません。あなたの専門性と実績を輝かせるための「専用チャンネル」を提供します。
             </p>
             <p className="text-slate-600 leading-relaxed">
               PRISM Live Studioとの連携により、数式や図解も鮮明に伝えることが可能。対面授業を超える「体験」を生徒に届けましょう。
             </p>
           </div>
           <div className="flex-1 order-1 md:order-2">
             <img 
               src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/bb603a708_generated_image.png"
               alt="オンライン授業風景"
               className="w-full rounded-2xl shadow-lg"
             />
           </div>
         </div>
       </div>
      </section>

      {/* 収益構造の革命 */}
      <section className="py-20 px-5 bg-blue-900 text-white">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-10">収益構造の革命</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <p className="text-xl font-bold text-yellow-400">なぜ「85%」なのか？</p>
              <p className="text-blue-100 leading-relaxed">
                私たちは、教育の質は「講師のモチベーション」に直結すると信じています。中抜きのコストを極限まで削り、講師に還元することで、最高品質の授業を実現します。
              </p>
              <ul className="space-y-3 text-blue-100">
                <li className="flex items-center gap-2">
                 <span className="text-yellow-400">💰</span> 授業料の85%を講師がダイレクトに受領
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">⚡</span> 業界最安水準のプラットフォーム利用料
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-yellow-400">📊</span> 高還元だからこそ可能な低価格・高品質の両立
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-center">
              <div className="text-center space-y-3">
                <p className="text-7xl font-black text-yellow-400">85%</p>
                <p className="text-2xl font-bold text-white">講師収益還元率</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2つの指導スタイル */}
      <section className="py-20 px-5">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
          <h2 className="text-3xl font-black text-blue-900 mb-10">2つの指導スタイル</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1対1 */}
            <div className="bg-blue-50 border-2 border-blue-300 rounded-2xl p-8 space-y-4">
              <div className="text-4xl">👤</div>
              <h3 className="text-xl font-black text-blue-900">1対1 個別指導</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                生徒と1対1のマンツーマンビデオ通話。個別の課題にじっくり向き合い、丁寧に指導できます。
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">✓</span>既存の生徒・保護者へ案内しやすい</li>
                <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">✓</span>追加指導・補習にも活用できる</li>
                <li className="flex items-start gap-2"><span className="text-blue-600 mt-0.5">✓</span>受付・決済・指導までオンラインで完結</li>
              </ul>
            </div>

            {/* 1対2〜9 */}
            <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-8 space-y-4">
              <div className="text-4xl">👥</div>
              <h3 className="text-xl font-black text-blue-900">1対2〜最大9名の少人数レッスン</h3>
              <p className="text-slate-600 text-sm leading-relaxed">
                オンライン塾・少人数クラスに対応。顔が見える距離感で、質問しやすい環境を作れます。
              </p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">✓</span>兄弟・友人グループ・少人数補習に対応</li>
                <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">✓</span>生徒も質問しやすく、講師も管理しやすい</li>
                <li className="flex items-start gap-2"><span className="text-indigo-600 mt-0.5">✓</span>チケット制で確実に収益化できる</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Basicプラン12か月無料 */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
          <h2 className="text-3xl font-black text-blue-900 mb-10">初期メンバー向け：Basicプラン12か月無料</h2>

          <div className="bg-blue-900 text-white p-8 rounded-3xl space-y-6">
            <p className="text-xl font-bold">リスクゼロで始められる</p>
            <p className="text-blue-100 leading-relaxed">
              初期メンバーとして参加いただいた方は、Basicプランを最大12か月間無料で利用できます。
            </p>
            <ul className="space-y-3 text-blue-100">
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold mt-1">•</span>
                <span>1対1個別指導・少人数レッスンの全機能が利用可能</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold mt-1">•</span>
                <span>収益還元率85%（実績に応じて最大95%）</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-yellow-400 font-bold mt-1">•</span>
                <span>12か月の間に自分の生徒・顧客基盤を構築できる</span>
              </li>
            </ul>
            <p className="text-xs text-blue-300 leading-relaxed">
              ※Basicプラン12か月無料の適用には条件があります。<br />
              ※12か月無料期間終了後、自動的に課金が開始されることはありません。継続利用を希望する場合は、利用者本人による有料プラン申込が必要です。<br />
              ※収益還元率は対象プラン・適用条件により異なります。最大95%は所定条件を満たした場合のプログレッシブインセンティブ適用時の還元率です。
            </p>
          </div>
        </div>
      </section>

      {/* プラットフォームの三本柱 */}
      <section className="py-20 px-5 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
          <h2 className="text-3xl font-black text-blue-900 mb-10">プラットフォームの三本柱</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="p-8 bg-white rounded-2xl shadow-sm border border-slate-100 text-center space-y-3">
                <div className="text-5xl">{f.icon}</div>
                <h3 className="text-xl font-bold text-blue-900">{f.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 講師に選ばれる5つの理由 */}
      <section className="py-20 px-5">
        <div className="max-w-3xl mx-auto">
          <div className="inline-block w-1 h-8 bg-yellow-500 rounded-full mb-4" />
          <h2 className="text-3xl font-black text-blue-900 mb-10">講師に選ばれる5つの理由</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {REASONS.map((r) => (
              <div key={r.title} className="p-6 border-l-4 border-yellow-500 bg-yellow-50 rounded-lg space-y-2">
                <p className="text-3xl font-bold text-blue-900">{r.icon}</p>
                <h3 className="text-lg font-bold text-blue-900">{r.title}</h3>
                <p className="text-slate-600 text-sm">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 圧倒的な数字のインパクト */}
      <section className="py-20 px-5 bg-gradient-to-r from-blue-900 to-blue-800 text-white">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <p className="text-5xl sm:text-6xl font-black">85%</p>
          <p className="text-3xl font-bold">講師収益還元率</p>
          <p className="text-blue-100 leading-relaxed max-w-md mx-auto">
            教えることに集中できる、透明な仕組みを目指しています。他のプラットフォームで1万円の授業をしても、あなたの手元に残るのは5,000円～7,000円。Chat Marketなら8,500円があなたのものです。
          </p>
          <p className="text-xs text-blue-200">
            さらに、12ヶ月間の無料期間を活かすことで、運営コストを抑えながら自分のペースで生徒との関係を築いていけます。
          </p>
        </div>
      </section>

      {/* ── 実際に活躍中の講師 ── */}
      <section className="py-16 px-5 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <ActiveCreatorsSection
            serviceCategory="language"
            title="実際に活躍中の講師"
            accentColor="#1F4A9D"
            theme="light"
          />
        </div>
      </section>

      {/* 初期クリエイター募集 */}
      <section className="py-8 px-5 bg-slate-50">
        <div className="max-w-4xl mx-auto">
          <EarlyCreatorSection />
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-5 text-center bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-4xl font-black text-blue-900">あなたの授業を、届けよう。</h2>
          <p className="text-xl text-slate-600">
            生徒とつながりながら、自分のペースで活動できる場所です。
          </p>
          <button
            onClick={handleRegisterClick}
            className="px-12 py-5 rounded-full text-lg font-black text-white transition-all hover:scale-105 active:scale-95 shadow-lg mx-auto block"
            style={{ background: "#1F4A9D" }}
          >
            <span className="flex items-center justify-center gap-2">
              講師として登録する
              <ArrowRight className="w-5 h-5" />
            </span>
          </button>
          <p className="text-xs text-slate-500">
            生徒一人ひとりに近い距離で教えられるオンライン指導環境。<br />
            ※Basicプラン12か月無料の適用には条件があります。
          </p>
        </div>
      </section>
    </div>
  );
}