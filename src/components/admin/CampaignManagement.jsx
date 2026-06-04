/**
 * CampaignManagement — 管理者向けキャンペーン管理UI
 * 300名上限・承認済み人数・対象者一覧を管理者のみに表示
 */
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Gift, Clock, RefreshCw, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const GRANT_SOURCE_LABELS = {
  campaign_link: { label: "公開キャンペーン", color: "bg-primary/10 text-primary border-primary/30" },
  admin_designated: { label: "管理者指定(12M)", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  special_scout: { label: "特別スカウト(24M)", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30" },
};

const STATUS_LABELS = {
  draft: { label: "下書き", color: "bg-secondary text-muted-foreground" },
  active: { label: "受付中", color: "bg-primary/10 text-primary" },
  closed: { label: "終了", color: "bg-destructive/10 text-destructive" },
};

export default function CampaignManagement() {
  const queryClient = useQueryClient();
  const [grantEmail, setGrantEmail] = useState("");
  const [grantMode, setGrantMode] = useState("admin_designated");

  const { data: campaigns = [], isLoading: loadingCampaigns } = useQuery({
    queryKey: ["admin-campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date"),
  });

  const { data: allGrantees = [], isLoading: loadingGrantees } = useQuery({
    queryKey: ["admin-campaign-grantees"],
    queryFn: () => base44.entities.CampaignLiveGrantee.list("-granted_at", 500),
  });

  const grantMutation = useMutation({
    mutationFn: ({ email, mode }) =>
      base44.functions.invoke("campaignAutoGrant", { mode, email, campaign_code: mode === "campaign_link" ? "LAUNCH2026" : undefined }),
    onSuccess: (res, { mode }) => {
      const data = res.data;
      if (data?.ok && !data?.skipped) {
        toast.success(`付与完了: ${data.email} (${data.benefit_months}か月)`);
      } else if (data?.skipped && data?.reason === "already_granted") {
        toast.info("既に付与済みのユーザーです（枠は消費されません）");
      } else {
        toast.warning(data?.reason || "付与に失敗しました");
      }
      queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["admin-campaign-grantees"] });
      setGrantEmail("");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGrant = () => {
    if (!grantEmail.trim()) { toast.error("メールアドレスを入力してください"); return; }
    grantMutation.mutate({ email: grantEmail.trim(), mode: grantMode });
  };

  const now = new Date();
  // 公開キャンペーン枠のアクティブGrantees
  const publicGrantees = allGrantees.filter(
    (g) => g.grant_source === "campaign_link" && g.expires_at && new Date(g.expires_at) > now
  );
  const adminGrantees = allGrantees.filter((g) => g.grant_source === "admin_designated");
  const scoutGrantees = allGrantees.filter((g) => g.grant_source === "special_scout");

  // 重複メール検出
  const emailCounts = {};
  allGrantees.forEach((g) => { emailCounts[g.email] = (emailCounts[g.email] || 0) + 1; });
  const duplicates = Object.entries(emailCounts).filter(([, c]) => c > 1).map(([e]) => e);

  return (
    <div className="space-y-8">

      {/* キャンペーン一覧 */}
      <div className="space-y-4">
        <h2 className="text-lg font-black flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" /> キャンペーン管理
        </h2>

        {loadingCampaigns ? (
          <div className="text-center text-muted-foreground py-6 text-sm">読み込み中...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-5 text-center text-sm text-muted-foreground">
            キャンペーンがありません
          </div>
        ) : (
          campaigns.map((c) => {
            const statusLabel = STATUS_LABELS[c.status] || STATUS_LABELS.draft;
            const activeCount = allGrantees.filter(
              (g) => g.campaign_id === c.id && g.grant_source === "campaign_link" && g.expires_at && new Date(g.expires_at) > now
            ).length;
            const remaining = Math.max(0, c.max_participants - activeCount);
            const pct = Math.min(100, Math.round((activeCount / c.max_participants) * 100));

            return (
              <div key={c.id} className="bg-card border border-border rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-black text-base">{c.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusLabel.color}`}>
                        {statusLabel.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">コード: <code className="text-primary">{c.campaign_code}</code></p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-2xl font-black text-primary">{activeCount} <span className="text-sm text-muted-foreground">/ {c.max_participants}名</span></p>
                    <p className="text-xs text-muted-foreground">残り <span className="font-bold text-foreground">{remaining}名</span></p>
                  </div>
                </div>

                {/* プログレスバー */}
                <div className="space-y-1">
                  <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-yellow-500" : "bg-primary"}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-right">{pct}% 使用</p>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="bg-primary/5 rounded-lg p-2">
                    <p className="font-black text-primary text-lg">{activeCount}</p>
                    <p className="text-muted-foreground">公開キャンペーン</p>
                  </div>
                  <div className="bg-blue-500/5 rounded-lg p-2">
                    <p className="font-black text-blue-400 text-lg">{adminGrantees.length}</p>
                    <p className="text-muted-foreground">管理者指定</p>
                  </div>
                  <div className="bg-yellow-500/5 rounded-lg p-2">
                    <p className="font-black text-yellow-400 text-lg">{scoutGrantees.length}</p>
                    <p className="text-muted-foreground">特別スカウト</p>
                  </div>
                </div>

                {c.starts_at && (
                  <p className="text-xs text-muted-foreground">
                    開始: {format(new Date(c.starts_at), "yyyy/M/d HH:mm", { locale: ja })}
                    {c.ends_at && ` 〜 終了: ${format(new Date(c.ends_at), "yyyy/M/d HH:mm", { locale: ja })}`}
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 管理者付与フォーム */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Shield className="w-4 h-4 text-blue-400" /> 管理者手動付与（300名枠外）
        </h3>
        <div className="flex gap-2">
          <select
            value={grantMode}
            onChange={(e) => setGrantMode(e.target.value)}
            className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground shrink-0"
          >
            <option value="admin_designated">管理者指定（12か月）</option>
            <option value="special_scout">特別スカウト（24か月）</option>
          </select>
          <Input
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            placeholder="対象者のメールアドレス"
            className="bg-secondary border-0"
          />
          <Button onClick={handleGrant} disabled={grantMutation.isPending} className="shrink-0 gap-1">
            <UserPlus className="w-4 h-4" />
            付与
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ⚠️ この操作は公開キャンペーンの300名枠を消費しません。管理者権限で個別付与されます。
        </p>
      </div>

      {/* 重複警告 */}
      {duplicates.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <p className="text-sm font-bold text-destructive mb-2">⚠️ 重複申込を検出 ({duplicates.length}件)</p>
          {duplicates.map((e) => (
            <p key={e} className="text-xs text-destructive/80">{e}</p>
          ))}
        </div>
      )}

      {/* 全Grantee一覧 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" /> 全付与対象者 ({allGrantees.length}件)
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { queryClient.invalidateQueries({ queryKey: ["admin-campaign-grantees"] }); queryClient.invalidateQueries({ queryKey: ["admin-campaigns"] }); }}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {loadingGrantees ? (
          <div className="text-center text-muted-foreground py-6 text-sm">読み込み中...</div>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {allGrantees.map((g) => {
              const src = GRANT_SOURCE_LABELS[g.grant_source] || GRANT_SOURCE_LABELS.campaign_link;
              const expired = g.expires_at && new Date(g.expires_at) <= now;
              const isDuplicate = duplicates.includes(g.email);
              return (
                <div
                  key={g.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${expired ? "opacity-50 border-border/30" : "border-border/50"} ${isDuplicate ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{g.email}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${src.color} shrink-0`}>{src.label}</span>
                      {isDuplicate && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-destructive/10 text-destructive border-destructive/30">重複</span>}
                      {expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full border bg-secondary text-muted-foreground border-border/30">期限切れ</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Gift className="w-3 h-3" />{g.benefit_months || "?"}か月
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {g.granted_at ? format(new Date(g.granted_at), "yyyy/M/d") : "-"}付与
                      </span>
                      <span>
                        〜 {g.expires_at ? format(new Date(g.expires_at), "yyyy/M/d") : "-"}
                      </span>
                    </div>
                    {g.notes && <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">{g.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}