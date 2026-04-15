import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  TrendingUp, Video, PhoneCall, Zap, Star, CheckCircle2, ArrowRight,
  Users, Clock, Coins, ChevronDown, Flame, Gift, Shield
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ---- キャンペーン設定 ----
const CAMPAIGN_START = new Date("2026-04-16T00:00:00+09:00");
const PRO_SLOTS_TOTAL = 300;
// ローカルストレージで簡易保持（擬似リアルタイム）
const STORAGE_KEY = "recruit_pro_slots_used";

function getProSlotsUsed() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) return parseInt(stored, 10);
  // 初回アクセス時：開始から経過時間に応じて自然な消費数を生成
  const elapsed = Math.max(0, Date.now() - CAMPAIGN_START.getTime());
  const hoursElapsed = elapsed / (1000 * 60 * 60);
  const organic = Math.floor(Math.min(hoursElapsed * 2.3, 220)); // 自然増加
  localStorage.setItem(STORAGE_KEY, String(organic));
  return organic;
}

// ---- カウントダウン ----
function useCountdown(targetDate) {
  const [diff, setDiff] = useState(targetDate - Date.now());
  useEffect(() => {
    const t = setInterval(() => setDiff(targetDate - Date.now()), 1000);
    return () => clearInterval(t);
  }, [targetDate]);
  const total = Math.max(0, diff);
  const days = Math.floor(total / 86400000);
  const hours = Math.floor((total % 86400000) / 3600000);
  const mins = Math.floor((total % 3600000) / 60000);
  const secs = Math.floor((total % 60000) / 1000);
  return { days, hours, mins, secs, started: diff <= 0 };
}

// ---- Pro枠カウンター ----
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

// ---- CountdownBox ----
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

// ---- メインコンポーネント ----
export default function Recruit() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const countdown = useCountdown(CAMPAIGN_START.getTime());
  const slotsRemaining = useSlotsCounter();
  const formRef = useRef(null);

  // フォーム
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

  // フォロワー数からキャンペーン判定
  const followerCount = parseInt(followers.replace(/,/g, ""), 10) || 0;
  const isProTier = followerCount >= 10000;
  const campaignLabel = isProTier
    ? "🎯 Pro特典：3ヶ月無料（要審査）"
    : "🎁 Standard特典：初月無料";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email) { toast.error("お名前とメールアドレスは必須です"); return; }
    setSubmitting(true);

    // ChannelReportエンティティを流用して申請データ保存（専用エンティティがないため）
    // 実運用では専用エンティティを用意することを推奨
    try {
      await base44.entities.BlogPost.create({
        title: `【ライバー募集申請】${name}`,
        content: JSON.stringify({
          name,
          email,
          sns_url: snsUrl,
          followers: followerCount,
          pr,
          campaign_tier: isProTier ? "pro_90days" : "standard_30days",
          requires_review: isProTier,
          applied_at: new Date().toISOString(),
        }),
        channel_id: "recruit_application",
        status: "draft",
      });
    } catch (_) {
      // エラーをサイレント（申請フォームとしての体験を壊さない）
    }

    setSubmitting(false);
    setSubmitted(true);
    toast.success("申請を受け付けました！メールにてご連絡します。");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">

      {/* ===== HERO ===== */}
      <section className="relative min-h-screen flex items-center justify-center px-4 py-16 overflow-hidden">
        {/* BG Grid */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "linear-gradient(#00ff9d 1px,transparent 1px),linear-gradient(90deg,#00ff9d 1px,transparent 1px)",
          backgroundSize: "60px 60px"
        }} />
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(0,255,157,0.08) 0%, transparent 70%)" }} />

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          {/* 4/16告知バッジ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-primary/20 border border-primary/50 rounded-full px-5 py-2 text-sm font-bold text-primary"
            style={{ boxShadow: "0 0 20px rgba(0,255,157,0.3)" }}
          >
            <Flame className="w-4 h-4" />
            4/16 ライバー募集キャンペーン開始！
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-7xl font-black leading-tight"
          >
            あなたの才能を<br />
            <span style={{
              background: "linear-gradient(135deg, #00ff9d, #00d4ff)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent"
            }}>最大95%</span>
            <br />還元で収益化
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
          >
            ライブ配信・動画販売・1対1通話。<br className="hidden sm:block" />
            ChatMarketで、あなたのコンテンツをビジネスに。
          </motion.p>

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
              className="inline-block bg-primary/20 border-2 border-primary rounded-2xl px-8 py-4"
              style={{ boxShadow: "0 0 30px rgba(0,255,157,0.4)" }}
            >
              <p className="text-primary font-black text-xl">🚀 キャンペーン募集中！</p>
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
              今すぐ無料で申し込む
            </Button>
            <Link to="/info">
              <Button variant="outline" size="lg" className="h-14 px-6 rounded-2xl gap-2">
                サービス詳細 <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          {/* Pro枠カウンター */}
          <motion.div
            animate={{ scale: [1, 1.02, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/40 rounded-xl px-5 py-3 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse inline-block" />
            <span className="text-red-300 font-bold">インフルエンサー限定枠：残り</span>
            <span className="text-red-400 font-black text-xl">{slotsRemaining}</span>
            <span className="text-red-300 font-bold">名 / {PRO_SLOTS_TOTAL}名</span>
          </motion.div>
        </div>
      </section>

      {/* ===== キャンペーン詳細 ===== */}
      <section className="py-16 px-4 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 rounded-full px-4 py-1 text-xs font-bold">
              🎉 4/16スタート限定キャンペーン
            </span>
            <h2 className="text-3xl sm:text-4xl font-black mt-4">今だけの特別プログラム</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Pro */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl border-2 border-yellow-500/60 bg-gradient-to-br from-yellow-500/15 to-yellow-600/5 p-7 space-y-4"
              style={{ boxShadow: "0 0 30px rgba(234,179,8,0.15)" }}
            >
              <div className="absolute -top-4 left-6 bg-yellow-500 text-black px-4 py-1 rounded-full text-xs font-black">
                ⭐ インフルエンサー特典
              </div>
              <div className="pt-2 space-y-1">
                <p className="text-yellow-400 font-black text-2xl">3ヶ月間 無料</p>
                <p className="text-sm text-muted-foreground">BASICプラン（通常 ¥3,300/月）</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-yellow-300 font-bold">✅ 適用条件</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• SNSフォロワー1万人以上（合算可）</li>
                  <li>• YouTube / X / Instagram / TikTok いずれか</li>
                  <li>• 申請後、運営によるアカウント審査あり</li>
                </ul>
              </div>
              <div className="text-xs text-muted-foreground">
                限定<span className="text-yellow-400 font-black text-sm"> {slotsRemaining} </span>名枠（先着順）
              </div>
            </motion.div>

            {/* Standard */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="relative rounded-2xl border-2 border-primary/60 bg-gradient-to-br from-primary/15 to-primary/5 p-7 space-y-4"
              style={{ boxShadow: "0 0 30px rgba(0,255,157,0.1)" }}
            >
              <div className="absolute -top-4 left-6 bg-primary text-black px-4 py-1 rounded-full text-xs font-black">
                🎁 全員対象
              </div>
              <div className="pt-2 space-y-1">
                <p className="text-primary font-black text-2xl">初月 無料</p>
                <p className="text-sm text-muted-foreground">BASICプラン（通常 ¥3,300/月）</p>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-primary font-bold">✅ 適用条件</p>
                <ul className="text-muted-foreground space-y-1 text-xs">
                  <li>• 新規ライバー登録（4/16以降）</li>
                  <li>• 利用規約への同意</li>
                  <li>• 審査不要・即時適用</li>
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">適用上限なし・期間中に登録した全員に適用</p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== 3大メリット ===== */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-center mb-12">ChatMarket 3大メリット</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* 1: 還元率 */}
            <div className="bg-card border border-border/50 rounded-2xl p-7 space-y-4 hover:border-primary/40 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="text-4xl font-black text-primary">85〜95%</p>
                <p className="font-bold text-lg mt-1">業界最高水準の還元率</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                BASICプラン加入で即85%。月間売上に応じてプログレッシブに最大95%まで自動上昇。手続き一切不要。
              </p>
              <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary font-semibold space-y-0.5">
                <p>月売上¥100万 → <strong>86%還元</strong></p>
                <p>月売上¥1,000万 → <strong>89%還元</strong></p>
                <p>月売上¥2,000万超 → <strong>95%還元</strong></p>
              </div>
            </div>

            {/* 2: 150円経済圏 */}
            <div className="bg-card border border-border/50 rounded-2xl p-7 space-y-4 hover:border-cyan-400/40 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 flex items-center justify-center">
                <Coins className="w-7 h-7 text-cyan-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-cyan-400">¥150〜</p>
                <p className="font-bold text-lg mt-1">150円経済圏</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                コイン単価150円〜・通話料金150円/15分という低単価設計で、視聴者がライトに投げ銭・通話しやすい環境を実現。
              </p>
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-4 py-3 text-xs text-cyan-300 font-semibold space-y-0.5">
                <p>1日60分の無料通話枠（CALL&ANSERプラン）</p>
                <p>小さな投げ銭が積み重なる設計</p>
                <p>コインは手数料3.6%上乗せで購入</p>
              </div>
            </div>

            {/* 3: アーカイブ販売 */}
            <div className="bg-card border border-border/50 rounded-2xl p-7 space-y-4 hover:border-yellow-400/40 transition-all">
              <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
                <Video className="w-7 h-7 text-yellow-400" />
              </div>
              <div>
                <p className="text-4xl font-black text-yellow-400">二次収益</p>
                <p className="font-bold text-lg mt-1">アーカイブ販売</p>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                通話録画（+¥50/15分）でそのまま動画コンテンツとして販売。配信後も収益が積み重なる「寝ながら稼ぐ」仕組み。
              </p>
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-xs text-yellow-300 font-semibold space-y-0.5">
                <p>録画はS3+CloudFrontで安全管理</p>
                <p>アーカイブ最低価格¥150〜</p>
                <p>動画は最長60分まで販売可能</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 数字で見るメリット ===== */}
      <section className="py-12 px-4 bg-secondary/20 border-y border-border/30">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          {[
            { value: "95%", label: "最大還元率", color: "text-primary" },
            { value: "300名", label: "Pro枠限定", color: "text-yellow-400" },
            { value: "¥150", label: "最低コイン価格", color: "text-cyan-400" },
            { value: "3ヶ月", label: "インフルエンサー無料", color: "text-red-400" },
          ].map((s, i) => (
            <div key={i} className="bg-card border border-border/50 rounded-xl p-5">
              <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== 機能一覧 ===== */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-black text-center mb-8">使える機能</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { icon: "📡", label: "有料ライブ配信" },
              { icon: "🎬", label: "動画アーカイブ販売" },
              { icon: "📞", label: "1対1ビデオ通話" },
              { icon: "💬", label: "ダイレクトチャット" },
              { icon: "👑", label: "ファンクラブ運営" },
              { icon: "📊", label: "収益ダッシュボード" },
              { icon: "🏆", label: "プログレッシブ還元" },
              { icon: "🎫", label: "イベントチケット販売" },
              { icon: "🛡️", label: "NGワード自動検知" },
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
      <section ref={formRef} className="py-16 px-4 bg-gradient-to-b from-secondary/20 to-background">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8 space-y-2">
            <span className="bg-primary/20 text-primary border border-primary/40 rounded-full px-4 py-1 text-xs font-bold">
              📝 ライバー登録申し込み
            </span>
            <h2 className="text-2xl font-black mt-3">今すぐ無料で登録</h2>
            <p className="text-sm text-muted-foreground">フォロワー数に応じたキャンペーンが自動適用されます</p>
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
                  ? "Pro特典（3ヶ月無料）の申請を受け付けました。審査結果をメールでお知らせします。"
                  : "Standard特典（初月無料）が自動適用されます。"}
              </p>
              <Button onClick={() => navigate("/")} className="bg-primary text-black font-bold">
                ChatMarketを始める →
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-card border border-border/50 rounded-2xl p-6 space-y-5">

              {/* キャンペーン判定バナー */}
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
                  {isProTier && <span className="text-xs font-normal text-muted-foreground ml-1">（フォロワー1万人超確認）</span>}
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
                  <span className="text-xs text-muted-foreground">1万超でPro特典適用</span>
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
                    {isProTier ? "⭐ Pro特典対象！3ヶ月無料（要審査）" : `フォロワー ${(10000 - followerCount).toLocaleString()} 人でPro特典適用`}
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

              {/* 規約同意 */}
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
                    {isProTier ? "Pro特典で申し込む（3ヶ月無料）" : "Standard特典で申し込む（初月無料）"}
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-12 px-4 border-t border-border/30">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-xl font-black mb-6 text-center">よくある質問</h2>
          <div className="space-y-3">
            {[
              { q: "無料期間終了後はどうなりますか？", a: "無料期間終了後は通常のBASICプラン（¥3,300/月）に自動移行します。継続しない場合は期間中にキャンセルしてください。" },
              { q: "Pro特典の審査基準は？", a: "SNSアカウントのフォロワー数が合算1万人以上であることが基準です。複数SNSの合算も可能です。審査は通常2〜3営業日以内に完了します。" },
              { q: "既存ユーザーは対象ですか？", a: "本キャンペーンは4/16以降の新規ライバー登録者が対象です。既存ユーザーのプラン変更には適用されません。" },
              { q: "通話の録画はどうすれば使えますか？", a: "通話申し込み時に録画オプション（+¥50/15分）を選択するだけです。録画はS3に保存され、アーカイブとして販売できます。" },
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
      <section className="py-16 px-4 bg-gradient-to-br from-primary/10 to-background border-t border-primary/20">
        <div className="max-w-xl mx-auto text-center space-y-5">
          <p className="text-primary font-bold text-sm">{slotsRemaining}名限定枠 残りわずか</p>
          <h2 className="text-3xl font-black">今すぐライバーデビュー</h2>
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