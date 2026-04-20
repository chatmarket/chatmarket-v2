import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Calendar } from "lucide-react";
import { toast } from "sonner";

export default function CopyrightReportManager() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [exporting, setExporting] = useState(false);

  // 著作権トランザクション取得
  const { data: copyrightTransactions = [], isLoading } = useQuery({
    queryKey: ["copyright-transactions"],
    queryFn: () => base44.entities.CopyrightTransaction.list("-created_date", 10000),
  });

  // フィルタリング
  const filteredTransactions = copyrightTransactions.filter((t) => {
    if (!startDate || !endDate) return true;
    const txDate = new Date(t.created_date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return txDate >= start && txDate <= end;
  });

  // 集計
  const totalRevenue = filteredTransactions.reduce((s, t) => s + (t.revenue_amount || 0), 0);
  const totalCopyrightFee = filteredTransactions.reduce((s, t) => s + (t.copyright_fee_amount || 0), 0);
  const musicRelatedCount = filteredTransactions.filter((t) => t.is_music_related).length;

  // CSV エクスポート
  const handleExport = async () => {
    if (filteredTransactions.length === 0) {
      toast.error("エクスポート対象のデータがありません");
      return;
    }

    setExporting(true);

    try {
      // CSV ヘッダー
      const headers = ["配信ID", "チャンネルID", "配信者メール", "売上（円）", "著作権料（円）", "音楽利用", "決済日時"];
      
      // CSV行
      const rows = filteredTransactions.map((t) => [
        t.stream_id,
        t.channel_id,
        t.channel_owner_email,
        t.revenue_amount,
        t.copyright_fee_amount,
        t.is_music_related ? "はい" : "いいえ",
        new Date(t.created_date).toLocaleString("ja-JP"),
      ]);

      // 集計行
      rows.push(["", "", "合計", totalRevenue, totalCopyrightFee, "", ""]);

      // CSV 作成
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      // BOM付きUTF-8（Excelで日本語が正しく表示される）
      const bom = "\uFEFF";
      const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `著作権料レポート_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();

      toast.success(`${filteredTransactions.length}件のレコードをエクスポートしました`);
    } catch (err) {
      toast.error("エクスポートに失敗しました");
      console.error(err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">著作権料レポート（JASRAC集計）</h2>
        <p className="text-muted-foreground text-sm">月間または期間指定で著作権積立金（3%分）の総額と対象売上を集計します</p>
      </div>

      {/* 期間指定フィルター */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="w-4 h-4" /> 期間指定
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>開始日</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>終了日</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-secondary border-0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 集計結果 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">音楽利用配信数</p>
            <p className="text-3xl font-black text-primary">{musicRelatedCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">対象売上合計</p>
            <p className="text-3xl font-black text-cyan-400">¥{totalRevenue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-purple-500/30 bg-purple-500/5">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground mb-1">著作権料積立（3%）</p>
            <p className="text-3xl font-black text-purple-400">¥{totalCopyrightFee.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* レコード一覧 */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">詳細レコード（{filteredTransactions.length}件）</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">読み込み中...</p>
          ) : filteredTransactions.length === 0 ? (
            <p className="text-muted-foreground">対象のデータがありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground">配信ID</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground">配信者</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-muted-foreground">売上</th>
                    <th className="text-right py-2 px-3 text-xs font-bold text-muted-foreground">著作権料</th>
                    <th className="text-center py-2 px-3 text-xs font-bold text-muted-foreground">音楽利用</th>
                    <th className="text-left py-2 px-3 text-xs font-bold text-muted-foreground">決済日</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/30 hover:bg-secondary/50">
                      <td className="py-2 px-3 text-xs font-mono">{tx.stream_id.slice(0, 8)}...</td>
                      <td className="py-2 px-3 text-xs">{tx.channel_owner_email}</td>
                      <td className="py-2 px-3 text-right font-semibold">¥{(tx.revenue_amount || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-right text-purple-400 font-semibold">¥{(tx.copyright_fee_amount || 0).toLocaleString()}</td>
                      <td className="py-2 px-3 text-center">{tx.is_music_related ? "✓" : "−"}</td>
                      <td className="py-2 px-3 text-xs text-muted-foreground">
                        {new Date(tx.created_date).toLocaleDateString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* エクスポートボタン */}
      <Button
        onClick={handleExport}
        disabled={exporting || filteredTransactions.length === 0}
        className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold gap-2 h-11"
      >
        <Download className="w-4 h-4" />
        {exporting ? "エクスポート中..." : "CSVエクスポート"}
      </Button>
    </div>
  );
}