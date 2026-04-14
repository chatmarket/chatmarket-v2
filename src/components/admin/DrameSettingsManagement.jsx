/**
 * DrameSettingsManagement
 * Admin: ジャイアント・キリング・ヒーロースロット等の演出設定管理
 */
import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Zap, Crown, Trophy, Save, Play, RefreshCw } from "lucide-react";
import { toast } from "sonner";

// ダミー通知を送ってテストする
async function fireTestGiantKilling(channelId, channelName) {
  await base44.entities.Notification.create({
    user_email: 'broadcast',
    type: 'giant_killing',
    title: `[テスト] 歴史が動いた！ ${channelName} がTOP1に躍り出た！`,
    message: `[管理者テスト送信] 15分以内に急上昇！`,
    is_broadcast: true,
    channel_id: channelId,
    channel_name: channelName,
    link: `/channel/${channelId}`,
    is_read: false,
    rank_before: 5,
    rank_after: 1,
  });
}

export default function DrameSettingsManagement() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [testChannelIdx, setTestChannelIdx] = useState(0);

  // 設定値 (ローカルステート)
  const [settings, setSettings] = useState({
    giant_killing_enabled: true,
    giant_killing_window_min: 15,
    giant_killing_threshold_coins: 50000,
    hero_slot_enabled: true,
    millionaire_threshold: 20000000,
    millionaire_supporters_enabled: true,
  });

  const { data: channels = [] } = useQuery({
    queryKey: ["admin-drama-channels"],
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 10),
  });

  const { data: recentNotifs = [] } = useQuery({
    queryKey: ["admin-giant-killing-notifs"],
    queryFn: () => base44.entities.Notification.filter({ type: "giant_killing", is_broadcast: true }, "-created_date", 10),
    refetchInterval: 30000,
  });

  const handleTest = async () => {
    const ch = channels[testChannelIdx];
    if (!ch) { toast.error("チャンネルが見つかりません"); return; }
    await fireTestGiantKilling(ch.id, ch.name);
    toast.success(`テスト通知を送信しました: ${ch.name}`);
    queryClient.invalidateQueries({ queryKey: ["admin-giant-killing-notifs"] });
  };

  const handleDetect = async () => {
    setSaving(true);
    const res = await base44.functions.invoke("detectGiantKilling", {});
    if (res.data?.detected) {
      toast.success(`検知！ ${res.data.channel} ${res.data.rankBefore}位→${res.data.rankAfter}位`);
    } else {
      toast.info(res.data?.reason || "現在下剋上は発生していません");
    }
    queryClient.invalidateQueries({ queryKey: ["admin-giant-killing-notifs"] });
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      {/* ジャイアント・キリング設定 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" /> ジャイアント・キリング設定
        </h3>

        <div className="flex items-center justify-between">
          <Label>演出を有効にする</Label>
          <Switch
            checked={settings.giant_killing_enabled}
            onCheckedChange={(v) => setSettings(s => ({ ...s, giant_killing_enabled: v }))}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">検知ウィンドウ（分）</Label>
            <Input
              type="number" min={5} max={60}
              value={settings.giant_killing_window_min}
              onChange={(e) => setSettings(s => ({ ...s, giant_killing_window_min: +e.target.value }))}
              className="bg-secondary border-0"
            />
            <p className="text-[11px] text-muted-foreground">この時間内の急上昇を検知</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">発動閾値（コイン数）</Label>
            <Input
              type="number" min={1000}
              value={settings.giant_killing_threshold_coins}
              onChange={(e) => setSettings(s => ({ ...s, giant_killing_threshold_coins: +e.target.value }))}
              className="bg-secondary border-0"
            />
            <p className="text-[11px] text-muted-foreground">ウィンドウ内のコイン増加でトリガー</p>
          </div>
        </div>

        {/* テスト送信 */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/50">
          <select
            value={testChannelIdx}
            onChange={(e) => setTestChannelIdx(+e.target.value)}
            className="flex-1 h-9 rounded-md bg-secondary px-3 text-sm text-foreground"
          >
            {channels.map((ch, i) => (
              <option key={ch.id} value={i}>{ch.name}</option>
            ))}
          </select>
          <Button size="sm" variant="outline" onClick={handleTest} className="gap-1.5 text-yellow-400 border-yellow-500/40">
            <Play className="w-3.5 h-3.5" /> テスト送信
          </Button>
          <Button size="sm" variant="outline" onClick={handleDetect} disabled={saving} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${saving ? "animate-spin" : ""}`} /> 今すぐ検知
          </Button>
        </div>
      </div>

      {/* ヒーロースロット設定 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Crown className="w-4 h-4 text-yellow-400" /> ヒーロースロット設定
        </h3>
        <div className="flex items-center justify-between">
          <div>
            <Label>TOPページ1位枠を表示する</Label>
            <p className="text-xs text-muted-foreground mt-0.5">当月売上1位ライバーをファーストビューに常駐</p>
          </div>
          <Switch
            checked={settings.hero_slot_enabled}
            onCheckedChange={(v) => setSettings(s => ({ ...s, hero_slot_enabled: v }))}
          />
        </div>
      </div>

      {/* ミリオネア設定 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <h3 className="font-bold flex items-center gap-2">
          <Trophy className="w-4 h-4 text-yellow-400" /> ミリオネア・サポーター設定
        </h3>
        <div className="flex items-center justify-between">
          <Label>ミリオネア・サポーター表示を有効にする</Label>
          <Switch
            checked={settings.millionaire_supporters_enabled}
            onCheckedChange={(v) => setSettings(s => ({ ...s, millionaire_supporters_enabled: v }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">ミリオネア達成閾値（コイン）</Label>
          <Input
            type="number" min={1000000}
            value={settings.millionaire_threshold}
            onChange={(e) => setSettings(s => ({ ...s, millionaire_threshold: +e.target.value }))}
            className="bg-secondary border-0"
          />
          <p className="text-[11px] text-muted-foreground">デフォルト: 20,000,000（2,000万コイン = 2,000万円）</p>
        </div>
      </div>

      {/* 直近のジャイアント・キリング履歴 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
        <h3 className="font-bold text-sm">直近の下剋上履歴</h3>
        {recentNotifs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">まだ発生していません</p>
        ) : (
          <div className="space-y-2">
            {recentNotifs.map((n) => (
              <div key={n.id} className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-2 text-xs">
                <Zap className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                <span className="flex-1 truncate font-medium">{n.title}</span>
                <span className="text-muted-foreground shrink-0">
                  {new Date(n.created_date).toLocaleString("ja-JP", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}