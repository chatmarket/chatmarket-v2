import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Crown, Zap, TrendingUp, Users, Mic2, DollarSign, CheckCircle2, ArrowRight, Sparkles, Calendar, Clock, Phone } from "lucide-react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const STATS = [
  { value: "85%", label: "還元率", sub: "PPV・エール共通" },
  { value: "3,000+", label: "同時視聴", sub: "インフラ完備" },
  { value: "0円", label: "初期費用", sub: "完全無料" },
  { value: "24h", label: "サポート", sub: "即座対応" },
];

const COMPARISON = [
  {
    label: "Chat Market",
    highlight: true,
    items: [
      "✓ PPV還元率 85%（プラットフォーム手数料15%）",
      "✓ エールコイン還元率 85%（同じ基準）",
      "✓ 大規模講演会対応（3,000名同時視聴可）",
      "✓ ライブ終了→1対1個別相談の自動誘導",
      "✓ キャッシング最適化＋DB保護",
    ],
  },
  {
    label: "従来型配信",
    highlight: false,
    items: [
      "✗ 30%～50%に及ぶ中間マージン",
      "✗ 大規模視聴対応の負荷テスト実績不明",
      "✗ 個別相談の自動誘導なし",
      "✗ インフラスケーリング不透明",
      "✗ 還元方式が複雑で不透明",
    ],
  },
];

const FEATURES = [
  {
    icon: "🎤",
    title: "大規模PPV講演会",
    desc: "3,000名規模の同時視聴に対応。インフラ最適化で数千人が一斉にチケット購入してもDB悲鳴ゼロ。",
  },
  {
    icon: "💬",
    title: "リアルタイムコメント制御",
    desc: "コメント殺到時もバッチ処理でフリーズなし。質問・応援・エール投げが自然に流れる。",
  },
  {
    icon: "🤝",
    title: "1対1個別相談へ自動誘導",
    desc: "ライブ終了時に『先生に直接相談』の誘導ポップアップ。割引コード付与で成約率最大化。",
  },
  {
    icon: "💰",
    title: "透明な85%還元",
    desc: "PPV・エール・チケット・1対1すべてが同じ基準。複雑な計算なし、シンプル・公明正大。",
  },
];

export default function ExpertLP() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [eventInfo, setEventInfo] = useState(null);
  const [user, setUser] = useState(null);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    document.title = "有識者・著名人向け講演会プラットフォーム | Chat Market";
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // イベント情報とユーザー取得
  useEffect(() => {
    const init = async () => {
      try {
        // デモ用：ExpertLP 専用イベントを取得
        const events = await base44.entities.TicketEvent.filter({
          channel_id: "expert_lp"
        });
        if (events.length > 0) {
          setEventInfo(events[0]);
        }

        // ユーザー認証確認
        const isAuth = await base44.auth.isAuthenticated();
        if (isAuth) {
          const me = await base44.auth.me();
          setUser(me);
        }
      } catch (err) {
        console.error("Failed to load event info:", err);
      }
    };
    init();
  }, []);

  // チケット購入処理
  const handleTicketPurchase = async () => {
    if (!user) {
      base44.auth.redirectToLogin("/lp/expert");
      return;
    }

    if (!eventInfo) {
      toast.error("イベント情報が見つかりません");
      return;
    }

    setPurchasing(true);
    try {
      const response = await base44.functions.invoke("createLiveTicketCheckout", {
        event_id: eventInfo.id,
        event_name: eventInfo.event_name,
        ticket_price: eventInfo.price || 3000,
        ticket_type: "expert_lecture",
        buyer_email: user.email,
        buyer_name: user.full_name || user.email,
        redirect_url: window.location.href,
      });

      if (response.data?.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.error("チェックアウトページの取得に失敗しました");
      }
    } catch (err) {
      console.error("Ticket purchase error:", err);
      toast.error("購入処理に失敗しました");
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950 text-white overflow-x-hidden font-inter">
      <MetaHelmet
        title="有識者・コンサルタント向けオンライン講演プラットフォーム | ChatMarket（チャットマーケット）"
        description="有識者・著名人・コンサルタント向けライブ配信プラットフォーム。3,000名規模のPPVオンライン講演会・個別相談を還元率85%で収益化。初期費用0円・クレカ不要で今すぐ登録。"
        image="https://media.base44.com/images/public/69c1b541d5db3555833124aa/707796e00_generated_image.png"
      />
      {/* ── ExpertLP独自のCTAボタン（AppLayoutヘッダーの下に表示） ── */}
      <div
        className="fixed left-0 right-0 z-40 flex justify-end px-6 py-2 pointer-events-none"
        style={{ top: "calc(env(safe-area-inset-top) + 56px)" }}
      >
        <Link to="/recruit" className="pointer-events-auto">
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-black font-black shadow-lg"
          >
            今すぐ登録 →
          </Button>
        </Link>
      </div>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-32 pb-16">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-20 left-1/4 w-96 h-96 rounded-full opacity-20"
            style={{
              background: "radial-gradient(ellipse, #3b82f6, transparent)",
              filter: "blur(80px)",
            }}
          />
          <div
            className="absolute bottom-40 right-1/4 w-96 h-96 rounded-full opacity-15"
            style={{
              background: "radial-gradient(ellipse, #fbbf24, transparent)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold"
            style={{
              background: "rgba(251,191,36,0.15)",
              border: "1px solid rgba(251,191,36,0.5)",
              color: "#fbbf24",
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            有識者・著名人専用プラットフォーム
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-7xl font-black leading-tight"
          >
            知の価値を、<br />
            <span className="text-amber-400">最大限に売ろう</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-blue-100 max-w-2xl mx-auto leading-relaxed"
          >
            3,000名規模の講演会・セミナーで圧倒的な収益を実現。<br />
            PPV・エール・個別相談すべてが還元率85%。シンプルで、公明正大。<br />

          </motion.p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="pt-4"
          >
            <Link to="/recruit">
              <Button
                size="lg"
                className="bg-amber-500 hover:bg-amber-600 text-black font-black text-lg h-14 px-10 gap-2 shadow-2xl"
                style={{
                  boxShadow: "0 0 40px rgba(251,191,36,0.5)",
                }}
              >
                <Crown className="w-5 h-5" />
                有識者として登録する
              </Button>
            </Link>
          </motion.div>

          <p className="text-sm text-blue-200">
            セットアップ3分 • クレジットカード不要 • 24時間サポート完備
          </p>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div
              key={s.label}
              className="text-center p-6 rounded-2xl border border-blue-500/30"
              style={{
                background: "rgba(59,130,246,0.1)",
              }}
            >
              <p className="text-3xl md:text-4xl font-black text-amber-400">{s.value}</p>
              <p className="text-sm font-bold text-white mt-2">{s.label}</p>
              <p className="text-xs text-blue-200 mt-1">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── VISUAL SHOWCASE ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-4xl font-black text-center">
            講演会も、個別相談も。<br />
            <span className="text-amber-400">同じ有識者が対応します。</span>
          </h2>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 大規模講演会 */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-2xl overflow-hidden shadow-2xl border border-amber-500/30"
            >
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/707796e00_generated_image.png"
                alt="大規模講演会で有識者が多くの聴衆の前で講演している様子"
                className="w-full h-auto object-cover aspect-video"
              />
              <div className="p-6 bg-gradient-to-t from-slate-900 to-slate-800 space-y-2">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-400" />
                  大規模講演会
                </h3>
                <p className="text-sm text-blue-100">
                  数千人規模の同時視聴にも対応。<br />
                  PPV・エール・チケット販売で最大還元率85%。
                </p>
              </div>
            </motion.div>

            {/* 1対1個別相談 */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="rounded-2xl overflow-hidden shadow-2xl border border-blue-500/30"
            >
              <img
                src="https://media.base44.com/images/public/69c1b541d5db3555833124aa/950461c0f_generated_image.png"
                alt="同じ有識者が1対1のオンライン個別相談をしている様子"
                className="w-full h-auto object-cover aspect-video"
              />
              <div className="p-6 bg-gradient-to-t from-slate-900 to-slate-800 space-y-2">
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <Phone className="w-5 h-5 text-blue-400" />
                  1対1個別相談
                </h3>
                <p className="text-sm text-blue-100">
                  ライブ終了後の自動誘導。<br />
                  深い学習とカスタマイズされた指導で満足度向上。
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── COMPARISON ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-8">
          <h2 className="text-3xl md:text-4xl font-black text-center mb-12">
            従来型 vs Chat Market
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {COMPARISON.map((comp) => (
              <div
                key={comp.label}
                className={`p-8 rounded-2xl border-2 space-y-4 ${
                  comp.highlight
                    ? "bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/60"
                    : "bg-slate-900/50 border-slate-700/50"
                }`}
              >
                <p
                  className={`text-lg font-black ${
                    comp.highlight ? "text-amber-400" : "text-slate-400"
                  }`}
                >
                  {comp.highlight ? "✓" : "✗"} {comp.label}
                </p>
                <ul className="space-y-2.5">
                  {comp.items.map((item, i) => (
                    <li
                      key={i}
                      className="text-sm text-blue-100 leading-relaxed"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <h2 className="text-3xl md:text-4xl font-black text-center">
            4つの強み
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="p-6 rounded-2xl border border-blue-500/30 space-y-3 hover:border-amber-500/50 transition-all"
                style={{ background: "rgba(59,130,246,0.05)" }}
              >
                <div className="text-4xl">{f.icon}</div>
                <h3 className="font-black text-lg text-white">{f.title}</h3>
                <p className="text-sm text-blue-100 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── REVENUE MODEL ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-10">
          <h2 className="text-3xl font-black">透明な還元率ポリシー</h2>

          <div className="space-y-4">
            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">PPV講演会チケット</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">プラットフォーム手数料15%のみ</p>
            </div>

            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">エールコイン（投げ銭）</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">同じ基準で公明正大</p>
            </div>

            <div className="p-6 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-500/20 to-amber-600/10">
              <p className="text-sm text-amber-300 font-bold mb-2">1対1個別相談</p>
              <p className="text-4xl font-black text-amber-400">85% → あなたの手取り</p>
              <p className="text-xs text-blue-200 mt-2">自動誘導で高成約率</p>
            </div>
          </div>

          <p className="text-sm text-blue-200 pt-4 border-t border-blue-500/20">
            <strong>複雑な計算はなし。すべてが同じ基準。</strong><br />
            数千人が一斉にチケット購入しても安定稼働する確実な基盤を用意しました。
          </p>
        </div>
      </section>

      {/* ── DEMO LECTURE EVENT ── */}
      {eventInfo && (
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="rounded-2xl border-2 border-amber-500/60 p-8 space-y-6"
              style={{
                background: "linear-gradient(135deg, rgba(251,191,36,0.15), rgba(59,130,246,0.1))",
              }}
            >
              <div className="text-center space-y-2">
                <p className="text-sm font-bold text-amber-400">🎤 DEMO EVENT</p>
                <h3 className="text-2xl font-black text-white">
                  {eventInfo.event_name || "知の帝国構築セミナー"}
                </h3>
                <p className="text-blue-100">
                  有識者プラットフォーム完成記念・特別講演
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <Calendar className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-200">開始予定日</p>
                    <p className="text-lg font-bold text-white">
                      {eventInfo.event_date
                        ? new Date(eventInfo.event_date).toLocaleString("ja-JP", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "2026年5月15日 20:00"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5">
                  <DollarSign className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="text-xs text-blue-200">チケット価格</p>
                    <p className="text-lg font-bold text-white">
                      ¥{eventInfo.price || 3000}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 space-y-2">
                <p className="text-sm text-blue-100">
                  <strong>📬 購入後の特典</strong><br />
                  • イベント開始15分前に通知を受け取れます<br />
                  • 購入者限定：有識者向けコミュニティへのアクセス<br />
                  • アーカイブ動画視聴権（30日間有効）
                </p>
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleTicketPurchase}
                disabled={purchasing}
                className="w-full py-4 rounded-xl font-black text-lg text-black transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #fbbf24)",
                  boxShadow: "0 0 30px rgba(251,191,36,0.4)",
                }}
              >
                {purchasing ? (
                  "処理中..."
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Zap className="w-5 h-5" />
                    チケットを購入する
                  </span>
                )}
              </motion.button>

              <p className="text-xs text-blue-300 text-center">
                セキュア決済（Stripe） • 購入確認メール即座送信
              </p>
            </motion.div>
          </div>
        </section>
      )}

      {/* ── FINAL CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto space-y-8">
          <Sparkles className="w-12 h-12 mx-auto text-amber-400" />
          <h2 className="text-3xl md:text-4xl font-black leading-tight">
            さあ、あなたの知をお金に変えよう。
          </h2>
          <p className="text-lg text-blue-100">
            3,000人規模の同時視聴にも安定対応する<br />
            エンタープライズシステムを完備。
          </p>

          <Link to="/recruit">
            <Button
              size="lg"
              className="bg-amber-500 hover:bg-amber-600 text-black font-black text-lg h-14 px-10 gap-2 shadow-2xl"
              style={{
                boxShadow: "0 0 50px rgba(251,191,36,0.5)",
              }}
            >
              <Crown className="w-5 h-5" />
              有識者として今すぐ登録
            </Button>
          </Link>

          <p className="text-xs text-blue-300">
            セットアップ3分 • 24時間オンボーディング対応 • 本当に売上が出たら満足します
          </p>
        </div>
      </section>

      <footer className="text-center py-8 text-blue-300/40 text-xs border-t border-blue-500/10">
        © 2026 ChatMarket. The Platform for Knowledge Leaders.
      </footer>
    </div>
  );
}