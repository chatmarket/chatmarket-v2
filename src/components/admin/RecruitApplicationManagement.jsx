import React, { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, MessageCircle, Download } from "lucide-react";
import { toast } from "sonner";

export default function RecruitApplicationManagement({ applications: propsApplications = [] }) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);

  // AdminDashboardからpropsで受け取ったapplicationsを使用
  const applications = propsApplications && propsApplications.length > 0 ? propsApplications : [];

  // 新しい申し込みの通知
  useEffect(() => {
    if (applications.length > prevCountRef.current) {
      const newCount = applications.length - prevCountRef.current;
      toast.success(`🔔 新しいライバー申込 ${newCount}件`, {
        duration: 5000,
        description: "管理画面で確認してください",
      });
    }
    prevCountRef.current = applications.length;
  }, [applications.length]);

  const handleApprove = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // 申請者にメール送信
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "【ChatMarket】ライバー申込 - 承認のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただき、承認させていただきました。\n\n全プランの無料期間が自動的に適用されております。\nお気軽にChatMarketをお始めください。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      });

      // BlogPostを削除（承認済み）
      await base44.entities.BlogPost.delete(app.id);
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を承認しました`);
    } catch (err) {
      toast.error("承認処理に失敗しました: " + err.message);
    }
  };

  const handleReject = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // 申請者にメール送信
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "【ChatMarket】ライバー申込 - 審査結果のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただきましたが、現在のところご参加をお断りさせていただいております。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      });

      // BlogPostを削除（却下済み）
      await base44.entities.BlogPost.delete(app.id);
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を却下しました`);
    } catch (err) {
      toast.error("却下処理に失敗しました: " + err.message);
    }
  };

  const handleStatusChange = async (app, newStatus) => {
    try {
      await base44.entities.BlogPost.update(app.id, {
        recruit_status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`ステータスを「${newStatus}」に更新しました`);
    } catch (err) {
      toast.error("ステータス更新に失敗しました: " + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ["申し込み日時", "申し込み者", "メール", "フォロワー数", "SNS", "自己PR", "ステータス"];
    const rows = applications.map((app) => {
      const data = JSON.parse(app.content);
      return [
        new Date(app.created_date).toLocaleString("ja-JP"),
        data.name || "",
        data.email || "",
        data.followers || "0",
        data.sns_url || "",
        data.pr ? data.pr.replace(/\n/g, " ").substring(0, 100) : "",
        app.recruit_status || "未対応",
      ];
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recruit-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("CSVファイルをダウンロードしました");
  };

  return (
    <div className="space-y-6">
      {/* 件数バッジとCSVエクスポート */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">ライバー申込状況</h3>
          {applications.length > 0 && (
            <Badge className="bg-red-500 text-white text-base px-3 py-1">
              {applications.length}件
            </Badge>
          )}
        </div>
        {applications.length > 0 && (
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4" /> CSV出力
          </Button>
        )}
      </div>

      {/* 申込一覧テーブル */}
      {applications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>申込はまだありません</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left py-3 px-4 font-bold">申し込み者</th>
                <th className="text-left py-3 px-4 font-bold">メール</th>
                <th className="text-left py-3 px-4 font-bold">フォロワー</th>
                <th className="text-center py-3 px-4 font-bold">ステータス</th>
                <th className="text-left py-3 px-4 font-bold">申し込み日時</th>
                <th className="text-center py-3 px-4 font-bold">アクション</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const data = JSON.parse(app.content);
                const isTierPro = (data.followers || 0) >= 10000;

                return (
                  <tr key={app.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold flex items-center gap-2">
                          {data.name}
                          {isTierPro && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs">
                              Pro
                            </Badge>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{data.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold">{(data.followers || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Select
                        value={app.recruit_status || "未対応"}
                        onValueChange={(status) => handleStatusChange(app, status)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs bg-secondary border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="未対応">未対応</SelectItem>
                          <SelectItem value="審査中">審査中</SelectItem>
                          <SelectItem value="採用">採用</SelectItem>
                          <SelectItem value="不採用">不採用</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(app.created_date).toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-1 justify-center">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(app)}
                          className="h-7 px-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40"
                          variant="outline"
                        >
                          承認
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(app)}
                          className="h-7 px-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                          variant="outline"
                        >
                          却下
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 説明 */}
      <div className="bg-secondary rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p>• 承認: 申請者に確認メールを送信 → プロフィール設定に進める</p>
        <p>• 却下: 申請者に却下メールを送信 → 再度申し込み可能</p>
        <p className="pt-2 border-t border-border/50">
          Pro申し込み（フォロワー1万人以上）は3ヶ月無料、通常申し込みは初月無料
        </p>
      </div>
    </div>
  );
}