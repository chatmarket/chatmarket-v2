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
import { Search, Menu, X, User, LogOut, Radio, Video, Settings, CreditCard, BookOpen, Heart, Library, DollarSign, BarChart3, Coins, Phone, GraduationCap, Building2, Ticket, Zap, School } from "lucide-react";
import { base44 } from "@/api/base44Client";
import LangSwitcher from "./LangSwitcher";
import { t } from "@/lib/i18n";
import NotificationBell from "./NotificationBell";

const LOGO_URL = "https://media.base44.com/images/public/69c1b541d5db3555833124aa/44f9139d1_1ldpi.png";

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

  const { data: userProfile } = useQuery({
    queryKey: ["navbar-user-profile", user?.email],
    queryFn: () => base44.entities.User.filter({ email: user.email }, "-created_date", 1).then(data => data[0] || null),
    enabled: !!user?.email,
  });

  const { data: wallet } = useQuery({
    queryKey: ["yell-coin-wallet", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }, "-updated_date", 1).then(data => data[0] || null),
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
          <img src={LOGO_URL} alt="ChatMarket" className="w-8 h-8 sm:w-9 sm:h-9 object-contain" />
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
           <Link to="/classroom-lp">
             <Button size="sm" variant="ghost" className="gap-1.5 text-sm text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
               <School className="w-3.5 h-3.5" />
               クラスルーム
             </Button>
           </Link>
           <Link to="/plan-select">
             <Button size="sm" variant="ghost" className="gap-1.5 text-sm">
               <CreditCard className="w-3.5 h-3.5" />
               料金プラン
             </Button>
           </Link>
          <div className="relative group">
            <Link to="/blog">
              <Button size="sm" variant="ghost" className="gap-1.5 text-sm">
                <BookOpen className="w-3.5 h-3.5" />
                運営ブログ
                {hasNewBlog && (
                  <span className="ml-0.5 text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded-full animate-pulse">NEW</span>
                )}
              </Button>
            </Link>
            {/* 新着プレビュードロップダウン */}
            {blogPosts.length > 0 && (
              <div className="absolute top-full left-0 mt-1 w-72 bg-card border border-border/60 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 overflow-hidden">
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">最新記事</p>
                </div>
                {blogPosts.slice(0, 3).map((post) => (
                  <Link to={`/blog/${post.id}`} key={post.id}>
                    <div className="px-3 py-2.5 hover:bg-secondary/60 transition-colors flex items-start gap-2">
                      <BookOpen className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{post.title}</p>
                        {post.published_at && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(post.published_at).toLocaleDateString("ja-JP")}
                          </p>
                        )}
                      </div>
                      {post.published_at && new Date(post.published_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) && (
                        <span className="shrink-0 text-[8px] bg-red-500 text-white px-1 py-0.5 rounded font-black">NEW</span>
                      )}
                    </div>
                  </Link>
                ))}
                <Link to="/blog">
                  <div className="px-3 py-2 border-t border-border/50 text-center text-[10px] text-primary hover:text-primary/80 font-bold transition-colors">
                    すべての記事を見る →
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <LangSwitcher />

          {user ? (
            <>
              <NotificationBell user={user} />
              <Link to="/coin-charge">
                <Button size="sm" variant="ghost" className="gap-1.5 text-yellow-400 hover:bg-yellow-500/10">
                  <Coins className="w-4 h-4" />
                  <span className="hidden sm:inline text-xs font-semibold">{(wallet?.balance || 0).toLocaleString()}</span>
                </Button>
              </Link>
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
                      {userProfile?.nickname || user.nickname || user.full_name || "ユーザー"}
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
                  <DropdownMenuItem onClick={() => navigate("/my-tickets")}>
                    <Ticket className="w-4 h-4 mr-2 text-primary" />
                    マイチケット
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
                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                    <GraduationCap className="w-4 h-4 mr-2 text-violet-400" />
                    ミニスクール管理
                    <span className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">準備中</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                    <Building2 className="w-4 h-4 mr-2 text-violet-400" />
                    エンタープライズ管理
                    <span className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">準備中</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
                    <Heart className="w-4 h-4 mr-2 text-red-400" />
                    寄付者マイページ
                    <span className="ml-auto text-[10px] bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">準備中</span>
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
                      <DropdownMenuItem onClick={() => navigate("/influencer-campaign")}>
                        <Zap className="w-4 h-4 mr-2 text-yellow-400" />
                        インフルエンサー爆撃
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
                <Link to="/plan-select">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-primary/50 text-primary hover:bg-primary/10"
                  >
                    料金プラン
                  </Button>
                </Link>
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
            <Link to="/classroom-lp" className="flex-1" onClick={() => setIsMenuOpen(false)}>
              <Button variant="secondary" className="w-full gap-2 text-xs text-violet-400">
                <School className="w-4 h-4" /> クラスルーム
              </Button>
            </Link>
            <Link to="/plan-select" className="flex-1" onClick={() => setIsMenuOpen(false)}>
              <Button variant="secondary" className="w-full gap-2 text-xs">
                <CreditCard className="w-4 h-4" /> 料金プラン
              </Button>
            </Link>
          </div>
          <div className="flex gap-2">
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