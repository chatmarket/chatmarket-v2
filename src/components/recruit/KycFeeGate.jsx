import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Shield, CreditCard, CheckCircle2, ArrowRight, Lock } from "lucide-react";
import { toast } from "sonner";

/**
 * 認証手数料決済ゲート
 * - kyc_paid=1 がURLにあれば決済完了済みとみなし、直接KYCステップへ進む
 * - それ以外はStripe Checkoutへリダイレクト
 */
export default function KycFeeGate({ onPaid }) {
  const [loading, setLoading] = useState(false);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  // URLパラメータで決済完了を検知
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("kyc_paid") === "1") {
      setAlreadyPaid(true);
      // URLを綺麗にする
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  // 決済完了済みならKYCへ自動遷移
  useEffect(() => {
    if (alreadyPaid) {
      onPaid();
    }
  }, [alreadyPaid, onPaid]);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const currentUrl = window.location.href.split("?")[0];
      const res = await base44.functions.invoke("createKycFeeCheckout", {
        successUrl: currentUrl,
        cancelUrl: currentUrl,
      });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("決済ページへの遷移に失敗しました。時間をおいて再度お試しください。");
        setLoading(false);
      }
    } catch (err) {
      toast.error("エラーが発生しました: " + err.message);
      setLoading(false);
    }
  };

  if (alreadyPaid) {
    return (
      <div className="text-center py-8">
        <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-3" />
        <p className="text-primary font-bold">決済完了。本人確認へ進みます...</p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* 説明カード */}
      <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="font-black text-amber-300">公式ライバー認証について</p>
            <p className="text-xs text-amber-400/70">認証完了で「公式ライバー」バッジを取得</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          <p>
            Chat Marketでは、安心・安全な取引環境を維持するため、全ての先生に
            <strong className="text-foreground">Stripeシステムを用いた本人確認</strong>をお願いしております。
          </p>
          <p>
            現在、月額利用料3,300円が「<strong className="text-primary">1年間無料</strong>」となるキャンペーン中につき、
            本来システム側で負担する
            <strong className="text-amber-400">「本人確認・公式認証手数料（500円）」</strong>
            のみ、登録時に実費として頂戴しております。
          </p>
          <p className="text-xs text-muted-foreground/70">
            一度の認証で「公式ライバー」のバッジが付与され、お客様からの信頼度が飛躍的に向上します。
            先行投資としてご理解いただけますと幸いです。
          </p>
        </div>
      </div>

      {/* 料金カード */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-black text-lg">公式認証手数料</p>
            <p className="text-xs text-muted-foreground">本人確認システム利用料（実費・税込）</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-amber-400">¥500</p>
            <p className="text-xs text-muted-foreground">1回のみ</p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {[
            "公式ライバーバッジ付与",
            "Stripe Identity 本人確認",
            "ファンからの信頼度向上",
            "全プラン1年間無料キャンペーン適用済み",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-secondary rounded-xl px-4 py-3 text-xs text-muted-foreground">
          <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
          Stripeの安全な決済ページへ移動します。カード情報はChat Marketに送信されません。
        </div>

        <Button
          onClick={handlePayment}
          disabled={loading}
          className="w-full h-14 font-black text-base bg-amber-500 hover:bg-amber-600 text-black gap-2 rounded-2xl"
          style={{ boxShadow: "0 0 20px rgba(245,158,11,0.4)" }}
        >
          <CreditCard className="w-5 h-5" />
          {loading ? "決済ページへ移動中..." : "500円を決済して本人確認へ進む"}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}