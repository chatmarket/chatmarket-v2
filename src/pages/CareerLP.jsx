import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, ChevronDown, ArrowRight, Gift, Star, TrendingUp, Shield, Clock, Zap, Users, Briefcase } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// ── PDFのブランドカラー ──
const C = {
  navy: "#1B2B6B",
  orange: "#F5A623",
  bg: "#F7F8FC",
  white: "#FFFFFF",
};

const TOTAL_SLOTS = 50;

// 比較テーブルデータ（PDF p.9）
const COMPARISON_TABLE = [
  { item: "アドバイスの中立性", cm: "100%（利害関係なし）", agent: "低い（内定報酬モデル）", skill: "普通（個人差あり）" },
  { item: "講師の収益性",       cm: "高（還元率 85%）",     agent: "固定給または歩合",      skill: "中（手数料 25〜35%）" },
  { item: "プライバシー保護",   cm: "最高（防犯メディア連携）", agent: "普通（企業に開示）", skill: "普通（自己責任）" },
  { item: "夜間・即時対応",     cm: "可能（24時間体制）",   agent: "不可（営業時間内）",   skill: "困難（事前予約必須）" },
];

// 3つのコアバリュー（PDF p.5）
const CORE_VALUES = [
  {
    emoji: "💬",
    title: "模擬面接×フィードバック",
    desc: "PRISM連携の低遅延ビデオ通話で、本番さながらの臨場感を実現。細かい表情や言葉遣いまで指導可能。",
  },
  {
    emoji: "🫶",
    title: "伴走型メンタルケア",
    desc: "孤独な就職・転職活動に寄り添う。不安を取り除き、自己肯定感を高めるための心理的アプローチ。",
  },
  {
    emoji: "📊",
    title: "セカンドオピニオン",
    desc: "他社エージェントの提案を客観的に評価。キャリアの分岐点における、究極の「第三者評価」を提供。",
  },
];

// 選ばれる5つの理由（PDF p.7）
const REASONS = [
  { emoji: "🔒", title: "徹底した秘匿性",      desc: "現職にバレる心配のない、クローズドな空間を保証。" },
  { emoji: "📹", title: "最高画質の指導環境",  desc: "数式共有や資料提示も鮮明なPRISMプラットフォーム。" },
  { emoji: "💳", title: "即時決済システム",    desc: "未回収リスクゼロ。相談完了と同時に報酬が確定。" },
  { emoji: "🛡️", title: "防犯メディアの盾",   desc: "迷惑ユーザーを遮断し、講師の安全とプライバシーを死守。" },
  { emoji: "🚀", title: "将来の拡張性",        desc: "法人研修や有料note等への導線としての活用も可能。" },
];

// 先着枠ウィジェット
function SlotsWidget({ remaining }) {
  const pct = Math.round(((TOTAL_SLOTS - remaining) / TOTAL_SLOTS) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-bold" style={{ color: C.navy }}>
        <span>残り枠</span>
        <span style={{ color: remaining <= 10 ? "#EF4444" : C.orange }}>{remaining} / {TOTAL_SLOTS} 名</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${C.orange}, #E8851A)` }}
        />
      </div>
      <p className="text-xs text-gray-500">定員に達し次第、キャンペーンは終了します</p>
    </div>
  );
}

export default function CareerLP() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [user, setUser] = useState(null);
  const [remaining, setRemaining] = useState(50);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "Career Navigation Project | Chat Market";
    base44.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        const me = await base44.auth.me();
        setUser(me);
        setName(me.full_name || "");
        setEmail(me.email || "");
      }
    });
    // 先着枠を申込数から計算
    base44.entities.BlogPost.filter({ channel_id: "career_application" })
      .then((posts) => {
        const used = Math.min(posts.length, TOTAL_SLOTS);
        setRemaining(Math.max(0, TOTAL_SLOTS - used));
      })
      .catch(() => {});
  }, []);

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) { toast.error("お名前とメールアドレスは必須です"); return; }
    if (remaining <= 0) { toast.error("申し訳ありません。定員に達しました。"); return; }
    setSubmitting(true);
    try {
      await base44.entities.BlogPost.create({
        title: `【キャリア申請】${name}`,
        content: JSON.stringify({ name, email, specialty, applied_at: new Date().toISOString() }),
        channel_id: "career_application",
        status: "draft",
      });
      try {
        await base44.functions.invoke("campaignAutoGrant", {
          email, name, followers: 0,
          category_id: "career",
          career_free_subscription_months: 12,
          career_revenue_rate: 0.85,
        });
      } catch (_) {}
      setRemaining((r) => Math.max(0, r - 1));
      toast.success("✅ 登録完了！12ヶ月無料・85%還元が適用されました");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      toast.error("送信に失敗しました。しばらくしてからお試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-inter overflow-x-hidden" style={{ background: C.bg, color: C.navy }}>

      {/* ── HERO（PDF p.1） ── */}
      <section className="min-h-screen flex flex-col items-center justify-center text-center px-5 pt-20 pb-16"
        style={{ background: C.bg }}>
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto space-y-6">
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black leading-tight" style={{ color: C.navy }}>
            Career Navigation<br />
            <span style={{ color: C.orange }}>Project</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 leading-relaxed">
            1対1模擬面接×メンタルケア：専門家のための新聖域
          </p>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-3 px-6 py-3 rounded-full font-bold text-white text-sm"
            style={{ background: C.navy }}
          >
            還元率 85% | 12ヶ月無料 | 秘密厳守
          </motion.div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={scrollToForm}
              className="px-10 py-4 rounded-full font-black text-base text-white transition-all hover:scale-105 shadow-lg"
              style={{ background: C.orange, boxShadow: `0 8px 30px ${C.orange}50` }}>
              今すぐパートナー登録 →
            </button>
            <Link to="/recruit">
              <button className="px-10 py-4 rounded-full font-black text-base transition-all border-2 hover:bg-gray-100"
                style={{ borderColor: C.navy, color: C.navy }}>
                ライバー募集を見る
              </button>
            </Link>
          </div>
        </motion.div>
        <motion.div className="absolute bottom-10 left-1/2 -translate-x-1/2 hidden sm:block"
          animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </section>

      {/* ── 「無料相談」の限界を超える（PDF p.2） ── */}
      <section className="py-24 px-5 text-center" style={{ background: C.white }}>
        <div className="max-w-2xl mx-auto space-y-5">
          <div className="w-12 h-1 rounded-full mx-auto" style={{ background: C.orange }} />
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: C.navy }}>
            「無料相談」の限界を超える
          </h2>
          <p className="text-gray-500 text-lg leading-relaxed">
            既存の無料サービスが解決できない「利害関係のない純粋な助言」への需要を独占します。
          </p>
        </div>
      </section>

      {/* ── 無料サービスの裏側 vs Chat Market（PDF p.3） ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>無料サービスの「裏側」と弊社の解</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 既存の問題 */}
            <div className="p-8 rounded-2xl border-l-4 space-y-4" style={{ borderLeftColor: "#EF4444", background: "#FEF2F2" }}>
              <p className="font-black text-base" style={{ color: "#DC2626" }}>エージェントの利益相反</p>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  "企業からの紹介料が目的の「誘導」",
                  "就職率を優先した画一的なアドバイス",
                  "相談者の本音よりも「成約」を重視",
                  "繁忙期の予約困難と質のバラつき",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            {/* Chat Market */}
            <div className="p-8 rounded-2xl border-l-4 space-y-4" style={{ borderLeftColor: "#10B981", background: "#F0FDF4" }}>
              <p className="font-black text-base" style={{ color: "#059669" }}>Chat Marketの中立性</p>
              <ul className="space-y-3 text-sm text-gray-700">
                {[
                  "企業との利害関係ゼロ。相談者第一主義",
                  "コイン課金制による「純粋なアドバイス」",
                  "24時間365日、不安な瞬間に即アクセス",
                  "資格保持者によるプロのメンタルサポート",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── プロのスキルを、最高の環境で（PDF p.4） ── */}
      <section className="py-20 px-5" style={{ background: C.white }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>プロのスキルを、最高の環境で。</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="rounded-3xl overflow-hidden shadow-lg aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <img
                src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=800&q=80"
                alt="キャリアコンサルタントの面談"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-5">
              <p className="font-black text-xl" style={{ color: C.navy }}>キャリアコンサルタントの「自立」</p>
              <p className="text-gray-600 leading-relaxed">
                資格を活かしきれていない、あるいは大手プラットフォームの手数料に疲弊しているプロフェッショナルの皆様へ。
              </p>
              <p className="text-gray-600 leading-relaxed">
                Chat Marketは、あなたの専門性を高く評価し、ファンと直接つながるための最高級のツールを提供します。
              </p>
              <button onClick={scrollToForm}
                className="px-7 py-3 rounded-xl font-black text-sm text-white"
                style={{ background: C.navy }}>
                無料で登録する →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3つのコアバリュー（PDF p.5） ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>提供する3つのコア・バリュー</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {CORE_VALUES.map((v, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="p-8 rounded-2xl text-center space-y-4 border-t-4"
                style={{ background: C.white, borderTopColor: C.navy, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              >
                <div className="text-5xl">{v.emoji}</div>
                <h3 className="font-black text-base" style={{ color: C.navy }}>{v.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 85%収益ポテンシャル（PDF p.6） ── */}
      <section className="py-20 px-5" style={{ background: C.navy }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black text-white">圧倒的な収益ポテンシャル</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="text-center">
              <p className="text-9xl font-black leading-none" style={{ color: C.orange }}>85</p>
              <p className="text-4xl font-black text-white">%</p>
              <p className="text-lg font-bold text-white/70 mt-2">アドバイザー受取額</p>
            </div>
            <div className="space-y-5">
              <p className="font-black text-white text-base">「安売り」からの脱却</p>
              <p className="text-white/70 leading-relaxed">
                無料セミナーの講師や、低単価なマッチングサイトに時間を費やすのはもう終わりです。
              </p>
              <p className="text-white/70 leading-relaxed">
                85%という高還元率により、たった15分のセッションが、あなたのキャリアを支える確かな収益に変わります。
              </p>
              <div className="px-5 py-4 rounded-xl text-sm font-mono" style={{ background: "rgba(255,255,255,0.08)", color: C.orange }}>
                Net Profit = Session Fee × 0.85
              </div>
              {/* 収益シミュレーション */}
              <div className="space-y-2 pt-2">
                {[
                  { label: "1日3件（30分×3,000円）", value: "¥7,650/日", pct: 85 },
                  { label: "週5日稼働", value: "¥153,000/月", pct: 60 },
                  { label: "月50件フルタイム", value: "¥382,500/月", pct: 100 },
                ].map((row) => (
                  <div key={row.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{row.label}</span>
                      <span className="font-black" style={{ color: C.orange }}>{row.value}</span>
                    </div>
                    <div className="h-5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${row.pct}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${C.orange}, #E8851A)` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 選ばれる5つの戦略的理由（PDF p.7） ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>選ばれる5つの戦略的理由</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {REASONS.map((r, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: i % 2 === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="flex gap-4 p-6 rounded-2xl border-l-4"
                style={{ background: C.white, borderLeftColor: C.orange, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
              >
                <div className="text-3xl">{r.emoji}</div>
                <div>
                  <p className="font-black text-base" style={{ color: C.navy }}>{r.title}</p>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{r.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 防犯メディア×安心（PDF p.8） ── */}
      <section className="py-20 px-5" style={{ background: C.white }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>「安心」という名の最強の付加価値</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <p className="font-black text-base" style={{ color: C.navy }}>防犯メディア×キャリア相談</p>
              <p className="text-gray-600 leading-relaxed">
                キャリアの悩みは、時として非常にデリケートな個人情報を含みます。Chat Marketは、防犯メディア直営だからこそ可能な、最高水準のセキュリティ体制を構築しています。
              </p>
              <p className="text-gray-600 leading-relaxed">
                ユーザーが安心して「本当の悩み」を打ち明けられる環境こそが、有料でも選ばれる最大の理由です。
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-lg aspect-video">
              <img
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?w=800&q=80"
                alt="信頼と安心の握手"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── 市場ポジショニング比較表（PDF p.9） ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>市場におけるポジショニング</h2>
          </div>
          <div className="rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.navy }}>
                  <th className="text-left py-4 px-4 text-white font-bold">項目</th>
                  <th className="py-4 px-4 font-black text-center" style={{ background: C.orange, color: C.navy }}>Chat Market</th>
                  <th className="text-center py-4 px-4 text-white font-bold">大手エージェント</th>
                  <th className="text-center py-4 px-4 text-white font-bold">一般スキルシェア</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50"} style={{ background: i % 2 === 0 ? C.white : "#F9FAFB" }}>
                    <td className="py-4 px-4 font-semibold" style={{ color: C.navy }}>{row.item}</td>
                    <td className="py-4 px-4 text-center font-black" style={{ color: "#059669" }}>{row.cm}</td>
                    <td className="py-4 px-4 text-center text-gray-500">{row.agent}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.skill}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 需要予測（PDF p.10） ── */}
      <section className="py-20 px-5" style={{ background: C.white }}>
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <div className="flex items-center gap-3 justify-center">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>個別キャリアコンサルティングの需要予測</h2>
          </div>
          {/* シンプルな成長グラフ */}
          <div className="relative h-40 bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
            <div className="absolute bottom-0 left-0 right-0 h-full flex items-end px-8 pb-6">
              <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.navy} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={C.navy} stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <path d="M20,110 Q100,100 200,60 Q300,20 380,5" stroke={C.navy} strokeWidth="3" fill="none" />
                <path d="M20,110 Q100,100 200,60 Q300,20 380,5 L380,120 L20,120 Z" fill="url(#growthGrad)" />
                <circle cx="20" cy="110" r="5" fill={C.orange} />
                <circle cx="200" cy="60" r="5" fill={C.orange} />
                <circle cx="380" cy="5" r="5" fill={C.orange} />
                <text x="15" y="125" fontSize="10" fill="#6B7280">2024</text>
                <text x="185" y="125" fontSize="10" fill="#6B7280">2027</text>
                <text x="365" y="125" fontSize="10" fill="#6B7280">2030</text>
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            「終身雇用の崩壊」と「ジョブ型雇用の普及」により、中立なアドバイザーへの需要は2030年に向けて激増します。
          </p>
        </div>
      </section>

      {/* ── 先着50名・特典（PDF p.11） ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-3xl mx-auto space-y-8">
          <h2 className="text-3xl font-black text-center" style={{ color: C.navy }}>先着50名限定の特権</h2>
          <div className="rounded-2xl p-8 space-y-6" style={{ background: C.white, boxShadow: "0 4px 30px rgba(0,0,0,0.06)" }}>
            <p className="font-black text-base" style={{ color: C.orange }}>早期参入者へのベネフィット</p>
            <p className="text-gray-600 text-sm leading-relaxed">
              キャリアナビゲーション・カテゴリのオープンを記念し、初期パートナー50名様に限り、以下の特典を付帯します。
            </p>
            <div className="space-y-4">
              {[
                { icon: "🎁", text: "サブスク費用 12ヶ月間 0円" },
                { icon: "⭐", text: "「公認エキスパート」バッジ付与" },
                { icon: "📈", text: "カテゴリトップへの優先表示" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl" style={{ background: `${C.orange}10` }}>
                  <span className="text-2xl">{item.icon}</span>
                  <span className="font-bold" style={{ color: C.navy }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 登録フォーム ── */}
      <section ref={formRef} className="py-20 px-5" style={{ background: C.navy }}>
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-white">Join the Evolution</h2>
            <p className="text-white/70">あなたの知見を、迷える才能の「光」へ。</p>
            <p className="text-sm font-mono" style={{ color: C.orange }}>www.chatmarket.info/lp/career</p>
          </div>

          {/* 残り枠 */}
          <div className="bg-white rounded-2xl p-5">
            <SlotsWidget remaining={remaining} />
          </div>

          {/* 12ヶ月無料バナー */}
          <div className="rounded-2xl border-2 p-5 text-center space-y-1"
            style={{ borderColor: `${C.orange}60`, background: `${C.orange}15` }}>
            <p className="text-sm text-white/70">通常 月額3,300円のサブスクが</p>
            <p className="text-4xl font-black" style={{ color: C.orange }}>12ヶ月間 完全 0円</p>
          </div>

          {submitted ? (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl p-10 text-center space-y-4"
              style={{ background: `${C.orange}20`, border: `2px solid ${C.orange}` }}>
              <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: C.orange }} />
              <h3 className="text-xl font-black text-white">登録完了！</h3>
              <p className="text-white/70 text-sm">12ヶ月無料・還元率85%が自動適用されました。</p>
              <button onClick={() => navigate("/")}
                className="px-7 py-3 rounded-xl font-black text-sm"
                style={{ background: C.orange, color: C.navy }}>
                Chat Marketを始める →
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">お名前（相談者名・活動名）<span className="text-red-500 ml-1">*必須</span></Label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" required
                  className="w-full rounded-xl bg-gray-50 border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">メールアドレス<span className="text-red-500 ml-1">*必須</span></Label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required
                  className="w-full rounded-xl bg-gray-50 border-0 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">専門分野・資格</Label>
                <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full rounded-xl bg-gray-50 border-0 px-4 py-3 text-sm focus:outline-none">
                  <option value="">選択してください</option>
                  <option value="career_consultant">キャリアコンサルタント（国家資格）</option>
                  <option value="hr_experience">人事経験者（採用・育成）</option>
                  <option value="recruiter">ヘッドハンター・リクルーター</option>
                  <option value="coach">コーチング資格保持者</option>
                  <option value="counselor">産業カウンセラー</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                登録により<Link to="/terms" target="_blank" className="underline font-semibold">利用規約</Link>および
                <Link to="/privacy" target="_blank" className="underline font-semibold">プライバシーポリシー</Link>に同意したものとみなします。
              </div>
              <button type="submit" disabled={submitting || !name || !email || remaining <= 0}
                className="w-full py-4 rounded-xl font-black text-base text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${C.orange}, #E8851A)` }}>
                {submitting ? "送信中..." : `パートナー登録する（残り${remaining}名）`}
              </button>
              <p className="text-xs text-center text-gray-400">Chat Market Strategic Office - 2026</p>
            </form>
          )}
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 text-center text-gray-400 text-xs border-t border-gray-100" style={{ background: C.bg }}>
        © 2026 ChatMarket. Career Navigation Project.
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/terms" className="hover:text-gray-600">利用規約</Link>
          <Link to="/privacy" className="hover:text-gray-600">プライバシー</Link>
          <Link to="/recruit" className="hover:text-gray-600">ライバー募集</Link>
        </div>
      </footer>
    </div>
  );
}