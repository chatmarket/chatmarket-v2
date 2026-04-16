import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CreditCard, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function TestPayment() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});

    // Stripe成功後のリダイレクト処理
    const params = new URLSearchParams(window.location.search);
    if (params.get("session_id")) {
      setSuccess(true);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handlePurchase = async () => {
    if (!user) {
      toast.error("ログインが必要です");
      return;
    }
    setLoading(true);
    try {
      const successUrl = window.location.href.split("?")[0];
      const stripeSecretKey = null; // バックエンド経由で実行

      const res = await base44.functions.invoke("createTestPaymentSession", {
        successUrl,
        cancelUrl: successUrl,
      });

      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("決済ページの生成に失敗しました: " + (res.data?.error || "不明なエラー"));
      }
    } catch (e) {
      toast.error("エラー: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-card border border-primary/40 rounded-2xl p-8 text-center space-y-4">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
          <h1 className="text-2xl font-black text-foreground">決済成功！</h1>
          <p className="text-muted-foreground text-sm">
            100円の本番決済が完了しました。<br />
            Stripeダッシュボードの「支払い（Payments）」で確認してください。
          </p>
          <div className="bg-secondary rounded-xl p-4 text-left space-y-2 text-xs text-muted-foreground">
            <p>✅ 支払い (Payments)：最上段に「¥100 Succeeded」が出ているか確認</p>
            <p>✅ 残高 (Balance)：手数料差引後の金額が反映されているか確認</p>
          </div>
          <a
            href="https://dashboard.stripe.com/payments"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-primary underline text-sm"
          >
            Stripeダッシュボードを開く →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 space-y-6">
        <div className="text-center space-y-2">
          <CreditCard className="w-12 h-12 text-primary mx-auto" />
          <h1 className="text-2xl font-black">本番テスト決済</h1>
          <p className="text-muted-foreground text-sm">Stripe本番環境の動作確認用</p>
        </div>

        {/* 商品情報 */}
        <div className="bg-secondary rounded-xl p-5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold">テスト商品（動作確認用）</span>
            <span className="text-xl font-black text-primary">¥100</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Stripe本番環境の決済機能確認のための最小金額テスト。
          </p>
        </div>

        {/* 注意書き */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex items-start gap-2 text-xs text-yellow-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">本番（Live）モードで実行されます</p>
            <p>実際のクレジットカードで100円が引き落とされます。テストカード（4242...）は使用しないでください。</p>
          </div>
        </div>

        <Button
          onClick={handlePurchase}
          disabled={loading || !user}
          className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 gap-2"
        >
          {loading ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> 処理中...</>
          ) : (
            <><CreditCard className="w-5 h-5" /> ¥100 で決済する</>
          )}
        </Button>

        {!user && (
          <p className="text-xs text-center text-muted-foreground">
            決済にはログインが必要です
          </p>
        )}

        <p className="text-[10px] text-center text-muted-foreground">
          このページはStripe本番決済の動作確認専用です。
        </p>
      </div>
    </div>
  );
}