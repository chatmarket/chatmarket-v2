import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import {
  CheckCircle2, XCircle, Minus, Dumbbell, Video, Calendar, Shield,
  TrendingUp, Users, Clock, Zap, ArrowRight, Flame, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import MetaHelmet from "@/components/layout/MetaHelmet";

// ── カラー ──
const C = {
  navy: "#1B2B6B",
  orange: "#F5A623",
  bg: "#F7F8FC",
};

// 先着枠
const TOTAL_SLOTS = 50;

// 統計
const STATS = [
  { value: "85%", label: "収益還元率", sub: "業界最高水準" },
  { value: "12ヶ月", label: "無料期間", sub: "先着50名限定" },
  { value: "¥0", label: "初期費用", sub: "完全無料スタート" },
  { value: "24h", label: "サポート", sub: "365日対応" },
];

// 比較表
const COMPARISON = [
  { item: "収益還元率", cm: "85%", fitness: "50〜70%", platform: "30〜50%", cmGood: true },
  { item: "初期・月額費用", cm: "12ヶ月無料", fitness: "月額5,000円〜", platform: "手数料高め", cmGood: true },
  { item: "1対1特化機能", cm: "✓ 標準装備", fitness: "— 限定的", platform: "✗ なし", cmGood: true },
  { item: "画質・通信品質", cm: "✓ 最高水準", fitness: "— 普通", platform: "— 環境依存", cmGood: true },
];

// 機能
const FEATURES = [
  { icon: "🎥", title: "PRISM高画質配信", desc: "筋肉の動き・フォーム・教材の文字まで鮮明に映し出す。オンライン特有の「見えにくさ」を完全解消。" },
  { icon: "📅", title: "自動予約・決済", desc: "24時間365日、予約受付から決済まで自動完結。事務作業に追われる時間はもうありません。" },
  { icon: "🛡️", title: "防犯メディア連携", desc: "ストーカーや迷惑行為からあなたを守る。メディア直営だからこその安全な活動環境。" },
  { icon: "💰", title: "透明な85%還元", desc: "1万円のレッスンで手元に8,500円。Net Profit = Total Sales × 0.85。シンプルで明快。" },
];

// 問題点
const PROBLEMS = [
  { icon: "🏠", title: "宅トレの日常化", desc: "自宅でのトレーニングが一般化。より「個」に最適化されたプライベート指導への需要が急増しています。" },
  { icon: "💸", title: "中間マージンの課題", desc: "既存ジムの所属では、受講料の50%以上が中抜きされる現実。指導者の手残りが少なすぎます。" },
  { icon: "🔒", title: "プライバシーの重視", desc: "大勢に見られるライブ配信よりも、1対1でじっくり相談できるクローズドな空間が求められています。" },
];

// バーグラフデータ
const BAR_DATA = [
  { label: "Chat Market", value: 8500, color: C.orange, max: true },
  { label: "大手フィットネスA", value: 6000, color: "#9CA3AF", max: false },
  { label: "一般配信B", value: 4000, color: "#D1D5DB", max: false },
];

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

export default function FitnessLP() {
  const navigate = useNavigate();
  const formRef = useRef(null);
  const [user, setUser] = useState(null);
  const [remaining, setRemaining] = useState(50);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [genre, setGenre] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "フィットネス・ヨガ専用プラットフォーム | Chat Market";
    base44.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        const me = await base44.auth.me();
        setUser(me);
        setName(me.full_name || "");
        setEmail(me.email || "");
      }
    });

    // 先着枠を既存申込数から計算
    base44.entities.BlogPost.filter({ channel_id: "fitness_application" })
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
      // 申請記録
      await base44.entities.BlogPost.create({
        title: `【フィットネス申請】${name}`,
        content: JSON.stringify({ name, email, genre, applied_at: new Date().toISOString() }),
        channel_id: "fitness_application",
        status: "draft",
      });

      // 全プラン12ヶ月無料付与
      try {
        await base44.functions.invoke("campaignAutoGrant", {
          email,
          followers: 0,
          name,
          category_id: "fitness",
          fitness_free_subscription_months: 12,
          fitness_revenue_rate: 0.85,
        });
      } catch (_) {}

      setRemaining((r) => Math.max(0, r - 1));
      toast.success("✅ 登録完了！12ヶ月無料が自動適用されました");
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      toast.error("送信に失敗しました。しばらくしてからお試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen font-inter overflow-x-hidden" style={{ background: C.bg, color: C.navy }}>
      <MetaHelmet
        title="フィットネス・ヨガ・パーソナルトレーナー向けプラットフォーム | ChatMarket（チャットマーケット）"
        description="フィットネストレーナー・ヨガ講師・パーソナルジム向け収益化プラットフォーム。1対1ビデオ通話レッスン・ライブ配信で還元率85%。先着50名限定12ヶ月無料キャンペーン実施中。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/2a7791b65_generated_image.png"
      />

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-5 pt-20 pb-16 overflow-hidden">
        {/* 背景装飾 */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-5"
            style={{ background: `radial-gradient(ellipse at right top, ${C.orange}, transparent)` }} />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* テキスト */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-black"
                style={{ background: `${C.orange}20`, border: `1px solid ${C.orange}`, color: C.orange }}
              >
                <Flame className="w-4 h-4" /> 先着50名限定キャンペーン実施中
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight"
                style={{ color: C.navy }}
              >
                Private Fitness<br />
                <span style={{ color: C.orange }}>Revolution</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-base sm:text-lg text-gray-600 leading-relaxed"
              >
                次世代パーソナル指導プラットフォーム：Chat Market始動。<br />
                場所と時間に縛られず、プロフェッショナルが正当な報酬を受け取れる「聖域」を創造します。
              </motion.p>

              {/* バッジ */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl"
                style={{
                  background: `linear-gradient(135deg, ${C.navy}, #2d4099)`,
                  boxShadow: `0 8px 30px ${C.navy}40`,
                }}
              >
                <span className="text-white font-black text-base">還元率 85%</span>
                <span className="text-white/40">|</span>
                <span className="text-white font-black text-base">12ヶ月無料</span>
                <span className="text-white/40">|</span>
                <span style={{ color: C.orange }} className="font-black text-base">先着50名限定</span>
              </motion.div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={scrollToForm}
                  className="px-8 py-4 rounded-2xl font-black text-base text-white transition-all hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${C.orange}, #E8851A)`, boxShadow: `0 8px 30px ${C.orange}50` }}
                >
                  今すぐ無料登録 →
                </button>
                <Link to="/recruit">
                  <button className="px-8 py-4 rounded-2xl font-black text-base transition-all border hover:border-gray-400"
                    style={{ border: `2px solid ${C.navy}30`, color: C.navy, background: "white" }}>
                    詳細を見る
                  </button>
                </Link>
              </div>
            </div>

            {/* 画像 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ boxShadow: `0 20px 60px ${C.navy}25` }}
            >
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/2a7791b65_generated_image.png"
                alt="オンラインフィットネストレーニングの様子"
                className="w-full h-auto object-cover aspect-video"
              />
            </motion.div>
          </div>
        </div>

        {/* スクロール */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2" animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
          <ChevronDown className="w-6 h-6 text-gray-400" />
        </motion.div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-5" style={{ background: C.navy }}>
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="text-center p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)" }}>
              <p className="text-3xl sm:text-4xl font-black" style={{ color: C.orange }}>{s.value}</p>
              <p className="text-sm font-bold text-white mt-1">{s.label}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 指導者の価値を最大化する ── */}
      <section className="py-20 px-5 text-center" style={{ background: C.bg }}>
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-1 rounded-full mx-auto" style={{ background: C.orange }} />
          <h2 className="text-3xl sm:text-4xl font-black" style={{ color: C.navy }}>指導者の価値を最大化する</h2>
          <p className="text-gray-600 text-lg leading-relaxed">
            場所と時間に縛られず、プロフェッショナルが正当な報酬を受け取れる「聖域」を創造します。
          </p>
        </div>
      </section>

      {/* ── オンラインフィットネスの現状 ── */}
      <section className="py-16 px-5" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>オンラインフィットネスの現状</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {PROBLEMS.map((p) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl border-b-4 space-y-3 bg-white shadow-sm"
                style={{ borderBottomColor: C.orange, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              >
                <div className="text-4xl">{p.icon}</div>
                <h3 className="font-black text-base" style={{ color: C.navy }}>{p.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── プライベートヨガの新しい形 ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>プライベート・ヨガの新しい形</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="rounded-3xl overflow-hidden shadow-xl aspect-video">
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/2a7791b65_generated_image.png"
                alt="オンラインヨガレッスン"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-5">
              <div>
                <p className="font-black text-base mb-2" style={{ color: C.navy }}>1対1だから届く、深い呼吸</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Chat Marketは、PRISM連携による高画質配信をサポート。インストラクターの細かなポーズ修正や呼吸のタイミングを、対面と変わらない精度で伝えます。
                </p>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                ヨガ、ピラティス、ストレッチ。あなたの独自のメソッドを、最高画質でファンに届けましょう。
              </p>
              <button
                onClick={scrollToForm}
                className="px-7 py-3 rounded-xl font-black text-sm text-white"
                style={{ background: C.navy }}
              >
                無料で始める →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── 本格プライベートジム ── */}
      <section className="py-20 px-5" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>本格プライベートジムを画面越しに</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5 order-2 md:order-1">
              <div>
                <p className="font-black text-base mb-2" style={{ color: C.navy }}>限界を突破するパーソナル指導</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  本格的なウェイトトレーニングやボディメイクも、1対1のビデオ通話ならリアルタイムで追い込みが可能。フォームチェックから食事管理の相談まで、一貫したサポートを実現します。
                </p>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                既存のジム設備を利用しながら、空き時間にオンラインで「プラスアルファ」の収益を構築できます。
              </p>
            </div>
            <div className="order-1 md:order-2 rounded-3xl overflow-hidden shadow-xl aspect-video bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
              <div className="text-center text-gray-400 space-y-2">
                <Dumbbell className="w-16 h-16 mx-auto" />
                <p className="text-sm font-bold">オンラインパーソナルジム</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 衝撃の収益還元率 85% ── */}
      <section className="py-20 px-5" style={{ background: C.navy }}>
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black text-white">衝撃の収益還元率</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            {/* 大数字 */}
            <div className="text-center">
              <p className="text-9xl font-black leading-none" style={{ color: C.orange }}>85</p>
              <p className="text-4xl font-black text-white">%</p>
              <p className="text-lg font-bold text-white/70 mt-2">インストラクター受取額</p>
            </div>
            {/* 説明 */}
            <div className="space-y-5">
              <div>
                <p className="font-black text-white text-base mb-2">業界最高水準のパワー</p>
                <p className="text-white/70 text-sm leading-relaxed">
                  他社プラットフォームを凌駕する「85%」という数字。1万円のレッスンを提供した場合、あなたの手元には8,500円が残ります。
                </p>
              </div>
              <div className="px-5 py-4 rounded-xl font-mono text-sm" style={{ background: "rgba(255,255,255,0.08)", color: C.orange }}>
                Net Profit = Total Sales × 0.85
              </div>
              <p className="text-white/70 text-sm leading-relaxed">
                これこそが、プロフェッショナルが選ぶべき「せこくて賢い」選択です。
              </p>

              {/* バーグラフ */}
              <div className="space-y-3 pt-2">
                {BAR_DATA.map((b) => (
                  <div key={b.label} className="space-y-1">
                    <div className="flex justify-between text-xs text-white/60">
                      <span>{b.label}</span>
                      <span className="font-bold" style={{ color: b.max ? C.orange : undefined }}>{b.value.toLocaleString()}円</span>
                    </div>
                    <div className="w-full h-6 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${(b.value / 10000) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1 }}
                        className="h-full rounded-full flex items-center justify-end pr-2"
                        style={{ background: b.max ? `linear-gradient(90deg, ${C.orange}, #E8851A)` : b.color }}
                      />
                    </div>
                  </div>
                ))}
                <p className="text-xs text-white/40">同じ1万円の売上でも、年間に換算すると数百万円の収益差が生まれます。</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── プロを支える3つの機能 ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>プロを支える3つの強力な機能</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {FEATURES.slice(0, 3).map((f) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="p-7 rounded-2xl text-center space-y-4 border-b-4"
                style={{ background: "white", borderBottomColor: C.navy, boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}
              >
                <div className="text-5xl">{f.icon}</div>
                <h3 className="font-black text-base" style={{ color: C.navy }}>{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── あなたが主役のブランド ── */}
      <section className="py-20 px-5" style={{ background: "white" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div className="space-y-5">
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: C.navy }}>あなたが主役のブランド</h2>
              <div>
                <p className="font-black text-base mb-2" style={{ color: C.navy }}>「所属」から「独立」へ</p>
                <p className="text-gray-600 text-sm leading-relaxed">
                  フィットネスクラブの一員としてではなく、あなた個人の「マイチャンネル」を確立できます。ファンはあなた自身のファンになり、LTV（顧客生涯価値）が向上します。
                </p>
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">
                Chat Marketは、プロの指導者が自立し、輝くための「武器」をすべて提供します。今こそ、自分自身のステージへ。
              </p>
              <button
                onClick={scrollToForm}
                className="px-7 py-3 rounded-xl font-black text-sm text-white"
                style={{ background: `linear-gradient(135deg, ${C.orange}, #E8851A)` }}
              >
                ステージへ進む →
              </button>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-xl aspect-square bg-gradient-to-br flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${C.navy}10, ${C.orange}10)` }}>
              <div className="text-center space-y-3 p-10">
                <div className="text-7xl">💪</div>
                <p className="font-black text-xl" style={{ color: C.navy }}>あなたのステージ</p>
                <p className="text-sm text-gray-500">フィットネスプロとして独立</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 他社比較 ── */}
      <section className="py-20 px-5" style={{ background: C.bg }}>
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 rounded-full" style={{ background: C.orange }} />
            <h2 className="text-2xl sm:text-3xl font-black" style={{ color: C.navy }}>他社比較：なぜChat Marketか？</h2>
          </div>
          <div className="overflow-x-auto rounded-2xl shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: C.navy }}>
                  <th className="text-left py-4 px-4 text-white font-bold">比較項目</th>
                  <th className="py-4 px-4 font-black text-center" style={{ background: C.orange, color: C.navy }}>Chat Market</th>
                  <th className="text-center py-4 px-4 text-white font-bold">大手フィットネスアプリ</th>
                  <th className="text-center py-4 px-4 text-white font-bold">一般配信プラットフォーム</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="py-4 px-4 font-semibold" style={{ color: C.navy }}>{row.item}</td>
                    <td className="py-4 px-4 text-center font-black" style={{ color: C.orange }}>{row.cm}</td>
                    <td className="py-4 px-4 text-center text-gray-500">{row.fitness}</td>
                    <td className="py-4 px-4 text-center text-gray-400">{row.platform}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── 先着50名・12ヶ月無料 申込フォーム ── */}
      <section ref={formRef} className="py-20 px-5" style={{ background: C.navy }}>
        <div className="max-w-xl mx-auto space-y-8">
          <div className="text-center space-y-3">
            <p className="text-sm font-black tracking-widest uppercase" style={{ color: C.orange }}>🎯 LIMITED OFFER</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white">Ready to Lead?</h2>
            <p className="text-white/70">フィットネス登録者【先着50名様限定】</p>
          </div>

          {/* 無料バナー */}
          <div className="rounded-2xl border-2 p-6 text-center space-y-2"
            style={{ borderColor: `${C.orange}60`, background: `${C.orange}15` }}>
            <p className="text-sm text-white/70">通常 月額3,300円のサブスクリプション費用が</p>
            <p className="text-4xl font-black" style={{ color: C.orange }}>12ヶ月間 完全に 0円</p>
            <p className="text-xs text-white/50">※定員に達し次第、キャンペーンは終了いたします。お早めにご登録ください。</p>
          </div>

          {/* 残り枠 */}
          <div className="bg-white rounded-2xl p-5">
            <SlotsWidget remaining={remaining} />
          </div>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl p-10 text-center space-y-4"
              style={{ background: `${C.orange}20`, border: `2px solid ${C.orange}` }}
            >
              <CheckCircle2 className="w-14 h-14 mx-auto" style={{ color: C.orange }} />
              <h3 className="text-xl font-black text-white">登録完了！</h3>
              <p className="text-white/70 text-sm">12ヶ月無料・還元率85%が自動適用されました。<br />メールをご確認ください。</p>
              <button onClick={() => navigate("/")}
                className="px-7 py-3 rounded-xl font-black text-sm"
                style={{ background: C.orange, color: C.navy }}>
                Chat Marketを始める →
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">お名前（指導者名）<span className="text-red-500 ml-1">*必須</span></Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例：山田 太郎" required className="bg-gray-50 border-0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">メールアドレス<span className="text-red-500 ml-1">*必須</span></Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="example@email.com" required className="bg-gray-50 border-0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-500">専門ジャンル</Label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full rounded-md bg-gray-50 px-3 py-2.5 text-sm focus:outline-none"
                >
                  <option value="">選択してください</option>
                  <option value="personal_training">パーソナルトレーニング</option>
                  <option value="yoga">ヨガ</option>
                  <option value="pilates">ピラティス</option>
                  <option value="stretch">ストレッチ</option>
                  <option value="diet">ダイエット・食事管理</option>
                  <option value="other">その他</option>
                </select>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500">
                登録により<Link to="/terms" target="_blank" className="underline font-semibold">利用規約</Link>および<Link to="/privacy" target="_blank" className="underline font-semibold">プライバシーポリシー</Link>に同意したものとみなします。
              </div>

              <button
                type="submit"
                disabled={submitting || !name || !email || remaining <= 0}
                className="w-full py-4 rounded-xl font-black text-base transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${C.orange}, #E8851A)`, color: C.navy }}
              >
                {submitting ? "送信中..." : `無料で登録する（残り${remaining}名）`}
              </button>

              <p className="text-xs text-center text-gray-400">
                www.chatmarket.info/lp/fitness<br />
                クレジットカード不要・いつでもキャンセル可能
              </p>
            </form>
          )}
        </div>
      </section>

      {/* フッター */}
      <footer className="py-8 text-center text-gray-400 text-xs border-t border-gray-100" style={{ background: C.bg }}>
        © 2026 ChatMarket. Private Fitness Revolution.
        <div className="mt-2 flex justify-center gap-4">
          <Link to="/terms" className="hover:text-gray-600 transition-colors">利用規約</Link>
          <Link to="/privacy" className="hover:text-gray-600 transition-colors">プライバシー</Link>
          <Link to="/recruit" className="hover:text-gray-600 transition-colors">ライバー募集</Link>
        </div>
      </footer>
    </div>
  );
}