import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Video, Radio, PhoneCall, Play, Heart, ChevronDown, ChevronUp, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";

const plans = [
  {
    icon: Play,
    name: "FREEプラン",
    price: "¥0",
    period: "/月",
    revenueShare: "70%",
    color: "from-gray-500/20 to-gray-600/10 border-gray-500/30",
    iconColor: "text-gray-300",
    badge: "無料スタート",
    badgeColor: "bg-gray-500/20 text-gray-300",
    features: [
      "無料で今すぐ始められる",
      "1対1の有料ビデオ通話機能",
      "視聴者からエールコイン受取",
      "チャンネルページ作成",
    ],
  },
  {
    icon: PhoneCall,
    name: "BASICプラン",
    price: "¥3,300",
    period: "/月",
    revenueShare: "85%",
    color: "from-blue-500/20 to-blue-600/10 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: "1対1ビデオ通話",
    badgeColor: "bg-blue-500/20 text-blue-300",
    features: [
      "1対1の有料ビデオ通話機能",
      "通話料金：15分 ¥150〜（自由設定）",
      "プログレッシブ・インセンティブに自動参加",
      "視聴者からエールコイン受取",
      "チャンネルページ作成",
    ],
  },
  {
    icon: Phone,
    name: "CALL＆ANSERプラン",
    price: "¥6,600",
    note: "BASICプランとの組み合わせでご利用いただけます。",
    period: "/月",
    color: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: "双方向有料通話",
    badgeColor: "bg-cyan-500/20 text-cyan-300",
    features: [
      "1対1の双方向有料通話（15分毎に¥150〜）",
      "30分×4回/日 無料通話",
      "エールコイン受け取り機能",
      "使用例：有料でインタビューさせてください、推し活、求人面接など",
      "使い方はあなた次第！",
    ],
  },
  {
    icon: Video,
    name: "VODプラン",
    price: "¥9,900",
    note: "BASICプランとの組み合わせでご利用いただけます。",
    period: "/月",
    color: "from-primary/20 to-primary/10 border-primary/40",
    iconColor: "text-primary",
    badge: "動画販売",
    badgeColor: "bg-primary/20 text-primary",
    popular: true,
    features: [
      "制作動画の販売機能",
      "動画1本 ¥1〜（自由設定）",
      "生配信アーカイブ販売機能",
      "視聴者からエールコイン受取",
      "チャンネルページ作成",
    ],
  },
  {
    icon: Heart,
    name: "BASIC＋クラウドファンディングプラン",
    price: "¥12,000",
    period: "/月",
    revenueShare: "90%",
    specialBadge: true,
    comingSoon: true,
    color: "from-red-500/20 to-pink-600/10 border-red-400/40",
    iconColor: "text-red-400",
    badge: "クラウドファンディング",
    badgeColor: "bg-red-500/20 text-red-300",
    features: [
      "BASICプランの全機能込み",
      "NPO・政治政党向けクラウドファンディング",
      "プロジェクトページ作成・公開",
      "自由金額での寄付受付",
      "収益還元率90%（プログレッシブ対応）",
      "独自審査・電話確認あり",
    ],
  },
  {
    icon: Radio,
    name: "PPVプラン",
    price: "¥9,900",
    note: "BASICプランとの組み合わせでご利用いただけます。",
    period: "/月",
    color: "from-red-500/20 to-red-600/10 border-red-500/30",
    iconColor: "text-red-400",
    badge: "有料ライブ配信",
    badgeColor: "bg-red-500/20 text-red-300",
    features: [
      "1対多数の有料ライブ配信",
      "配信料金：15分 ¥150〜（自由設定）",
      "視聴者からエールコイン受取",
      "チャンネルページ作成",
      "ライブ配信アーカイブ",
    ],
  },
];

export default function PlanSection() {
  const [openIndex, setOpenIndex] = useState(null);
  const navigate = useNavigate();

  const planSlugMap = {
    "FREEプラン": "free",
    "BASICプラン": "basic",
    "CALL＆ANSERプラン": "call-anser",
    "VODプラン": "vod",
    "PPVプラン": "ppv",
    "BASIC＋クラウドファンディングプラン": "crowdfunding",
  };

  return (
    <section id="plans" className="py-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">料金プラン</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          あなたのニーズに合ったプランをお選びください
        </p>
      </div>

      <div className="space-y-3">
        {plans.map((plan, i) => {
          const Icon = plan.icon;
          const isOpen = openIndex === i;
          return (
            <div
              key={plan.name}
              className={`rounded-2xl bg-gradient-to-br border overflow-hidden ${plan.color} ${plan.popular ? "ring-2 ring-primary" : ""}`}
            >
              {/* Header row — always visible */}
              <button
                className="w-full flex items-center gap-4 px-5 py-4 text-left"
                onClick={() => setOpenIndex(isOpen ? null : i)}
              >
                <div className="w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                      {plan.badge}
                    </span>
                    {plan.popular && (
                      <span className="text-xs font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">人気</span>
                    )}
                    {plan.comingSoon && (
                      <span className="text-xs font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">🚧 現在準備中</span>
                    )}
                  </div>
                  <h3 className="font-bold text-base mt-0.5">{plan.name}</h3>
                  {plan.revenueShare && (
                    <p className="text-xs text-primary font-semibold flex items-center gap-1.5 flex-wrap">
                      収益還元率 {plan.revenueShare}
                      {plan.specialBadge && (
                        <span className="text-[10px] font-bold bg-orange-500 text-white px-1.5 py-0.5 rounded-full">特別還元枠（変更有）</span>
                      )}
                    </p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xl font-black">{plan.price}</span>
                  <span className="text-muted-foreground text-xs ml-1">{plan.period}</span>
                </div>

                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expandable content */}
              {isOpen && (
                <div className="px-5 pb-5 border-t border-white/10 pt-4 space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span className="text-foreground/80">{f}</span>
                      </li>
                    ))}
                  </ul>
                  {plan.note && (
                    <p className="text-xs text-muted-foreground bg-white/5 rounded-lg px-3 py-2">{plan.note}</p>
                  )}
                  <Button
                    onClick={() => navigate(`/plan/${planSlugMap[plan.name]}`)}
                    className={`w-full ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-white/10 hover:bg-white/20 text-foreground"}`}
                  >
                    機能一覧・登録はこちら
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center text-xs text-muted-foreground mt-6 space-y-1">
        <p>※ プラットフォーム手数料：動画・ライブ売上の15%、エールコインの10%</p>
        <p>※ 収益の銀行振込手数料は実費でご負担いただきます。</p>
      </div>
    </section>
  );
}