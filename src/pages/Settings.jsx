import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Save, Loader2, User, CreditCard, Building, Camera, Tag, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import CategoryTagSelector from "../components/channel/CategoryTagSelector";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const [profile, setProfile] = useState({
    nickname: "",
    bio: "",
    address: "",
    phone: "",
    avatar_url: "",
  });

  const [bank, setBank] = useState({
    bank_account_name: "",
    bank_name: "",
    bank_branch: "",
    bank_account_number: "",
    bank_account_type: "普通",
  });

  const [subscription, setSubscription] = useState({
    auto_subscribe_price: 3000,
    auto_subscribe_enabled: false,
  });
  const [channelTags, setChannelTags] = useState([]);
  const [channelCategoryId, setChannelCategoryId] = useState("");
  const [channelId, setChannelId] = useState(null);
  const [callSettings, setCallSettings] = useState({
    call_enabled: false,
    call_price_30min: 3000,
    call_price_60min: 5000,
    call_available_dates: "",
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
          setProfile({
            nickname: u.nickname || "",
            bio: u.bio || "",
            address: u.address || "",
            phone: u.phone || "",
            avatar_url: u.avatar_url || "",
          });
          setSubscription({
            auto_subscribe_price: u.auto_subscribe_price || 3000,
            auto_subscribe_enabled: u.auto_subscribe_enabled || false,
          });
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });

    // Load channel info (bank + tags)
    base44.auth.me().then(async (u) => {
      const channels = await base44.entities.Channel.filter({ owner_email: u.email });
      if (channels[0]) {
        setBank({
          bank_account_name: channels[0].bank_account_name || "",
          bank_name: channels[0].bank_name || "",
          bank_branch: channels[0].bank_branch || "",
          bank_account_number: channels[0].bank_account_number || "",
          bank_account_type: channels[0].bank_account_type || "普通",
        });
        setChannelTags(channels[0].tags || []);
        setChannelCategoryId(channels[0].category_id || "");
        setChannelId(channels[0].id);
        setCallSettings({
          call_enabled: channels[0].call_enabled || false,
          call_price_30min: channels[0].call_price_30min || 3000,
          call_price_60min: channels[0].call_price_60min || 5000,
          call_available_dates: channels[0].call_available_dates || "",
        });
      }
    }).catch(() => {});
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      nickname: profile.nickname,
      bio: profile.bio.slice(0, 200),
      address: profile.address,
      phone: profile.phone,
      avatar_url: profile.avatar_url,
    });
    toast.success("プロフィールを保存しました");
    setSaving(false);
  };

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setSaving(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setProfile({ ...profile, avatar_url: file_url });
    await base44.auth.updateMe({ avatar_url: file_url });
    toast.success("プロフィール画像を更新しました");
    setSaving(false);
  };

  const handleSaveSubscription = async () => {
    setSaving(true);
    await base44.auth.updateMe({
      auto_subscribe_price: subscription.auto_subscribe_price,
      auto_subscribe_enabled: subscription.auto_subscribe_enabled,
    });
    toast.success("サブスク設定を保存しました");
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">設定</h1>

      <Tabs defaultValue="profile">
        <TabsList className="bg-secondary mb-8 w-full">
          <TabsTrigger value="profile" className="flex-1 gap-2">
            <User className="w-4 h-4" /> プロフィール
          </TabsTrigger>
          <TabsTrigger value="subscription" className="flex-1 gap-2">
            <CreditCard className="w-4 h-4" /> サブスク
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex-1 gap-2">
            <Building className="w-4 h-4" /> 銀行口座
          </TabsTrigger>
          <TabsTrigger value="category" className="flex-1 gap-2">
            <Tag className="w-4 h-4" /> 業種タグ
          </TabsTrigger>
          <TabsTrigger value="call" className="flex-1 gap-2">
            <PhoneCall className="w-4 h-4" /> 通話設定
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-5">
          <div className="space-y-2">
            <Label>プロフィール画像</Label>
            <label className="cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files && handleAvatarUpload(e.target.files[0])}
                disabled={saving}
              />
              <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-border hover:border-primary/50 transition-colors">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">クリックして画像を選択</p>
            </label>
          </div>

          <div className="space-y-2">
            <Label>ニックネーム（アカウント名）</Label>
            <Input
              value={profile.nickname}
              onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
              placeholder="表示名を入力"
              className="bg-secondary border-0"
            />
          </div>

          <div className="space-y-2">
            <Label>プロフィールコメント（最大200字）</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value.slice(0, 200) })}
              placeholder="自己紹介を入力"
              className="bg-secondary border-0 resize-none"
              rows={4}
            />
            <p className="text-xs text-muted-foreground text-right">{profile.bio.length}/200</p>
          </div>

          <div className="space-y-2">
            <Label>住所</Label>
            <Input
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              placeholder="住所を入力"
              className="bg-secondary border-0"
            />
          </div>

          <div className="space-y-2">
            <Label>電話番号</Label>
            <Input
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              placeholder="電話番号を入力"
              className="bg-secondary border-0"
              type="tel"
            />
          </div>

          <Button onClick={handleSaveProfile} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-5">
          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>自動サブスクリプションを有効にする</Label>
                <p className="text-xs text-muted-foreground mt-1">視聴者が月額でサブスクできるようにします</p>
              </div>
              <Switch
                checked={subscription.auto_subscribe_enabled}
                onCheckedChange={(v) => setSubscription({ ...subscription, auto_subscribe_enabled: v })}
              />
            </div>

            {subscription.auto_subscribe_enabled && (
              <div className="space-y-2">
                <Label>月額料金（円）</Label>
                <Input
                  type="number"
                  min={300}
                  step={100}
                  value={subscription.auto_subscribe_price}
                  onChange={(e) => setSubscription({ ...subscription, auto_subscribe_price: parseInt(e.target.value) || 3000 })}
                  className="bg-secondary border-0"
                />
                <p className="text-xs text-muted-foreground">デフォルト: ¥3,000/月</p>
              </div>
            )}
          </div>

          <Button onClick={handleSaveSubscription} disabled={saving} className="w-full gap-2 bg-primary hover:bg-primary/90">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>

        {/* Bank Tab */}
        <TabsContent value="bank" className="space-y-5">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-400">
            ⚠️ 振込手数料は実費負担となります。正確な口座情報を入力してください。
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>口座名義</Label>
              <Input
                value={bank.bank_account_name}
                onChange={(e) => setBank({ ...bank, bank_account_name: e.target.value })}
                placeholder="カナで入力"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>銀行名</Label>
              <Input
                value={bank.bank_name}
                onChange={(e) => setBank({ ...bank, bank_name: e.target.value })}
                placeholder="例: 三菱UFJ銀行"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input
                value={bank.bank_branch}
                onChange={(e) => setBank({ ...bank, bank_branch: e.target.value })}
                placeholder="支店名を入力"
                className="bg-secondary border-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>口座種別</Label>
                <select
                  value={bank.bank_account_type}
                  onChange={(e) => setBank({ ...bank, bank_account_type: e.target.value })}
                  className="w-full h-9 rounded-md bg-secondary px-3 text-sm text-foreground border-0"
                >
                  <option value="普通">普通</option>
                  <option value="当座">当座</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>口座番号</Label>
                <Input
                  value={bank.bank_account_number}
                  onChange={(e) => setBank({ ...bank, bank_account_number: e.target.value })}
                  placeholder="7桁"
                  className="bg-secondary border-0"
                />
              </div>
            </div>
          </div>

          <Button
            onClick={async () => {
              setSaving(true);
              // Save bank info to user's channel
              const channels = await base44.entities.Channel.filter({ owner_email: user.email });
              if (channels[0]) {
                await base44.entities.Channel.update(channels[0].id, {
                  bank_account_name: bank.bank_account_name,
                  bank_name: bank.bank_name,
                  bank_branch: bank.bank_branch,
                  bank_account_number: bank.bank_account_number,
                  bank_account_type: bank.bank_account_type,
                });
              }
              toast.success("銀行口座を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>
        {/* Category/Tags Tab */}
        <TabsContent value="category" className="space-y-5">
          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div>
              <h3 className="font-bold mb-1">業種・タグ設定</h3>
              <p className="text-xs text-muted-foreground">PDFのマインドマップに基づく業種カテゴリからタグを選択してください。検索で見つけてもらいやすくなります。</p>
            </div>
            <CategoryTagSelector value={channelTags} onChange={setChannelTags} />
          </div>
          <Button
            onClick={async () => {
              if (!channelId) { toast.error("チャンネルが見つかりません"); return; }
              setSaving(true);
              await base44.entities.Channel.update(channelId, { tags: channelTags });
              toast.success("業種タグを保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            タグを保存する
          </Button>
        </TabsContent>
        {/* Call Settings Tab */}
        <TabsContent value="call" className="space-y-5">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 text-sm">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <PhoneCall className="w-4 h-4 text-primary" /> 1対1ビデオ通話設定
            </p>
            <p className="text-xs text-muted-foreground">BASICプラン加入者のみが申し込みできます。料金はあなた（配信者）が設定し、申込者が支払います。</p>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border/50 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>通話受付を有効にする</Label>
                <p className="text-xs text-muted-foreground mt-0.5">ONにすると申し込みを受け付けます</p>
              </div>
              <Switch
                checked={callSettings.call_enabled}
                onCheckedChange={(v) => setCallSettings({ ...callSettings, call_enabled: v })}
              />
            </div>

            {callSettings.call_enabled && (
              <>
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <Label>30分の通話料金（円）</Label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={callSettings.call_price_30min}
                    onChange={(e) => setCallSettings({ ...callSettings, call_price_30min: parseInt(e.target.value) || 0 })}
                    className="bg-secondary border-0"
                  />
                  <p className="text-xs text-muted-foreground">あなたの受取額: ¥{Math.floor((callSettings.call_price_30min || 0) * 0.9).toLocaleString()}（手数料10%差引後）</p>
                </div>

                <div className="space-y-2">
                  <Label>60分の通話料金（円）</Label>
                  <Input
                    type="number"
                    min={100}
                    step={100}
                    value={callSettings.call_price_60min}
                    onChange={(e) => setCallSettings({ ...callSettings, call_price_60min: parseInt(e.target.value) || 0 })}
                    className="bg-secondary border-0"
                  />
                  <p className="text-xs text-muted-foreground">あなたの受取額: ¥{Math.floor((callSettings.call_price_60min || 0) * 0.9).toLocaleString()}（手数料10%差引後）</p>
                </div>

                <div className="space-y-2">
                  <Label>通話可能スケジュール</Label>
                  <Textarea
                    value={callSettings.call_available_dates}
                    onChange={(e) => setCallSettings({ ...callSettings, call_available_dates: e.target.value })}
                    placeholder={"例:\n毎週火・木 19:00〜22:00\n土日 10:00〜18:00\n※2日前までにチャットでご予約ください"}
                    className="bg-secondary border-0 resize-none"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">申込ページに表示されます。申込者への案内として記入してください。</p>
                </div>
              </>
            )}
          </div>

          <Button
            onClick={async () => {
              if (!channelId) { toast.error("チャンネルが見つかりません"); return; }
              setSaving(true);
              await base44.entities.Channel.update(channelId, {
                call_enabled: callSettings.call_enabled,
                call_price_30min: callSettings.call_price_30min,
                call_price_60min: callSettings.call_price_60min,
                call_available_dates: callSettings.call_available_dates,
              });
              toast.success("通話設定を保存しました");
              setSaving(false);
            }}
            disabled={saving}
            className="w-full gap-2 bg-primary hover:bg-primary/90"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            保存する
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}