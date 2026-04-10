import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Ban, ShieldOff, ShieldCheck, AlertTriangle, MessageSquare, Clock, CheckCircle2, XCircle, Search, Flag, ChevronDown, ChevronUp } from "lucide-react";
import { format } from "date-fns";

const REASON_LABELS = {
  report: "通報あり",
  misconduct: "悪質な言動",
  ng_word_violation: "NGワード違反",
  other: "その他",
};

const STATUS_CONFIG = {
  suspended: { label: "閉鎖中", cls: "bg-red-500/20 text-red-300", icon: Ban },
  appeal_pending: { label: "異議申立中", cls: "bg-yellow-500/20 text-yellow-300", icon: Clock },
  appeal_approved: { label: "異議承認・復旧済", cls: "bg-green-500/20 text-green-300", icon: CheckCircle2 },
  appeal_rejected: { label: "異議却下", cls: "bg-orange-500/20 text-orange-300", icon: XCircle },
  lifted: { label: "解除済", cls: "bg-blue-500/20 text-blue-300", icon: ShieldCheck },
};

const REPORT_REASON_LABELS = {
  harassment: "ハラスメント・嫌がらせ",
  spam: "スパム・迷惑行為",
  inappropriate: "不適切なコンテンツ",
  misconduct: "悪質な言動",
  ng_word: "NGワード・規約違反",
  other: "その他",
};

export default function ChannelSuspensionManagement({ channels = [], adminEmail }) {
  const queryClient = useQueryClient();
  const [showReports, setShowReports] = useState(true);
  const [adminResponse, setAdminResponse] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [channelSearch, setChannelSearch] = useState("");
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(null);
  const [suspendForm, setSuspendForm] = useState({ channel_id: "", reason: "report", reason_detail: "" });

  const { data: reports = [] } = useQuery({
    queryKey: ["channel-reports"],
    queryFn: () => base44.entities.ChannelReport.list("-created_date", 100),
  });

  const pendingReports = reports.filter((r) => r.status === "pending");

  const markReportReviewed = useMutation({
    mutationFn: ({ reportId, action }) =>
      base44.entities.ChannelReport.update(reportId, {
        status: action === "dismiss" ? "dismissed" : "actioned",
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channel-reports"] }),
  });

  const { data: suspensions = [] } = useQuery({
    queryKey: ["channel-suspensions"],
    queryFn: () => base44.entities.ChannelSuspension.list("-created_date", 200),
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ channel_id, reason, reason_detail }) => {
      const ch = channels.find((c) => c.id === channel_id);
      if (!ch) throw new Error("チャンネルが見つかりません");
      // チャンネルを閉鎖フラグ
      await base44.entities.Channel.update(channel_id, { is_suspended: true });
      return base44.entities.ChannelSuspension.create({
        channel_id,
        channel_name: ch.name,
        owner_email: ch.owner_email,
        reason,
        reason_detail,
        status: "suspended",
        suspended_by: adminEmail,
        suspended_at: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-suspensions"] });
      setShowSuspendModal(false);
      setSuspendForm({ channel_id: "", reason: "report", reason_detail: "" });
      toast.success("チャンネルを一時閉鎖しました");
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, channelId, adminResp }) =>
      Promise.all([
        base44.entities.ChannelSuspension.update(id, {
          status,
          admin_response: adminResp || "",
          resolved_at: new Date().toISOString(),
        }),
        // 復旧の場合はチャンネルの閉鎖フラグを解除
        (status === "appeal_approved" || status === "lifted")
          ? base44.entities.Channel.update(channelId, { is_suspended: false })
          : Promise.resolve(),
      ]),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["channel-suspensions"] });
      setShowAppealModal(null);
      setAdminResponse("");
      const msg = status === "appeal_approved" ? "異議を承認しチャンネルを復旧しました"
        : status === "appeal_rejected" ? "異議を却下しました"
        : status === "lifted" ? "閉鎖を解除しました" : "更新しました";
      toast.success(msg);
    },
  });

  const filteredSuspensions = suspensions.filter((s) => {
    if (filterStatus !== "all" && s.status !== filterStatus) return false;
    return true;
  });

  const counts = {
    all: suspensions.length,
    suspended: suspensions.filter((s) => s.status === "suspended").length,
    appeal_pending: suspensions.filter((s) => s.status === "appeal_pending").length,
    appeal_approved: suspensions.filter((s) => s.status === "appeal_approved").length,
    appeal_rejected: suspensions.filter((s) => s.status === "appeal_rejected").length,
    lifted: suspensions.filter((s) => s.status === "lifted").length,
  };

  const filteredChannels = channels.filter((c) =>
    c.name?.toLowerCase().includes(channelSearch.toLowerCase()) ||
    c.owner_email?.toLowerCase().includes(channelSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 通報一覧セクション */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-red-500/10 transition-colors"
          onClick={() => setShowReports((v) => !v)}
        >
          <div className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-red-400" />
            <span className="font-bold text-sm">ユーザーからの通報</span>
            {pendingReports.length > 0 && (
              <span className="bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                {pendingReports.length}件 未対応
              </span>
            )}
          </div>
          {showReports ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>

        {showReports && (
          <div className="divide-y divide-border/30">
            {pendingReports.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">未対応の通報はありません</p>
            ) : (
              pendingReports.map((report) => (
                <div key={report.id} className="px-4 py-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm">{report.channel_name}</p>
                      <p className="text-xs text-muted-foreground">{report.owner_email}</p>
                      <span className="inline-block text-xs bg-red-500/15 text-red-300 px-2 py-0.5 rounded-full">
                        {REPORT_REASON_LABELS[report.reason] || report.reason}
                      </span>
                      {report.detail && (
                        <p className="text-xs text-muted-foreground mt-1">{report.detail}</p>
                      )}
                      <p className="text-xs text-muted-foreground">通報者: {report.reporter_email}</p>
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 gap-1 text-xs h-7 px-2"
                        onClick={() => {
                          setSuspendForm({
                            channel_id: report.channel_id,
                            reason: report.reason === "ng_word" ? "ng_word_violation" : report.reason === "misconduct" ? "misconduct" : "report",
                            reason_detail: report.detail || "",
                          });
                          setChannelSearch(report.channel_name);
                          markReportReviewed.mutate({ reportId: report.id, action: "action" });
                          setShowSuspendModal(true);
                        }}
                      >
                        <Ban className="w-3 h-3" /> 閉鎖へ
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground"
                        onClick={() => markReportReviewed.mutate({ reportId: report.id, action: "dismiss" })}
                      >
                        却下
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Ban className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-lg">チャンネル一時閉鎖管理</h3>
          {counts.appeal_pending > 0 && (
            <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">
              異議申立 {counts.appeal_pending}件
            </Badge>
          )}
        </div>
        <Button
          onClick={() => setShowSuspendModal(true)}
          className="gap-2 bg-red-600 hover:bg-red-700"
          size="sm"
        >
          <Ban className="w-4 h-4" /> チャンネルを閉鎖する
        </Button>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "すべて" },
          { key: "suspended", label: "閉鎖中" },
          { key: "appeal_pending", label: "異議申立中" },
          { key: "appeal_approved", label: "承認済" },
          { key: "appeal_rejected", label: "却下済" },
          { key: "lifted", label: "解除済" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === key
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {label} ({counts[key] ?? 0})
          </button>
        ))}
      </div>

      {/* 閉鎖一覧 */}
      {filteredSuspensions.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ShieldCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">該当する閉鎖記録はありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSuspensions.map((s) => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.suspended;
            const Icon = cfg.icon;
            return (
              <div key={s.id} className="bg-card border border-border/50 rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${cfg.cls}`}>
                        <Icon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="text-xs bg-secondary px-2 py-0.5 rounded-full text-muted-foreground">
                        {REASON_LABELS[s.reason]}
                      </span>
                    </div>
                    <p className="font-bold">{s.channel_name}</p>
                    <p className="text-xs text-muted-foreground">{s.owner_email}</p>
                    {s.reason_detail && (
                      <p className="text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-1.5 mt-1">
                        {s.reason_detail}
                      </p>
                    )}
                  </div>
                  <div className="text-right space-y-1 shrink-0">
                    <p className="text-xs text-muted-foreground">
                      閉鎖: {s.suspended_at ? format(new Date(s.suspended_at), "MM/dd HH:mm") : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">by {s.suspended_by}</p>
                  </div>
                </div>

                {/* 異議申立内容 */}
                {s.appeal_text && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-bold text-yellow-300 flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> 異議申し立て内容
                    </p>
                    <p className="text-xs text-foreground/80">{s.appeal_text}</p>
                    {s.appeal_submitted_at && (
                      <p className="text-xs text-muted-foreground">
                        申立日時: {format(new Date(s.appeal_submitted_at), "MM/dd HH:mm")}
                      </p>
                    )}
                  </div>
                )}

                {/* 管理者コメント */}
                {s.admin_response && (
                  <div className="bg-secondary rounded-lg p-3">
                    <p className="text-xs font-bold text-muted-foreground mb-1">管理者コメント</p>
                    <p className="text-xs">{s.admin_response}</p>
                  </div>
                )}

                {/* アクションボタン */}
                <div className="flex gap-2 flex-wrap pt-1 border-t border-border/30">
                  {s.status === "appeal_pending" && (
                    <>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 gap-1.5 text-xs"
                        onClick={() => { setShowAppealModal(s); setAdminResponse(""); }}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> 異議を審査する
                      </Button>
                    </>
                  )}
                  {s.status === "suspended" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                        onClick={() => updateStatusMutation.mutate({ id: s.id, status: "lifted", channelId: s.channel_id })}
                        disabled={updateStatusMutation.isPending}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> 閉鎖を解除
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 閉鎖実行モーダル */}
      <Dialog open={showSuspendModal} onOpenChange={setShowSuspendModal}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban className="w-5 h-5" /> チャンネルを一時閉鎖する
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* チャンネル検索・選択 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">対象チャンネル</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={channelSearch}
                  onChange={(e) => setChannelSearch(e.target.value)}
                  placeholder="チャンネル名・メールで検索"
                  className="bg-secondary border-0 pl-9 text-sm"
                />
              </div>
              {channelSearch && (
                <div className="bg-secondary rounded-xl max-h-40 overflow-y-auto divide-y divide-border/30">
                  {filteredChannels.slice(0, 8).map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => {
                        setSuspendForm((f) => ({ ...f, channel_id: ch.id }));
                        setChannelSearch(ch.name);
                      }}
                      className={`w-full text-left px-3 py-2.5 hover:bg-primary/10 transition-colors text-sm ${
                        suspendForm.channel_id === ch.id ? "bg-primary/10 text-primary" : ""
                      }`}
                    >
                      <p className="font-semibold">{ch.name}</p>
                      <p className="text-xs text-muted-foreground">{ch.owner_email}</p>
                    </button>
                  ))}
                  {filteredChannels.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-3">見つかりません</p>
                  )}
                </div>
              )}
            </div>

            {/* 理由 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">閉鎖理由</label>
              <Select
                value={suspendForm.reason}
                onValueChange={(v) => setSuspendForm((f) => ({ ...f, reason: v }))}
              >
                <SelectTrigger className="bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="report">通報あり</SelectItem>
                  <SelectItem value="misconduct">悪質な言動</SelectItem>
                  <SelectItem value="ng_word_violation">NGワード違反</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 詳細 */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">詳細（任意）</label>
              <Textarea
                value={suspendForm.reason_detail}
                onChange={(e) => setSuspendForm((f) => ({ ...f, reason_detail: e.target.value }))}
                placeholder="具体的な違反内容や状況を記入してください"
                className="bg-secondary border-0 resize-none"
                rows={3}
              />
            </div>

            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-300">
              <AlertTriangle className="w-3.5 h-3.5 inline mr-1" />
              閉鎖するとチャンネルオーナーはコンテンツの公開ができなくなります。
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSuspendModal(false)}>キャンセル</Button>
            <Button
              className="bg-red-600 hover:bg-red-700 gap-2"
              onClick={() => suspendMutation.mutate(suspendForm)}
              disabled={!suspendForm.channel_id || suspendMutation.isPending}
            >
              <Ban className="w-4 h-4" />
              {suspendMutation.isPending ? "処理中..." : "閉鎖を実行する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 異議審査モーダル */}
      <Dialog open={!!showAppealModal} onOpenChange={() => setShowAppealModal(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-400" /> 異議申し立てを審査する
            </DialogTitle>
          </DialogHeader>
          {showAppealModal && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-xl p-3 space-y-1">
                <p className="font-bold">{showAppealModal.channel_name}</p>
                <p className="text-xs text-muted-foreground">{showAppealModal.owner_email}</p>
                <p className="text-xs">閉鎖理由: {REASON_LABELS[showAppealModal.reason]}</p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs font-bold text-yellow-300 mb-1">申し立て内容</p>
                <p className="text-sm">{showAppealModal.appeal_text}</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">管理者コメント（任意）</label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="判断理由や対応内容を記入"
                  className="bg-secondary border-0 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button
              variant="destructive"
              className="flex-1 gap-1.5"
              onClick={() => updateStatusMutation.mutate({
                id: showAppealModal.id,
                status: "appeal_rejected",
                channelId: showAppealModal.channel_id,
                adminResp: adminResponse,
              })}
              disabled={updateStatusMutation.isPending}
            >
              <XCircle className="w-4 h-4" /> 却下（閉鎖継続）
            </Button>
            <Button
              className="flex-1 gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={() => updateStatusMutation.mutate({
                id: showAppealModal.id,
                status: "appeal_approved",
                channelId: showAppealModal.channel_id,
                adminResp: adminResponse,
              })}
              disabled={updateStatusMutation.isPending}
            >
              <CheckCircle2 className="w-4 h-4" /> 承認（チャンネル復旧）
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}