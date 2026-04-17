import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Radio, Search, Crown, Settings, Upload, BookOpen,
  CreditCard, User, LogOut, Bell, Coins, Menu, X, BarChart3, Wallet, Phone, CalendarDays, ShoppingBag, MessageSquare, Users, Zap, Globe, TrendingUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import LangSwitcher from "./LangSwitcher";
import Footer from "./Footer";

const LOGO_URL = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png";

const SUPER_ADMIN_EMAILS = ["ono@onestep-corp.com", "taktak0315@icloud.com", "unei@chatmarket.info"];

const ADMIN_NAV_ITEMS = [
  { path: "/admin/dashboard", icon: BarChart3, label: "運営管理ダッシュボード" },
  { path: "/admin/dashboard?tab=recruit", icon: Zap, label: "ライバー申込一覧" },
  { path: "/admin/analytics", icon: Globe, label: "プラットフォーム分析" },
  { path: "/admin/video-moderation", icon: Settings, label: "コンテンツ審査" },
  { path: "/admin/ng-word-analytics", icon: Settings, label: "NGワード分析" },
];

const NAV_ITEMS = [
  { path: "/", icon: Home, label: "ホーム" },
  { path: "/search", icon: Search, label: "さがす" },
  { path: "/community", icon: Users, label: "コミュニティ" },
  { path: "/fanclub", icon: Crown, label: "ファンクラブ" },
  { path: "/plan-select", icon: CreditCard, label: "料金プラン" },
  { path: "/blog", icon: BookOpen, label: "ブログ" },
  { path: "/recruit", icon: Zap, label: "ライバー募集" },
];

const CREATOR_ITEMS = [
  { path: "/go-live", icon: Radio, label: "ライブ配信" },
  { path: "/upload", icon: Upload, label: "動画アップ" },
  { path: "/creator-dashboard", icon: BarChart3, label: "ダッシュボード" },
  { path: "/revenue", icon: Wallet, label: "収益管理" },
  { path: "/withdrawal-request", icon: Wallet, label: "払い出し申請" },
  { path: "/call-slots", icon: Phone, label: "通話枠設定" },
  { path: "/creator-schedule", icon: CalendarDays, label: "スケジュール管理" },
  { path: "/equipment", icon: ShoppingBag, label: "機材ガイド" },
  { path: "/forum", icon: MessageSquare, label: "掲示板" },
];

export default function AppLayout() {
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: wallet } = useQuery({
    queryKey: ["wallet-layout", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  const isActive = (path) => path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const SidebarContent = ({ onClose }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-border/50">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
          <img src={LOGO_URL} alt="ChatMarket" className="w-9 h-9 object-contain" />
          <span className="font-black text-lg tracking-tight">
            Chat<span className="text-primary">Market</span>
          </span>
        </Link>
        {onClose && (
          <Button variant="ghost" size="icon" className="ml-auto" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Main Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} onClick={onClose}>
            <div className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
              isActive(path)
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            )}>
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </div>
          </Link>
        ))}

        {user && (
          <>
            <div className="pt-3 pb-1 px-3">
              <p className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">配信者メニュー</p>
            </div>
            {CREATOR_ITEMS.map(({ path, icon: Icon, label }) => (
              <Link key={path} to={path} onClick={onClose}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive(path)
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}>
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </div>
              </Link>
            ))}

            {SUPER_ADMIN_EMAILS.includes(user.email) && (
              <>
                <div className="pt-3 pb-1 px-3">
                  <p className="text-[10px] font-bold tracking-widest text-purple-400 uppercase">⚡ スーパー管理者</p>
                </div>
                {ADMIN_NAV_ITEMS.map(({ path, icon: Icon, label }) => (
                  <Link key={path} to={path} onClick={onClose}>
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
            <Link to="/my-channel" onClick={onClose}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <User className="w-4 h-4 shrink-0" />マイチャンネル
              </div>
            </Link>
            <Link to="/settings" onClick={onClose}>
              <div className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Settings className="w-4 h-4 shrink-0" />設定
              </div>
            </Link>
            {SUPER_ADMIN_EMAILS.includes(user.email) && (
              <Link to="/admin/dashboard" onClick={onClose}>
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-purple-400 hover:bg-purple-500/10 transition-all">
                  <BarChart3 className="w-4 h-4 shrink-0" />管理者
                </div>
              </Link>
            )}
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col fixed left-0 top-0 h-screen bg-sidebar border-r border-border/50 z-40">
        <SidebarContent onClose={null} />
      </aside>

      {/* Mobile overlay sidebar */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 bg-sidebar h-full shadow-2xl">
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen overflow-x-hidden w-full">
        {/* Mobile/Tablet top bar */}
        <header className="lg:hidden sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 h-14 flex items-center px-4 gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 flex-1">
            <img src={LOGO_URL} alt="" className="w-7 h-7 object-contain" />
            <span className="font-black tracking-tight">Chat<span className="text-primary">Market</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <LangSwitcher />
            {user && <NotificationBell user={user} />}
            {!user && (
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-xs" onClick={() => base44.auth.redirectToLogin()}>
                ログイン
              </Button>
            )}
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-background/90 backdrop-blur-xl border-b border-border/50 h-14 items-center px-6 gap-4">
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <LangSwitcher />
            {user ? (
              <>
                <NotificationBell user={user} />
                <Link to="/upload">
                  <Button size="sm" variant="ghost" className="gap-2 text-sm">
                    <Upload className="w-4 h-4" />アップロード
                  </Button>
                </Link>
                <Link to="/go-live">
                  <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                    <Radio className="w-4 h-4" />ライブ配信
                  </Button>
                </Link>
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-primary" />
                </div>
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
        <main className="flex-1 pb-20 lg:pb-6 overflow-x-hidden">
          <Outlet />
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 flex items-center justify-around h-16 px-2">
        {[
          { path: "/", icon: Home, label: "ホーム" },
          { path: "/search", icon: Search, label: "さがす" },
          { path: "/go-live", icon: Radio, label: "配信" },
          { path: "/fanclub", icon: Crown, label: "FC" },
          { path: "/settings", icon: Settings, label: "設定" },
        ].map(({ path, icon: Icon, label }) => (
          <Link key={path} to={path} className="flex-1 flex flex-col items-center gap-0.5 py-2">
            <Icon className={cn("w-5 h-5 transition-colors", isActive(path) ? "text-primary" : "text-muted-foreground")} />
            <span className={cn("text-[10px] font-medium transition-colors", isActive(path) ? "text-primary" : "text-muted-foreground")}>
              {label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
}