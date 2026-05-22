import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Heart, TrendingUp, Users, Banknote, AlertTriangle, CheckCircle2,
  Clock, XCircle, Plus, ExternalLink, FileText, ArrowDownToLine, Loader2
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending:   { label: "審査待ち",   color: "bg-yellow-500/20 text-yellow-300 border-0", icon: Clock },
  reviewing: { label: "審査中",     color: "bg-blue-500/20 text-blue-300 border-0",   icon: Clock },
  approved:  { label: "承認済み",   color: "bg-green-500/20 text-green-300 border-0", icon: CheckCircle2 },
  rejected:  { label: "却下",       color: "bg-red-500/20 text-red-300 border-0",     icon: XCircle },
  active:    { label: "掲載中",     color: "bg-primary/20 text-primary border-0",     icon: CheckCircle2 },
};

function WithdrawalModal({ project, availableYen, onClose, onSuccess }) {
  const [form, setForm] = useState({
    amount: String(availableYen),
    bank_account_name: "",
    bank_name: "",
    bank_branch: "",
    bank_account_number: "",
    bank_account_type: "普通",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const amt = parseInt(form.amount);
    if (!amt || amt < 1000) { toast.error("1,000円以上の金額を入力してください"); return; }
    if (amt > availableYen) { toast.error(`出金可能額（¥${availableYen.toLocaleString()}）を超えています`); return; }
    if (!form.bank_account_name || !form.bank_name || !form.bank_account_number) {
      toast.error("口座情報を入力してください"); return;
    }
    setSubmitting(true);
    await base44.entities.Withdrawal.create({
      applicant_email: project.owner_email,
      applicant_name: project.organization_name,
      amount: amt,
      bank_account_name: form.bank_account_name,
      bank_name: form.bank_name,
      bank_branch: form.bank_branch,
      bank_account_number: form.bank_account_number,
      bank_account_type: form.bank_account_type,
      notes: `[CF: ${project.title}] ${form.notes}`.trim(),
      status: "pending",
    });
    setSubmitting(false);
    toast.success("出金申請を送信しました");
    onSuccess();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-primary" />出金申請
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl p-3 text-sm"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <span className="text-muted-foreground">出金可能額：</span>
            <span className="font-black text-primary ml-2">¥{availableYen.toLocaleString()}</span>
          </div>

          <div className="space-y-2">
            <Label>出金金額（円）</Label>
            <Input type="number" min={1000} max={availableYen} value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="bg-secondary border-0" />
          </div>
          <div className="space-y-2">
            <Label>口座名義 <span className="text-red-400">*</span></Label>
            <Input value={form.bank_account_name} onChange={e => setForm(f => ({ ...f, bank_account_name: e.target.value }))}
              className="bg-secondary border-0" placeholder="ヤマダ タロウ" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>銀行名 <span className="text-red-400">*</span></Label>
              <Input value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                className="bg-secondary border-0" placeholder="〇〇銀行" />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input value={form.bank_branch} onChange={e => setForm(f => ({ ...f, bank_branch: e.target.value }))}
                className="bg-secondary border-0" placeholder="〇〇支店" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>口座番号 <span className="text-red-400">*</span></Label>
              <Input value={form.bank_account_number} onChange={e => setForm(f => ({ ...f, bank_account_number: e.target.value }))}
                className="bg-secondary border-0" placeholder="1234567" />
            </div>
            <div className="space-y-2">
              <Label>口座種別</Label>
              <Select value={form.bank_account_type} onValueChange={v => setForm(f => ({ ...f, bank_account_type: v }))}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通">普通</SelectItem>
                  <SelectItem value="当座">当座</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>備考</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="bg-secondary border-0" placeholder="任意" />
          </div>

          <Button onClick={handleSubmit} disabled={submitting} className="w-full h-11 gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />送信中...</> : <><ArrowDownToLine className="w-4 h-4" />出金申請を送信</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CrowdfundingManage() {
  const [user, setUser] = useState(null);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showWithdrawal, setShowWithdrawal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["my-cf-projects", user?.email],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ owner_email: user.email }, "-created_date"),
    enabled: !!user?.email,
  });

  // 選択プロジェクトの寄付一覧
  const { data: donations = [] } = useQuery({
    queryKey: ["cf-donations-manage", selectedProject?.id],
    queryFn: () => base44.entities.CrowdfundingDonation.filter(
      { project_id: selectedProject.id, status: "completed" }, "-created_date", 50
    ),
    enabled: !!selectedProject?.id,
  });

  // 出金申請履歴
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["cf-withdrawals", user?.email],
    queryFn: () => base44.entities.Withdrawal.filter({ applicant_email: user.email }, "-created_date"),
    enabled: !!user?.email,
  });

  if (!user || isLoading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  // 選択中プロジェクトに紐づく出金済み合計
  const totalWithdrawn = withdrawals
    .filter(w => selectedProject && w.notes?.includes(`[CF: ${selectedProject.title}]`) && ["approved", "transferred"].includes(w.status))
    .reduce((s, w) => s + (w.amount || 0), 0);

  const pendingWithdrawal = withdrawals
    .filter(w => selectedProject && w.notes?.includes(`[CF: ${selectedProject.title}]`) && w.status === "pending")
    .reduce((s, w) => s + (w.amount || 0), 0);

  const totalPayoutYen = donations.reduce((s, d) => s + (d.payout_yen || 0), 0);
  const availableYen = Math.max(0, totalPayoutYen - totalWithdrawn - pendingWithdrawal);

  const currentProject = selectedProject
    ? projects.find(p => p.id === selectedProject.id)
    : projects[0];

  const proj = currentProject || projects[0];

  // 出金ボタンは審査通過(approved/active)のプロジェクトのみ
  const canWithdraw = proj && ["approved", "active"].includes(proj.status) && availableYen >= 1000;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Heart className="w-6 h-6 text-red-400" />
          <h1 className="text-2xl font-bold">クラウドファンディング管理</h1>
        </div>
        <Link to="/crowdfunding/new">
          <Button className="gap-2"><Plus className="w-4 h-4" />新規申請</Button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <Heart className="w-12 h-12 text-muted-foreground mx-auto" />
          <p className="text-muted-foreground">まだプロジェクトがありません</p>
          <Link to="/crowdfunding/new">
            <Button className="gap-2"><Plus className="w-4 h-4" />プロジェクトを申請する</Button>
          </Link>
        </div>
      ) : (
        <>
          {/* プロジェクト選択タブ */}
          {projects.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {projects.map(p => (
                <button key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${
                    (selectedProject?.id || projects[0]?.id) === p.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                  }`}>
                  {p.title}
                </button>
              ))}
            </div>
          )}

          {proj && (
            <div className="space-y-6">
              {/* プロジェクトサマリー */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1">
                    <Badge className={STATUS_CONFIG[proj.status]?.color || "bg-secondary"}>
                      {STATUS_CONFIG[proj.status]?.label || proj.status}
                    </Badge>
                    <h2 className="text-lg font-bold">{proj.title}</h2>
                    <p className="text-sm text-muted-foreground">{proj.organization_name}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Link to={`/crowdfunding/${proj.id}`} target="_blank">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <ExternalLink className="w-3 h-3" />公開ページ
                      </Button>
                    </Link>
                    <Link to="/crowdfunding/new">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <FileText className="w-3 h-3" />新規申請
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* 審査ステータス案内 */}
                {proj.status === "pending" && (
                  <div className="rounded-xl p-4 flex gap-3 text-sm"
                    style={{ background: "rgba(234,179,8,0.08)", border: "1px solid rgba(234,179,8,0.25)" }}>
                    <Clock className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-yellow-200">審査待ちです。担当者より電話にてご確認後、審査を進めます（通常3〜5営業日）。</p>
                  </div>
                )}
                {proj.status === "reviewing" && (
                  <div className="rounded-xl p-4 flex gap-3 text-sm"
                    style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.25)" }}>
                    <Clock className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-blue-200">審査中です。もうしばらくお待ちください。</p>
                  </div>
                )}
                {proj.status === "rejected" && (
                  <div className="rounded-xl p-4 flex gap-3 text-sm"
                    style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
                    <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-red-300 space-y-1">
                      <p>審査が却下されました。</p>
                      {proj.admin_note && <p className="text-red-300/80">理由：{proj.admin_note}</p>}
                    </div>
                  </div>
                )}

                {/* KPI */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "累計支援金額", value: `¥${(proj.total_raised || 0).toLocaleString()}`, icon: TrendingUp, color: "text-primary" },
                    { label: "支援者数", value: proj.supporter_count || 0, icon: Users, color: "text-foreground" },
                    { label: "実受取累計", value: `¥${totalPayoutYen.toLocaleString()}`, icon: Banknote, color: "text-emerald-400" },
                    { label: "出金可能額", value: `¥${availableYen.toLocaleString()}`, icon: ArrowDownToLine, color: canWithdraw ? "text-primary" : "text-muted-foreground" },
                  ].map(item => (
                    <div key={item.label} className="bg-secondary/50 rounded-xl p-4 space-y-1">
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <item.icon className="w-3 h-3" />{item.label}
                      </p>
                      <p className={`text-xl font-black ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* 出金申請ボタン */}
                <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    {pendingWithdrawal > 0 && <p>申請中：¥{pendingWithdrawal.toLocaleString()}</p>}
                    {totalWithdrawn > 0 && <p>出金済み：¥{totalWithdrawn.toLocaleString()}</p>}
                  </div>
                  <Button
                    onClick={() => setShowWithdrawal(true)}
                    disabled={!canWithdraw}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-40"
                  >
                    <ArrowDownToLine className="w-4 h-4" />
                    {!["approved", "active"].includes(proj.status)
                      ? "審査通過後に出金可能"
                      : availableYen < 1000
                        ? "出金可能額が不足"
                        : "出金申請する"}
                  </Button>
                </div>

                {!["approved", "active"].includes(proj.status) && (
                  <div className="rounded-xl p-3 flex gap-2 text-xs"
                    style={{ background: "rgba(234,179,8,0.07)", border: "1px solid rgba(234,179,8,0.2)" }}>
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                    <p className="text-yellow-200/80">出金申請はチャットマーケットの審査に通過したプロジェクトのみ可能です。</p>
                  </div>
                )}
              </div>

              {/* 支援履歴 */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Heart className="w-4 h-4 text-red-400" />最近の支援履歴
                </h3>
                {donations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">まだ支援はありません</p>
                ) : (
                  <div className="space-y-2">
                    {donations.map(d => (
                      <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                        <div>
                          <p className="font-medium">{d.is_anonymous ? "匿名" : d.donor_name}</p>
                          <p className="text-xs text-muted-foreground">{new Date(d.created_date).toLocaleDateString("ja-JP")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-primary">¥{d.amount.toLocaleString()}</p>
                          <p className="text-xs text-emerald-400">受取 ¥{(d.payout_yen || 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 出金申請履歴 */}
              <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-4">
                <h3 className="font-bold flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-primary" />出金申請履歴
                </h3>
                {withdrawals.filter(w => w.notes?.includes(`[CF: ${proj.title}]`)).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">出金申請はまだありません</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.filter(w => w.notes?.includes(`[CF: ${proj.title}]`)).map(w => (
                      <div key={w.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                        <div>
                          <p className="font-medium">¥{w.amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{new Date(w.created_date).toLocaleDateString("ja-JP")} · {w.bank_name} {w.bank_account_number}</p>
                        </div>
                        <Badge className={{
                          pending: "bg-yellow-500/20 text-yellow-300 border-0",
                          approved: "bg-green-500/20 text-green-300 border-0",
                          rejected: "bg-red-500/20 text-red-300 border-0",
                          transferred: "bg-primary/20 text-primary border-0",
                        }[w.status] || "bg-secondary"}>
                          {{ pending: "審査中", approved: "承認済み", rejected: "却下", transferred: "振込完了" }[w.status] || w.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {showWithdrawal && proj && (
        <WithdrawalModal
          project={proj}
          availableYen={availableYen}
          onClose={() => setShowWithdrawal(false)}
          onSuccess={() => {
            setShowWithdrawal(false);
            queryClient.invalidateQueries({ queryKey: ["cf-withdrawals", user.email] });
          }}
        />
      )}
    </div>
  );
}