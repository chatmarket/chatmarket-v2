import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Coins, Users, Settings, TrendingUp, Save, X } from "lucide-react";
import { toast } from "sonner";

export default function FanClubManage() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    fanclub_enabled: false,
    fanclub_monthly_price: 500,
    fanclub_description: "",
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => setUser(u)).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["fanclub-manage-channel", user?.email],
    queryFn: () =>
      base44.entities.Channel.filter({ owner_email: user.email }).then(
        (r) => r[0] || null
      ),
    enabled: !!user?.email,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["fanclub-members", channel?.id],
    queryFn: () =>
      base44.entities.PlanSubscription.filter({
        plan_id: "fanclub",
        user_email: channel?.owner_email,
        status: "active",
      }),
    enabled: !!channel?.id,
  });

  useEffect(() => {
    if (channel) {
      setFormData({
        fanclub_enabled: channel.fanclub_enabled || false,
        fanclub_monthly_price: channel.fanclub_monthly_price || 500,
        fanclub_description: channel.fanclub_description || "",
      });
    }
  }, [channel]);

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.Channel.update(channel.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fanclub-manage-channel"] });
      toast.success("ファンクラブ設定を保存しました");
    },
    onError: () => toast.error("保存に失敗しました"),
  });

  const handleSave = async () => {
    setSaving(true);
    saveMutation.mutate(formData, {
      onSettled: () => setSaving(false),
    });
  };

  if (!user || !channel) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">チャンネル情報を読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">ファンクラブ管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {channel.name} のファンクラブを開設・管理します
          </p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="w-4 h-4" /> 設定
          </TabsTrigger>
          <TabsTrigger value="members" className="gap-2">
            <Users className="w-4 h-4" /> 会員
          </TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2">
            <TrendingUp className="w-4 h-4" /> 売上
          </TabsTrigger>
        </TabsList>

        {/* 設定タブ */}
        <TabsContent value="settings" className="space-y-6">
          {/* ファンクラブ有効化 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">ファンクラブを有効化</p>
                <p className="text-sm text-muted-foreground mt-1">
                  クリエイターページにファンクラブ入会ボタンを表示します
                </p>
              </div>
              <Switch
                checked={formData.fanclub_enabled}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, fanclub_enabled: checked })
                }
              />
            </div>
          </div>

          {/* 月額料金（固定3ティア表示） */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <label className="text-sm font-bold block">月額料金プラン（Stripe連携・固定）</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "⭐ Standard", price: 500, color: "border-zinc-500/40 bg-zinc-500/5" },
                { label: "👑 Premium", price: 3000, color: "border-blue-500/40 bg-blue-500/5" },
                { label: "💎 Diamond", price: 10000, color: "border-amber-500/40 bg-amber-500/5" },
              ].map(({ label, price, color }) => (
                <div key={price} className={`rounded-xl border p-3 text-center ${color}`}>
                  <p className="text-xs font-bold text-muted-foreground">{label}</p>
                  <p className="text-lg font-black mt-1">¥{price.toLocaleString()}</p>
                  <p className="text-[10px] text-primary mt-0.5">手取り ¥{Math.floor(price * 0.85).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-3 py-2">
              💡 価格はStripe側で管理されています。変更が必要な場合はStripeダッシュボードで対応します。
            </p>
          </div>

          {/* 説明文 */}
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <label className="text-sm font-bold block">
              ファンクラブの説明・特典
            </label>
            <Textarea
              value={formData.fanclub_description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fanclub_description: e.target.value,
                })
              }
              placeholder="例：限定動画、先行販売、月1回のライブ相談、チャットグループへのアクセス..."
              rows={6}
              className="bg-secondary border-0 resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {formData.fanclub_description.length} / 1000文字
            </p>
          </div>

          {/* 保存ボタン */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-primary hover:bg-primary/90 gap-2 font-black h-12"
          >
            <Save className="w-5 h-5" />
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </TabsContent>

        {/* 会員タブ */}
        <TabsContent value="members" className="space-y-4">
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="text-center space-y-2">
              <p className="text-4xl font-black text-primary">
                {members.length}
              </p>
              <p className="text-muted-foreground">アクティブな会員</p>
            </div>

            {members.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>まだファンクラブ会員がいません</p>
                <p className="text-sm mt-2">
                  ファンクラブを有効化すると、ファンが入会できるようになります
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">
                  最近の入会者
                </p>
                {members.slice(0, 10).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                  >
                    <span className="text-sm font-medium truncate">
                      {m.user_email}
                    </span>
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
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/40 p-6 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">月間想定売上</p>
              <p className="text-4xl font-black text-primary">
                ¥
                {(
                  members.length * formData.fanclub_monthly_price
                ).toLocaleString()}
              </p>
            </div>
            <div className="space-y-2 pt-4 border-t border-primary/20">
              <p className="text-sm text-muted-foreground">あなたの手取り (85%)</p>
              <p className="text-3xl font-black text-green-400">
                ¥
                {Math.floor(
                  members.length * formData.fanclub_monthly_price * 0.85
                ).toLocaleString()}
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}