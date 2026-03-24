import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Check, Video, Radio, PhoneCall, Play, Heart } from "lucide-react";
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
    icon: Video,
    name: "VODプラン",
    price: "¥9,000",
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
    price: "¥9,000",
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
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser).catch(() => {});
      }
    });
  }, []);

  const handlePlanClick = (planName) => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    // Create a payment page with plan info
    const planMap = {
      "BASICプラン": "basic",
      "VODプラン": "vod",
      "PPVプラン": "ppv",
      "BASIC＋クラウドファンディングプラン": "crowdfunding",
    };
    const planId = planMap[planName];
    if (planId) {
      navigate(`/payment?plan=${planId}`);
    }
  };

  return (
    <section className="py-4">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-3">料金プラン</h2>
        <p className="text-muted-foreground text-sm md:text-base">
          あなたのニーズに合ったプランをお選びください
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl bg-gradient-to-br border p-6 flex flex-col gap-4 ${plan.color} ${plan.popular ? "ring-2 ring-primary" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">
                  人気
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-black/20 flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${plan.iconColor}`} />
                </div>
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}>
                    {plan.badge}
                  </span>
                  <h3 className="font-bold text-lg mt-0.5">{plan.name}</h3>
                  {plan.revenueShare && (
                    <p className="text-xs text-primary font-semibold mt-0.5">収益還元率 {plan.revenueShare}</p>
                  )}
                </div>
              </div>

              <div className="flex items-end gap-1">
                <span className="text-3xl font-black">{plan.price}</span>
                <span className="text-muted-foreground text-sm mb-1">{plan.period}（税込）</span>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{f}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => plan.name === "FREEプラン" ? navigate("/go-live") : handlePlanClick(plan.name)}
                className={`w-full mt-2 ${plan.popular ? "bg-primary hover:bg-primary/90" : "bg-white/10 hover:bg-white/20 text-foreground"}`}
              >
                {plan.name === "FREEプラン" ? "1対1のビデオ通話を開始" : "このプランで始める"}
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        ※ プラットフォーム手数料：動画・ライブ売上の15%、エールコインの10%
      </p>
    </section>
  );
}