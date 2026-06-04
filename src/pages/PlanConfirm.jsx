import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, ArrowLeft, ExternalLink, AlertCircle, Gift } from "lucide-react";
import { toast } from "sonner";
import { getStripeLinkByPlan } from "@/lib/stripeLinks";
import { resolveUserPlan } from "@/lib/userPlan";

// キャンペーン対象プラン（これらはキャンペーン期間中にStripe Checkoutを作成しない）
const CAMPAIGN_COVERED_PLANS = ['call-anser', 'basic', 'vod', 'ppv'];

const PLAN_INFO = {
  free:          { name: "FREEプラン",                     price: 0,     badge: "無料スタート",       badgeColor: "bg-gray-500/20 text-gray-300" },
  basic:         { name: "BASICプラン",                    price: 3300,  badge: "1対1ビデオ通話",     badgeColor: "bg-blue-500/20 text-blue-300" },
  "call-anser":  { name: "CALL＆ANSERプラン",              price: 3300,  badge: "双方向有料通話",      badgeColor: "bg-cyan-500/20 text-cyan-300" },
  vod:           { name: "VODプラン",                      price: 3300,  badge: "動画販売",           badgeColor: "bg-primary/20 text-primary" },
  ppv:           { name: "PPVプラン",                      price: 3300,  badge: "有料ライブ配信",      badgeColor: "bg-red-500/20 text-red-300" },
  crowdfunding:  { name: "BASIC＋クラウドファンディング",   price: 12000, badge: "クラウドファンディング", badgeColor: "bg-red-500/20 text-red-300" },
};

export default function PlanConfirm() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [planInfo, setPlanInfo] = useState(null);
  const params = new URLSearchParams(window.location.search);
  const planIds = (params.get("plans") || "").split(",").filter(Boolean);
  const stripeSuccess = params.get("stripe_success") === "true";

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(async (u) => {
          setUser(u);
          const info = await resolveUserPlan(u);
          setPlanInfo(info);
        });
      }
    });
  }, []);

  // Stripe決済成功時：案内のみ表示（PlanSubscription有効化はWebhook経由のみ）
  // ❌ Red Line: 成功URLへの遷移だけでactiveにしない
  useEffect(() => {
    if (stripeSuccess && user) {
      toast.success("お申し込みありがとうございます！Stripe処理完了後にプランが有効になります。");
      setTimeout(() => navigate("/creator-dashboard"), 2500);
    }
  }, [stripeSuccess, user]);

  const selectedPlans = planIds.map((id) => ({ id, ...PLAN_INFO[id] })).filter((p) => p.name);
  const totalPrice = selectedPlans.reduce((sum, p) => sum + p.price, 0);

  const isAdmin = planInfo?.isAdmin ?? false;
  const isCampaign = planInfo?.isCampaign ?? false;
  const hasFreeOnly = planIds.includes("free") && planIds.length === 1;
  const hasCrowdfunding = planIds.includes("crowdfunding");
  // キャンペーン対象者には、対象プランのStripe決済ボタンを出さない
  const paidPlans = selectedPlans.filter((p) => {
    if (p.price === 0 || p.id === "crowdfunding") return false;
    if ((isAdmin || isCampaign) && CAMPAIGN_COVERED_PLANS.includes(p.id)) return false;
    return true;
  });
  // キャンペーン対象プランのうち選択されているもの
  const campaignPlans = (isAdmin || isCampaign)
    ? selectedPlans.filter(p => CAMPAIGN_COVERED_PLANS.includes(p.id))
    : [];

  const handleFreeStart = async () => {
    try {
      await base44.auth.updateMe({ plan_subscribed: "free", free_plan_activated_at: new Date().toISOString() });
      navigate("/creator-dashboard");
    } catch (err) {
      toast.error("プラン有効化に失敗しました");
    }
  };

  const handleCrowdfunding = () => navigate("/crowdfunding/new");

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const handlePaidPlan = async (planId) => {
    // キャンペーン対象者は対象プランへのStripe決済を作成しない
    if ((isAdmin || isCampaign) && CAMPAIGN_COVERED_PLANS.includes(planId)) {
      toast.info("キャンペーン適用中のため、追加料金なしで利用できます");
      return;
    }

    setCheckoutLoading(true);
    try {
      const successUrl = `${window.location.origin}/plan-confirm?plans=${planId}&stripe_success=true`;
      const cancelUrl = `${window.location.origin}/plan-confirm?plans=${planId}`;

      // バックエンドでCheckout Session（subscription mode）を作成
      const res = await base44.functions.invoke("createPlanCheckoutSession", {
        planId,
        successUrl,
        cancelUrl,
      });

      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else if (res.data?.error === 'stripe_price_not_configured') {
        // Price ID未設定の場合はPayment Linkにフォールバック
        const stripeLink = getStripeLinkByPlan(planId === 'call-anser' ? 'call' : planId, 12);
        if (stripeLink) {
          const returnUrl = `${window.location.origin}/plan-confirm?plans=${planId}&stripe_success=true`;
          window.location.href = `${stripeLink}?client_reference_id=${user?.email || 'guest'}&success_url=${encodeURIComponent(returnUrl)}`;
        } else {
          toast.error("決済リンクが見つかりません");
        }
      } else {
        toast.error(res.data?.message || "決済セッションの作成に失敗しました");
      }
    } catch (err) {
      // バックエンド失敗時はPayment Linkにフォールバック
      const stripeLink = getStripeLinkByPlan(planId === 'call-anser' ? 'call' : planId, 12);
      if (stripeLink) {
        const returnUrl = `${window.location.origin}/plan-confirm?plans=${planId}&stripe_success=true`;
        window.location.href = `${stripeLink}?client_reference_id=${user?.email || 'guest'}&success_url=${encodeURIComponent(returnUrl)}`;
      } else {
        toast.error("決済セッションの作成に失敗しました");
      }
    } finally {
      setCheckoutLoading(false);
    }
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
            <p className="text-xs text-primary/80">全プランが開放されています。</p>
          </div>
        </div>
      )}

      {/* キャンペーン適用中通知 */}
      {isCampaign && campaignPlans.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/40 rounded-xl p-4 flex items-start gap-3">
          <Gift className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-bold text-blue-300">🎉 キャンペーン適用中</p>
            <p className="text-xs text-blue-300/80">
              期間中は追加料金なしで全プランをご利用いただけます。カード登録・お支払いは不要です。
            </p>
            {planInfo?.campaignExpiresAt && (
              <p className="text-xs text-blue-300 font-bold">
                無料期間終了日: {planInfo.campaignExpiresAt.toLocaleDateString('ja-JP')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 申し込みアクション */}
      <div className="space-y-3">
        {hasFreeOnly && (
          <Button onClick={handleFreeStart} className="w-full h-12 text-base font-bold">
            無料で始める
          </Button>
        )}

        {/* キャンペーン対象プランは「利用中」ボタンを表示（Stripe不可） */}
        {campaignPlans.map((plan) => (
          <div key={plan.id} className="w-full h-12 rounded-lg border-2 border-blue-500/40 bg-blue-500/10 flex items-center justify-center gap-2">
            <Check className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-bold text-blue-300">{plan.name} — キャンペーン適用中（追加料金なし）</span>
          </div>
        ))}

        {/* 通常有料プラン（キャンペーン非対象） */}
        {paidPlans.map((plan) => (
          <Button
            key={plan.id}
            onClick={() => handlePaidPlan(plan.id)}
            disabled={checkoutLoading}
            className="w-full h-12 text-base font-bold gap-2 bg-primary hover:bg-primary/90"
          >
            <ExternalLink className="w-4 h-4" />
            {checkoutLoading ? "処理中..." : `${plan.name}を申し込む（月額¥3,300）`}
          </Button>
        ))}

        {hasCrowdfunding && (
          <Button onClick={handleCrowdfunding} className="w-full h-12 text-base font-bold gap-2 bg-red-500 hover:bg-red-600 text-white">
            クラウドファンディングプランを申請する
          </Button>
        )}

        {/* キャンペーン対象者で全選択プランがキャンペーン対象の場合 → ダッシュボードへ */}
        {(isAdmin || isCampaign) && paidPlans.length === 0 && !hasFreeOnly && !hasCrowdfunding && campaignPlans.length > 0 && (
          <Button onClick={() => navigate("/creator-dashboard")} className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90">
            ダッシュボードへ →
          </Button>
        )}
      </div>

      <div className="bg-secondary/60 border border-border/50 rounded-xl px-4 py-3 text-xs text-muted-foreground space-y-1">
        <p>※ 各プランは個別の決済リンクでお申し込みいただきます。</p>
        <p>※ 収益の銀行振込手数料は実費でご負担いただきます。</p>
        <p>※ ご不明な点はお気軽にお問い合わせください。</p>
      </div>
    </div>
  );
}