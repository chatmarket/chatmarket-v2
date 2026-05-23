import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Heart, X, AlertTriangle, Loader2, TrendingUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 30000];

const TIERS = [
  { threshold: 20000000, rate: 0.95 },
  { threshold: 19500000, rate: 0.94 },
  { threshold: 18000000, rate: 0.93 },
  { threshold: 16500000, rate: 0.92 },
  { threshold: 15000000, rate: 0.91 },
  { threshold: 12000000, rate: 0.90 },
  { threshold:  9000000, rate: 0.89 },
  { threshold:  6000000, rate: 0.88 },
  { threshold:  3000000, rate: 0.87 },
  { threshold:  1000000, rate: 0.86 },
];
function getProgressiveRate(monthlyYen) {
  for (const tier of TIERS) {
    if (monthlyYen >= tier.threshold) return tier.rate;
  }
  return 0.85;
}

export default function DonationModal({ project, user, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [monthlyYen, setMonthlyYen] = useState(0);

  // 当月累計を取得してプログレッシブ還元率をプレビュー
  useEffect(() => {
    if (!project?.owner_email) return;
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    base44.entities.CrowdfundingDonation.filter({ owner_email: project.owner_email, status: "completed" })
      .then(donations => {
        const total = donations
          .filter(d => new Date(d.created_date) >= monthStart)
          .reduce((s, d) => s + (d.amount || 0), 0);
        setMonthlyYen(total);
      })
      .catch(() => {});
  }, [project?.owner_email]);

  const amountNum = parseInt(amount) || 0;
  const currentRate = getProgressiveRate(monthlyYen);
  const nextRate = getProgressiveRate(monthlyYen + amountNum);
  const stripeFee = Math.ceil(amountNum * 0.036);
  const platformFee = Math.floor(amountNum * (1 - nextRate));
  const payoutYen = amountNum - stripeFee - platformFee;

  const handleDonate = async () => {
    if (!amountNum || amountNum < 100) {
      toast.error("100円以上の金額を入力してください");
      return;
    }
    setProcessing(true);
    const res = await base44.functions.invoke("createCrowdfundingCheckout", {
      project_id: project.id,
      amount: amountNum,
      message: message.trim() || "",
      is_anonymous: isAnonymous,
    });
    setProcessing(false);
    if (res.data?.checkout_url) {
      window.location.href = res.data.checkout_url;
    } else {
      toast.error("決済の開始に失敗しました");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />支援する
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* 金額選択 */}
          <div className="space-y-2">
            <Label>支援金額（円）</Label>
            <div className="grid grid-cols-3 gap-2 mb-2">
              {PRESET_AMOUNTS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(String(a))}
                  className={`py-2 rounded-lg text-sm font-medium border transition-all ${
                    amount === String(a)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary border-border hover:border-primary/50"
                  }`}
                >
                  ¥{a.toLocaleString()}
                </button>
              ))}
            </div>
            <Input
              type="number"
              min={100}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="自由金額を入力（100円以上）"
              className="bg-secondary border-0"
            />
          </div>

          {/* プログレッシブ還元率プレビュー */}
          {amountNum >= 100 && (
            <div className="rounded-xl p-4 space-y-2.5"
              style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-xs font-black flex items-center gap-1.5 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                プログレッシブ還元プレビュー
              </p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>支援額</span>
                  <span className="text-foreground font-bold">¥{amountNum.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stripe手数料 (3.6%)</span>
                  <span>- ¥{stripeFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>プラットフォーム手数料</span>
                  <span>- ¥{platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-border/30 pt-1 mt-1">
                  <span className="font-bold text-emerald-400">団体への実受取額</span>
                  <span className="font-black text-emerald-400">¥{Math.max(0, payoutYen).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>適用還元率</span>
                  <span className="font-black text-emerald-400">{Math.round(nextRate * 100)}%</span>
                </div>
                {nextRate > currentRate && (
                  <p className="text-emerald-400/80 pt-1">
                    ✨ この支援により還元率が {Math.round(currentRate * 100)}% → {Math.round(nextRate * 100)}% にアップします！
                  </p>
                )}
              </div>
            </div>
          )}

          {/* メッセージ */}
          <div className="space-y-2">
            <Label>応援メッセージ（任意）</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="応援メッセージを入力..."
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="text-sm">匿名で支援する</Label>
            <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
          </div>

          <Button
            onClick={handleDonate}
            disabled={processing || !amountNum}
            className="w-full h-11 bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            {processing
              ? <><Loader2 className="w-4 h-4 animate-spin" />処理中...</>
              : <><ExternalLink className="w-4 h-4" />Stripeで ¥{amountNum.toLocaleString()} を支援する</>
            }
          </Button>
          <p className="text-xs text-muted-foreground text-center">Stripe 安全決済 · クレジットカード対応</p>
        </div>
      </div>
    </div>
  );
}