import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, CheckCircle2, XCircle, Clock, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function WithdrawalManagement() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState(null);

  const { data: withdrawals = [] } = useQuery({
    queryKey: ["admin-withdrawals"],
    queryFn: () => base44.entities.Withdrawal.list("-created_date"),
  });

  const approve = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Withdrawal.update(id, {
        status: "approved",
        transfer_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("承認しました");
    },
  });

  const reject = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Withdrawal.update(id, {
        status: "rejected",
        admin_note: rejectReason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("却下しました");
      setRejectingId(null);
      setRejectReason("");
    },
  });

  const transfer = useMutation({
    mutationFn: async (id) => {
      await base44.entities.Withdrawal.update(id, {
        status: "transferred",
        transfer_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast.success("振込完了にしました");
    },
  });

  const pending = withdrawals.filter((w) => w.status === "pending");
  const approved = withdrawals.filter((w) => w.status === "approved");
  const transferred = withdrawals.filter((w) => w.status === "transferred");
  const rejected = withdrawals.filter((w) => w.status === "rejected");

  const StatusBadge = ({ status }) => {
    const config = {
      pending: { icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/20" },
      approved: { icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/20" },
      transferred: { icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-500/20" },
      rejected: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/20" },
    };
    const c = config[status] || config.pending;
    const Icon = c.icon;
    return (
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${c.bg} ${c.color}`}>
        <Icon className="w-3 h-3" />
        {status === "pending" ? "待機中" : status === "approved" ? "承認済み" : status === "transferred" ? "振込完了" : "却下"}
      </div>
    );
  };

  const WithdrawalRow = ({ w }) => (
    <div className="bg-card rounded-lg border border-border/50 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <p className="font-semibold text-sm">{w.applicant_name || w.applicant_email}</p>
          <p className="text-xs text-muted-foreground">{w.applicant_email}</p>
        </div>
        <StatusBadge status={w.status} />
      </div>

      <div className="bg-secondary/50 rounded-lg p-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">申請額</span>
          <span className="font-bold text-primary">¥{w.amount?.toLocaleString()}</span>
        </div>
        <div className="space-y-1 text-muted-foreground">
          <p>{w.bank_name} {w.bank_branch}</p>
          <p>{w.bank_account_type === "普通" ? "普通" : "当座"} {w.bank_account_number}</p>
          <p>{w.bank_account_name}</p>
        </div>
      </div>

      {w.notes && <p className="text-xs text-muted-foreground italic">備考: {w.notes}</p>}
      {w.admin_note && <p className="text-xs text-red-400">却下理由: {w.admin_note}</p>}

      {w.status === "pending" && (
        <div className="flex gap-2 pt-2">
          <Button
            size="sm"
            className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs"
            onClick={() => approve.mutate(w.id)}
            disabled={approve.isPending}
          >
            承認する
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs"
            onClick={() => setRejectingId(w.id)}
          >
            却下
          </Button>
        </div>
      )}

      {w.status === "approved" && (
        <Button
          size="sm"
          className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs"
          onClick={() => transfer.mutate(w.id)}
          disabled={transfer.isPending}
        >
          振込完了にする
        </Button>
      )}

      {rejectingId === w.id && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 space-y-2">
          <Textarea
            placeholder="却下理由を入力"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="bg-secondary border-0 text-xs"
            rows={2}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-xs"
              onClick={() => setRejectingId(null)}
            >
              キャンセル
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-xs"
              onClick={() => reject.mutate(w.id)}
              disabled={!rejectReason.trim() || reject.isPending}
            >
              確定
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* サマリー */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">待機中の申請</p>
          <p className="text-2xl font-black text-yellow-400 mt-1">{pending.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ¥{pending.reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">承認待ち</p>
          <p className="text-2xl font-black text-green-400 mt-1">{approved.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ¥{approved.reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">振込完了</p>
          <p className="text-2xl font-black text-blue-400 mt-1">{transferred.length}</p>
          <p className="text-xs text-muted-foreground mt-1">
            ¥{transferred.reduce((sum, w) => sum + (w.amount || 0), 0).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-lg border border-border/50 p-4">
          <p className="text-xs text-muted-foreground">却下</p>
          <p className="text-2xl font-black text-red-400 mt-1">{rejected.length}</p>
        </div>
      </div>

      {/* 待機中の申請 */}
      {pending.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-400" />
            待機中の申請（{pending.length}件）
          </h3>
          <div className="space-y-2">
            {pending.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </div>
        </div>
      )}

      {/* 承認済み */}
      {approved.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            承認済み（{approved.length}件）
          </h3>
          <div className="space-y-2">
            {approved.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </div>
        </div>
      )}

      {/* 振込完了 */}
      {transferred.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            振込完了（{transferred.length}件）
          </h3>
          <div className="space-y-2">
            {transferred.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </div>
        </div>
      )}

      {/* 却下 */}
      {rejected.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-400" />
            却下（{rejected.length}件）
          </h3>
          <div className="space-y-2">
            {rejected.map((w) => (
              <WithdrawalRow key={w.id} w={w} />
            ))}
          </div>
        </div>
      )}

      {withdrawals.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>申請がありません</p>
        </div>
      )}
    </div>
  );
}