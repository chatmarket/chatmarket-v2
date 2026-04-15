import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Filter, Lock } from "lucide-react";
import PostCard from "../components/community/PostCard";
import PostComposer from "../components/community/PostComposer";

const PLAN_ORDER = ["public", "basic", "call-anser", "vod", "ppv"];

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "public", label: "全員公開" },
  { value: "basic", label: "BASIC限定" },
  { value: "call-anser", label: "CALL&ANSER限定" },
  { value: "vod", label: "VOD限定" },
  { value: "ppv", label: "PPV限定" },
];

function getUserPlans(user, subscriptions) {
  if (!user) return [];
  if (user.role === "admin") return ["public", "basic", "call-anser", "vod", "ppv"];
  const active = subscriptions.filter(s => s.user_email === user.email && s.status === "active").map(s => s.plan_id);
  return ["public", ...active];
}

export default function Community() {
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    base44.auth.isAuthenticated().then(ok => {
      if (ok) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: () => base44.entities.CommunityPost.list("-created_date", 50),
    refetchInterval: 30000,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["user-subscriptions", user?.email],
    queryFn: () => base44.entities.PlanSubscription.filter({ user_email: user.email, status: "active" }),
    enabled: !!user,
  });

  const { data: channel } = useQuery({
    queryKey: ["my-channel-community", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0]),
    enabled: !!user,
  });

  const userPlans = getUserPlans(user, subscriptions);

  const visiblePosts = posts.filter(post => {
    // 閲覧権限チェック
    if (!userPlans.includes(post.visibility)) return false;
    // フィルター
    if (filter !== "all" && post.visibility !== filter) return false;
    return true;
  });

  // ピン留め優先ソート
  const sortedPosts = [
    ...visiblePosts.filter(p => p.is_pinned),
    ...visiblePosts.filter(p => !p.is_pinned),
  ];

  const lockedCount = posts.filter(p => !userPlans.includes(p.visibility)).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-black">コミュニティ</h1>
          <p className="text-xs text-muted-foreground">ライバーとファンの交流掲示板</p>
        </div>
      </div>

      {/* ロック中の投稿通知 */}
      {lockedCount > 0 && (
        <div className="bg-secondary border border-border/50 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="w-4 h-4 shrink-0 text-yellow-400" />
          <span>プラン加入者限定の投稿が <span className="text-yellow-400 font-bold">{lockedCount}件</span> あります。</span>
        </div>
      )}

      {/* 投稿フォーム */}
      {user && <PostComposer user={user} channel={channel} />}
      {!user && (
        <div className="bg-card border border-border/50 rounded-2xl p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">投稿・コメント・いいねにはログインが必要です</p>
          <button
            onClick={() => base44.auth.redirectToLogin()}
            className="text-primary font-bold text-sm underline"
          >
            ログインする →
          </button>
        </div>
      )}

      {/* フィルター */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
              filter === opt.value
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border/50 text-muted-foreground hover:border-primary/40"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* 投稿一覧 */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 space-y-3 animate-pulse">
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-secondary" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded w-1/3" />
                  <div className="h-3 bg-secondary rounded w-full" />
                  <div className="h-3 bg-secondary rounded w-2/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : sortedPosts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground space-y-2">
          <Users className="w-12 h-12 mx-auto opacity-20" />
          <p className="text-sm">まだ投稿がありません</p>
          {user && <p className="text-xs">最初の投稿をしてみましょう！</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map(post => (
            <PostCard
              key={post.id}
              post={post}
              user={user}
              userPlans={userPlans}
            />
          ))}
        </div>
      )}
    </div>
  );
}