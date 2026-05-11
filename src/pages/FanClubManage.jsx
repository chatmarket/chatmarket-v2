import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Coins, Users, Settings, TrendingUp, Save } from "lucide-react";
import { toast } from "sonner";

const MIN_PRICE = 300;
const MAX_PRICE = 1000;

export default function FanClubManage() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fanclubEnabled, setFanclubEnabled] = useState(false);
  const [fanclubDescription, setFanclubDescription] = useState("");
  const [price, setPrice] = useState(500);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["fanclub-manage-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["fanclub-members", channel?.id],
    queryFn: () => base44.entities.PlanSubscription.filter({ plan_id: `sanctum_${channel?.id}`, status: "active" }),
    enabled: !!channel?.id,
  });

  useEffect(() => {
    if (channel) {
      setFanclubEnabled(channel.fanclub_enabled || false);
      setFanclubDescription(channel.fanclub_description || "");
      // 単一プランの価格: fanclub_tiers[0] または fanclub_monthly_price にフォールバック
      const savedPrice = channel.fanclub_tiers?.[0]?.price || channel.fanclub_monthly_price || 500;
      setPrice(Math.min(MAX_PRICE, Math.max(MIN_PRICE, savedPrice)));
    }
  }, [channel]);

  const handleSave = async () => {
    if (!channel) return;
    const clampedPrice = Math.min(MAX_PRICE, Math.max(MIN_PRICE, price));
    if (clampedPrice !== price) {
      toast.error(`月額は${MIN_PRICE}円〜${MAX_PRICE}円の範囲で設定してください`);
      return;
    }
    setSaving(true);
    try {
      // 単一プランとして fanclub_tiers に保存（既存の Stripe 連携との互換を維持）
      const singleTier = [{
        tier_id: "member",
        name: "ファンクラブ会員",
        emoji: "👑",
        price: clampedPrice,
        perks: [
          "1対1通話の先行予約権（一般公開24時間前から予約可）",
          "限定投稿・写真を閲覧",
          "メンバー限定ギフト解放",
        ],
        description: fanclubDescription,
        stripe_price_id: "",
      }];
      await base44.entities.Channel.update(channel.id, {
        fanclub_enabled: fanclubEnabled,
        fanclub_description: fanclubDescription,
        fanclub_monthly_price: clampedPrice,
        fanclub_tiers: singleTier,
      });
      queryClient.invalidateQueries({ queryKey: ["fanclub-manage-channel"] });
      toast.success("ファンクラブ設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (!user || !channel) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">チャンネル情報を読み込み中...</p>
      </div>
    );
  }

  const monthlyRevenue = members.length * price;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">ファンクラブ管理</h1>
          <p className="text-sm text-muted-foreground mt-1">{channel.name} のファンクラブを管理します</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> 設定</TabsTrigger>
          <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" /> 会員 ({members.length})</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2"><TrendingUp className="w-4 h-4" /> 売上</TabsTrigger>
        </TabsList>

        {/* 設定タブ */}
        <TabsContent value="settings" className="space-y-6">
          {/* 有効化スイッチ */}
          <div className="bg-card rounded-2xl border border-border/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">ファンクラブを有効化</p>
                <p className="text-sm text-muted-foreground mt-1">チャンネルページに入会ボタンを表示します</p>
              </div>
              <Switch checked={fanclubEnabled} onCheckedChange={setFanclubEnabled} />
            </div>
          </div>

          {/* 月額料金（単一・300〜1,000円） */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-3">
            <label className="text-sm font-bold block">月額料金</label>
            <div className="flex items-center gap-3">
              <Coins className="w-5 h-5 text-yellow-400 shrink-0" />
              <Input
                type="number"
                min={MIN_PRICE}
                max={MAX_PRICE}
                step={10}
                value={price}
                onChange={e => setPrice(parseInt(e.target.value) || MIN_PRICE)}
                placeholder="300〜1,000円で設定してください"
                className="bg-secondary border-0 font-bold text-lg"
              />
              <span className="text-muted-foreground shrink-0">/月</span>
            </div>
            <p className="text-xs text-muted-foreground">設定可能範囲: {MIN_PRICE}円 〜 {MAX_PRICE}円</p>
            <p className="text-xs text-primary">手取り ¥{Math.floor(price * 0.85).toLocaleString()} (85%)</p>
          </div>

          {/* 説明文 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-3">
            <label className="text-sm font-bold block">ファンクラブの説明（任意）</label>
            <Textarea
              value={fanclubDescription}
              onChange={e => setFanclubDescription(e.target.value)}
              placeholder="例：限定動画・先行予約権・メンバー限定チャットが解放されます..."
              rows={4}
              className="bg-secondary border-0 resize-none"
            />
          </div>

          {/* 特典の明示 */}
          <div className="bg-primary/5 border border-primary/30 rounded-xl p-4 space-y-2">
            <p className="text-sm font-bold text-primary">✓ 全会員に自動付与される特典</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• 1対1通話の先行予約権（一般公開24時間前から予約可能）</li>
              <li>• 限定投稿・写真の閲覧</li>
              <li>• メンバー限定ギフト解放</li>
            </ul>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 gap-2 font-black h-12">
            <Save className="w-5 h-5" />
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </TabsContent>

        {/* 会員タブ */}
        <TabsContent value="members" className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-4xl font-black text-primary">{members.length}</p>
              <p className="text-muted-foreground">アクティブな会員</p>
            </div>
            {members.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground text-sm">まだファンクラブ会員がいません</p>
            ) : (
              <div className="space-y-2">
                {members.slice(0, 20).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <span className="text-sm font-medium truncate">{m.user_email}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(m.created_date).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* 売上タブ */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/40 p-6 space-y-3">
            <p className="text-sm text-muted-foreground">月間合計（手取り 85%）</p>
            <p className="text-4xl font-black text-green-400">
              ¥{Math.floor(monthlyRevenue * 0.85).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">
              会員 {members.length}人 × 月額 ¥{price.toLocaleString()} = ¥{monthlyRevenue.toLocaleString()}
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}