import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, ArrowLeft, ExternalLink, Video, Radio, PhoneCall, Play, Heart, Phone, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAILS = ["unei@chatmarket.info", "ono@onestep-corp.com"];

const PLAN_INFO = {
  free:          { name: "FREEプラン",                     price: 0,     badge: "無料スタート",       badgeColor: "bg-gray-500/20 text-gray-300" },
  basic:         { name: "BASICプラン",                    price: 3300,  badge: "1対1ビデオ通話",     badgeColor: "bg-blue-500/20 text-blue-300" },
  "call-anser":  { name: "CALL＆ANSERプラン",              price: 3300,  badge: "双方向有料通話",      badgeColor: "bg-cyan-500/20 text-cyan-300" },
  vod:           { name: "VODプラン",                      price: 3300,  badge: "動画販売",           badgeColor: "bg-primary/20 text-primary" },
  ppv:           { name: "PPVプラン",                      price: 3300,  badge: "有料ライブ配信",      badgeColor: "bg-red-500/20 text-red-300" },
  crowdfunding:  { name: "BASIC＋クラウドファンディング",   price: 12000, badge: "クラウドファンディング", badgeColor: "bg-red-500/20 text-red-300" },
};

// Stripe決済リンク（プランごと）
const PAYMENT_LINKS = {
  basic:        "https://buy.stripe.com/placeholder_basic",
  "call-anser": "https://buy.stripe.com/placeholder_call_anser",
  vod:          "https://buy.stripe.com/placeholder_vod",
  ppv:          "https://buy.stripe.com/placeholder_ppv",
};

export default function PlanConfirm() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const planIds = (params.get("plans") || "").split(",").filter(Boolean);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser);
      }
    });
  }, []);

  const selectedPlans = planIds.map((id) => ({ id, ...PLAN_INFO[id] })).filter((p) => p.name);
  const totalPrice = selectedPlans.reduce((sum, p) => sum + p.price, 0);

  const isAdmin = ADMIN_EMAILS.includes(user?.email);
  const hasFreeOnly = planIds.includes("free") && planIds.length === 1;
  const hasCrowdfunding = planIds.includes("crowdfunding");
  const paidPlans = selectedPlans.filter((p) => p.price > 0 && p.id !== "crowdfunding");

  const handleFreeStart = () => navigate("/go-live");
  const handleCrowdfunding = () => navigate("/crowdfunding/new");
  const handlePaidPlan = (planId) => {
    const url = PAYMENT_LINKS[planId];
    if (url) window.open(url, "_blank");
    else toast.info("決済リンクは近日公開予定です");
  };

  if (selectedPlans.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center text-muted-foreground">
        <p>プランが選択されていません。</p>
        <Button onClick={() => navigate("/plan-select")} className="mt-4">プランを選ぶ</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-8">
      <button onClick={() => navigate("/plan-select")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> プラン選択に戻る
      </button>

      <div>
        <h1 className="text-2xl font-black">申し込み確認</h1>
        <p className="text-muted-foreground text-sm mt-1">以下のプランでお申し込みください。</p>
      </div>

      {/* 選択プラン一覧 */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
        <h2 className="font-bold">選択中のプラン</h2>
        <div className="space-y-3">
          {selectedPlans.map((plan) => (
            <div key={plan.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3 h-3 text-primary" />
                </div>
                <div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor} mr-2`}>{plan.badge}</span>
                  <span className="text-sm font-semibold">{plan.name}</span>
                </div>
              </div>
              <span className="font-bold text-sm">
                {plan.price === 0 ? "無料" : `¥${plan.price.toLocaleString()}/月`}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 pt-4 flex justify-between items-center font-black text-lg">
          <span>月額合計</span>
          <span className="text-primary">¥{totalPrice.toLocaleString()}<span className="text-sm font-normal text-muted-foreground">/月</span></span>
        </div>
      </div>

      {/* 管理者権限通知 */}
      {isAdmin && (
        <div className="bg-primary/10 border border-primary/40 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-primary">運営管理者アカウント</p>
            <p className="text-xs text-primary/80">このアカウントでの加入は収益に反映されません。プラン確認用です。</p>
          </div>
        </div>
      )}

      {/* 申し込みアクション */}
      {!isAdmin ? (
        <div className="space-y-3">
          {hasFreeOnly && (
            <Button onClick={handleFreeStart} className="w-full h-12 text-base font-bold">
              無料で始める
            </Button>
          )}

          {paidPlans.map((plan) => (
            <Button
              key={plan.id}
              onClick={() => handlePaidPlan(plan.id)}
              className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90"
            >
              <ExternalLink className="w-4 h-4" />
              {plan.name}を申し込む
            </Button>
          ))}

          {hasCrowdfunding && (
            <Button onClick={handleCrowdfunding} className="w-full h-12 text-base font-bold gap-2 bg-red-500 hover:bg-red-600 text-white">
              クラウドファンディングプランを申請する
            </Button>
          )}
        </div>
      ) : (
        <Button onClick={() => navigate("/plan-select")} className="w-full h-12 text-base font-bold">
          プラン選択に戻る
        </Button>
      )}

      <div className="bg-secondary/60 border border-border/50 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>※ 各プランは個別の決済リンクでお申し込みいただきます。</p>
        <p>※ 収益の銀行振込手数料は実費でご負担いただきます。</p>
        <p>※ ご不明な点はお気軽にお問い合わせください。</p>
      </div>
    </div>
  );
}