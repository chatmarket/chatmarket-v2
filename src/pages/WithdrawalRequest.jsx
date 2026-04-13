import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle2, DollarSign, Building2 } from "lucide-react";
import { toast } from "sonner";

export default function WithdrawalRequest() {
  const [user, setUser] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    notes: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
        }).catch(() => {});
      }
    });
  }, []);

  // 銀行情報取得
  const { data: channel } = useQuery({
    queryKey: ["my-channel-for-withdrawal", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  // 現在のクリエイター収益取得
  const { data: allPurchases = [] } = useQuery({
    queryKey: ["my-purchases-withdrawal", user?.email],
    queryFn: () => base44.entities.Purchase.filter({ item_type: "video", created_by: user.email }),
    enabled: !!user,
  });

  const { data: allCallsCallee = [] } = useQuery({
    queryKey: ["my-calls-callee-withdrawal", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ status: "ended", callee_email: user.email }),
    enabled: !!user,
  });

  // 払い出し履歴
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["my-withdrawals", user?.email],
    queryFn: () => base44.entities.Withdrawal.filter({ applicant_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  // 収益計算
  const videoRevenue = allPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);
  const callRevenue = allCallsCallee.reduce((sum, c) => sum + (c.price || 0), 0);
  const totalRevenue = videoRevenue + callRevenue;

  // クリエイター配分（動画85%、通話70%）
  const videoEarning = Math.floor(videoRevenue * 0.85);
  const callEarning = Math.floor(callRevenue * 0.70);
  const totalEarning = videoEarning + callEarning;

  // 既に申請・承認・振込中の金額
  const requestedAmount = withdrawals
    .filter((w) => ["pending", "approved", "transferred"].includes(w.status))
    .reduce((sum, w) => sum + (w.amount || 0), 0);

  const availableAmount = totalEarning - requestedAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseInt(form.amount);
    try {

    if (!amount || amount <= 0) {
      toast.error("有効な申請額を入力してください");
      return;
    }

    if (amount > availableAmount) {
      toast.error("申請額が申請可能額を超えています");
      return;
    }

    if (!channel) {
      toast.error("チャンネル情報が見つかりません");
      return;
    }

    if (!channel.bank_account_name || !channel.bank_name || !channel.bank_account_number) {
      toast.error("先に銀行口座情報を登録してください");
      return;
    }

    setSubmitting(true);

    await base44.entities.Withdrawal.create({
      applicant_email: user.email,
      applicant_name: user.full_name || user.email,
      amount,
      bank_account_name: channel.bank_account_name,
      bank_name: channel.bank_name,
      bank_branch: channel.bank_branch || "",
      bank_account_number: channel.bank_account_number,
      bank_account_type: channel.bank_account_type || "普通",
      notes: form.notes || "",
      status: "pending",
    });

    toast.success("払い出し申請をしました。確認をお待ちください。");
    setForm({ amount: "", notes: "" });
    queryClient.invalidateQueries({ queryKey: ["my-withdrawals"] });
    } catch (err) {
      toast.error("申請に失敗しました: " + (err.message || "不明なエラー"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-6 sm:space-y-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <DollarSign className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-xl sm:text-3xl font-bold">売上金の払い出し申請</h1>
      </div>

      {/* 収益サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-card rounded-lg sm:rounded-xl border border-border/50 p-4 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">累計収益（動画販売）</p>
          <p className="text-xl sm:text-2xl font-black text-blue-400">¥{videoRevenue.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">収益 {videoRevenue > 0 ? `→ 85%` : ""} ¥{videoEarning.toLocaleString()}</p>
        </div>

        <div className="bg-card rounded-lg sm:rounded-xl border border-border/50 p-4 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">累計収益（ビデオ通話）</p>
          <p className="text-xl sm:text-2xl font-black text-cyan-400">¥{callRevenue.toLocaleString()}</p>
          <p className="text-xs sm:text-sm text-muted-foreground">収益 {callRevenue > 0 ? `→ 70%` : ""} ¥{callEarning.toLocaleString()}</p>
        </div>

        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg sm:rounded-xl border border-primary/40 p-4 space-y-2">
          <p className="text-xs sm:text-sm text-muted-foreground">総受取可能額</p>
          <p className="text-2xl sm:text-3xl font-black text-primary">¥{totalEarning.toLocaleString()}</p>
        </div>

        <div className={`rounded-lg sm:rounded-xl border p-4 space-y-2 ${availableAmount > 0 ? "bg-green-500/10 border-green-500/40" : "bg-secondary border-border/50"}`}>
          <p className="text-xs sm:text-sm text-muted-foreground">申請可能額</p>
          <p className={`text-2xl sm:text-3xl font-black ${availableAmount > 0 ? "text-green-400" : "text-muted-foreground"}`}>
            ¥{availableAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* 銀行口座未設定 */}
      {!channel?.bank_account_name && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-start gap-2 sm:gap-3">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm">
            <p className="font-bold text-yellow-400">銀行口座情報が未設定です</p>
            <p className="text-yellow-300/80 mt-0.5">設定ページで銀行口座情報を登録してから申請してください。</p>
          </div>
        </div>
      )}

      {/* 申請フォーム */}
      {availableAmount > 0 && channel?.bank_account_name ? (
        <form onSubmit={handleSubmit} className="bg-card rounded-lg sm:rounded-xl border border-border/50 p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold">申請額（円）</label>
            <Input
              type="number"
              min={1}
              max={availableAmount}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder={`1〜${availableAmount.toLocaleString()}`}
              className="bg-secondary border-0 text-sm"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>最大: ¥{availableAmount.toLocaleString()}</span>
              <button
                type="button"
                onClick={() => setForm({ ...form, amount: availableAmount.toString() })}
                className="text-primary hover:text-primary/80"
              >
                全額申請
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold">備考（任意）</label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="申請理由など（任意）"
              className="bg-secondary border-0 resize-none text-sm"
              rows={2}
            />
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-blue-400 flex items-center gap-1">
              <Building2 className="w-3 h-3" /> 振込先
            </p>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>銀行: {channel.bank_name}</p>
              <p>支店: {channel.bank_branch || "（未設定）"}</p>
              <p>口座: {channel.bank_account_type === "普通" ? "普通" : "当座"} {channel.bank_account_number}</p>
              <p>名義: {channel.bank_account_name}</p>
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 space-y-2">
            <p className="text-xs text-amber-300">
              ※ 振込手数料は実費として申請額から差し引かれる場合があります。<br />
              ※ 申請は管理者による確認後、承認・却下いたします。
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting || !form.amount}
            className="w-full h-10 sm:h-12 bg-primary hover:bg-primary/90 gap-2 text-sm sm:text-base"
          >
            {submitting ? "申請中..." : "払い出し申請をする"}
          </Button>
        </form>
      ) : availableAmount > 0 ? null : (
        <div className="text-center py-8 sm:py-12 text-muted-foreground">
          <AlertCircle className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm sm:text-base">申請可能額がありません</p>
        </div>
      )}

      {/* 申請履歴 */}
      {withdrawals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">申請履歴</h2>
          <div className="space-y-2 sm:space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="bg-card rounded-lg border border-border/50 p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">¥{w.amount?.toLocaleString()}</p>
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${
                    w.status === "pending" ? "bg-yellow-500/20 text-yellow-400" :
                    w.status === "approved" ? "bg-green-500/20 text-green-400" :
                    w.status === "transferred" ? "bg-blue-500/20 text-blue-400" :
                    "bg-red-500/20 text-red-400"
                  }`}>
                    {w.status === "pending" ? "待機中" : w.status === "approved" ? "承認済み" : w.status === "transferred" ? "振込完了" : "却下"}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(w.created_date).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
                {w.notes && <p className="text-xs text-muted-foreground italic">備考: {w.notes}</p>}
                {w.admin_note && <p className="text-xs text-red-400">却下理由: {w.admin_note}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}