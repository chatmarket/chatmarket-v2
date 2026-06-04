import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { DollarSign, Users, TrendingUp, CreditCard, Settings, AlertCircle, Copy, Check, Coins, RefreshCw, FileText, Home, CheckCircle, XCircle, ExternalLink, ShieldAlert, Ban, Radio, Phone, Tag, Zap, Music, Star, Ticket, Percent, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import UserDetailModal from "../components/admin/UserDetailModal";
import AnnualFinancialStatement from "../components/admin/AnnualFinancialStatement";
import ReportManagement from "../components/admin/ReportManagement";
import ContentModeration from "../components/admin/ContentModeration.jsx";
import KycManagement from "../components/admin/KycManagement.jsx";
import ProgressiveIncentiveList from "../components/admin/ProgressiveIncentiveList";
import ProgressiveRateMasterManager from "../components/admin/ProgressiveRateMasterManager";
import CrowdfundingManagement from "../components/admin/CrowdfundingManagement";
import ChannelSuspensionManagement from "../components/admin/ChannelSuspensionManagement";
import WithdrawalManagement from "../components/admin/WithdrawalManagement";
import LiveStreamCostMonitor from "../components/admin/LiveStreamCostMonitor";
import VideoCallCostMonitor from "../components/admin/VideoCallCostMonitor";
import CallProfitBreakdown from "../components/admin/CallProfitBreakdown";
import RecordingCostBreakdown from "../components/admin/RecordingCostBreakdown";
import CampaignChannelManagement from "../components/admin/CampaignChannelManagement";
import CampaignManagement from "../components/admin/CampaignManagement";
import DrameSettingsManagement from "../components/admin/DrameSettingsManagement";
import CallUsageLimitManagement from "../components/admin/CallUsageLimitManagement";
import TestUserCreationForm from "../components/admin/TestUserCreationForm";
import RegisteredTestUsersList from "../components/admin/RegisteredTestUsersList";
import RecruitApplicationManagement from "../components/admin/RecruitApplicationManagement";
import PurchaseReportTab from "../components/admin/PurchaseReportTab";
import CopyrightReportManager from "../components/admin/CopyrightReportManager";
import NgWordManagement from "../components/admin/NgWordManagement";
import IdolApplicationManagement from "../components/admin/IdolApplicationManagement";
import TicketBuyerExport from "../components/admin/TicketBuyerExport";
import SpecialRateManager from "../components/admin/SpecialRateManager";
import LineNotifySettings from "../components/admin/LineNotifySettings";
import { isAdmin } from "@/lib/adminConfig";
import MetaHelmet from "@/components/layout/MetaHelmet";

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const [stripeApiKey, setStripeApiKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [savingStripe, setSavingStripe] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const queryClient = useQueryClient();

  // URLパラメータでタブ初期値を制御
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "revenue";

  const VIEWER_EMAILS = [];
  const ADMIN_EMAILS = [];
  const isViewerOnly = false;
  const displayUserRole = user?.role;

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          if (u.role !== "admin") {
            window.location.href = "/";
            return;
          }
          setUser(u);
          setUserLoading(false);
        });
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  // userLoadingがfalseになり、かつadminであることが確定してからのみクエリ実行
  const isAdminUser = !userLoading && user?.role === 'admin';

  const adminQueryOptions = {
    enabled: isAdminUser,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
  };

  const { data: stripeBalance, isLoading: loadingStripe, refetch: refetchStripe } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-stripe-balance"],
    queryFn: async () => {
      const response = await base44.functions.invoke('getStripeBalance', {});
      return response.data;
    },
  });

  // 全体統計（User エンティティはRLSで直接listできないためバックエンド関数経由）
  const { data: allUsers = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-users"],
    queryFn: () => base44.functions.invoke('adminGetAllUsers', {}).then(r => r.data?.users || []),
  });

  const { data: allChannels = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-channels"],
    queryFn: () => base44.entities.Channel.list(),
  });

  const { data: allVideos = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-videos"],
    queryFn: () => base44.entities.Video.list(),
  });

  const { data: allStreams = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-streams"],
    queryFn: () => base44.entities.LiveStream.list(),
  });

  const { data: allCalls = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-calls"],
    queryFn: () => base44.entities.VideoCall.list(),
  });

  const { data: allPurchases = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-purchases"],
    queryFn: () => base44.entities.Purchase.list(),
  });

  const { data: allYellCoinTransactions = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-yell-transactions"],
    queryFn: () => base44.entities.YellCoinTransaction.list(),
  });

  const { data: allYellCoinWallets = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-yell-wallets"],
    queryFn: () => base44.entities.YellCoinWallet.list(),
  });

  const { data: allSubscriptions = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-subscriptions"],
    queryFn: () => base44.entities.PlanSubscription.list(),
  });

  // 管理者・ビューアー以外のサブスク加入者のみカウント
  const filteredSubscriptions = allSubscriptions.filter((s) => !VIEWER_EMAILS.includes(s.user_email));

  const { data: allCancellationReasons = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-cancellation-reasons"],
    queryFn: () => base44.entities.CancellationReason.list(),
  });

  const { data: allCrowdfundingProjects = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-all-crowdfunding-projects"],
    queryFn: () => base44.entities.CrowdfundingProject.list(),
  });

  const { data: applications = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-recruit-applications"],
    queryFn: () =>
      base44.entities.BlogPost.filter(
        { channel_id: "recruit_application" },
        "-created_date"
      ),
  });

  const { data: pendingReports = [] } = useQuery({
    ...adminQueryOptions,
    queryKey: ["admin-pending-reports"],
    queryFn: () => base44.entities.ChannelReport.filter({ status: "pending" }),
  });

  if (!user || !isAdmin(user)) {
    return null;
  }

  // 収益計算（ビューアー分除外）
  const excludedEmails = [...VIEWER_EMAILS];
  const totalVideoRevenue = allPurchases
    .filter((p) => p.item_type === "video" && !excludedEmails.includes(p.created_by))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalStreamRevenue = allPurchases
    .filter((p) => p.item_type === "livestream" && !excludedEmails.includes(p.created_by))
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // コイン消費ベースの通話収益（確定仕様: 150コイン/15分、手数料0%）
  const totalCallCoins = allCalls
    .filter((c) => c.status === "ended" && (c.coins_consumed || 0) > 0 && !excludedEmails.includes(c.caller_email) && !excludedEmails.includes(c.callee_email))
    .reduce((sum, c) => sum + (c.coins_consumed || 0), 0);
  const totalCallRevenue = totalCallCoins; // コイン = 円

  const totalPlatformFee = 
    Math.floor(totalVideoRevenue * 0.15) +
    Math.floor(totalStreamRevenue * 0.15) +
    0; // 通話は手数料0%

  // エールコイン統計
  const totalYellCoinCharged = allYellCoinTransactions
    .filter((t) => t.type === "charge")
    .reduce((sum, t) => sum + (t.yen_amount || 0), 0);

  const totalYellCoinSent = allYellCoinTransactions
    .filter((t) => t.type === "send")
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalYellCoinBalance = allYellCoinWallets.reduce((sum, w) => sum + (w.balance || 0), 0);

  // 日別・月別のエールコインチャージ
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const todayYellCoinCharged = allYellCoinTransactions
    .filter((t) => t.type === "charge" && new Date(t.created_date) >= todayStart)
    .reduce((sum, t) => sum + (t.yen_amount || 0), 0);

  const monthYellCoinCharged = allYellCoinTransactions
    .filter((t) => t.type === "charge" && new Date(t.created_date) >= monthStart)
    .reduce((sum, t) => sum + (t.yen_amount || 0), 0);

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
    // Refetch balance after saving
    setTimeout(() => refetchStripe(), 1000);
    setSavingStripe(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <MetaHelmet title="運営管理ダッシュボード | ChatMarket" noindex={true} />
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
            <Settings className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">運営管理ダッシュボード</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/admin/metrics">
            <Button variant="outline" className="gap-2 border-primary/40 text-primary hover:bg-primary/10">
              <TrendingUp className="w-4 h-4" /> 社長向けメトリクス
            </Button>
          </Link>
          <Link to="/admin/ng-word-analytics">
            <Button variant="outline" className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
              <ShieldAlert className="w-4 h-4" /> NGワード分析
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline" className="gap-2">
              <Home className="w-4 h-4" /> TOPに戻る
            </Button>
          </Link>
        </div>
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

        <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl border border-blue-500/40 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="w-4 h-4" />
              <span className="text-sm font-semibold">Stripe 残高</span>
            </div>
            <button
              onClick={() => refetchStripe()}
              disabled={loadingStripe}
              className="text-blue-400 hover:text-blue-300 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStripe ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {loadingStripe ? (
            <div className="space-y-2">
              <div className="h-6 bg-blue-400/20 rounded animate-pulse" />
              <div className="h-4 bg-blue-400/20 rounded animate-pulse w-2/3" />
            </div>
          ) : stripeBalance ? (
            <div className="space-y-2">
              <p className="text-3xl font-black text-blue-400">
                ¥{stripeBalance.available.toLocaleString()}
              </p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>利用可能: ¥{stripeBalance.available.toLocaleString()}</p>
                <p>保留中: ¥{stripeBalance.pending.toLocaleString()}</p>
                <p className="text-blue-400">合計: ¥{stripeBalance.total.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  更新: {new Date(stripeBalance.lastUpdated).toLocaleString("ja-JP")}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Stripe API Key が設定されていません</p>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-semibold">エールコイン本日チャージ</span>
          </div>
          <p className="text-3xl font-black text-yellow-500">
            ¥{todayYellCoinCharged.toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-semibold">エールコイン今月チャージ</span>
          </div>
          <p className="text-3xl font-black text-yellow-500">
            ¥{monthYellCoinCharged.toLocaleString()}
          </p>
        </div>

        <div className="bg-card rounded-xl border border-border/50 p-5 space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm font-semibold">エールコイン全残高</span>
          </div>
          <p className="text-3xl font-black text-yellow-400">
            {totalYellCoinBalance.toLocaleString()} 枚
          </p>
        </div>
      </div>

      {/* タブ */}
      <Tabs defaultValue={initialTab}>
        <div className="overflow-x-auto border-b border-border/50">
          <TabsList className="bg-secondary flex flex-wrap gap-0 rounded-none p-0 h-auto w-full">
            <div className="flex flex-wrap gap-0">
              {/* 📊 基本管理 */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="revenue" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <DollarSign className="w-4 h-4" /> 収益管理
                </TabsTrigger>
                <TabsTrigger value="subscription" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Coins className="w-4 h-4" /> サブスク
                </TabsTrigger>
                <TabsTrigger value="stripe" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <CreditCard className="w-4 h-4" /> Stripe
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Users className="w-4 h-4" /> ユーザー
                </TabsTrigger>
                <TabsTrigger value="financial" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <FileText className="w-4 h-4" /> 決算書
                </TabsTrigger>
              </div>

              {/* ⚖️ 管理・審査 */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="reports" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <AlertCircle className="w-4 h-4" /> 通報
                </TabsTrigger>
                <TabsTrigger value="moderation" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <AlertCircle className="w-4 h-4" /> 審査
                </TabsTrigger>
                <TabsTrigger value="kyc" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Users className="w-4 h-4" /> KYC
                </TabsTrigger>
                <TabsTrigger value="suspension" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary relative">
                  <Ban className="w-4 h-4" /> 閉鎖
                  {pendingReports.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-3 h-3 rounded-full flex items-center justify-center text-[8px]">
                      {pendingReports.length > 9 ? "9+" : pendingReports.length}
                    </span>
                  )}
                </TabsTrigger>
              </div>

              {/* 💰 マネタイズ */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="crowdfunding" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <DollarSign className="w-4 h-4" /> CF
                </TabsTrigger>
                <TabsTrigger value="incentive" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <TrendingUp className="w-4 h-4" /> 還元率
                </TabsTrigger>
                <TabsTrigger value="withdrawal" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <DollarSign className="w-4 h-4" /> 払出
                </TabsTrigger>
              </div>

              {/* 🎛️ インフラ・設定 */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="live-cost" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Radio className="w-4 h-4" /> ライブ
                </TabsTrigger>
                <TabsTrigger value="call-cost" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Phone className="w-4 h-4" /> 通話
                </TabsTrigger>
                <TabsTrigger value="campaign" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Tag className="w-4 h-4" /> キャンペーン
                </TabsTrigger>
                <TabsTrigger value="drama" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Zap className="w-4 h-4" /> 演出
                </TabsTrigger>
                <TabsTrigger value="call-limit" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Phone className="w-4 h-4" /> 制限
                </TabsTrigger>
              </div>

              {/* 🎵 著作権 */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="copyright" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Music className="w-4 h-4" /> 著作権料
                </TabsTrigger>
                <TabsTrigger value="ng-words" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <ShieldAlert className="w-4 h-4" /> NGワード
                </TabsTrigger>
              </div>

              {/* 🎯 特別料率・LP */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="special-rates" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Percent className="w-4 h-4" /> 特別料率
                </TabsTrigger>
              </div>

              {/* 🔔 通知設定 */}
              <div className="flex gap-0 border-r border-border/30">
                <TabsTrigger value="line-notify" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <MessageCircle className="w-4 h-4" /> LINE通知
                </TabsTrigger>
              </div>

              {/* 📝 レポート・ライバー */}
              <div className="flex gap-0">
                <TabsTrigger value="ticket-buyers" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Ticket className="w-4 h-4" /> チケット購入者
                </TabsTrigger>
                <TabsTrigger value="idol-applications" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <Star className="w-4 h-4" /> アイドル応募
                </TabsTrigger>
                <TabsTrigger value="recruit" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary relative">
                  <Zap className="w-4 h-4" /> 申込
                  {applications.filter(a => !a.recruit_status || a.recruit_status === "未対応").length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-3 h-3 rounded-full flex items-center justify-center text-[8px]">
                      {applications.filter(a => !a.recruit_status || a.recruit_status === "未対応").length > 9 ? "9+" : applications.filter(a => !a.recruit_status || a.recruit_status === "未対応").length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="purchases" className="gap-2 rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
                  <CreditCard className="w-4 h-4" /> 決済
                </TabsTrigger>
              </div>
            </div>
          </TabsList>
        </div>

        {/* サブスク管理タブ */}
        <TabsContent value="subscription" className="space-y-6">
          {(() => {
            // プラン毎の統計
            const PLANS = ["basic", "vod", "ppv", "call-anser"];
            const PLAN_NAMES = {
              basic: "BASICプラン",
              vod: "VODプラン",
              ppv: "PPVプラン",
              "call-anser": "CALL&ANSERプラン"
            };
            const PLAN_PRICES = {
              basic: 0,
              vod: 0,
              ppv: 0,
              "call-anser": 0
            };

            // 管理者ユーザーならフィルターしない、それ以外は管理者メール除外
            const displaySubscriptions = allSubscriptions;

            const subscriptionStats = PLANS.map((planId) => {
              const active = displaySubscriptions.filter((s) => s.plan_id === planId && s.status === "active").length;
              const cancelled = displaySubscriptions.filter((s) => s.plan_id === planId && s.status === "cancelled").length;
              const total = active + cancelled;
              const churnRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : 0;
              const monthlyRevenue = active * PLAN_PRICES[planId];

              return {
                planId,
                planName: PLAN_NAMES[planId],
                active,
                cancelled,
                total,
                churnRate,
                monthlyRevenue
              };
            });

            // 解約理由の集計（管理者以外は管理者メール除外）
            const displayCancellationReasons = allCancellationReasons;
            const reasonCounts = {};
            displayCancellationReasons.forEach((r) => {
              const key = r.reason_ja || r.reason;
              reasonCounts[key] = (reasonCounts[key] || 0) + 1;
            });

            return (
              <div className="space-y-6">
                {/* プラン毎の統計 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {subscriptionStats.map((stat) => (
                    <div key={stat.planId} className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                      <h3 className="font-bold flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-primary" />
                        {stat.planName}
                      </h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">現在加入者</span>
                          <span className="font-semibold text-green-400">{stat.active}件</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">累計加入者</span>
                          <span className="font-semibold">{stat.total}件</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">解約数</span>
                          <span className="font-semibold text-red-400">{stat.cancelled}件</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                          <span className="text-muted-foreground">解約率</span>
                          <span className={`font-semibold ${stat.churnRate > 30 ? "text-red-400" : "text-yellow-400"}`}>
                            {stat.churnRate}%
                          </span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-border/50 pt-2">
                          <span className="text-muted-foreground">月間想定売上</span>
                          <span className="font-bold text-primary">¥{stat.monthlyRevenue.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 解約理由の集計 */}
                <div className="bg-card rounded-xl border border-border/50 p-5 space-y-4">
                  <h3 className="font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    解約理由の集計
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/50">
                          <th className="text-left py-3 px-3 font-bold">解約理由</th>
                          <th className="text-right py-3 px-3 font-bold">件数</th>
                          <th className="text-right py-3 px-3 font-bold">割合</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(reasonCounts)
                           .sort(([, a], [, b]) => b - a)
                           .map(([reason, count]) => {
                             const percentage = displayCancellationReasons.length > 0 ? ((count / displayCancellationReasons.length) * 100).toFixed(1) : 0;
                             return (
                               <tr key={reason} className="border-b border-border/30 hover:bg-secondary/50">
                                 <td className="py-3 px-3">{reason}</td>
                                 <td className="text-right py-3 px-3 font-semibold">{count}件</td>
                                 <td className="text-right py-3 px-3 text-muted-foreground">{percentage}%</td>
                               </tr>
                             );
                           })}
                        </tbody>
                        </table>
                        </div>
                        {displayCancellationReasons.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">まだ解約がありません</p>
                        )}
                </div>
              </div>
            );
          })()}
        </TabsContent>

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
                ビデオ通話（150円/15分・手数料0%）
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">流通コイン総額</span>
                  <span className="font-semibold">{totalCallCoins.toLocaleString()}コイン</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">プラットフォーム手数料</span>
                  <span className="font-semibold text-muted-foreground">0%（BasicプランMRRで補填）</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">クリエイター配分（85%）</span>
                  <span className="font-semibold text-green-400">{Math.floor(totalCallCoins * 0.85).toLocaleString()}コイン</span>
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

          {/* Chime SDK 収支内訳 */}
          <CallProfitBreakdown calls={allCalls} />
          {/* 録画コスト精査 */}
          <RecordingCostBreakdown />

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
                  <td className="py-3 px-3 font-bold">ビデオ通話<span className="ml-1 text-[10px] text-primary">(手数料0%)</span></td>
                  <td className="text-right py-3 px-3 font-bold">{totalCallCoins.toLocaleString()}コイン</td>
                  <td className="text-right py-3 px-3 font-bold text-primary">0%</td>
                  <td className="text-right py-3 px-3 font-bold text-muted-foreground">-</td>
                  <td className="text-right py-3 px-3 font-bold text-green-400">{Math.floor(totalCallCoins * 0.85).toLocaleString()}コイン</td>
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

        {/* 決算書タブ */}
        <TabsContent value="financial" className="space-y-6">
          <AnnualFinancialStatement
            purchases={allPurchases}
            calls={allCalls}
            yellCoinTransactions={allYellCoinTransactions}
            subscriptions={allSubscriptions}
          />
        </TabsContent>

        {/* 通報管理タブ */}
        <TabsContent value="reports" className="space-y-6">
          <ReportManagement />
        </TabsContent>

        {/* コンテンツ審査タブ */}
        <TabsContent value="moderation" className="space-y-6">
          <ContentModeration />
        </TabsContent>

        {/* KYC審査タブ */}
        <TabsContent value="kyc" className="space-y-6">
          <KycManagement />
        </TabsContent>

        {/* プログレッシブインセンティブタブ */}
        <TabsContent value="incentive" className="space-y-6">
          <div className="bg-primary/10 border border-primary/30 rounded-xl px-5 py-4">
            <p className="text-primary font-black text-lg">🎯 頑張った分だけ翌月の収益還元率がUP!</p>
            <p className="text-sm text-muted-foreground mt-1">月間売上に応じて還元率が段階的に自動アップ。翌月から即反映されます。</p>
          </div>
          <ProgressiveRateMasterManager />
          <hr className="border-border/40" />
          <ProgressiveIncentiveList
            users={allUsers}
            subscriptions={allSubscriptions}
            purchases={allPurchases}
            calls={allCalls}
            yellCoinTransactions={allYellCoinTransactions}
            userRole={user?.role}
          />
        </TabsContent>

        {/* チャンネル閉鎖タブ */}
        <TabsContent value="suspension" className="space-y-6">
          <ChannelSuspensionManagement
            channels={allChannels}
            adminEmail={user?.email}
          />
        </TabsContent>

        {/* クラウドファンディングタブ */}
        <TabsContent value="crowdfunding" className="space-y-6">
          <CrowdfundingManagement projects={allCrowdfundingProjects} queryClient={queryClient} />
        </TabsContent>

        {/* 払い出し管理タブ */}
        <TabsContent value="withdrawal" className="space-y-6">
          <WithdrawalManagement />
        </TabsContent>

        {/* ライブコストモニタータブ */}
        <TabsContent value="live-cost" className="space-y-6">
          <LiveStreamCostMonitor />
        </TabsContent>

        {/* 通話コストモニタータブ */}
        <TabsContent value="call-cost" className="space-y-6">
          <VideoCallCostMonitor />
        </TabsContent>

        {/* キャンペーン管理タブ */}
        <TabsContent value="campaign" className="space-y-6">
          <CampaignManagement />
          <hr className="border-border/40" />
          <CampaignChannelManagement />
        </TabsContent>

        {/* 演出設定タブ */}
        <TabsContent value="drama" className="space-y-6">
          <DrameSettingsManagement />
        </TabsContent>

        {/* 通話制限管理タブ */}
        <TabsContent value="call-limit" className="space-y-6">
          <CallUsageLimitManagement />
        </TabsContent>

        {/* 特別料率・LPテンプレート */}
        <TabsContent value="special-rates" className="space-y-6">
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-5 py-4 flex items-center gap-3">
            <Percent className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <p className="font-black text-amber-300">職種別・特別還元率 & LPテンプレート管理</p>
              <p className="text-xs text-amber-400/70">社長が「〇〇向けLPが必要」と言った瞬間に対応できる体制。カテゴリ追加・還元率設定・公開状況を一元管理。</p>
            </div>
          </div>
          <SpecialRateManager />
        </TabsContent>

        {/* チケット購入者リスト */}
        <TabsContent value="ticket-buyers" className="space-y-6">
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl px-5 py-4 flex items-center gap-3">
            <Ticket className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <p className="font-black text-blue-300">チケット購入者リスト CSV出力</p>
              <p className="text-xs text-blue-400/70">TicketEvent・PPVライブ配信の購入者をプロモーションメール配信用にエクスポート</p>
            </div>
          </div>
          <TicketBuyerExport />
        </TabsContent>

        {/* アイドルスカウト応募タブ */}
        <TabsContent value="idol-applications" className="space-y-6">
          <div className="bg-pink-500/10 border border-pink-500/30 rounded-xl px-5 py-4 flex items-center gap-3">
            <Star className="w-5 h-5 text-pink-400 shrink-0" />
            <div>
              <p className="font-black text-pink-300">アイドルスカウト応募管理</p>
              <p className="text-xs text-pink-400/70">IdolLP ページからの応募が一覧表示されます</p>
            </div>
          </div>
          <IdolApplicationManagement />
        </TabsContent>

        {/* ライバー申込状況タブ */}
        <TabsContent value="recruit" className="space-y-6">
          <RecruitApplicationManagement applications={applications} />
        </TabsContent>

        {/* 決済レポートタブ */}
        <TabsContent value="purchases" className="space-y-6">
          <PurchaseReportTab purchases={allPurchases} />
        </TabsContent>

        {/* 著作権料レポートタブ */}
        <TabsContent value="copyright" className="space-y-6">
          <CopyrightReportManager />
        </TabsContent>

        {/* NGワード管理タブ */}
        <TabsContent value="ng-words" className="space-y-6">
          <NgWordManagement />
        </TabsContent>

        {/* LINE Notify設定タブ */}
        <TabsContent value="line-notify" className="space-y-6">
          <LineNotifySettings />
        </TabsContent>

        {/* ユーザー管理タブ */}
        <TabsContent value="users" className="space-y-6">
          {/* テストユーザー作成 */}
          <TestUserCreationForm />

          {/* 登録済みテストユーザー一覧 */}
          <RegisteredTestUsersList />

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
                      <td className="py-2 px-3">
                        <button
                          onClick={() => setSelectedUser(u)}
                          className="text-primary hover:text-primary/80 hover:underline transition-colors text-left font-medium"
                        >
                          {u.full_name || "未設定"}
                        </button>
                      </td>
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

      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
}