import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertCircle, Trash2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const REPORT_REASONS = [
  "不適切なコンテンツ",
  "詐欺・なりすまし",
  "ハラスメント・暴言",
  "スパム・宣伝",
  "著作権侵害",
  "プライバシー侵害",
  "その他",
];

export default function ReportManagement() {
  const [notifications, setNotifications] = useState({});

  const { data: allReports = [], refetch: refetchReports } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: () => base44.entities.BlockReport.filter({ type: "report" }, "-created_date", 100),
  });

  // 最新10件を取得
  const recentReports = allReports.slice(0, 10);

  const handleResolveReport = async (reportId) => {
    try {
      await base44.entities.BlockReport.delete(reportId);
      toast.success("通報を解決しました");
      refetchReports();
    } catch (error) {
      toast.error("削除に失敗しました");
    }
  };

  const handleAddNotification = (reportId, reason) => {
    setNotifications((prev) => ({
      ...prev,
      [reportId]: { shown: true, reason },
    }));
    // 3秒後に自動的に非表示
    setTimeout(() => {
      setNotifications((prev) => ({
        ...prev,
        [reportId]: { ...prev[reportId], shown: false },
      }));
    }, 3000);
  };

  return (
    <div className="space-y-6">
      {/* 通報通知 */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
        {Object.entries(notifications).map(
          ([reportId, { shown, reason }]) =>
            shown && (
              <div
                key={reportId}
                className="bg-destructive text-white rounded-lg p-4 shadow-lg flex items-start gap-3 animate-in slide-in-from-top-5"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold text-sm">新しい通報があります</p>
                  <p className="text-xs text-white/80 mt-1">{reason}</p>
                </div>
              </div>
            )
        )}
      </div>

      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <h3 className="font-bold text-lg">ユーザー通報管理</h3>
          <span className="text-xs bg-destructive text-white rounded-full px-2 py-1">
            {allReports.length}件
          </span>
        </div>
      </div>

      {/* 通報一覧 */}
      {recentReports.length > 0 ? (
        <div className="space-y-3">
          {recentReports.map((report) => (
            <div
              key={report.id}
              className="bg-card border-2 border-destructive/30 rounded-lg p-4 space-y-3 hover:border-destructive/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <p className="text-sm font-semibold truncate">
                      {report.target_email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">
                    通報者: {report.from_email}
                  </p>
                  <div className="bg-destructive/10 rounded-md p-2 mb-3">
                    <p className="text-xs text-foreground font-semibold mb-1">理由：</p>
                    <p className="text-sm text-foreground">{report.reason || "未指定"}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    報告日時: {new Date(report.created_date).toLocaleString("ja-JP")}
                  </p>
                </div>

                <div className="flex gap-2 shrink-0">
                  {/* プッシュ通知メニュー */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                      >
                        🔔 通知
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {REPORT_REASONS.map((reason) => (
                        <DropdownMenuItem
                          key={reason}
                          onClick={() =>
                            handleAddNotification(report.id, reason)
                          }
                        >
                          <AlertCircle className="w-4 h-4 mr-2 text-destructive" />
                          {reason}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* 解決ボタン */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleResolveReport(report.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                    解決
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-muted-foreground">通報はありません</p>
        </div>
      )}

      {allReports.length > 10 && (
        <p className="text-xs text-muted-foreground text-center">
          表示: 10件 / 全 {allReports.length}件
        </p>
      )}
    </div>
  );
}