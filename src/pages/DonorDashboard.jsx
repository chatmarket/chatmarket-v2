import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Heart, TrendingUp, Users, FileText, Bell, ChevronRight, Target, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { jsPDF } from "jspdf";

const ORG_TYPE_LABELS = {
  npo: { label: "NPO法人", color: "bg-blue-500/20 text-blue-300" },
  public: { label: "公共団体", color: "bg-green-500/20 text-green-300" },
  individual: { label: "個人", color: "bg-gray-500/20 text-gray-300" },
  company: { label: "企業", color: "bg-purple-500/20 text-purple-300" },
  political_party: { label: "政治政党", color: "bg-orange-500/20 text-orange-300" },
};

export default function DonorDashboard() {
  const [user, setUser] = useState(null);
  const [receiptMonth, setReceiptMonth] = useState(() => format(new Date(), "yyyy-MM"));

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  // 自分の寄付一覧
  const { data: myDonations = [] } = useQuery({
    queryKey: ["my-donations", user?.email],
    queryFn: () => base44.entities.CrowdfundingDonation.filter({ donor_email: user.email, status: "completed" }, "-created_date"),
    enabled: !!user,
    refetchInterval: 30000,
  });

  // 支援したプロジェクトID一覧（重複除去）
  const supportedProjectIds = [...new Set(myDonations.map((d) => d.project_id))];

  // 支援プロジェクト詳細
  const { data: projects = [] } = useQuery({
    queryKey: ["supported-projects", supportedProjectIds.join(",")],
    queryFn: async () => {
      const all = await base44.entities.CrowdfundingProject.list();
      return all.filter((p) => supportedProjectIds.includes(p.id));
    },
    enabled: supportedProjectIds.length > 0,
    refetchInterval: 30000,
  });

  // 支援プロジェクトの活動報告（全件）
  const { data: reports = [] } = useQuery({
    queryKey: ["activity-reports", supportedProjectIds.join(",")],
    queryFn: async () => {
      if (supportedProjectIds.length === 0) return [];
      const all = await base44.entities.CrowdfundingActivityReport.list("-created_date", 100);
      return all.filter((r) => supportedProjectIds.includes(r.project_id));
    },
    enabled: supportedProjectIds.length > 0,
    refetchInterval: 15000,
  });

  const totalDonated = myDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

  // 月別に絞り込んだ寄付
  const filteredByMonth = myDonations.filter((d) => {
    return format(new Date(d.created_date), "yyyy-MM") === receiptMonth;
  });
  const monthlyTotal = filteredByMonth.reduce((sum, d) => sum + (d.amount || 0), 0);

  const generateReceipt = () => {
    const doc = new jsPDF();
    const [year, month] = receiptMonth.split("-");
    const issueDate = format(new Date(), "yyyy年MM月dd日");

    // タイトル
    doc.setFontSize(20);
    doc.text("寄付領収書", 105, 25, { align: "center" });

    doc.setFontSize(10);
    doc.text(`発行日: ${issueDate}`, 160, 35);

    // 宛名
    doc.setFontSize(13);
    doc.text(`${user.full_name || user.email} 様`, 20, 50);

    doc.setFontSize(10);
    doc.text(`対象期間: ${year}年${month}月`, 20, 60);
    doc.text(`メールアドレス: ${user.email}`, 20, 68);

    // 合計金額
    doc.setFontSize(14);
    doc.text(`合計寄付金額: ¥${monthlyTotal.toLocaleString()}`, 20, 82);

    // 明細テーブルヘッダー
    doc.setFontSize(10);
    doc.text("寄付日", 20, 98);
    doc.text("プロジェクト名", 50, 98);
    doc.text("金額", 165, 98, { align: "right" });
    doc.line(20, 101, 190, 101);

    let y = 109;
    filteredByMonth.forEach((d) => {
      const proj = projects.find((p) => p.id === d.project_id);
      const title = proj?.title || d.project_id;
      const dateStr = format(new Date(d.created_date), "yyyy/MM/dd");
      const truncated = title.length > 28 ? title.slice(0, 28) + "…" : title;

      doc.text(dateStr, 20, y);
      doc.text(truncated, 50, y);
      doc.text(`¥${d.amount.toLocaleString()}`, 165, y, { align: "right" });
      y += 9;
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
    });

    doc.line(20, y + 1, 190, y + 1);
    doc.setFontSize(12);
    doc.text(`合計: ¥${monthlyTotal.toLocaleString()}`, 165, y + 10, { align: "right" });

    // フッター注記
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text("※ 本領収書はChatMarketプラットフォーム上での寄付記録に基づき発行されます。", 20, 280);
    doc.text("※ 確定申告の際は所轄税務署または税理士にご確認ください。", 20, 286);

    doc.save(`receipt_${receiptMonth}_${user.email}.pdf`);
  };

  // プロジェクトごとの自分の支援額
  const donationByProject = myDonations.reduce((acc, d) => {
    acc[d.project_id] = (acc[d.project_id] || 0) + d.amount;
    return acc;
  }, {});

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <Heart className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">寄付者マイページ</h1>
          <p className="text-sm text-muted-foreground">支援中のプロジェクト・活動報告をリアルタイムで確認</p>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <p className="text-2xl font-black text-primary">¥{totalDonated.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">累計支援総額</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center">
          <p className="text-2xl font-black">{supportedProjectIds.length}</p>
          <p className="text-xs text-muted-foreground mt-1">支援プロジェクト数</p>
        </div>
        <div className="bg-card border border-border/50 rounded-2xl p-5 text-center col-span-2 sm:col-span-1">
          <p className="text-2xl font-black text-yellow-400">{reports.length}</p>
          <p className="text-xs text-muted-foreground mt-1">未読の活動報告</p>
        </div>
      </div>

      {/* No donations */}
      {myDonations.length === 0 && (
        <div className="text-center py-20 text-muted-foreground space-y-4">
          <Heart className="w-14 h-14 mx-auto opacity-20" />
          <p className="font-semibold">まだ支援したプロジェクトはありません</p>
          <Link to="/crowdfunding">
            <button className="mt-2 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">
              プロジェクトを探す
            </button>
          </Link>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="space-y-5">
          <h2 className="font-bold text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            支援中のプロジェクト
          </h2>
          {projects.map((project) => {
            const goalPct = project.goal_amount > 0
              ? Math.min(100, Math.round((project.total_raised / project.goal_amount) * 100))
              : null;
            const myAmount = donationByProject[project.id] || 0;
            const orgInfo = ORG_TYPE_LABELS[project.organization_type] || { label: project.organization_type, color: "bg-secondary text-foreground" };
            const projectReports = reports.filter((r) => r.project_id === project.id);

            return (
              <div key={project.id} className="bg-card border border-border/50 rounded-2xl overflow-hidden">
                {/* Project header */}
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <Badge className={`${orgInfo.color} border-0 text-xs`}>{orgInfo.label}</Badge>
                      <h3 className="font-bold text-base">{project.title}</h3>
                      <p className="text-xs text-muted-foreground">{project.organization_name}</p>
                    </div>
                    <Link to={`/crowdfunding/${project.id}`} className="shrink-0">
                      <button className="flex items-center gap-1 text-xs text-primary hover:underline">
                        詳細 <ChevronRight className="w-3 h-3" />
                      </button>
                    </Link>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-secondary/60 rounded-xl p-3 text-center">
                      <p className="text-sm font-black text-primary">¥{(project.total_raised || 0).toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">累計支援額</p>
                    </div>
                    <div className="bg-secondary/60 rounded-xl p-3 text-center">
                      <p className="text-sm font-black">{project.supporter_count || 0}人</p>
                      <p className="text-[10px] text-muted-foreground">支援者数</p>
                    </div>
                    <div className="bg-red-500/10 rounded-xl p-3 text-center border border-red-500/20">
                      <p className="text-sm font-black text-red-400">¥{myAmount.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">あなたの支援額</p>
                    </div>
                  </div>

                  {/* Goal progress */}
                  {goalPct !== null && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Target className="w-3 h-3" /> 目標 ¥{project.goal_amount.toLocaleString()}
                        </span>
                        <span className={`font-bold ${goalPct >= 100 ? "text-primary" : "text-foreground"}`}>
                          {goalPct}% 達成
                        </span>
                      </div>
                      <Progress value={goalPct} className="h-2" />
                      {goalPct >= 100 && (
                        <p className="text-xs text-primary font-semibold text-center">🎉 目標達成！</p>
                      )}
                    </div>
                  )}
                </div>

                {/* Activity reports */}
                {projectReports.length > 0 && (
                  <div className="border-t border-border/50">
                    <div className="px-5 py-3 flex items-center gap-2 bg-primary/5">
                      <Bell className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-semibold text-primary">活動報告 ({projectReports.length}件)</span>
                    </div>
                    <div className="divide-y divide-border/30">
                      {projectReports.slice(0, 3).map((report) => (
                        <div key={report.id} className="px-5 py-4 flex gap-3">
                          {report.image_url && (
                            <img src={report.image_url} alt="" className="w-16 h-12 rounded-lg object-cover shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold line-clamp-1">{report.title}</p>
                            <p className="text-xs text-foreground/70 line-clamp-2 mt-0.5">{report.content}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {format(new Date(report.created_date), "yyyy年M月d日 HH:mm", { locale: ja })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {projectReports.length > 3 && (
                        <div className="px-5 py-2 text-center">
                          <span className="text-xs text-muted-foreground">他 {projectReports.length - 3} 件の報告</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {projectReports.length === 0 && (
                  <div className="border-t border-border/50 px-5 py-4 text-xs text-muted-foreground flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5" />
                    活動報告はまだありません
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 領収書発行 */}
      {myDonations.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-5 space-y-4">
          <h2 className="font-bold text-base flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" /> 月次領収書（PDF）
          </h2>
          <p className="text-xs text-muted-foreground">確定申告や寄付控除の証明にご利用いただけます。</p>
          <div className="flex items-center gap-3">
            <input
              type="month"
              value={receiptMonth}
              onChange={(e) => setReceiptMonth(e.target.value)}
              className="h-9 rounded-md bg-secondary border-0 px-3 text-sm text-foreground"
            />
            <span className="text-sm text-muted-foreground">
              合計: <span className="text-primary font-bold">¥{monthlyTotal.toLocaleString()}</span>
              <span className="text-xs ml-1">({filteredByMonth.length}件)</span>
            </span>
          </div>
          <Button
            onClick={generateReceipt}
            disabled={filteredByMonth.length === 0}
            className="gap-2 bg-primary hover:bg-primary/90"
          >
            <Download className="w-4 h-4" />
            {receiptMonth.replace("-", "年")}月の領収書をダウンロード
          </Button>
          {filteredByMonth.length === 0 && (
            <p className="text-xs text-muted-foreground">選択した月の寄付履歴がありません。</p>
          )}
        </div>
      )}

      {/* My donation history */}
      {myDonations.length > 0 && (
        <div className="bg-card border border-border/50 rounded-2xl p-5">
          <h2 className="font-bold text-base mb-4 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> 支援履歴
          </h2>
          <div className="space-y-2">
            {myDonations.slice(0, 10).map((d) => {
              const proj = projects.find((p) => p.id === d.project_id);
              return (
                <div key={d.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30 last:border-0">
                  <div>
                    <p className="font-medium text-sm line-clamp-1">{proj?.title || d.project_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(d.created_date), "yyyy/MM/dd", { locale: ja })}
                    </p>
                  </div>
                  <span className="text-primary font-bold">¥{d.amount.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}