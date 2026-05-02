import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, Video, PhoneCall, Zap, CheckCircle2, ArrowRight,
  Coins, ChevronDown, Flame, Gift, Crown, Check
} from "lucide-react";
import RevenueModel from "@/components/recruit/RevenueModel";
import MetaHelmet from "@/components/layout/MetaHelmet";
import BusinessModelShowcase from "@/components/recruit/BusinessModelShowcase";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ---- キャンペーン設定 ----
const CAMPAIGN_START = new Date("2026-04-16T20:00:00+09:00");
const PRO_SLOTS_TOTAL = 300;

// 全有料プラン一覧
const ALL_PLANS = [
  { name: "BASIC",      price: "¥3,300",  color: "#00ff9d", desc: "配信・通話で 最大85〜95%を稼ぐ" },
  { name: "CALL&ANSER", price: "¥3,300",  color: "#00d4ff", desc: "通話：15分で 150円以上 稼ぐ（上限なし）" },
  { name: "VOD",        price: "¥3,300",  color: "#f59e0b", desc: "動画アーカイブ販売で 収益化" },
  { name: "PPV",        price: "¥3,300",  color: "#ff6b6b", desc: "有料ライブ配信で 最大95%還元" },
];
const TOTAL_VALUE = "¥13,200"; // 月額合計（各¥3,300×4）

function useCountdown(targetDate) {
  const [diff, setDiff] = useState(targetDate - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(targetDate - Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  const total = Math.max(0, diff);
  return {
    days: Math.floor(total / 86400000),
    hours: Math.floor((total % 86400000) / 3600000),
    mins: Math.floor((total % 3600000) / 60000),
    secs: Math.floor((total % 60000) / 1000),
    started: diff <= 0,
  };
}

function CountdownBox({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-black/60 border border-primary/40 rounded-xl w-16 h-16 flex items-center justify-center"
        style={{ boxShadow: "0 0 15px rgba(0,255,157,0.3)" }}>
        <span className="text-2xl font-black text-primary font-mono">{String(value).padStart(2, "0")}</span>
      </div>
      <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
    </div>
  );
}

export default function Recruit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const countdown = useCountdown(CAMPAIGN_START.getTime());
  const formRef = useRef(null);

  // 実際の申し込み数を取得して残り枠を計算
  const { data: applications = [] } = useQuery({
    queryKey: ["recruit-applications-count"],
    queryFn: () => base44.entities.BlogPost.filter({ channel_id: "recruit_application" }),
    refetchInterval: 30000,
  });
  const slotsRemaining = Math.max(0, PRO_SLOTS_TOTAL - applications.length);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [snsUrl, setSnsUrl] = useState("");
  const [followers, setFollowers] = useState("");
  const [pr, setPr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (ok) => {
      if (ok) {
        const me = await base44.auth.me();
        setUser(me);
        setName(me.full_name || "");
        setEmail(me.email || "");
      }
    });
  }, []);

  const followerCount = parseInt(followers.replace(/,/g, ""), 10) || 0;
  const isProTier = followerCount >= 10000;

  const campaignLabel = isProTier
    ? `🎯 Pro特典：全有料プラン24ヶ月完全無料（要審査）`
    : `🎁 Standard特典：全有料プラン12ヶ月完全無料`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) { toast.error("お名前とメールアドレスは必須です"); return; }
    setSubmitting(true);

    // 1. 申請レコード保存
    try {
      await base44.entities.BlogPost.create({
        title: `【ライバー募集申請】${name}`,
        content: JSON.stringify({
          name,
          email,
          sns_url: snsUrl,
          followers: followerCount,
          pr,
          campaign_tier: isProTier ? "pro_90days_all_plans" : "standard_30days_all_plans",
          applied_at: new Date().toISOString(),
        }),
        channel_id: "recruit_application",
        status: "draft",
      });
    } catch (_) {}

    // 2. 全プラン自動付与（バックエンド経由）
    try {
      const res = await base44.functions.invoke("campaignAutoGrant", {
        email,
        followers: followerCount,
        name,
      });
      if (res.data?.success) {
        const months = res.data.months;
        toast.success(`✅ 全プランを${months}ヶ月間、自動で有効化しました！`);
      }
    } catch (err) {
      // 付与失敗はサイレント（申請は通す）
      console.error("campaignAutoGrant error:", err);
    }

    setSubmitting(false);
    setSubmitted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <MetaHelmet page="recruit" />

      {/* ===== HERO ===== */}
      <section className="relative w-full min-h-screen flex items-center justify-center px-4 sm:px-6 py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(#00ff9d 1px,transparent 1px),linear-gradient(90deg,#00ff9d 1px,transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,157,0.07) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-red-500/20 border border-red-500/50 rounded-full px-5 py-2 text-sm font-bold text-red-300"
            style={{ boxShadow: "0 0 20px rgba(255,80,80,0.3)" }}
          >
            <Flame className="w-4 h-4" />
            先着300名が埋まり次第終了
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight"
          >
            全有料プラン<br />
            <span style={{
              background: "linear-gradient(135deg, #fbbf24, #f59e0b, #ef4444)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>完全無料</span>
            <br />
            <span className="text-2xl sm:text-3xl md:text-4xl text-muted-foreground font-bold">で精鋭ライバー300名募集</span>
          </motion.h1>

          {/* 総額インパクト */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-block rounded-2xl px-8 py-5 mx-auto"
            style={{
              background: "linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))",
              border: "2px solid rgba(245,158,11,0.6)",
              boxShadow: "0 0 40px rgba(245,158,11,0.25)",
            }}
          >
            <p className="text-xs font-bold text-amber-400 mb-1 tracking-widest">月額総額</p>
            <p className="text-5xl sm:text-6xl font-black"
              style={{ color: "#fbbf24", textShadow: "0 0 20px rgba(251,191,36,0.5)" }}>
              {TOTAL_VALUE}
            </p>
            <p className="text-sm text-amber-300 font-bold mt-1">相当が全部タダ</p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto"
          >
            通話・ライブ配信・動画販売・イベントチケット。<br className="hidden sm:block" />
            プロフェッショナル機能を<strong className="text-foreground">全部無制限で使い倒せ。</strong>
          </motion.p>

          <style>{`
            @keyframes neonBlueFlicker {
              0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
                text-shadow: 0 0 7px #00d4ff, 0 0 10px #00d4ff, 0 0 21px #00d4ff, 0 0 42px #0099ff, 0 0 82px #0099ff;
                color: #00d4ff;
              }
              20%, 24%, 55% {
                text-shadow: 0 0 5px #00d4ff, 0 0 10px #00d4ff;
                color: #00b8d4;
              }
            }
            .neon-blue-disclaimer {
              animation: neonBlueFlicker 3s infinite;
              font-family: 'Courier New', monospace;
              letter-spacing: 0.05em;
            }
          `}</style>
          <p className="neon-blue-disclaimer text-xs font-semibold text-center mt-3">
            振り込み手数料、規定のプラットフォーム手数料は発生致しますので予めご了承ください
          </p>

          {/* カウントダウン or 開始済み */}
          {!countdown.started ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground font-semibold">募集開始まで</p>
              <div className="flex items-end justify-center gap-3">
                <CountdownBox value={countdown.days} label="日" />
                <span className="text-primary font-black text-2xl mb-4">:</span>
                <CountdownBox value={countdown.hours} label="時間" />
                <span className="text-primary font-black text-2xl mb-4">:</span>
                <CountdownBox value={countdown.mins} label="分" />
                <span className="text-primary font-black text-2xl mb-4">:</span>
                <CountdownBox value={countdown.secs} label="秒" />
              </div>
            </div>
          ) : (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-block bg-red-500/20 border-2 border-red-400 rounded-2xl px-8 py-4"
              style={{ boxShadow: "0 0 30px rgba(255,80,80,0.4)" }}
            >
              <p className="text-red-300 font-black text-xl">🔥 キャンペーン募集中！</p>
            </motion.div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              onClick={scrollToForm}
              size="lg"
              className="bg-primary text-black font-black text-base px-8 h-14 rounded-2xl hover:bg-primary/90 gap-2"
              style={{ boxShadow: "0 0 25px rgba(0,255,157,0.5)" }}
            >
              <Zap className="w-5 h-5" />
              全プラン無料で今すぐ申し込む
            </Button>
            <Link to="/info">
              <Button variant="outline" size="lg" className="h-14 px-6 rounded-2xl gap-2">
                サービス詳細 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-3 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
            <span className="text-red-300 font-bold">限定人数に達し次第終了</span>
          </motion.div>
        </div>
      </section>

      {/* ===== 全プラン無料 詳細 ===== */}
      <section className="w-full py-16 px-4 sm:px-6 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full px-4 py-1 text-xs font-bold">
              🎉 先着300名限定キャンペーン
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4">今だけ、全部タダ。</h2>
            <p className="text-muted-foreground mt-2 text-sm">BASIC・CALL&ANSER・VOD・PPV — すべてのプランが同時に無料（埋まり次第終了）</p>
          </div>

          {/* 全プランカード */}
          <div className="hidden md:flex justify-center gap-3 mb-10">
            {ALL_PLANS.map((plan) => (
              <div key={plan.name + "_d"} className="w-44 rounded-xl border p-4 text-center space-y-2 shrink-0"
                style={{
                  borderColor: plan.color + "66",
                  background: `${plan.color}11`,
                  boxShadow: `0 0 15px ${plan.color}22`,
                }}>
                <p className="font-black text-base" style={{ color: plan.color }}>{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground/50">通常：{plan.price}/月</p>
                  <p className="font-black text-sm" style={{ color: plan.color }}>→ 無料</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid md:hidden grid-cols-2 sm:grid-cols-3 gap-3 mb-10">
            {ALL_PLANS.map((plan) => (
              <div key={plan.name + "_m"} className="rounded-xl border p-4 text-center space-y-2"
                style={{
                  borderColor: plan.color + "66",
                  background: `${plan.color}11`,
                  boxShadow: `0 0 15px ${plan.color}22`,
                }}>
                <p className="font-black text-base" style={{ color: plan.color }}>{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
                <div className="space-y-0.5">
                  <p className="text-xs text-muted-foreground/50">通常：{plan.price}/月</p>
                  <p className="font-black text-sm" style={{ color: plan.color }}>→ 無料</p>
                </div>
              </div>
            ))}
          </div>

          {/* Pro / Standard 特典比較 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pro */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/15 to-yellow-600/5 p-7 space-y-4"
              style={{ boxShadow: "0 0 30px rgba(234,179,8,0.2)" }}
            >
              <div className="absolute -top-4 left-6 bg-yellow-500 text-black px-4 py-1 rounded-full text-xs font-black flex items-center gap-1">
                <Crown className="w-3 h-3" /> インフルエンサー特典
              </div>
              <div className="pt-2 space-y-1">
                <p className="text-yellow-400 font-black text-3xl">24ヶ月間 完全無料</p>
                <p className="text-sm font-bold text-yellow-300">全有料プラン（{TOTAL_VALUE}/月相当）</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-yellow-300 font-bold">✅ 適用条件</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• SNSフォロワー1万人以上（合算可）</li>
                  <li>• YouTube / X / Instagram / TikTok いずれか</li>
                  <li>• 申請後、運営によるアカウント審査あり</li>
                </ul>
              </div>
              <div className="bg-yellow-500/20 border border-yellow-500/40 rounded-xl p-3 text-center">
                <p className="text-yellow-300 font-black text-lg">24ヶ月で最大 {TOTAL_VALUE} × 24ヶ月 FREE</p>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                先着限定・埋まり次第終了
              </div>
            </motion.div>

            {/* Standard */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5 p-7 space-y-4"
              style={{ boxShadow: "0 0 30px rgba(0,255,157,0.15)" }}
            >
              <div className="absolute -top-4 left-6 bg-primary text-black px-4 py-1 rounded-full text-xs font-black">
                🎁 新規登録者 全員対象
              </div>
              <div className="pt-2 space-y-1">
                <p className="text-primary font-black text-3xl">12ヶ月間 完全無料</p>
                <p className="text-sm font-bold text-primary/80">全有料プラン（{TOTAL_VALUE}/月相当）</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-primary font-bold">✅ 適用条件</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• 新規ライバー登録（先着300名が埋まるまで）</li>
                  <li>• 利用規約への同意</li>
                  <li>• 審査不要・即時適用</li>
                </ul>
              </div>
              <div className="bg-primary/20 border border-primary/40 rounded-xl p-3 text-center">
                <p className="text-primary font-black text-lg">12ヶ月で最大 {TOTAL_VALUE} × 12ヶ月 FREE</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">先着300名限定・埋まり次第終了</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 試食コーナー → 本注文 ステップ図 ===== */}
      <section className="w-full py-16 px-4 sm:px-6 bg-gradient-to-b from-secondary/30 to-background">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full px-4 py-1 text-xs font-bold">
              🍽️ まずは無料でお試し
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4">試食コーナーから<br className="sm:hidden" />本注文へ</h2>
            <p className="text-muted-foreground mt-2 text-sm max-w-xl mx-auto">
              「料理で言えば、まずはお一口、無料でどうぞ。味には自信があります。」<br/>
              FREEプランで1対1通話の収益化を体験し、気に入ったら有料プランへ。
            </p>
          </div>

          {/* ステップ図 */}
          <div className="flex flex-col md:flex-row items-stretch gap-0 md:gap-0">
            {/* STEP 1: 無料登録 */}
            <div className="flex-1 relative bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 border-2 border-emerald-500/50 rounded-2xl md:rounded-r-none p-6 space-y-3"
              style={{ boxShadow: "0 0 20px rgba(16,185,129,0.15)" }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-black px-3 py-0.5 rounded-full text-xs font-black">STEP 1</div>
              <div className="text-4xl text-center pt-2">🍽️</div>
              <p className="text-center font-black text-lg text-emerald-300">無料登録</p>
              <p className="text-center text-xs text-muted-foreground">クレジットカード不要<br/>今すぐ始められる</p>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
                <p className="text-2xl font-black text-emerald-400">¥0</p>
                <p className="text-xs text-emerald-400/70">FREEプラン</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" />1対1ビデオ通話</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" />収益還元率 70%</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-emerald-400" />エールコイン受取</li>
              </ul>
            </div>

            {/* 矢印 */}
            <div className="flex md:flex-col items-center justify-center px-4 py-4 md:py-0">
              <div className="flex md:flex-col items-center gap-1">
                <div className="text-amber-400 font-black text-xs text-center hidden md:block">味に<br/>納得</div>
                <ArrowRight className="w-6 h-6 text-amber-400 rotate-90 md:rotate-0" />
                <div className="text-amber-400 font-black text-xs text-center hidden md:block">本注文</div>
              </div>
            </div>

            {/* STEP 2: 有料プランへ */}
            <div className="flex-1 relative bg-gradient-to-br from-amber-500/15 to-orange-600/5 border-2 border-amber-500/50 rounded-2xl md:rounded-l-none p-6 space-y-3"
              style={{ boxShadow: "0 0 20px rgba(245,158,11,0.15)" }}>
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-black px-3 py-0.5 rounded-full text-xs font-black">STEP 2</div>
              <div className="text-4xl text-center pt-2">🚀</div>
              <p className="text-center font-black text-lg text-amber-300">本注文（有料プラン）</p>
              <p className="text-center text-xs text-muted-foreground">気に入ったら<br/>フル機能へアップグレード</p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 line-through">各 ¥6,600〜¥9,900</p>
                <p className="text-2xl font-black text-red-400">各 ¥3,300</p>
                <p className="text-xs text-amber-400/70">システム拡充中特別価格</p>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-amber-400" />還元率 最大95%（BASIC）</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-amber-400" />1対多ライブ配信（PPV）</li>
                <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3 text-amber-400" />動画販売・アーカイブ（VOD）</li>
              </ul>
            </div>
          </div>

          {/* 収益還元率 70% → 95% グラフ */}
          <div className="mt-10 bg-card border border-border/50 rounded-2xl p-6 space-y-4">
            <h3 className="font-black text-lg text-center">収益還元率の比較</h3>
            <p className="text-xs text-muted-foreground text-center">FREEプランから始めて、有料プランでさらに高還元を目指せます</p>
            <div className="space-y-3">
              {[
                { label: "FREEプラン", rate: 70, color: "#10b981", bg: "bg-emerald-500", plan: "1対1通話・エールコイン" },
                { label: "BASIC（月間¥100万以下）", rate: 85, color: "#00ff9d", bg: "bg-primary", plan: "基本還元率" },
                { label: "BASIC（月間¥100万超）", rate: 86, color: "#60a5fa", bg: "bg-blue-400", plan: "プログレッシブ還元 STEP1" },
                { label: "BASIC（月間¥300万超）", rate: 87, color: "#818cf8", bg: "bg-indigo-400", plan: "STEP2" },
                { label: "BASIC（月間¥600万超）", rate: 88, color: "#a78bfa", bg: "bg-violet-400", plan: "STEP3" },
                { label: "BASIC（月間¥900万超）", rate: 89, color: "#c084fc", bg: "bg-purple-400", plan: "STEP4" },
                { label: "BASIC（月間¥1,200万超）", rate: 90, color: "#e879f9", bg: "bg-fuchsia-400", plan: "STEP5" },
                { label: "BASIC（月間¥1,500万超）", rate: 91, color: "#f472b6", bg: "bg-pink-400", plan: "STEP6" },
                { label: "BASIC（月間¥1,650万超）", rate: 92, color: "#fb923c", bg: "bg-orange-400", plan: "STEP7" },
                { label: "BASIC（月間¥1,800万超）", rate: 93, color: "#facc15", bg: "bg-yellow-400", plan: "STEP8" },
                { label: "BASIC（月間¥1,950万超）", rate: 94, color: "#f59e0b", bg: "bg-amber-500", plan: "STEP9" },
                { label: "BASIC（月間¥2,000万以上）", rate: 95, color: "#ef4444", bg: "bg-red-500", plan: "MAX還元率" },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground/80">{item.label}</span>
                    <span className="font-black" style={{ color: item.color }}>{item.rate}%</span>
                  </div>
                  <div className="w-full h-5 bg-secondary rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${item.rate}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: i * 0.1, ease: "easeOut" }}
                      className={`h-full rounded-full ${item.bg}`}
                      style={{ boxShadow: `0 0 8px ${item.color}66` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground">{item.plan}</p>
                </div>
              ))}
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-300 font-semibold">
                ✅ まずはFREEプランで70%還元を体験 → 有料プランで最大95%へ
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 利用シーン図解 ===== */}
      <BusinessModelShowcase onCtaClick={scrollToForm} />

      {/* ===== 解放される機能 ===== */}
      <section className="w-full py-16 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-4">プロフェッショナル機能、全開放</h2>
          <p className="text-center text-muted-foreground mb-10 text-sm">通常は月額費用が必要な全機能が、キャンペーン期間中は完全無料で使い放題</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-card border border-primary/30 rounded-2xl p-7 space-y-4 hover:border-primary/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-4xl font-black text-primary">最大95%を稼げる</p>
                <p className="font-bold text-lg mt-1">業界最高水準の還元率</p>
                </div>
                <p className="text-sm text-muted-foreground">15分で 150円に設定すれば、あなたの手取りは 最大 142.5円。月間売上に応じてプログレッシブに自動アップ。</p>
                <div className="bg-primary/10 border border-primary/20 rounded-lg px-3 py-2 text-xs text-primary/80">
                💰 収入例：150円 × 視聴者100人 × 4回/月 = 60,000円の手取り（初月）
                </div>
            </div>
            <div className="bg-card border border-cyan-400/30 rounded-2xl p-7 space-y-4 hover:border-cyan-400/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <PhoneCall className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-cyan-400">15分で150円〜</p>
                <p className="font-bold text-lg mt-1">通話で稼ぐ（CALL&ANSER）</p>
                </div>
                <p className="text-sm text-muted-foreground">1対1ビデオ通話で 15分150円〜（配信最低設定金額、上限なし）。1日60分の無料枠でテストしてから有料化できます。</p>
            </div>
            <div className="bg-card border border-amber-400/30 rounded-2xl p-7 space-y-4 hover:border-amber-400/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Video className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-amber-400">寝ながら稼ぐ</p>
                <p className="font-bold text-lg mt-1">動画アーカイブ販売（VOD）</p>
                </div>
                <p className="text-sm text-muted-foreground">配信・通話を動画化して販売。一度アップロードすれば、その後 何度でも売上が発生。あなたは何もしなくても収入が増え続けます。</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 収益モデル・インセンティブ ===== */}
      <RevenueModel />

      {/* ===== 数字 ===== */}
      <section className="w-full py-12 px-4 sm:px-6 bg-secondary/20 border-y border-border/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "95%", label: "最大還元率", color: "text-primary" },
            { value: "300名", label: "限定先着枠", color: "text-red-400" },
            { value: TOTAL_VALUE, label: "月額相当が無料", color: "text-amber-400" },
            { value: "全4プラン", label: "同時開放", color: "text-cyan-400" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-5">
              <p className={`text-2xl sm:text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 機能一覧 ===== */}
      <section className="w-full py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">使える全機能</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: "📡", label: "有料ライブ配信（PPV）" },
              { icon: "🎬", label: "動画アーカイブ販売" },
              { icon: "📞", label: "1対1ビデオ通話" },
              { icon: "📲", label: "1日60分無料通話枠" },
              { icon: "💬", label: "ダイレクトチャット" },
              { icon: "👑", label: "ファンクラブ運営" },
              { icon: "📊", label: "収益ダッシュボード" },
              { icon: "🏆", label: "プログレッシブ還元" },
              { icon: "🎫", label: "イベントチケット販売" },
              { icon: "🛡️", label: "NGワード自動検知" },
              { icon: "🔴", label: "多ストリーム管理" },
              { icon: "💰", label: "即日振込申請" },
            ].map((f, i) => (
              <div key={i} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all">
                <span className="text-2xl">{f.icon}</span>
                <span className="text-sm font-semibold">{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 申し込みフォーム ===== */}
      <section ref={formRef} className="w-full py-16 px-4 sm:px-6 bg-gradient-to-b from-secondary/20 to-background">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8 space-y-2">
            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-full px-4 py-1 text-xs font-bold">
              📝 ライバー登録申し込み
            </span>
            <h2 className="text-2xl font-black mt-3">今すぐ全プラン無料で登録</h2>
            <p className="text-sm text-muted-foreground">フォロワー数に応じて1ヶ月または3ヶ月、全プランが無料</p>
          </div>

          {submitted ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-primary/10 border-2 border-primary/50 rounded-2xl p-10 text-center space-y-4"
              style={{ boxShadow: "0 0 30px rgba(0,255,157,0.2)" }}
            >
              <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
              <h3 className="text-xl font-black text-primary">申し込み受付完了！</h3>
              <p className="text-sm text-muted-foreground">
                {isProTier
                  ? `Pro特典（全プラン24ヶ月無料）の申請を受け付けました。審査結果をメールでお知らせします。`
                  : `Standard特典（全プラン12ヶ月無料）が適用されます。メールをご確認ください。`}
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary text-black font-bold">
                ChatMarketを始める →
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">

              <AnimatePresence mode="wait">
                <motion.div
                  key={isProTier ? "pro" : "standard"}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className={`rounded-xl p-3 border text-sm font-semibold flex items-center gap-2 ${
                    isProTier
                      ? "bg-yellow-500/15 border-yellow-500/40 text-yellow-400"
                      : "bg-primary/10 border-primary/30 text-primary"
                  }`}
                >
                  <Gift className="w-4 h-4 shrink-0" />
                  {campaignLabel}
                </motion.div>
              </AnimatePresence>

              <div className="space-y-1.5">
                <Label>お名前（配信者名）<span className="text-destructive text-xs ml-1">*必須</span></Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="例：山田花子" className="bg-secondary border-0" required />
              </div>

              <div className="space-y-1.5">
                <Label>メールアドレス<span className="text-destructive text-xs ml-1">*必須</span></Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="example@email.com" className="bg-secondary border-0" required />
              </div>

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1.5">
                  SNSフォロワー数（合算）
                  <span className="text-xs text-muted-foreground">1万超で3ヶ月無料</span>
                </Label>
                <Input
                  type="number"
                  value={followers}
                  onChange={e => setFollowers(e.target.value)}
                  placeholder="例：12000"
                  className="bg-secondary border-0"
                  min="0"
                />
                {followerCount > 0 && (
                  <p className={`text-xs font-semibold ${isProTier ? "text-yellow-400" : "text-muted-foreground"}`}>
                    {isProTier
                      ? "⭐ Pro特典対象！全プラン3ヶ月無料（要審査）"
                      : `フォロワー ${(10000 - followerCount).toLocaleString()} 人でPro特典（3ヶ月無料）適用`}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>SNS・ウェブリンク</Label>
                <Input value={snsUrl} onChange={e => setSnsUrl(e.target.value)} placeholder="https://twitter.com/yourhandle" className="bg-secondary border-0" />
                <p className="text-xs text-muted-foreground">Pro特典審査に使用します</p>
              </div>

              <div className="space-y-1.5">
                <Label>自己PR・配信コンセプト（任意）</Label>
                <Textarea
                  value={pr}
                  onChange={e => setPr(e.target.value.slice(0, 300))}
                  placeholder="どんな配信をしたいか、得意なジャンルなどをご記入ください"
                  className="bg-secondary border-0 resize-none"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground text-right">{pr.length}/300</p>
              </div>

              <div className="bg-secondary rounded-xl p-3">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  申し込みにより、
                  <Link to="/terms" target="_blank" className="text-primary underline font-semibold">利用規約</Link>
                  および
                  <Link to="/privacy" target="_blank" className="text-primary underline font-semibold">プライバシーポリシー</Link>
                  に同意したものとみなします。
                </p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !name || !email}
                className="w-full h-14 font-black text-base bg-primary text-black hover:bg-primary/90 gap-2 rounded-2xl"
                style={{ boxShadow: "0 0 20px rgba(0,255,157,0.3)" }}
              >
                {submitting ? "送信中..." : (
                  <>
                    <Zap className="w-5 h-5" />
                    {isProTier ? "全プラン24ヶ月無料で申し込む（Pro）" : `全プラン12ヶ月無料で申し込む`}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="w-full py-12 px-4 sm:px-6 border-t border-border/30">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black mb-6 text-center">よくある質問</h2>
          <div className="space-y-3">
            {[
              { q: "「全有料プラン無料」とは何が含まれますか？", a: `BASIC（¥3,300）・CALL&ANSER（¥6,600）・VOD（¥9,900）・PPV（¥9,900）のすべてが無料になります。通常月額${TOTAL_VALUE}相当の機能を全部タダで使えます。` },
              { q: "無料期間終了後はどうなりますか？", a: "無料期間終了後は通常の各プラン月額に自動移行します。継続しない場合は期間中にキャンセルしてください。" },
              { q: "Pro特典（3ヶ月）の審査基準は？", a: "SNSアカウントのフォロワー数が合算1万人以上であることが基準です。複数SNSの合算も可能です。審査は通常2〜3営業日以内に完了します。" },
              { q: "既存ユーザーは対象ですか？", a: "本キャンペーンは4/16以降の新規ライバー登録者が対象です。" },
            ].map((item, i) => (
              <details key={i} className="bg-card border border-border/50 rounded-xl p-4 group">
                <summary className="flex items-center justify-between cursor-pointer font-semibold text-sm list-none">
                  {item.q}
                  <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-2" />
                </summary>
                <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          {/* 収益・支払いFAQ */}
          <div className="mt-8">
            <h3 className="text-base font-black mb-4 flex items-center gap-2">
              <span className="text-primary">💰</span>
              収益と支払いに関するよくある質問
              <span className="text-xs font-normal text-muted-foreground ml-1">/ FAQ: Earnings & Payments</span>
            </h3>
            <div className="space-y-3">
              {[
                {
                  q: "Q1. 報酬の振込時期はいつですか？ / When will I receive my payouts?",
                  a: "原則として、振込申請から最短3営業日以内に指定口座へ送金されます（Stripeのスピード決済を採用）。月1回の締め日を待つ必要はありません。\n\nPayouts are generally processed within 3 business days of your request, thanks to our Stripe-integrated system. You don't have to wait for a once-a-month cycle.",
                },
                {
                  q: "Q2. 収益還元率と手数料について教えてください。 / What is the revenue share and are there any fees?",
                  a: "基本還元率は業界最高水準の85%です。プラットフォーム利用料や決済手数料はすべて差し引かれた後の金額があなたの収益となります。さらに、累計売上に応じた「プログレッシブ・ボーナス」で最大95%まで自動アップします。\n\nOur base revenue share is 85%, among the highest in the industry. All platform and transaction fees are already accounted for in your net earnings. Additionally, we offer \"Progressive Bonuses\" based on your performance (up to 95%).",
                },
                {
                  q: "Q3. 利用可能な決済手段は何ですか？ / What payment methods are available for fans?",
                  a: "世界135カ国以上で使われているStripe決済を導入しています。主要なクレジットカード（Visa, Mastercard等）のほか、Apple Pay、Google Payにも対応しており、世界中のファンからスムーズにギフトを受け取れます。\n\nWe use Stripe, a global leader in payment processing. We support all major credit cards (Visa, Mastercard, etc.), Apple Pay, and Google Pay, allowing you to receive gifts seamlessly from fans in over 135 countries.",
                },
                {
                  q: "Q4. 報酬の受け取りには何が必要ですか？ / What do I need to receive my earnings?",
                  a: "本人確認（KYC）が完了した銀行口座、またはStripeアカウントが必要です。登録は数分で完了し、すぐに配信・収益化をスタートできます。\n\nYou will need a verified bank account or a Stripe account. The setup takes only a few minutes, allowing you to start streaming and earning immediately.",
                },
              ].map((item, i) => (
                <details key={i} className="bg-card border border-primary/20 rounded-xl p-4 group">
                  <summary className="flex items-center justify-between cursor-pointer font-semibold text-sm list-none">
                    {item.q}
                    <ChevronDown className="w-4 h-4 text-muted-foreground group-open:rotate-180 transition-transform shrink-0 ml-2" />
                  </summary>
                  <div className="mt-3 text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer CTA ===== */}
      <section className="w-full py-16 px-4 sm:px-6 bg-gradient-to-br from-amber-500/10 to-background border-t border-amber-500/20">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <p className="text-amber-400 font-bold text-sm">限定人数に達し次第終了</p>
          <h2 className="text-3xl font-black">今すぐ全プラン無料でデビュー</h2>
          <p className="text-muted-foreground text-sm">{TOTAL_VALUE}/月相当が、今だけタダ。</p>
          <Button
            onClick={scrollToForm}
            size="lg"
            className="bg-primary text-black font-black text-base px-10 h-14 rounded-2xl hover:bg-primary/90"
            style={{ boxShadow: "0 0 25px rgba(0,255,157,0.4)" }}
          >
            無料で申し込む <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-xs text-muted-foreground">クレジットカード不要 · いつでもキャンセル可能</p>
        </div>
      </section>
    </div>
  );
}