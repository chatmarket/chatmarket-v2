import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Menu, X, User, LogOut, Radio, Video, Settings, CreditCard, BookOpen, Heart, Library, DollarSign, BarChart3, Coins, Phone } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LangSwitcher from "./LangSwitcher";
import { t } from "@/lib/i18n";
import NotificationBell from "./NotificationBell";

const LOGO_URL = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/d7bcd45d0_1xhdpi.png";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser).catch(() => {});
      }
    });
  }, []);

  const { data: wallet } = useQuery({
    queryKey: ["yell-coin-wallet", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }, "-updated_date", 1).then(data => data[0]),
    enabled: !!user?.email,
  });

  const { data: blogPosts = [] } = useQuery({
    queryKey: ["navbar-blog-posts"],
    queryFn: () => base44.entities.BlogPost.filter({ status: "published" }, "-published_at", 5),
  });

  const hasNewBlog = blogPosts.length > 0 && blogPosts[0].published_at ? 
    new Date(blogPosts[0].published_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : false;

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={LOGO_URL} alt="ChatMarket" className="w-9 h-9 object-contain" />
          <span className="text-lg font-bold tracking-tight hidden sm:block">
            Chat<span className="text-primary">Market</span>
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("search")}
              className="pl-10 bg-secondary border-0 focus-visible:ring-primary/50"
            />
          </div>
        </form>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          <a href="/#plans" onClick={(e) => { e.preventDefault(); const el = document.getElementById('plans'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else { window.location.href = '/#plans'; } }}>
            <Button size="sm" variant="ghost" className="gap-1.5 text-sm">
              <CreditCard className="w-3.5 h-3.5" />
              料金プラン
            </Button>
          </a>
          <Link to="/blog" className="relative">
            <Button size="sm" variant="ghost" className="gap-1.5 text-sm">
              <BookOpen className="w-3.5 h-3.5" />
              運営ブログ
            </Button>
            {hasNewBlog && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            )}
          </Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LangSwitcher />

          {user ? (
            <>
              <NotificationBell user={user} />
              {wallet && (
                <Button size="sm" variant="ghost" className="hidden sm:flex gap-1.5 text-yellow-400">
                  <Coins className="w-4 h-4" />
                  <span className="text-xs">{wallet.balance || 0}</span>
                </Button>
              )}
              <Link to="/upload">
                <Button size="sm" variant="ghost" className="hidden sm:flex gap-2">
                  <Video className="w-4 h-4" />
                  {t("upload")}
                </Button>
              </Link>
              <Link to="/go-live">
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90">
                  <Radio className="w-4 h-4" />
                  <span className="hidden sm:inline">{t("goLive")}</span>
                </Button>
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 rounded-full px-3">
                    <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="hidden sm:inline text-xs font-medium text-foreground/80 truncate max-w-[80px]">
                      {user.nickname || user.full_name || "ユーザー"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate("/my-channel")}>
                    <Radio className="w-4 h-4 mr-2" />
                    {t("myChannel")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/creator-dashboard")}>
                    <BarChart3 className="w-4 h-4 mr-2 text-primary" />
                    配信者ダッシュボード
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/revenue")}>
                    <DollarSign className="w-4 h-4 mr-2 text-yellow-400" />
                    収益管理
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-library")}>
                    <Library className="w-4 h-4 mr-2 text-primary" />
                    マイライブラリ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/analytics")}>
                    <BarChart3 className="w-4 h-4 mr-2 text-blue-400" />
                    分析
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/call-history")}>
                    <Phone className="w-4 h-4 mr-2 text-green-400" />
                    通話履歴
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/call-slots")}>
                    <Phone className="w-4 h-4 mr-2 text-primary" />
                    通話予約枠管理
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/my-reservations")}>
                    <Phone className="w-4 h-4 mr-2 text-blue-400" />
                    予約管理
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/donor-dashboard")}>
                    <Heart className="w-4 h-4 mr-2 text-red-400" />
                    寄付者マイページ
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="w-4 h-4 mr-2" />
                    {t("settings")}
                  </DropdownMenuItem>
                  {user?.role === "admin" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/admin/dashboard")}>
                        <BarChart3 className="w-4 h-4 mr-2 text-purple-400" />
                        管理者ダッシュボード
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => base44.auth.logout()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => base44.auth.redirectToLogin()}
              >
                {t("login")}
              </Button>
              <a href="/#plans" onClick={(e) => { e.preventDefault(); const el = document.getElementById('plans'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else { window.location.href = '/#plans'; } }}>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary/10"
                >
                  料金プラン
                </Button>
              </a>
              <Button
                size="sm"
                className="bg-primary hover:bg-primary/90"
                onClick={() => navigate("/plan-select")}
              >
                {navigator.language.startsWith("ja") ? "新規登録" : "Sign Up"}
              </Button>
            </div>
          )}

          {/* Mobile menu toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-background p-4 space-y-3">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("search")}
                className="pl-10 bg-secondary border-0"
              />
            </div>
          </form>
          <div className="flex gap-2">
            <a href="/#plans" className="flex-1" onClick={(e) => { e.preventDefault(); setIsMenuOpen(false); const el = document.getElementById('plans'); if (el) el.scrollIntoView({ behavior: 'smooth' }); else { window.location.href = '/#plans'; } }}>
              <Button variant="secondary" className="w-full gap-2 text-xs">
                <CreditCard className="w-4 h-4" /> 料金プラン
              </Button>
            </a>
            <Link to="/blog" className="flex-1 relative" onClick={() => setIsMenuOpen(false)}>
              <Button variant="secondary" className="w-full gap-2 text-xs">
                <BookOpen className="w-4 h-4" /> 運営ブログ
              </Button>
              {hasNewBlog && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </Link>
          </div>
          {user ? (
            <div className="space-y-2">
              {wallet && (
                <div className="flex items-center justify-center gap-1.5 text-yellow-400 text-sm font-semibold py-2">
                  <Coins className="w-4 h-4" />
                  エールコイン: {wallet.balance || 0}枚
                </div>
              )}
              <div className="flex gap-2">
                <Link to="/upload" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="secondary" className="w-full gap-2">
                    <Video className="w-4 h-4" /> {t("upload")}
                  </Button>
                </Link>
                <Link to="/go-live" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full gap-2 bg-primary">
                    <Radio className="w-4 h-4" /> {t("goLive")}
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => base44.auth.redirectToLogin()}>
                {t("login")}
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={() => base44.auth.redirectToLogin()}>
                {t("register")}
              </Button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}