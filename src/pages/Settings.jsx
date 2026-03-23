import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, Building2, User, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function Settings() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [bankForm, setBankForm] = useState({
    bank_name: "",
    bank_branch: "",
    bank_account_type: "普通",
    bank_account_number: "",
    bank_account_name: "",
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
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

  const handleSaveBank = async (e) => {
    e.preventDefault();
    if (!channel) return;
    setSaving(true);
    await base44.entities.Channel.update(channel.id, bankForm);
    queryClient.invalidateQueries({ queryKey: ["my-channels"] });
    setSaving(false);
    toast.success("銀行口座情報を保存しました");
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-8">設定</h1>

      {/* Account Info */}
      <Card className="mb-6 bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="w-5 h-5 text-primary" />
            アカウント情報
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">メールアドレス</Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <div className="space-y-2">
            <Label className="text-muted-foreground text-xs">名前</Label>
            <p className="text-sm font-medium">{user.full_name}</p>
          </div>
        </CardContent>
      </Card>

      {/* Bank Account */}
      <Card className="bg-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="w-5 h-5 text-primary" />
            銀行口座登録
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              <Select
                value={bankForm.bank_account_type}
                onValueChange={(v) => setBankForm({ ...bankForm, bank_account_type: v })}
              >
                <SelectTrigger className="bg-secondary border-0">
                  <SelectValue />
                </SelectTrigger>
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
                placeholder="カブシキガイシャ チャットマーケット"
                className="bg-secondary border-0"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full bg-primary hover:bg-primary/90 gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? "保存中..." : "口座情報を保存"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}