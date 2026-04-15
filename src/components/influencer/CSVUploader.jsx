import React, { useRef } from "react";
import { Upload, FileText, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function CSVUploader({ onDataLoaded }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CSV形式チェック
    if (!file.name.endsWith(".csv")) {
      toast.error("CSVファイルのみ対応しています");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
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
        const data = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          return {
            name: values[headers.indexOf("name")] || "",
            country: values[headers.indexOf("country")] || "",
            sns_url: values[headers.indexOf("sns_url")] || "",
            contact: values[headers.indexOf("contact")] || "",
          };
        }).filter((row) => row.name && row.country);

        if (data.length === 0) {
          toast.error("有効なデータ行がありません");
          return;
        }

        toast.success(`${data.length}件のインフルエンサーをロードしました`);
        onDataLoaded(data);
      } catch (err) {
        toast.error("CSVの解析に失敗しました: " + err.message);
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
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
        <p className="text-sm font-semibold">CSVをドラッグするか、ここをクリック</p>
        <p className="text-xs text-muted-foreground mt-1">
          または<span className="text-primary font-bold">ファイルを選択</span>
        </p>
      </div>

      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2 text-xs text-yellow-700">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <p>
          日本: JP, 英語圏: US/UK/EN, 韓国: KR で国コードを指定してください
        </p>
      </div>
    </div>
  );
}