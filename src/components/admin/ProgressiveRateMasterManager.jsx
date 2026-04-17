import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

const DEFAULT_TIERS = [
  { threshold_yen: 0,          rate_percent: 85, label: "STEP 1（基本）", description: "100万円未満", sort_order: 1,  is_active: true },
  { threshold_yen: 1000000,    rate_percent: 86, label: "STEP 2",         description: "100万円超",   sort_order: 2,  is_active: true },
  { threshold_yen: 3000000,    rate_percent: 87, label: "STEP 3",         description: "300万円超",   sort_order: 3,  is_active: true },
  { threshold_yen: 6000000,    rate_percent: 88, label: "STEP 4",         description: "600万円超",   sort_order: 4,  is_active: true },
  { threshold_yen: 9000000,    rate_percent: 89, label: "STEP 5",         description: "900万円超",   sort_order: 5,  is_active: true },
  { threshold_yen: 12000000,   rate_percent: 90, label: "STEP 6",         description: "1,200万円超", sort_order: 6,  is_active: true },
  { threshold_yen: 15000000,   rate_percent: 91, label: "STEP 7",         description: "1,500万円超", sort_order: 7,  is_active: true },
  { threshold_yen: 16500000,   rate_percent: 92, label: "STEP 8",         description: "1,650万円超", sort_order: 8,  is_active: true },
  { threshold_yen: 18000000,   rate_percent: 93, label: "STEP 9",         description: "1,800万円超", sort_order: 9,  is_active: true },
  { threshold_yen: 19500000,   rate_percent: 94, label: "STEP 10",        description: "1,950万円超", sort_order: 10, is_active: true },
  { threshold_yen: 20000000,   rate_percent: 95, label: "MAX",            description: "2,000万円超", sort_order: 11, is_active: true },
];

export default function ProgressiveRateMasterManager() {
  const queryClient = useQueryClient();
  const [seeding, setSeeding] = useState(false);
  const [running, setRunning] = useState(false);

  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ["progressive-rate-master-admin"],
    queryFn: () => base44.entities.ProgressiveRateMaster.filter({}, "sort_order"),
  });

  const handleSeedDefaults = async () => {
    setSeeding(true);
    for (const tier of DEFAULT_TIERS) {
      await base44.entities.ProgressiveRateMaster.create(tier);
    }
    queryClient.invalidateQueries({ queryKey: ["progressive-rate-master-admin"] });
    toast.success("デフォルトのティアを登録しました");
    setSeeding(false);
  };

  const handleUpdate = async (id, field, value) => {
    const numVal = field === "label" || field === "description" ? value : Number(value);
    await base44.entities.ProgressiveRateMaster.update(id, { [field]: numVal });
    queryClient.invalidateQueries({ queryKey: ["progressive-rate-master-admin"] });
    toast.success("更新しました");
  };

  const handleDelete = async (id) => {
    await base44.entities.ProgressiveRateMaster.delete(id);
    queryClient.invalidateQueries({ queryKey: ["progressive-rate-master-admin"] });
    toast.success("削除しました");
  };

  const handleRunBatch = async () => {
    setRunning(true);
    const res = await base44.functions.invoke("updateProgressiveRates", {});
    toast.success(`バッチ完了: ${res.data?.updated_channels}チャンネル更新`);
    setRunning(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold">プログレッシブ還元率マスタ</h3>
          <p className="text-xs text-muted-foreground mt-0.5">月間売上しきい値（円）と翌月適用還元率を管理します</p>
        </div>
        <div className="flex gap-2">
          {tiers.length === 0 && (
            <Button onClick={handleSeedDefaults} disabled={seeding} variant="outline" size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> デフォルト登録
            </Button>
          )}
          <Button onClick={handleRunBatch} disabled={running} size="sm" className="gap-2 bg-amber-500 text-black hover:bg-amber-400">
            <Save className="w-4 h-4" /> 今すぐバッチ実行
          </Button>
        </div>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-300">
        ⚠️ 変更は翌月1日の自動バッチ実行時に全ライバーへ反映されます。即時反映は「今すぐバッチ実行」をクリック。
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">読み込み中...</p>
      ) : tiers.length === 0 ? (
        <div className="bg-card border border-border/50 rounded-xl p-8 text-center text-muted-foreground">
          <p>マスタデータがありません。「デフォルト登録」で初期値を投入してください。</p>
        </div>
      ) : (
        <div className="bg-card border border-border/50 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left py-3 px-4 font-bold">ラベル</th>
                <th className="text-right py-3 px-4 font-bold">しきい値（円）超</th>
                <th className="text-center py-3 px-4 font-bold">還元率（%）</th>
                <th className="text-left py-3 px-4 font-bold">説明</th>
                <th className="text-center py-3 px-4 font-bold">削除</th>
              </tr>
            </thead>
            <tbody>
              {tiers.map((tier) => (
                <tr key={tier.id} className="border-b border-border/30 hover:bg-secondary/50">
                  <td className="py-2 px-4">
                    <Input
                      defaultValue={tier.label}
                      onBlur={(e) => handleUpdate(tier.id, "label", e.target.value)}
                      className="bg-secondary border-0 h-8 text-xs w-28"
                    />
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Input
                      type="number"
                      defaultValue={tier.threshold_yen}
                      onBlur={(e) => handleUpdate(tier.id, "threshold_yen", e.target.value)}
                      className="bg-secondary border-0 h-8 text-xs w-36 text-right"
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <Input
                      type="number"
                      defaultValue={tier.rate_percent}
                      onBlur={(e) => handleUpdate(tier.id, "rate_percent", e.target.value)}
                      className="bg-secondary border-0 h-8 text-xs w-16 text-center"
                      min="1" max="100"
                    />
                  </td>
                  <td className="py-2 px-4">
                    <Input
                      defaultValue={tier.description}
                      onBlur={(e) => handleUpdate(tier.id, "description", e.target.value)}
                      className="bg-secondary border-0 h-8 text-xs w-36"
                    />
                  </td>
                  <td className="py-2 px-4 text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDelete(tier.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}