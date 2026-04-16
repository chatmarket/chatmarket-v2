import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download } from "lucide-react";

export default function PurchaseReportTab({ purchases = [] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = purchases.filter((p) => {
    const matchSearch = 
      p.buyer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.item_id?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === "all" || p.item_type === filterType;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchType && matchStatus;
  });

  const handleExport = () => {
    const csv = [
      ["購入日時", "購入者", "商品ID", "商品種別", "金額", "ステータス"].join(","),
      ...filtered.map((p) => [
        new Date(p.created_date).toLocaleString("ja-JP"),
        p.buyer_email || "-",
        p.item_id || "-",
        p.item_type === "video" ? "動画" : p.item_type === "livestream" ? "ライブ配信" : p.item_type,
        `¥${(p.amount || 0).toLocaleString()}`,
        p.status === "completed" ? "完了" : p.status === "refunded" ? "返金" : p.status,
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* フィルター */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px]">
          <Input
            placeholder="購入者メールまたは商品IDで検索"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-secondary border-0"
            icon={<Search className="w-4 h-4" />}
          />
        </div>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="bg-secondary border-0 w-32">
            <SelectValue placeholder="商品種別" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="video">動画</SelectItem>
            <SelectItem value="livestream">ライブ配信</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="bg-secondary border-0 w-32">
            <SelectValue placeholder="ステータス" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全て</SelectItem>
            <SelectItem value="completed">完了</SelectItem>
            <SelectItem value="refunded">返金</SelectItem>
            <SelectItem value="pending">保留中</SelectItem>
          </SelectContent>
        </Select>

        <Button
          onClick={handleExport}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" /> CSV出力
        </Button>
      </div>

      {/* テーブル */}
      <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/50">
              <th className="text-left py-3 px-4 font-bold">購入日時</th>
              <th className="text-left py-3 px-4 font-bold">購入者</th>
              <th className="text-left py-3 px-4 font-bold">商品ID</th>
              <th className="text-left py-3 px-4 font-bold">種別</th>
              <th className="text-right py-3 px-4 font-bold">金額</th>
              <th className="text-center py-3 px-4 font-bold">ステータス</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-secondary/50 transition-colors">
                  <td className="py-3 px-4 text-xs">
                    {new Date(p.created_date).toLocaleString("ja-JP")}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs">{p.buyer_email || "-"}</td>
                  <td className="py-3 px-4 text-xs">{p.item_id || "-"}</td>
                  <td className="py-3 px-4 text-xs">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      p.item_type === "video" ? "bg-blue-500/20 text-blue-300" :
                      p.item_type === "livestream" ? "bg-red-500/20 text-red-300" :
                      "bg-secondary text-foreground"
                    }`}>
                      {p.item_type === "video" ? "動画" : p.item_type === "livestream" ? "ライブ配信" : p.item_type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-semibold">
                    ¥{(p.amount || 0).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                      p.status === "completed" ? "bg-green-500/20 text-green-300" :
                      p.status === "refunded" ? "bg-red-500/20 text-red-300" :
                      "bg-yellow-500/20 text-yellow-300"
                    }`}>
                      {p.status === "completed" ? "完了" : p.status === "refunded" ? "返金" : p.status}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="py-8 text-center text-muted-foreground">
                  決済データがありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-3 text-sm">
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-muted-foreground mb-1">総件数</p>
          <p className="text-2xl font-black text-foreground">{filtered.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-muted-foreground mb-1">完了件数</p>
          <p className="text-2xl font-black text-green-400">
            {filtered.filter((p) => p.status === "completed").length}
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border/50 p-4">
          <p className="text-muted-foreground mb-1">合計売上</p>
          <p className="text-2xl font-black text-primary">
            ¥{filtered.reduce((sum, p) => sum + (p.amount || 0), 0).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}