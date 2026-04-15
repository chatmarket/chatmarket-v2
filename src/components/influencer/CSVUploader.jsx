import React, { useRef } from "react";
import { Upload, FileText, AlertTriangle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CSVUploader({ onDataLoaded }) {
  const fileInputRef = useRef(null);

  const downloadTemplate = () => {
    const csv = [
      ["name", "country", "sns_url", "contact"].join(","),
      ["山田太郎", "JP", "https://twitter.com/example", "yamada@example.com"].join(","),
      ["Jane Doe", "US", "https://instagram.com/jane", "jane@example.com"].join(","),
      ["김철수", "KR", "https://tiktok.com/kimcs", "kim@example.com"].join(","),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influencer_template_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("テンプレートをダウンロードしました");
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isCSV = file.name.endsWith(".csv");
    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    if (!isCSV && !isExcel) {
      toast.error("CSV または Excel ファイルのみ対応しています");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let data;

        if (isCSV) {
          // CSV の場合
          const csv = event.target?.result;
          const lines = csv.split("\n").filter((line) => line.trim());

          // ヘッダー解析
          const headers = lines[0]
            .split(",")
            .map((h) => h.trim().toLowerCase());
          const requiredCols = ["name", "country", "sns_url", "contact"];
          const missingCols = requiredCols.filter((col) => !headers.includes(col));

          if (missingCols.length > 0) {
            toast.error(
              `必須カラムが不足: ${missingCols.join(", ")}(name, country, sns_url, contact)`
            );
            return;
          }

          // データ解析
          data = lines.slice(1).map((line) => {
            const values = line.split(",").map((v) => v.trim());
            return {
              name: values[headers.indexOf("name")] || "",
              country: values[headers.indexOf("country")] || "",
              sns_url: values[headers.indexOf("sns_url")] || "",
              contact: values[headers.indexOf("contact")] || "",
            };
          }).filter((row) => row.name && row.country);
        } else {
          // Excel の場合（簡易パース）
          // 注: 本格的には xlsx パッケージが必要（install_npm_package で対応）
          toast.error("Excel ファイルのアップロードにはライブラリのインストールが必要です。CSVをご使用ください。");
          return;
        }

        if (data.length === 0) {
          toast.error("有効なデータ行がありません");
          return;
        }

        toast.success(`${data.length}件のインフルエンサーをロードしました`);
        onDataLoaded(data);
      } catch (err) {
        toast.error("ファイルの解析に失敗しました: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="bg-card border border-border/50 rounded-xl p-6 space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-bold flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          CSVファイルをアップロード
        </label>
        <p className="text-xs text-muted-foreground">
          必須カラム: Name, Country, SNS_URL, Contact
        </p>
      </div>

      <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer group"
        onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
        <p className="text-sm font-semibold">CSVまたはExcelをドラッグ、またはここをクリック</p>
        <p className="text-xs text-muted-foreground mt-1">
          対応形式: <span className="text-primary font-bold">.csv, .xlsx, .xls</span>
        </p>
      </div>

      <div className="space-y-3">
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2 text-xs text-yellow-700">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            日本: JP, 英語圏: US/UK/EN, 韓国: KR で国コードを指定してください
          </p>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
          <p className="text-xs font-bold text-blue-400 mb-2">📝 テンプレートダウンロード</p>
          <Button
            size="sm"
            variant="outline"
            className="w-full gap-2 border-blue-500/50 hover:bg-blue-500/10"
            onClick={downloadTemplate}
          >
            <Download className="w-4 h-4" />
            テンプレートをCSVでダウンロード
          </Button>
        </div>
      </div>
    </div>
  );
}