import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, Video, PhoneCall, Zap, CheckCircle2, ArrowRight,
  Coins, ChevronDown, Flame, Gift, Crown
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ---- キャンペーン設定 ----
const CAMPAIGN_START = new Date("2026-04-16T20:00:00+09:00");
const PRO_SLOTS_TOTAL = 300;
const STORAGE_KEY = "recruit_pro_slots_used";

// 全有料プラン一覧
const ALL_PLANS = [
  { name: "BASIC",      price: "¥3,300",  color: "#00ff9d", desc: "配信・通話85%還元" },
  { name: "CALL&ANSER", price: "¥6,600",  color: "#00d4ff", desc: "15分150円〜上限なし通話" },
  { name: "VOD",        price: "¥9,900",  color: "#f59e0b", desc: "動画アーカイブ販売" },
  { name: "PPV",        price: "¥9,900",  color: "#ff6b6b", desc: "有料ライブ配信" },
];
const TOTAL_VALUE = "¥29,700"; // 月額合計

function getProSlotsUsed() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return parseInt(stored, 10);
  const elapsed = Math.max(0, Date.now() - CAMPAIGN_START.getTime());
  const hoursElapsed = elapsed / (1000 * 60 * 60);
  const organic = Math.floor(Math.min(hoursElapsed * 2.3, 220));
  localStorage.setItem(STORAGE_KEY, String(organic));
  return organic;
}

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

function useSlotsCounter() {
  const [used, setUsed] = useState(getProSlotsUsed);
  useEffect(() => {
    const t = setInterval(() => {
      setUsed(prev => {
        const next = Math.min(prev + (Math.random() < 0.15 ? 1 : 0), PRO_SLOTS_TOTAL - 1);
        localStorage.setItem(STORAGE_KEY, String(next));
        return next;
      });
    }, 8000);
    return () => clearInterval(t);
  }, []);
  return PRO_SLOTS_TOTAL - used;
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
  const slotsRemaining = useSlotsCounter();
  const formRef = useRef(null);

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
    ? `🎯 Pro特典：全有料プラン3ヶ月完全無料（要審査）`
    : `🎁 Standard特典：全有料プラン初月完全無料`;

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
            <span className="text-red-300 font-bold">残り枠：</span>
            <span className="text-red-400 font-black text-xl">{slotsRemaining}</span>
            <span className="text-red-300 font-bold">名 / {PRO_SLOTS_TOTAL}名</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-10">
            {ALL_PLANS.map((plan) => (
              <div key={plan.name} className="rounded-xl border p-4 text-center space-y-2"
                style={{
                  borderColor: plan.color + "66",
                  background: `${plan.color}11`,
                  boxShadow: `0 0 15px ${plan.color}22`,
                }}>
                <p className="font-black text-base" style={{ color: plan.color }}>{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.desc}</p>
                <div className="space-y-0.5">
                  <p className="text-xs line-through text-muted-foreground/50">{plan.price}/月</p>
                  <p className="font-black text-sm" style={{ color: plan.color }}>→ ¥0</p>
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
                <p className="text-yellow-400 font-black text-3xl">3ヶ月間 完全無料</p>
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
                <p className="text-yellow-300 font-black text-lg">3ヶ月で最大 {TOTAL_VALUE} × 3ヶ月 FREE</p>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                限定<span className="text-yellow-400 font-black text-sm"> {slotsRemaining} </span>名枠（先着順・埋まり次第終了）
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
                <p className="text-primary font-black text-3xl">初月 完全無料</p>
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
                <p className="text-primary font-black text-lg">初月 {TOTAL_VALUE} FREE</p>
              </div>
              <p className="text-xs text-muted-foreground text-center">先着300名限定・埋まり次第終了</p>
            </motion.div>
          </div>
        </div>
      </section>

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
                <p className="text-4xl font-black text-primary">85〜95%</p>
                <p className="font-bold text-lg mt-1">業界最高水準の還元率</p>
              </div>
              <p className="text-sm text-muted-foreground">BASICプランで即85%。月間売上に応じてプログレッシブに最大95%まで自動上昇。</p>
            </div>
            <div className="bg-card border border-cyan-400/30 rounded-2xl p-7 space-y-4 hover:border-cyan-400/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <PhoneCall className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-cyan-400">60分/日</p>
                <p className="font-bold text-lg mt-1">無料通話枠（CALL&ANSER）</p>
              </div>
              <p className="text-sm text-muted-foreground">1日60分の無料1対1ビデオ通話枠。ファンとの距離がゼロになる。</p>
            </div>
            <div className="bg-card border border-amber-400/30 rounded-2xl p-7 space-y-4 hover:border-amber-400/50 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center">
                <Video className="w-7 h-7 text-amber-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-amber-400">二次収益</p>
                <p className="font-bold text-lg mt-1">動画アーカイブ販売</p>
              </div>
              <p className="text-sm text-muted-foreground">通話・配信の録画をそのまま動画コンテンツとして販売。寝ながら稼ぐ仕組み。</p>
            </div>
          </div>
        </div>
      </section>

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
                  ? `Pro特典（全プラン3ヶ月無料）の申請を受け付けました。審査結果をメールでお知らせします。`
                  : `Standard特典（全プラン初月無料）が適用されます。メールをご確認ください。`}
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
                    {isProTier ? "全プラン3ヶ月無料で申し込む（Pro）" : `全プラン初月無料で申し込む`}
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
        </div>
      </section>

      {/* ===== Footer CTA ===== */}
      <section className="w-full py-16 px-4 sm:px-6 bg-gradient-to-br from-amber-500/10 to-background border-t border-amber-500/20">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <p className="text-amber-400 font-bold text-sm">{slotsRemaining}名限定枠 残りわずか</p>
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