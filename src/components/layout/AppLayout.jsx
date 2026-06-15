import React, { useState, useEffect } from "react";
import PushNotificationPrompt from "@/components/notifications/PushNotificationPrompt";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Radio, Search, Crown, Settings, Upload, BookOpen,
  CreditCard, User, LogOut, Coins, Menu, X, BarChart3, Wallet, Phone,
  Users, Zap, Globe, TrendingUp, Pencil, Star, Music, Heart,
  ChevronDown, ChevronUp, ShoppingBag, Play, Package
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import LangSwitcher from "./LangSwitcher";
import CreatorModeToggle from "./CreatorModeToggle";
import Footer from "./Footer";
import GlobalCallNotifier from "@/components/call/GlobalCallNotifier";
import { isAdmin } from "@/lib/adminConfig";
import { captureRefFromUrl } from "@/lib/referral";
import { capturePromoFromUrl } from "@/lib/promoCode";
import PwaInstallPrompt from "@/components/pwa/PwaInstallPrompt";
import { preloadTranslations } from "@/lib/dbTranslations";

const LOGO_URL = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png";

// 一般ユーザー向けメニュー
const NAV_ITEMS = [
  { path: "/", icon: Home, label: "ホーム" },
  { path: "/search", icon: Search, label: "さがす" },
  { path: "/", icon: Play, label: "ライブ" },
  { path: "/fortune-lp", icon: Star, label: "占い" },
  { path: "/community", icon: Users, label: "コミュニティ" },
  { path: "/my-purchases", icon: ShoppingBag, label: "購入履歴" },
  { path: "/coin-charge", icon: Coins, label: "コイン" },
  { path: "/settings", icon: Settings, label: "設定" },
];

// クリエイタースタジオ メニュー
const CREATOR_STUDIO_ITEMS = [
  { path: "/dashboard", icon: BarChart3, label: "ダッシュボード" },
  { path: "/my-channel", icon: User, label: "マイチャンネル" },
  { path: "/go-live", icon: Radio, label: "配信する", highlight: true },
  { path: "/obs-guide", icon: Play, label: "PPV生配信ガイド" },
  { path: "/my-library", icon: Package, label: "商品・音源販売" },
  { path: "/fanclub-manage", icon: Crown, label: "ファンクラブ" },
  { path: "/revenue", icon: Wallet, label: "収益" },
  { path: "/channel-profile-edit", icon: Pencil, label: "チャンネル編集" },
];

// 管理者専用メニュー
const ADMIN_NAV_ITEMS = [
  { key: "admin-dashboard", path: "/admin/dashboard", icon: BarChart3, label: "運営管理ダッシュボード" },
  { key: "admin-recruit", path: "/admin/dashboard?tab=recruit", icon: Zap, label: "ライバー申込一覧" },
  { key: "admin-moderation", path: "/admin/video-moderation", icon: Settings, label: "コンテンツ審査" },
  { key: "admin-ngword", path: "/admin/ng-word-analytics", icon: Settings, label: "NGワード分析" },
  { key: "admin-affiliate", path: "/admin/affiliate", icon: TrendingUp, label: "アフィリエイト分析" },
  { key: "admin-analytics", path: "/admin/analytics", icon: Globe, label: "プラットフォーム分析" },
];

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [creatorMode, setCreatorMode] = useState(false);
  const [creatorMenuOpen, setCreatorMenuOpen] = useState(false);
  const [lpMenuOpen, setLpMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // ✅ PrismWebOverlay はナビ・ヘッダー完全排除でそのまま表示
  const isPrismOverlay = location.pathname.startsWith("/prism-overlay");

  // creatorMode の状態を監視（localStorage の変更を検知）
  useEffect(() => {
    const checkMode = () => {
      setCreatorMode(localStorage.getItem("creatorMode") === "true");
    };
    checkMode();
    window.addEventListener("storage", checkMode);
    return () => window.removeEventListener("storage", checkMode);
  }, []);

  useEffect(() => {
    // サイト全体でrefパラメータをキャプチャ（どのページから来てもOK）
    captureRefFromUrl();
    capturePromoFromUrl();
    preloadTranslations(); // DB翻訳プリロード
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then((u) => {
        setUser(u);
        // 初回登録ユーザーのみプロフィール設定画面へ誘導
        // onboarding_required === true の場合のみリダイレクト（既存ユーザーは対象外）
        if (u.onboarding_required === true && u.profile_completed !== true && !window.location.pathname.startsWith("/settings")) {
          window.location.href = "/settings?onboarding=1";
        }
      }).catch(() => {});
    });
  }, []);

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["sidebar-blog-posts"],
    queryFn: () => base44.entities.BlogPost.filter({ status: "published" }, "-published_at", 1),
  });
  const hasNewBlog = blogPosts.length > 0 && blogPosts[0]?.published_at
    ? new Date(blogPosts[0].published_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    : false;

  const { data: wallet } = useQuery({
    queryKey: ["wallet-layout", user?.email],
    queryFn: async () => {
      const existing = await base44.entities.YellCoinWallet.filter({ user_email: user.email });
      if (existing[0]) return existing[0];
      
      // ウォレットが存在しない場合は自動作成（0コインで初期化）
      const newWallet = await base44.entities.YellCoinWallet.create({
        user_email: user.email,
        balance: 0,
        total_charged: 0,
        total_sent: 0,
      });
      return newWallet;
    },
    enabled: !!user?.email,
  });

  const { data: myChannel, isLoading: myChannelLoading } = useQuery({
    queryKey: ["layout-my-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: true,
  });

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const renderSidebar = (onCloseFn) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/50">
        <Link to="/" onClick={onCloseFn} className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="チャットマーケット ロゴ" className="w-9 h-9 object-contain" />
          <span className="font-black text-lg tracking-tight">
            Chat<span className="text-primary">Market</span>
          </span>
        </Link>
        {onCloseFn && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onCloseFn}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">

        {/* ── 一般ユーザーメニュー ── */}
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} onClick={onCloseFn}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive(path)
                ? "bg-pink-500/20 text-pink-400"
                : "text-muted-foreground hover:bg-pink-500/10 hover:text-pink-400"
            )}>
              <Icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{label}</span>
            </div>
          </Link>
        ))}

        {/* ── クリエイタースタジオ（チャンネル作成済みユーザーのみ表示） ── */}
        {user && myChannel && (
          <>
            <div className="pt-3 pb-1">
              <button
                onClick={() => setCreatorMenuOpen(!creatorMenuOpen)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-primary/80 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <Radio className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-left">クリエイタースタジオ</span>
                {creatorMenuOpen ? <ChevronUp className="w-4 h-4 shrink-0" /> : <ChevronDown className="w-4 h-4 shrink-0" />}
              </button>
            </div>
            {creatorMenuOpen && CREATOR_STUDIO_ITEMS.map(({ path, icon: Icon, label, highlight }) => {
              const isWaiting = highlight && myChannel?.call_enabled && !isActive(path);
              return (
                <Link key={path} to={path} onClick={onCloseFn}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ml-2",
                    isWaiting
                      ? "bg-primary/20 text-primary border border-primary/40 animate-pulse"
                      : isActive(path)
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                  )}>
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="flex-1">{label}</span>
                    {isWaiting && (
                      <span className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">LIVE</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </>
        )}

        {/* ── チャンネル未作成ユーザー向け導線（ログイン済み・チャンネルなし・読み込み完了後のみ） ── */}
        {user && !myChannelLoading && myChannel === null && (
          <div className="pt-3">
            <Link to="/my-channel" onClick={onCloseFn}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all",
                isActive("/my-channel")
                  ? "bg-primary/20 text-primary"
                  : "text-primary/70 hover:bg-primary/10 hover:text-primary border border-primary/30"
              )}>
                <Zap className="w-4 h-4 shrink-0" />
                <div className="flex flex-col">
                  <span>クリエイターとして始める</span>
                  <span className="text-[10px] font-normal opacity-70">配信・鑑定・販売を始める</span>
                </div>
              </div>
            </Link>
          </div>
        )}

        {/* ── 管理者メニュー（admin のみ表示） ── */}
        {user && isAdmin(user) && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">⚡ 管理者</p>
            </div>
            {ADMIN_NAV_ITEMS.map(({ key, path, icon: Icon, label }) => (
              <Link key={key} to={path} onClick={onCloseFn}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive(path)
                    ? "bg-purple-500/20 text-purple-300"
                    : "text-purple-400/70 hover:bg-purple-500/10 hover:text-purple-300"
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Bottom: User area */}
      <div className="border-t border-border/50 px-3 py-4 space-y-1">
        {user ? (
          <>
            {wallet && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20 mb-2">
                <Coins className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="text-xs text-yellow-400 font-bold">{wallet.balance || 0} コイン</span>
              </div>
            )}
            <Link to="/settings" onClick={onCloseFn}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Settings className="w-4 h-4 shrink-0" />設定
              </div>
            </Link>
            <button
              onClick={() => base44.auth.logout()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            >
              <LogOut className="w-4 h-4 shrink-0" />ログアウト
            </button>
          </>
        ) : (
          <div className="space-y-2 px-1">
            <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => base44.auth.redirectToLogin()}>
              ログイン / 新規登録
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  if (isPrismOverlay) {
    return (
      <div style={{ background: "transparent", padding: 0, margin: 0 }}>
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col fixed left-0 top-0 h-screen bg-sidebar border-r border-border/50 z-40" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}>
        {renderSidebar(null)}
      </aside>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-sidebar h-full shadow-2xl overflow-y-auto" style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}>
            {renderSidebar(() => setSidebarOpen(false))}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen overflow-x-hidden w-full">
        {/* Mobile/Tablet top bar — Safe Area対応 */}
        <header
          className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-b border-border/50 flex items-end"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)',
          }}
        >
          <div className="flex items-center w-full px-4 gap-3 h-14">
            <Button variant="ghost" onClick={() => setSidebarOpen(true)} className="h-11 w-11 p-0 shrink-0">
              <Menu className="w-6 h-6" />
            </Button>
            <Link to="/" className="flex items-center gap-2 flex-1 min-w-0">
              <img src={LOGO_URL} alt="チャットマーケット ロゴ" className="w-8 h-8 object-contain shrink-0" />
              <span className="font-black tracking-tight truncate">Chat<span className="text-primary">Market</span></span>
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              {user && (
                <span className="text-xs font-semibold text-muted-foreground truncate max-w-[80px]">
                  {user.full_name?.split(/\s/)[0] || user.email?.split("@")[0]}
                </span>
              )}
              {user && <CreatorModeToggle />}
              <LangSwitcher />
              {user && <NotificationBell user={user} />}
              {!user && (
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs px-3" onClick={() => base44.auth.redirectToLogin()}>
                  ログイン
                </Button>
              )}
            </div>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 h-14 items-center px-6 gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            {user && <CreatorModeToggle />}
            <LangSwitcher />
            {user ? (
              <>
                <NotificationBell user={user} />
                <Link to="/my-channel" className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-secondary transition-colors">
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <User className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-foreground max-w-[100px] truncate">
                    {user.full_name?.split(' ')[0] || user.email?.split('@')[0]}
                  </span>
                </Link>
                {myChannel && (
                  <Link to="/upload">
                    <Button size="sm" variant="ghost" className="gap-2 text-sm">
                      <Upload className="w-4 h-4" />アップロード
                    </Button>
                  </Link>
                )}
                <Link to="/go-live">
                  <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                    <Radio className="w-4 h-4" />ライブ配信
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button size="sm" variant="ghost" onClick={() => base44.auth.redirectToLogin()}>ログイン</Button>
                <Button size="sm" className="bg-primary hover:bg-primary/90" onClick={() => navigate("/plan-select")}>新規登録</Button>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden w-full max-w-[1400px] mx-auto lg:pt-0 lg:pb-8"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 56px)',
            paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)',
          }}
        >
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* PWA Install Prompt */}
      <PwaInstallPrompt />

      {/* Push Notification Prompt */}
      <PushNotificationPrompt />

      {/* グローバル着信・承認通知（ライブ視聴ページでは完全停止） */}
      {user && !location.pathname.startsWith("/live/") && <GlobalCallNotifier user={user} />}

      {/* Mobile Bottom Navigation — Safe Area対応フローティング */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)',
          minHeight: 56,
        }}
      >
        {/* 未ログイン：ホーム / さがす / ログイン（3タブ） */}
        {!user && (
          <>
            {[
              { path: "/", icon: Home, label: "ホーム" },
              { path: "/search", icon: Search, label: "さがす" },
            ].map(({ path, icon: Icon, label }) => (
              <Link key={path} to={path} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-w-0 min-h-[48px] justify-center overflow-hidden">
                <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive(path) ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("text-[10px] font-medium truncate w-full text-center", isActive(path) ? "text-primary" : "text-muted-foreground")}>{label}</span>
              </Link>
            ))}
            <button onClick={() => base44.auth.redirectToLogin()} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-w-0 min-h-[48px] justify-center overflow-hidden">
              <User className="w-5 h-5 shrink-0 text-primary" />
              <span className="text-[10px] font-medium text-primary truncate w-full text-center">ログイン</span>
            </button>
          </>
        )}

        {/* ログイン済み：ホーム / さがす / マイページ / 配信 or 始める / 設定（5タブ） */}
        {user && (() => {
          const creatorTab = myChannel
            ? { path: "/go-live", icon: Radio, label: "配信" }
            : { path: "/my-channel", icon: Zap, label: "始める" };
          return [
            { path: "/", icon: Home, label: "ホーム" },
            { path: "/search", icon: Search, label: "さがす" },
            { path: "/dashboard", icon: BarChart3, label: "マイページ" },
            creatorTab,
            { path: "/settings", icon: Settings, label: "設定" },
          ].map(({ path, icon: Icon, label }) => (
            <Link key={path + label} to={path} className="flex-1 flex flex-col items-center gap-0.5 py-2.5 min-w-0 min-h-[48px] justify-center overflow-hidden">
              <Icon className={cn("w-5 h-5 shrink-0 transition-colors", isActive(path) ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] font-medium truncate w-full text-center", isActive(path) ? "text-primary" : "text-muted-foreground")}>{label}</span>
            </Link>
          ));
        })()}
      </nav>
    </div>
  );
}