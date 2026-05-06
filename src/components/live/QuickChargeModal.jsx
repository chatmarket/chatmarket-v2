import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Coins, Loader2, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";

const QUICK_PLANS = [
  { id: "plan_1000", label: "1,000コイン", coins: 1000, price: 1038, bonus: 0 },
  { id: "plan_5000", label: "5,000コイン", coins: 5400, price: 5187, bonus: 400, popular: true },
  { id: "plan_10000", label: "10,000コイン", coins: 10800, price: 10374, bonus: 800 },
];

export default function QuickChargeModal({ onClose, onSuccess, neededCoins = 15 }) {
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  const handlePurchase = async (plan) => {
    setLoading(true);
    setSelectedId(plan.id);
    try {
      const successUrl = window.location.href.split("?")[0];
      const res = await base44.functions.invoke("createCoinCheckoutSession", {
        planId: plan.id,
        successUrl: successUrl + "?charged=1",
        cancelUrl: successUrl,
      });
      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        toast.error("決済ページの生成に失敗しました");
        setLoading(false);
        setSelectedId(null);
      }
    } catch (e) {
      toast.error("エラー: " + e.message);
      setLoading(false);
      setSelectedId(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm mx-0 sm:mx-4"
        style={{
          background: "linear-gradient(160deg, #0d1117 0%, #0a1628 60%, #0d1a12 100%)",
          border: "1px solid rgba(16,185,129,0.3)",
          borderRadius: "24px 24px 0 0",
          boxShadow: "0 -8px 60px rgba(16,185,129,0.2), 0 0 100px rgba(0,0,0,0.8)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ハンドル */}
        <div className="flex justify-center pt-3 pb-1">
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)" }} />
        </div>

        <div className="px-5 pb-6 pt-2 space-y-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap style={{ width: 18, height: 18, color: "#fbbf24" }} />
              </div>
              <div>
                <p style={{ color: "white", fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>コインを今すぐチャージ</p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>あと {neededCoins} コイン必要です</p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.6)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <X style={{ width: 14, height: 14 }} />
            </button>
          </div>

          {/* プラン一覧 */}
          <div className="space-y-2">
            {QUICK_PLANS.map((plan) => {
              const isSelected = selectedId === plan.id && loading;
              return (
                <button
                  key={plan.id}
                  onClick={() => !loading && handlePurchase(plan)}
                  disabled={loading}
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    borderRadius: 16,
                    background: plan.popular
                      ? "linear-gradient(135deg, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.1) 100%)"
                      : "rgba(255,255,255,0.04)",
                    border: plan.popular
                      ? "1.5px solid rgba(16,185,129,0.5)"
                      : "1px solid rgba(255,255,255,0.1)",
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                    opacity: loading && !isSelected ? 0.5 : 1,
                    transition: "all 0.15s",
                    boxShadow: plan.popular ? "0 0 20px rgba(16,185,129,0.15)" : "none",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {plan.popular && (
                    <span style={{
                      position: "absolute", top: 0, right: 0,
                      background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "white", fontSize: 9, fontWeight: 900,
                      padding: "3px 10px",
                      borderRadius: "0 16px 0 8px",
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      <Sparkles style={{ width: 8, height: 8 }} /> おすすめ
                    </span>
                  )}
                  <div style={{ textAlign: "left" }}>
                    <p style={{ color: "white", fontWeight: 900, fontSize: 16, lineHeight: 1.2 }}>
                      🪙 {plan.coins.toLocaleString()}コイン
                    </p>
                    {plan.bonus > 0 && (
                      <p style={{ color: "#10b981", fontSize: 10, fontWeight: 700 }}>
                        +{plan.bonus}コイン ボーナス付き
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {isSelected ? (
                      <Loader2 style={{ width: 20, height: 20, color: "#10b981", animation: "spin 1s linear infinite" }} />
                    ) : (
                      <div style={{
                        background: plan.popular ? "linear-gradient(135deg, #10b981, #059669)" : "rgba(255,255,255,0.1)",
                        color: plan.popular ? "white" : "rgba(255,255,255,0.8)",
                        fontWeight: 900, fontSize: 13,
                        padding: "6px 14px", borderRadius: 10,
                        whiteSpace: "nowrap",
                      }}>
                        ¥{plan.price.toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, textAlign: "center" }}>
            購入後すぐにこの画面に戻ります。コインは即時付与されます。
          </p>
        </div>
      </div>
    </div>
  );
}