import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Video, Radio, PhoneCall, Play, Heart, Phone, ExternalLink, ShoppingCart, X, GraduationCap } from "lucide-react";

// 単体プランの定義
const PLANS = [
  {
    id: "free",
    icon: Play,
    name: "FREEプラン",
    price: 0,
    period: "/月",
    revenueShare: "70%",
    color: "from-gray-500/20 to-gray-600/10 border-gray-500/30",
    iconColor: "text-gray-300",
    badge: "無料スタート",
    badgeColor: "bg-gray-500/20 text-gray-300",
    description: "クレジットカード不要。基本機能をすべて無料でご利用いただけます。",
    features: ["無料で今すぐ始められる", "1対1の有料ビデオ通話機能", "視聴者からエールコイン受取", "チャンネルページ作成"],
    exclusive: true, // 他と組み合わせ不可（選ぶと他が外れる）
  },
  {
    id: "basic",
    icon: PhoneCall,
    name: "BASICプラン",
    price: 3300,
    period: "/月",
    revenueShare: "85%",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: "1対1ビデオ通話",
    badgeColor: "bg-blue-500/20 text-blue-300",
    description: "1対1の有料ビデオ通話で収益化。プログレッシブ・インセンティブで最大95%還元。",
    features: ["1対1 有料ビデオ通話（配信者が料金設定・申込者が支払い）", "スケジュール制・事前申し込み方式", "無料通話枠なし・有料通話のみ", "プログレッシブ・インセンティブに自動参加", "視聴者からエールコイン受取"],
  },
  {
    id: "call-anser",
    icon: Phone,
    name: "CALL＆ANSERプラン",
    price: 6600,
    period: "/月",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: "双方向有料通話",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    description: "双方向の有料通話。有料インタビュー・推し活・求人面接など。BASICプランとの組み合わせでご利用いただけます。",
    features: ["1対1 双方向有料通話（発信・受信どちらも課金設定可）", "30分×4回/日 無料通話枠あり（架電時）", "相手の希望額を支払って発信することも可能", "有料インタビュー・推し活・求人面接など"],
  },
  {
    id: "vod",
    icon: Video,
    name: "VODプラン",
    price: 9900,
    period: "/月",
    revenueShare: "85%",
    color: "from-primary/20 to-primary/10 border-primary/40",
    iconColor: "text-primary",
    badge: "動画販売",
    badgeColor: "bg-primary/20 text-primary",
    popular: true,
    description: "制作した動画を販売して収益化。BASICプランとの組み合わせでご利用いただけます。",
    features: ["制作動画の販売機能", "動画1本 ¥1〜（自由設定）", "生配信アーカイブ販売機能", "視聴者からエールコイン受取"],
  },
  {
    id: "ppv",
    icon: Radio,
    name: "PPVプラン",
    price: 9900,
    period: "/月",
    revenueShare: "85%",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    iconColor: "text-red-400",
    badge: "有料ライブ配信",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "1対多数の有料ライブ配信でファンから直接収益化。BASICプランとの組み合わせでご利用いただけます。",
    features: ["1対多数の有料ライブ配信", "配信料金：15分 ¥150〜（自由設定）", "視聴者からエールコイン受取", "ライブ配信アーカイブ"],
  },
  {
    id: "mini-school",
    icon: GraduationCap,
    name: "ミニスクールプラン",
    price: 8900,
    period: "/月",
    revenueShare: "90%",
    comingSoon: true,
    color: "from-violet-500/20 to-violet-600/10 border-violet-500/30",
    iconColor: "text-violet-400",
    badge: "1対最大9人スクール",
    badgeColor: "bg-violet-500/20 text-violet-300",
    description: "最大9名の少人数ミニスクールを開設。チケット制で1回単位の収益化。生徒は無料プランでもアクセス可能。",
    features: [
      "1対最大9人の少人数授業（生徒氏名がリアルタイム表示）",
      "チケット制（1回単位・自由料金設定）",
      "生徒側は無料プランでもアクセス可能",
      "収益還元率90%",
      "月の授業回数・時間・料金は配信者が自由設定",
    ],
    exclusive: true,
  },
  {
    id: "crowdfunding",
    icon: Heart,
    name: "BASIC＋クラウドファンディングプラン",
    price: 12000,
    period: "/月",
    revenueShare: "90%",
    specialBadge: true,
    comingSoon: true,
    color: "from-red-500/20 to-pink-600/10 border-red-400/40",
    iconColor: "text-red-400",
    badge: "クラウドファンディング",
    badgeColor: "bg-red-500/20 text-red-300",
    description: "NPO・政治政党向けのクラウドファンディングプラン。独自審査・電話確認あり。",
    features: ["BASICプランの全機能込み", "NPO・政治政党向けクラウドファンディング", "プロジェクトページ作成・公開", "収益還元率90%（プログレッシブ対応）"],
    exclusive: true,
  },
];

// 推奨コンボ
const COMBOS = [
  { ids: ["basic", "vod"], label: "BASIC＋VOD", discount: 0 },
  { ids: ["basic", "ppv"], label: "BASIC＋PPV", discount: 0 },
  { ids: ["basic", "call-anser"], label: "BASIC＋CALL＆ANSER", discount: 0 },
  { ids: ["basic", "vod", "ppv"], label: "BASIC＋VOD＋PPV", discount: 0 },
  { ids: ["basic", "vod", "ppv", "call-anser"], label: "全部入り", discount: 0 },
];

export default function PlanSelect() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // unei@chatmarket.infoの場合は全プラン加入
  const [selected, setSelected] = useState(new Set());

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          if (u.email === "unei@chatmarket.info") {
            setSelected(new Set(["basic", "vod", "ppv", "call-anser"]));
          }
        });
      }
    });
  }, []);

  const togglePlan = (id) => {
    // unei@chatmarket.info は選択不可
    if (user?.email === "unei@chatmarket.info") {
      return;
    }

    const plan = PLANS.find((p) => p.id === id);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // FREEまたはcrowdfundingは排他
      if (plan.exclusive) {
        return new Set([id]);
      }
      // FREEが選ばれていたら外す
      next.delete("free");
      next.delete("crowdfunding");
      next.add(id);
      return next;
    });
  };

  const applyCombo = (ids) => {
    setSelected(new Set(ids));
  };

  const selectedPlans = PLANS.filter((p) => selected.has(p.id));
  const totalPrice = selectedPlans.reduce((sum, p) => sum + p.price, 0);

  const handleApply = async () => {
    const ids = [...selected].join(",");
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      // ログイン後にプラン確認ページへ戻る
      base44.auth.redirectToLogin(`/plan-confirm?plans=${ids}`);
      return;
    }
    navigate(`/plan-confirm?plans=${ids}`);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {user?.email === "unei@chatmarket.info" && (
        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4">
          <p className="text-sm font-bold text-primary mb-1">運営管理者アカウント</p>
          <p className="text-xs text-primary/80">全プラン（BASIC・VOD・PPV・CALL&ANSER）が自動的に加入状態になります。</p>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-black">プランを選択する</h1>
        <p className="text-muted-foreground text-sm mt-1">複数のプランを組み合わせてお申し込みいただけます。</p>
        <p className="text-sm text-foreground/80 mt-2">ChatMarketのプランは必要なプランをお選び頂き組み合わせてお申し込みが出来ます。</p>
      </div>

      {/* おすすめコンボ */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">おすすめの組み合わせ</p>
        <div className="flex flex-wrap gap-2">
          {COMBOS.map((combo) => (
            <button
              key={combo.label}
              onClick={() => applyCombo(combo.ids)}
              disabled={user?.email === "unei@chatmarket.info"}
              className="text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {combo.label}
            </button>
          ))}
        </div>
      </div>

      {/* プラン一覧 */}
      <div className="space-y-3">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          const isSelected = selected.has(plan.id);
          return (
            <button
              key={plan.id}
              onClick={() => togglePlan(plan.id)}
              disabled={user?.email === "unei@chatmarket.info"}
              className={`w-full text-left rounded-2xl bg-gradient-to-br border transition-all duration-200 overflow-hidden ${plan.color} ${
                isSelected ? "ring-2 ring-primary shadow-lg shadow-primary/10" : "opacity-80 hover:opacity-100"
              } ${plan.popular && isSelected ? "ring-primary" : ""} ${user?.email === "unei@chatmarket.info" ? "cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center gap-4 px-5 py-4">
                {/* Checkbox */}
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${isSelected ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>

                <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>{plan.badge}</span>
                    {plan.popular && <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">人気</span>}
                    {plan.comingSoon && <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🚧 準備中</span>}
                  </div>
                  <p className="font-bold text-sm">{plan.name}</p>
                  {plan.revenueShare && (
                    <p className="text-xs text-primary font-semibold">収益還元率 {plan.revenueShare}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{plan.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-black">¥{plan.price.toLocaleString()}</span>
                  <span className="text-muted-foreground text-xs ml-1">{plan.period}</span>
                </div>
              </div>

              {/* 展開された機能リスト */}
              {isSelected && (
                <div className="px-5 pb-4 border-t border-white/10 pt-3">
                  <ul className="space-y-1.5">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/70">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 合計・申し込みバー */}
      {selected.size > 0 && (
        <div className="sticky bottom-4 z-10">
          <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-primary" />
                <span className="font-bold">選択中のプラン</span>
              </div>
              <div className="flex flex-wrap gap-1 justify-end">
                {selectedPlans.map((p) => (
                  <span key={p.id} className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.badgeColor}`}>
                    {p.badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/50 pt-3">
              <div>
                <p className="text-xs text-muted-foreground">月額合計</p>
                <p className="text-2xl font-black text-primary">¥{totalPrice.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/月</span></p>
              </div>
              <Button onClick={handleApply} className="bg-primary hover:bg-primary/90 px-8 h-12 text-base font-bold gap-2">
                <ExternalLink className="w-4 h-4" />
                申し込む
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}