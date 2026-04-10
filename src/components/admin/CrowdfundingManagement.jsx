import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, ExternalLink, Heart, Target, DollarSign } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABELS = {
  pending: { label: "⏳ 審査待ち", cls: "bg-yellow-500/20 text-yellow-300" },
  approved: { label: "✓ 承認済み", cls: "bg-blue-500/20 text-blue-300" },
  active: { label: "✓ 公開中", cls: "bg-green-500/20 text-green-300" },
  rejected: { label: "✗ 却下", cls: "bg-red-500/20 text-red-300" },
};

export default function CrowdfundingManagement({ projects = [] }) {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);
  const [rejectNote, setRejectNote] = useState("");

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) =>
      base44.entities.CrowdfundingProject.update(id, { status }),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-crowdfunding-projects"] });
      toast.success(status === "active" ? "承認しました" : status === "rejected" ? "却下しました" : "更新しました");
      setSelectedProject(null);
      setRejectNote("");
    },
  });

  const filtered = filterStatus === "all" ? projects : projects.filter((p) => p.status === filterStatus);

  const counts = {
    all: projects.length,
    pending: projects.filter((p) => p.status === "pending").length,
    approved: projects.filter((p) => p.status === "approved").length,
    active: projects.filter((p) => p.status === "active").length,
    rejected: projects.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Heart className="w-5 h-5 text-red-400" />
        <h3 className="font-bold text-lg">クラウドファンディング管理</h3>
        <span className="text-xs bg-primary/20 text-primary rounded-full px-2 py-0.5">{projects.length}件</span>
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "all", label: "すべて" },
          { key: "pending", label: "審査待ち" },
          { key: "approved", label: "承認済み" },
          { key: "active", label: "公開中" },
          { key: "rejected", label: "却下" },
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
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {/* プロジェクト一覧 */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">プロジェクトがありません</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((project) => {
            const goalPct = project.goal_amount > 0
              ? Math.min(100, Math.round((project.total_raised / project.goal_amount) * 100))
              : null;
            const statusInfo = STATUS_LABELS[project.status] || STATUS_LABELS.pending;

            return (
              <div key={project.id} className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusInfo.cls}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-xs text-muted-foreground">{project.organization_type}</span>
                    </div>
                    <h4 className="font-bold text-base leading-tight">{project.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{project.organization_name} / 代表: {project.representative_name}</p>
                    <p className="text-xs text-muted-foreground">{project.owner_email}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {project.hp_url && (
                      <a href={project.hp_url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="gap-1 text-xs">
                          <ExternalLink className="w-3 h-3" /> HP
                        </Button>
                      </a>
                    )}
                  </div>
                </div>

                {/* 統計 */}
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1 text-red-400">
                    <Heart className="w-3.5 h-3.5" /> {project.supporter_count || 0}人支援
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <DollarSign className="w-3.5 h-3.5" /> ¥{(project.total_raised || 0).toLocaleString()}
                  </span>
                  {project.goal_amount > 0 && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Target className="w-3.5 h-3.5" /> 目標 ¥{project.goal_amount.toLocaleString()} ({goalPct}%)
                    </span>
                  )}
                </div>

                {/* 画像 */}
                {(project.image_url_1 || project.certificate_url) && (
                  <div className="flex gap-2">
                    {project.image_url_1 && (
                      <a href={project.image_url_1} target="_blank" rel="noopener noreferrer">
                        <img src={project.image_url_1} alt="画像1" className="w-20 h-14 object-cover rounded-lg border border-border/50 hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                    {project.image_url_2 && (
                      <a href={project.image_url_2} target="_blank" rel="noopener noreferrer">
                        <img src={project.image_url_2} alt="画像2" className="w-20 h-14 object-cover rounded-lg border border-border/50 hover:opacity-80 transition-opacity" />
                      </a>
                    )}
                    {project.certificate_url && (
                      <a href={project.certificate_url} target="_blank" rel="noopener noreferrer" className="w-20 h-14 rounded-lg border border-border/50 bg-secondary flex items-center justify-center text-xs text-primary hover:bg-secondary/70 transition-colors">
                        証明書 →
                      </a>
                    )}
                  </div>
                )}

                {/* 審査ボタン */}
                {(project.status === "pending" || project.status === "approved") && (
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    {project.status === "pending" && (
                      <Button
                        size="sm"
                        onClick={() => updateStatus.mutate({ id: project.id, status: "active" })}
                        disabled={updateStatus.isPending}
                        className="bg-green-600 hover:bg-green-700 gap-1.5"
                      >
                        <CheckCircle className="w-3.5 h-3.5" /> 承認・公開
                      </Button>
                    )}
                    {project.status === "active" && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => updateStatus.mutate({ id: project.id, status: "approved" })}
                        disabled={updateStatus.isPending}
                        className="gap-1.5"
                      >
                        公開停止
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus.mutate({ id: project.id, status: "rejected" })}
                      disabled={updateStatus.isPending}
                      className="gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" /> 却下
                    </Button>
                  </div>
                )}
                {project.status === "rejected" && (
                  <div className="flex gap-2 pt-2 border-t border-border/30">
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: project.id, status: "pending" })}
                      disabled={updateStatus.isPending}
                      variant="outline"
                      className="gap-1.5"
                    >
                      審査待ちに戻す
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}