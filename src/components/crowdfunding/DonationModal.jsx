import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Heart, X, AlertTriangle, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const PRESET_AMOUNTS = [500, 1000, 3000, 5000, 10000, 30000];

export default function DonationModal({ project, user, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);

  const handleDonate = async () => {
    const amountNum = parseInt(amount);
    if (!amountNum || amountNum < 100) {
      toast.error("100円以上の金額を入力してください");
      return;
    }
    setProcessing(true);

    await base44.entities.CrowdfundingDonation.create({
      project_id: project.id,
      donor_email: user.email,
      donor_name: user.full_name,
      amount: amountNum,
      message: message.trim() || null,
      is_anonymous: isAnonymous,
      status: "completed",
    });

    // Update project totals
    await base44.entities.CrowdfundingProject.update(project.id, {
      total_raised: (project.total_raised || 0) + amountNum,
      supporter_count: (project.supporter_count || 0) + 1,
    });

    setProcessing(false);
    setDone(true);
    setTimeout(() => {
      onSuccess();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-bold text-lg flex items-center gap-2"><Heart className="w-5 h-5 text-red-400" />支援する</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>

        {done ? (
          <div className="p-8 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-primary mx-auto" />
            <p className="font-bold text-lg">ご支援ありがとうございます！</p>
            <p className="text-sm text-muted-foreground">¥{parseInt(amount).toLocaleString()}の支援が完了しました</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            {project.organization_type === "political_party" && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 flex gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                <p className="text-xs text-yellow-200">政治団体への個人献金には法律上の限度額があります。献金額は個人で管理・把握し、法令を遵守した上でご支援ください。</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>支援金額（円）</Label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {PRESET_AMOUNTS.map((a) => (
                  <button
                    key={a}
                    onClick={() => setAmount(String(a))}
                    className={`py-2 rounded-lg text-sm font-medium border transition-all ${amount === String(a) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary border-border hover:border-primary/50"}`}
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

            <div className="space-y-2">
              <Label>応援メッセージ（任意）</Label>
              <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="応援メッセージを入力..." className="bg-secondary border-0 resize-none" rows={3} />
            </div>

            <div className="flex items-center justify-between">
              <Label className="text-sm">匿名で支援する</Label>
              <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
            </div>

            <Button onClick={handleDonate} disabled={processing || !amount} className="w-full h-11 bg-red-500 hover:bg-red-600 text-white gap-2">
              {processing ? <><Loader2 className="w-4 h-4 animate-spin" />処理中...</> : <><Heart className="w-4 h-4" />¥{parseInt(amount || 0).toLocaleString()}を支援する</>}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}