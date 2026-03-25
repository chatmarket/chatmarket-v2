import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Users, TrendingUp, CreditCard, Settings, AlertCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [stripeApiKey, setStripeApiKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          if (u.email !== "unei@chatmarket.info") {
            window.location.href = "/";
            return;
          }
          setUser(u);
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // 全体統計
  const { data: allUsers = [] } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  const { data: allChannels = [] } = useQuery({
    queryKey: ["admin-all-channels"],
    queryFn: () => base44.entities.Channel.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  const { data: allVideos = [] } = useQuery({
    queryKey: ["admin-all-videos"],
    queryFn: () => base44.entities.Video.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  const { data: allStreams = [] } = useQuery({
    queryKey: ["admin-all-streams"],
    queryFn: () => base44.entities.LiveStream.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  const { data: allCalls = [] } = useQuery({
    queryKey: ["admin-all-calls"],
    queryFn: () => base44.entities.VideoCall.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  const { data: allPurchases = [] } = useQuery({
    queryKey: ["admin-all-purchases"],
    queryFn: () => base44.entities.Purchase.list(),
    enabled: !!user && user.email === "unei@chatmarket.info",
  });

  if (!user || user.email !== "unei@chatmarket.info") {
    return null;
  }

  // 収益計算
  const totalVideoRevenue = allPurchases
    .filter((p) => p.item_type === "video")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalStreamRevenue = allPurchases
    .filter((p) => p.item_type === "livestream")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalCallRevenue = allCalls
    .filter((c) => c.status === "ended" && (c.price || 0) > 0)
    .reduce((sum, c) => sum + (c.price || 0), 0);

  const totalPlatformFee = 
    Math.floor(totalVideoRevenue * 0.15) +
    Math.floor(totalStreamRevenue * 0.15) +
    Math.floor(totalCallRevenue * 0.30);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveStripe = async () => {
    if (!stripeApiKey || !stripeWebhookSecret) {
      toast.error("API KeyとWebhook Secretの両方を入力してください");
      return;
    }
    setSavingStripe(true);
    await base44.auth.updateMe({
      stripe_api_key: stripeApiKey,
      stripe_webhook_secret: stripeWebhookSecret,
    });
    toast.success("Stripe連携を保存しました");
    setSavingStripe(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <h1 className="text-3xl font-bold">運営管理ダッシュボード</h1>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-4 h-4" />
            <span className="text-sm font-semibold">総ユーザー数</span>
          </div>
          <p className="text-3xl font-black">{allUsers.length}</p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-semibold">チャンネル数</span>
          </div>
          <p className="text-3xl font-black">{allChannels.length}</p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-semibold">総流通額</span>
          </div>
          <p className="text-3xl font-black text-primary">
            ¥{(totalVideoRevenue + totalStreamRevenue + totalCallRevenue).toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CreditCard className="w-4 h-4" />
            <span className="text-sm font-semibold">プラットフォーム手数料</span>
          </div>
          <p className="text-3xl font-black text-yellow-400">
            ¥{totalPlatformFee.toLocaleString()}
          </p>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue="revenue">
        <TabsList className="bg-secondary">
          <TabsTrigger value="revenue" className="gap-2">
            <DollarSign className="w-4 h-4" /> 収益管理
          </TabsTrigger>
          <TabsTrigger value="stripe" className="gap-2">
            <CreditCard className="w-4 h-4" /> Stripe連携
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" /> ユーザー管理
          </TabsTrigger>
        </TabsList>

        {/* 収益管理タブ */}
        <TabsContent value="revenue" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 動画販売 */}
            <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400" />
                動画販売
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">販売総額</span>
                  <span className="font-semibold">¥{totalVideoRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">プラットフォーム手数料（15%）</span>
                  <span className="font-semibold text-yellow-400">¥{Math.floor(totalVideoRevenue * 0.15).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">クリエイター配分（85%）</span>
                  <span className="font-semibold text-green-400">¥{Math.floor(totalVideoRevenue * 0.85).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 mt-2">
                  販売件数: {allPurchases.filter((p) => p.item_type === "video").length}件
                </div>
              </div>
            </div>

            {/* ライブ配信 */}
            <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                ライブ配信
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">販売総額</span>
                  <span className="font-semibold">¥{totalStreamRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">プラットフォーム手数料（15%）</span>
                  <span className="font-semibold text-yellow-400">¥{Math.floor(totalStreamRevenue * 0.15).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">クリエイター配分（85%）</span>
                  <span className="font-semibold text-green-400">¥{Math.floor(totalStreamRevenue * 0.85).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 mt-2">
                  販売件数: {allPurchases.filter((p) => p.item_type === "livestream").length}件
                </div>
              </div>
            </div>

            {/* ビデオ通話 */}
            <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400" />
                ビデオ通話
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">販売総額</span>
                  <span className="font-semibold">¥{totalCallRevenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">プラットフォーム手数料（30%）</span>
                  <span className="font-semibold text-yellow-400">¥{Math.floor(totalCallRevenue * 0.30).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">クリエイター配分（70%）</span>
                  <span className="font-semibold text-green-400">¥{Math.floor(totalCallRevenue * 0.70).toLocaleString()}</span>
                </div>
                <div className="text-xs text-muted-foreground bg-secondary rounded-lg p-2 mt-2">
                  終了通話: {allCalls.filter((c) => c.status === "ended").length}件
                </div>
              </div>
            </div>

            {/* 合計 */}
            <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl border border-primary/40 p-5 space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-primary" />
                プラットフォーム手数料合計
              </h3>
              <div className="space-y-2">
                <p className="text-3xl font-black text-primary">
                  ¥{totalPlatformFee.toLocaleString()}
                </p>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>• 月額手数料収入の目安として利用</p>
                  <p>• 実際の出金は各クリエイターの申請に基づく</p>
                </div>
              </div>
            </div>
          </div>

          {/* 収益内訳表 */}
          <div className="bg-card rounded-xl border border-border/50 p-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-3 font-bold">項目</th>
                  <th className="text-right py-3 px-3 font-bold">販売総額</th>
                  <th className="text-right py-3 px-3 font-bold">手数料率</th>
                  <th className="text-right py-3 px-3 font-bold">手数料額</th>
                  <th className="text-right py-3 px-3 font-bold">クリエイター配分</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/30 hover:bg-secondary/50">
                  <td className="py-3 px-3">動画販売</td>
                  <td className="text-right py-3 px-3">¥{totalVideoRevenue.toLocaleString()}</td>
                  <td className="text-right py-3 px-3">15%</td>
                  <td className="text-right py-3 px-3 text-yellow-400">¥{Math.floor(totalVideoRevenue * 0.15).toLocaleString()}</td>
                  <td className="text-right py-3 px-3 text-green-400">¥{Math.floor(totalVideoRevenue * 0.85).toLocaleString()}</td>
                </tr>
                <tr className="border-b border-border/30 hover:bg-secondary/50">
                  <td className="py-3 px-3">ライブ配信</td>
                  <td className="text-right py-3 px-3">¥{totalStreamRevenue.toLocaleString()}</td>
                  <td className="text-right py-3 px-3">15%</td>
                  <td className="text-right py-3 px-3 text-yellow-400">¥{Math.floor(totalStreamRevenue * 0.15).toLocaleString()}</td>
                  <td className="text-right py-3 px-3 text-green-400">¥{Math.floor(totalStreamRevenue * 0.85).toLocaleString()}</td>
                </tr>
                <tr className="bg-secondary/50">
                  <td className="py-3 px-3 font-bold">ビデオ通話</td>
                  <td className="text-right py-3 px-3 font-bold">¥{totalCallRevenue.toLocaleString()}</td>
                  <td className="text-right py-3 px-3 font-bold">30%</td>
                  <td className="text-right py-3 px-3 font-bold text-yellow-400">¥{Math.floor(totalCallRevenue * 0.30).toLocaleString()}</td>
                  <td className="text-right py-3 px-3 font-bold text-green-400">¥{Math.floor(totalCallRevenue * 0.70).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Stripe連携タブ */}
        <TabsContent value="stripe" className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-300">Stripeの本番API KeyとWebhook Secretを安全に保管します。このページは運営管理者のみアクセス可能です。</p>
          </div>

          <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4 max-w-lg">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Stripe API Key（sk_live_...）</label>
              <Input
                type="password"
                value={stripeApiKey}
                onChange={(e) => setStripeApiKey(e.target.value)}
                placeholder="sk_live_..."
                className="bg-secondary border-0"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold">Stripe Webhook Secret（whsec_...）</label>
              <Input
                type="password"
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder="whsec_..."
                className="bg-secondary border-0"
              />
            </div>

            <Button
              onClick={handleSaveStripe}
              disabled={savingStripe}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {savingStripe ? "保存中..." : "保存する"}
            </Button>

            <div className="text-xs text-muted-foreground space-y-1 bg-secondary rounded-lg p-3">
              <p>• API Keyは https://dashboard.stripe.com/apikeys から取得</p>
              <p>• Webhook Secretは https://dashboard.stripe.com/webhooks から取得</p>
              <p>• 本番環境のみ対応（test_keyは使用不可）</p>
            </div>
          </div>
        </TabsContent>

        {/* ユーザー管理タブ */}
        <TabsContent value="users" className="space-y-6">
          <div className="bg-card rounded-xl border border-border/50 p-5">
            <p className="text-sm text-muted-foreground mb-4">登録済みユーザー一覧（{allUsers.length}件）</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3">メール</th>
                    <th className="text-left py-2 px-3">名前</th>
                    <th className="text-left py-2 px-3">ロール</th>
                    <th className="text-left py-2 px-3">登録日</th>
                    <th className="text-center py-2 px-3">コピー</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.slice(0, 20).map((u) => (
                    <tr key={u.id} className="border-b border-border/30 hover:bg-secondary/50">
                      <td className="py-2 px-3 font-mono text-xs">{u.email}</td>
                      <td className="py-2 px-3">{u.full_name || "未設定"}</td>
                      <td className="py-2 px-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === "admin" ? "bg-red-500/20 text-red-300" : "bg-secondary text-foreground"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{new Date(u.created_date).toLocaleDateString("ja-JP")}</td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => copyToClipboard(u.email, u.id)}
                          className="text-primary hover:text-primary/80 transition-colors"
                        >
                          {copiedId === u.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {allUsers.length > 20 && (
              <p className="text-xs text-muted-foreground mt-3">表示: 20件 / 全 {allUsers.length}件</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}