import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, PenSquare, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";

const ADMIN_EMAIL = "ono@onestep-corp.com";

export default function BlogDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: post, isLoading } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: () => base44.entities.BlogPost.filter({ id }),
    select: (data) => data[0],
  });

  const isAdmin = user?.email === ADMIN_EMAIL;

  const handleDelete = async () => {
    if (!confirm("この記事を削除しますか？")) return;
    await base44.entities.BlogPost.delete(id);
    queryClient.invalidateQueries({ queryKey: ["blog-posts-public"] });
    queryClient.invalidateQueries({ queryKey: ["blog-posts-all"] });
    toast.success("記事を削除しました");
    navigate("/blog");
  };

  const categoryColors = {
    "お知らせ": "bg-blue-500/20 text-blue-300",
    "使い方": "bg-green-500/20 text-green-300",
    "アップデート": "bg-primary/20 text-primary",
    "コラム": "bg-purple-500/20 text-purple-300",
    "その他": "bg-secondary text-muted-foreground",
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!post) return (
    <div className="max-w-3xl mx-auto px-4 py-24 text-center text-muted-foreground">
      <p>記事が見つかりませんでした。</p>
      <Link to="/blog"><Button className="mt-4">ブログへ戻る</Button></Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Back */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/blog")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> ブログへ戻る
        </button>
        {isAdmin && (
          <div className="flex gap-2">
            <Link to={`/blog/edit/${id}`}>
              <Button size="sm" variant="outline" className="gap-2">
                <PenSquare className="w-4 h-4" /> 編集
              </Button>
            </Link>
            <Button size="sm" variant="destructive" onClick={handleDelete} className="gap-2">
              <Trash2 className="w-4 h-4" /> 削除
            </Button>
          </div>
        )}
      </div>

      {/* Thumbnail */}
      {post.thumbnail_url && (
        <div className="rounded-2xl overflow-hidden aspect-video">
          <img src={post.thumbnail_url} alt={post.title} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Meta */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${categoryColors[post.category] || categoryColors["その他"]}`}>
            {post.category}
          </span>
          {post.status === "draft" && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">下書き</span>
          )}
        </div>
        <h1 className="text-2xl md:text-3xl font-black leading-tight">{post.title}</h1>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          {post.published_at && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(new Date(post.published_at), "yyyy年M月d日", { locale: ja })}
            </span>
          )}
          {post.author_name && <span>{post.author_name}</span>}
        </div>
      </div>

      {/* Content */}
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8">
        <ReactMarkdown className="prose prose-invert prose-sm md:prose-base max-w-none">
          {post.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}