import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, Eye, Download } from "lucide-react";
import TemplateModal from "./TemplateModal";
import { toast } from "sonner";

export default function InfluencerListTable({ influencers }) {
  const [selectedInfluencer, setSelectedInfluencer] = useState(null);
  const [showTemplate, setShowTemplate] = useState(false);

  const generateInviteCode = (influencer, index) => {
    const baseUrl = window.location.origin;
    const code = btoa(`${influencer.name}_${influencer.country}_${index}`).slice(0, 12);
    return `${baseUrl}/plan-select?ref=${code}&from=${influencer.country}`;
  };

  const handleExport = () => {
    const csv = [
      ["Name", "Country", "SNS URL", "Contact", "Invite Code"].join(","),
      ...influencers.map((inf, idx) => [
        inf.name,
        inf.country,
        inf.sns_url,
        inf.contact,
        generateInviteCode(inf, idx),
      ].join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `influencer_campaign_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSVをエクスポートしました");
  };

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between pb-4 border-b border-border/50">
        <p className="text-sm font-semibold text-muted-foreground">
          {influencers.length} 件のインフルエンサー
        </p>
        <Button onClick={handleExport} variant="outline" size="sm" className="gap-2">
          <Download className="w-4 h-4" />
          エクスポート
        </Button>
      </div>

      {/* テーブル */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs font-bold text-muted-foreground border-b border-border/50">
            <tr>
              <th className="text-left py-3 px-3">#</th>
              <th className="text-left py-3 px-3">名前</th>
              <th className="text-left py-3 px-3">国</th>
              <th className="text-left py-3 px-3">SNS</th>
              <th className="text-left py-3 px-3">連絡先</th>
              <th className="text-center py-3 px-3">アクション</th>
            </tr>
          </thead>
          <tbody>
            {influencers.map((inf, idx) => {
              const inviteCode = generateInviteCode(inf, idx);
              return (
                <tr
                  key={idx}
                  className="border-b border-border/30 hover:bg-secondary/30 transition-colors"
                >
                  <td className="py-3 px-3 text-muted-foreground">{idx + 1}</td>
                  <td className="py-3 px-3 font-semibold text-foreground">{inf.name}</td>
                  <td className="py-3 px-3">
                    <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">
                      {inf.country}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <a
                      href={inf.sns_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-xs truncate"
                    >
                      プロフィール →
                    </a>
                  </td>
                  <td className="py-3 px-3">
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {inf.contact}
                    </span>
                  </td>
                  <td className="py-3 px-3 flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 gap-1"
                      onClick={() => {
                        setSelectedInfluencer(inf);
                        setShowTemplate(true);
                      }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      送信
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 gap-1"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteCode);
                        toast.success("招待コードをコピー");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* テンプレートモーダル */}
      {selectedInfluencer && (
        <TemplateModal
          open={showTemplate}
          onOpenChange={setShowTemplate}
          influencer={selectedInfluencer}
          inviteCode={generateInviteCode(selectedInfluencer, influencers.indexOf(selectedInfluencer))}
        />
      )}
    </div>
  );
}