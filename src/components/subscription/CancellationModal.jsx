import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  { value: "cost", label: "料金が高い" },
  { value: "unused", label: "使用していない" },
  { value: "poor_quality", label: "品質が期待と異なる" },
  { value: "better_alternative", label: "より良い代替案を見つけた" },
  { value: "technical_issues", label: "技術的な問題がある" },
  { value: "other", label: "その他" }
];

export default function CancellationModal({ subscription, onClose, onSuccess }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reasonLabel = REASONS.find((r) => r.value === selectedReason)?.label || "";

  const handleSubmit = async () => {
    if (!selectedReason) {
      toast.error("解約理由を選択してください");
      return;
    }

    setSubmitting(true);

    // 解約理由を記録
    await base44.entities.CancellationReason.create({
      user_email: subscription.user_email,
      plan_id: subscription.plan_id,
      plan_name: subscription.plan_name,
      reason: selectedReason,
      reason_ja: reasonLabel,
      comments: comments || null,
      cancelled_at: new Date().toISOString()
    });

    // サブスク記録を解約済みに更新
    await base44.entities.PlanSubscription.update(subscription.id, {
      status: "cancelled",
      end_date: new Date().toISOString()
    });

    setSubmitting(false);
    toast.success("プランを解約しました");
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border/50 max-w-lg w-full p-6 space-y-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h2 className="font-bold text-lg">プランの解約</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {subscription.plan_name} の解約前に、ご意見をお聞かせください。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold">解約理由を選択してください *</p>
          <div className="space-y-2">
            {REASONS.map((reason) => (
              <label key={reason.value} className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{ borderColor: selectedReason === reason.value ? "var(--primary)" : "inherit" }}>
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  checked={selectedReason === reason.value}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="w-4 h-4 accent-primary"
                />
                <span className="text-sm">{reason.label}</span>
              </label>
            ))}
          </div>
        </div>

        {selectedReason === "other" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold">詳しい理由をお聞かせください</label>
            <Textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="ご意見やご要望があればお聞かせください（任意）"
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="flex-1"
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !selectedReason}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            解約する
          </Button>
        </div>
      </div>
    </div>
  );
}