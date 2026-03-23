import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Building2, User, Loader2, CreditCard, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    bank_branch: "",
    bank_account_type: "普通",
    bank_account_number: "",
    bank_account_name: "",
  });
  const [profileForm, setProfileForm] = useState({
    nickname: "",
    bio: "",
    address: "",
    phone: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth)
        base44.auth.me().then((u) => {
          setUser(u);
          setProfileForm({
            nickname: u.nickname || "",
            bio: u.bio || "",
            address: u.address || "",
            phone: u.phone || "",
          });
        }).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["my-channels", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }),
    enabled: !!user,
  });

  const channel = channels[0];

  useEffect(() => {
    if (channel) {
      setBankForm({
        bank_name: channel.bank_name || "",
        bank_branch: channel.bank_branch || "",
        bank_account_type: channel.bank_account_type || "普通",
        bank_account_number: channel.bank_account_number || "",
        bank_account_name: channel.bank_account_name || "",
      });
    }
  }, [channel]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (profileForm.bio.length > 200) {
      toast.error("プロフィールコメントは200字以内です");
      return;
    }
    setSavingProfile(true);
    await base44.auth.updateMe(profileForm);
    setSavingProfile(false);
    toast.success("プロフィールを保存しました");
  };

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!channel) return;
    setSaving(true);
    await base44.entities.Channel.update(channel.id, bankForm);
    queryClient.invalidateQueries({ queryKey: ["my-channels"] });
    setSaving(false);
    toast.success("銀行口座情報を保存しました");
  };

  const handleSubscribe = async () => {
    toast.info("サブスク機能は決済連携後に利用可能になります（月額¥3,000）");
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
      <h1 className="text-2xl font-bold">設定</h1>

      {/* Account Info (read-only) */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">メールアドレス</span>
            <span className="font-medium">{user.email}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-border/30">
            <span className="text-muted-foreground">氏名</span>
            <span className="font-medium">{user.full_name}</span>
          </div>
          {user.nickname && (
            <div className="flex justify-between py-1">
              <span className="text-muted-foreground">ニックネーム（表示名）</span>
              <span className="font-medium text-primary">{user.nickname}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BadgeCheck className="w-5 h-5 text-primary" />
            プロフィール設定
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>ニックネーム <span className="text-primary text-xs">（アカウント名として表示）</span></Label>
              <Input
                value={profileForm.nickname}
                onChange={(e) => setProfileForm({ ...profileForm, nickname: e.target.value })}
                placeholder="例：配信太郎"
                className="bg-secondary border-0"
              />
            </div>

            <div className="space-y-2">
              <Label>
                プロフィールコメント
                <span className={`ml-2 text-xs ${profileForm.bio.length > 200 ? "text-destructive" : "text-muted-foreground"}`}>
                  {profileForm.bio.length}/200
                </span>
              </Label>
              <Textarea
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="自己紹介を入力（200字以内）"
                className="bg-secondary border-0 resize-none"
                rows={3}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>住所</Label>
              <Input
                value={profileForm.address}
                onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                placeholder="例：東京都渋谷区..."
                className="bg-secondary border-0"
              />
            </div>

            <div className="space-y-2">
              <Label>電話番号</Label>
              <Input
                type="tel"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="例：090-0000-0000"
                className="bg-secondary border-0"
              />
            </div>

            <Button type="submit" disabled={savingProfile || profileForm.bio.length > 200} className="w-full bg-primary hover:bg-primary/90 gap-2">
              {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {savingProfile ? "保存中..." : "プロフィールを保存"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card className="bg-card border-border/50 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-primary" />
            サブスクリプション
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="font-bold text-primary text-lg">¥3,000 <span className="text-sm font-normal text-muted-foreground">/ 月</span></p>
            <ul className="text-sm text-muted-foreground mt-2 space-y-1">
              <li>・アーカイブ動画 見放題</li>
              <li>・有料ライブ配信 優先視聴</li>
              <li>・エールコイン 毎月ボーナス</li>
            </ul>
          </div>
          {user.is_subscribed ? (
            <div className="flex items-center gap-2 text-primary text-sm font-medium">
              <BadgeCheck className="w-4 h-4" />
              サブスク加入中（{user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString("ja-JP") : "—"} まで有効）
            </div>
          ) : (
            <Button onClick={handleSubscribe} className="w-full bg-primary hover:bg-primary/90 gap-2">
              <CreditCard className="w-4 h-4" />
              サブスクに加入する（¥3,000/月）
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Bank Account */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            収益振込用銀行口座
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4 bg-secondary/60 rounded-lg p-3">
            ※ 振込手数料はご実費負担となります。登録口座への振込時に差し引かれます。
          </p>
          <form onSubmit={handleSaveBank} className="space-y-4">
            <div className="space-y-2">
              <Label>銀行名</Label>
              <Input
                value={bankForm.bank_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_name: e.target.value })}
                placeholder="例：三菱UFJ銀行"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>支店名</Label>
              <Input
                value={bankForm.bank_branch}
                onChange={(e) => setBankForm({ ...bankForm, bank_branch: e.target.value })}
                placeholder="例：渋谷支店"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>口座種別</Label>
              <Select value={bankForm.bank_account_type} onValueChange={(v) => setBankForm({ ...bankForm, bank_account_type: v })}>
                <SelectTrigger className="bg-secondary border-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="普通">普通</SelectItem>
                  <SelectItem value="当座">当座</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>口座番号</Label>
              <Input
                value={bankForm.bank_account_number}
                onChange={(e) => setBankForm({ ...bankForm, bank_account_number: e.target.value })}
                placeholder="1234567"
                className="bg-secondary border-0"
              />
            </div>
            <div className="space-y-2">
              <Label>口座名義（カタカナ）</Label>
              <Input
                value={bankForm.bank_account_name}
                onChange={(e) => setBankForm({ ...bankForm, bank_account_name: e.target.value })}
                placeholder="ヤマダ タロウ"
                className="bg-secondary border-0"
              />
            </div>
            <Button type="submit" disabled={saving || !channel} className="w-full bg-primary hover:bg-primary/90 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "保存中..." : "口座情報を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}