import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenSquare, Calendar, Tag } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

const ADMIN_EMAIL = "ono@onestep-corp.com";

export default function Blog() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: posts = [] } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: () => base44.entities.BlogPost.filter({ status: "published" }, "-published_at"),
  });

  const isAdmin = user?.email === ADMIN_EMAIL;

  const categoryColors = {
    "お知らせ": "bg-blue-500/20 text-blue-300",
    "使い方": "bg-green-500/20 text-green-300",
    "アップデート": "bg-primary/20 text-primary",
    "コラム": "bg-purple-500/20 text-purple-300",
    "その他": "bg-secondary text-muted-foreground",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">運営ブログ</h1>
          <p className="text-muted-foreground text-sm mt-1">ChatMarketからのお知らせ・使い方・最新情報</p>
        </div>
        {isAdmin && (
          <Link to="/blog/new">
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <PenSquare className="w-4 h-4" />
              新規投稿
            </Button>
          </Link>
        )}
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="text-center py-24 text-muted-foreground">
          <PenSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>まだ記事がありません</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {posts.map((post) => (
            <Link key={post.id} to={`/blog/${post.id}`} className="group block">
              <div className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/30 transition-all duration-300 flex flex-col sm:flex-row">
                {post.thumbnail_url && (
                  <div className="sm:w-48 sm:shrink-0 h-40 sm:h-auto overflow-hidden">
                    <img
                      src={post.thumbnail_url}
                      alt={post.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="p-5 flex flex-col justify-between flex-1">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[post.category] || categoryColors["その他"]}`}>
                        {post.category}
                      </span>
                    </div>
                    <h2 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-2">{post.title}</h2>
                    {post.excerpt && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{post.excerpt}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    {post.published_at && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(post.published_at), "yyyy年M月d日", { locale: ja })}
                      </span>
                    )}
                    {post.author_name && <span>{post.author_name}</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}