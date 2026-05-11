import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Crown, Coins, Users, Settings, TrendingUp, Save, Plus, Trash2, GripVertical } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_TIERS = [
  { tier_id: "standard", name: "Standard", price: 500, emoji: "⭐", perks: ["限定投稿・写真を閲覧", "コミュニティ掲示板への投稿", "スタンダードバッジ"], description: "", stripe_price_id: "" },
  { tier_id: "premium",  name: "Premium",  price: 3000, emoji: "👑", perks: ["Standard の全特典", "限定ライブへの招待", "プレミアムバッジ"],   description: "", stripe_price_id: "" },
  { tier_id: "diamond",  name: "Diamond",  price: 10000, emoji: "💎", perks: ["Premium の全特典", "月1回の1対1ビデオ通話権", "ダイヤモンドバッジ"], description: "", stripe_price_id: "" },
];

function TierEditor({ tier, onChange, onDelete, index }) {
  const updatePerk = (i, val) => {
    const newPerks = [...tier.perks];
    newPerks[i] = val;
    onChange({ ...tier, perks: newPerks });
  };
  const addPerk = () => onChange({ ...tier, perks: [...tier.perks, ""] });
  const removePerk = (i) => onChange({ ...tier, perks: tier.perks.filter((_, idx) => idx !== i) });

  return (
    <div className="bg-card rounded-2xl border border-border/50 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <span className="text-lg">{tier.emoji}</span>
          <span className="font-black text-sm">{tier.name}</span>
          {tier.stripe_price_id && (
            <span className="text-[10px] bg-green-500/20 text-green-400 border border-green-500/30 px-1.5 py-0.5 rounded-full font-bold">Stripe連携済み</span>
          )}
        </div>
        <button onClick={onDelete} className="text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">絵文字</label>
          <Input value={tier.emoji} onChange={e => onChange({ ...tier, emoji: e.target.value })} className="bg-secondary border-0 text-center text-lg" maxLength={2} />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">ティア名</label>
          <Input value={tier.name} onChange={e => onChange({ ...tier, name: e.target.value })} className="bg-secondary border-0" placeholder="例: VIP" />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-muted-foreground">月額料金（円）</label>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
          <Input
            type="number" min="100" step="100"
            value={tier.price}
            onChange={e => onChange({ ...tier, price: parseInt(e.target.value) || 100, stripe_price_id: "" })}
            className="bg-secondary border-0 font-bold"
          />
          <span className="text-muted-foreground text-sm shrink-0">/月</span>
        </div>
        <p className="text-xs text-primary">手取り ¥{Math.floor(tier.price * 0.85).toLocaleString()} (85%)</p>
        {tier.stripe_price_id && (
          <p className="text-[10px] text-yellow-400">⚠ 価格を変更したのでStripe Price IDをリセットしました。保存時に新しいPrice IDが自動生成されます。</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-muted-foreground">特典リスト</label>
          <button onClick={addPerk} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1">
            <Plus className="w-3 h-3" /> 追加
          </button>
        </div>
        {tier.perks.map((perk, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={perk}
              onChange={e => updatePerk(i, e.target.value)}
              className="bg-secondary border-0 text-sm flex-1"
              placeholder="特典を入力..."
            />
            <button onClick={() => removePerk(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function FanClubManage() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [fanclubEnabled, setFanclubEnabled] = useState(false);
  const [fanclubDescription, setFanclubDescription] = useState("");
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
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
      setTiers(channel.fanclub_tiers?.length > 0 ? channel.fanclub_tiers : DEFAULT_TIERS);
    }
  }, [channel]);

  const handleSave = async () => {
    if (!channel) return;
    setSaving(true);
    try {
      await base44.entities.Channel.update(channel.id, {
        fanclub_enabled: fanclubEnabled,
        fanclub_description: fanclubDescription,
        fanclub_tiers: tiers,
      });
      queryClient.invalidateQueries({ queryKey: ["fanclub-manage-channel"] });
      toast.success("ファンクラブ設定を保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    setTiers([...tiers, {
      tier_id: `tier_${Date.now()}`,
      name: "新しいティア",
      price: 1000,
      emoji: "🌟",
      perks: ["特典を追加してください"],
      description: "",
      stripe_price_id: "",
    }]);
  };

  const updateTier = (index, updated) => {
    const next = [...tiers];
    next[index] = updated;
    setTiers(next);
  };

  const deleteTier = (index) => {
    setTiers(tiers.filter((_, i) => i !== index));
  };

  if (!user || !channel) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <p className="text-muted-foreground">チャンネル情報を読み込み中...</p>
      </div>
    );
  }

  const totalMonthly = members.length > 0
    ? members.reduce((sum) => sum + (tiers[0]?.price || 500), 0)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Crown className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black">ファンクラブ管理</h1>
          <p className="text-sm text-muted-foreground mt-1">{channel.name} のファンクラブを開設・管理します</p>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-6">
        <TabsList className="bg-secondary">
          <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> 設定</TabsTrigger>
          <TabsTrigger value="tiers" className="gap-2"><Crown className="w-4 h-4" /> ティア管理</TabsTrigger>
          <TabsTrigger value="members" className="gap-2"><Users className="w-4 h-4" /> 会員 ({members.length})</TabsTrigger>
          <TabsTrigger value="revenue" className="gap-2"><TrendingUp className="w-4 h-4" /> 売上</TabsTrigger>
        </TabsList>

        {/* 設定タブ */}
        <TabsContent value="settings" className="space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold">ファンクラブを有効化</p>
                <p className="text-sm text-muted-foreground mt-1">クリエイターページにファンクラブ入会ボタンを表示します</p>
              </div>
              <Switch checked={fanclubEnabled} onCheckedChange={setFanclubEnabled} />
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border/50 p-6 space-y-4">
            <label className="text-sm font-bold block">ファンクラブの説明・特典概要</label>
            <Textarea
              value={fanclubDescription}
              onChange={e => setFanclubDescription(e.target.value)}
              placeholder="例：限定動画、先行販売、月1回のライブ相談、チャットグループへのアクセス..."
              rows={6}
              className="bg-secondary border-0 resize-none"
            />
            <p className="text-xs text-muted-foreground">{fanclubDescription.length} / 1000文字</p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 gap-2 font-black h-12">
            <Save className="w-5 h-5" />
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </TabsContent>

        {/* ティア管理タブ */}
        <TabsContent value="tiers" className="space-y-4">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
            💡 ティアの価格を変更すると、<strong>次回の決済から新しい価格が適用</strong>されます（Stripe側でPrice IDを自動生成）。既存会員には影響しません。
          </div>

          {tiers.map((tier, i) => (
            <TierEditor
              key={tier.tier_id}
              index={i}
              tier={tier}
              onChange={(updated) => updateTier(i, updated)}
              onDelete={() => deleteTier(i)}
            />
          ))}

          <button
            onClick={addTier}
            className="w-full border-2 border-dashed border-border/50 rounded-2xl p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
          >
            <Plus className="w-4 h-4" /> ティアを追加
          </button>

          <Button onClick={handleSave} disabled={saving} className="w-full bg-primary hover:bg-primary/90 gap-2 font-black h-12">
            <Save className="w-5 h-5" />
            {saving ? "保存中..." : "ティア設定を保存"}
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
              <div className="text-center py-8 text-muted-foreground">
                <p>まだファンクラブ会員がいません</p>
                <p className="text-sm mt-2">ファンクラブを有効化すると、ファンが入会できるようになります</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-semibold">最近の入会者</p>
                {members.slice(0, 20).map(m => (
                  <div key={m.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-sm font-medium truncate">{m.user_email}</span>
                      {m.plan_name && (
                        <span className="text-[10px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full shrink-0">
                          {m.plan_name.replace("sanctum_", "")}
                        </span>
                      )}
                    </div>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {tiers.map(tier => {
              const tierMembers = members.filter(m => m.plan_name === `sanctum_${tier.tier_id}`);
              return (
                <div key={tier.tier_id} className="bg-card rounded-xl border border-border/50 p-4 text-center space-y-2">
                  <p className="text-lg">{tier.emoji}</p>
                  <p className="text-sm font-bold">{tier.name}</p>
                  <p className="text-2xl font-black text-primary">{tierMembers.length}人</p>
                  <p className="text-xs text-muted-foreground">月 ¥{(tierMembers.length * tier.price).toLocaleString()}</p>
                  <p className="text-xs text-green-400">手取り ¥{Math.floor(tierMembers.length * tier.price * 0.85).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
          <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl border border-primary/40 p-6 space-y-3">
            <p className="text-sm text-muted-foreground">月間合計（手取り 85%）</p>
            <p className="text-4xl font-black text-green-400">
              ¥{Math.floor(members.reduce((sum, m) => {
                const t = tiers.find(t => m.plan_name === `sanctum_${t.tier_id}`);
                return sum + (t?.price || 0);
              }, 0) * 0.85).toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">総会員数: {members.length}人</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}