import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Filter, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import PostCard from "../components/community/PostCard";
import PostComposer from "../components/community/PostComposer";

const FILTER_OPTIONS = [
  { value: "all", label: "すべて" },
  { value: "public", label: "全員公開" },
  { value: "basic", label: "BASIC限定" },
  { value: "call-anser", label: "CALL&ANSER限定" },
  { value: "vod", label: "VOD限定" },
  { value: "ppv", label: "PPV限定" },
];

const PLAN_LABEL = {
  basic: "BASICプラン",
  "call-anser": "CALL&ANSERプラン",
  vod: "VODプラン",
  ppv: "PPVプラン",
};

function getUserPlans(user, subscriptions) {
  if (!user) return ["public"];
  if (user.role === "admin") return ["public", "basic", "call-anser", "vod", "ppv"];
  const active = subscriptions
    .filter(s => s.user_email === user.email && s.status === "active")
    .map(s => s.plan_id);
  return ["public", ...active];
}

function LockedPostPlaceholder({ visibility }) {
  const planName = PLAN_LABEL[visibility] || "限定プラン";
  return (
    <div className="relative bg-card border border-border/50 rounded-2xl overflow-hidden">
      {/* ぼかしコンテンツ（ダミー） */}
      <div className="p-4 space-y-3 select-none pointer-events-none" style={{ filter: "blur(4px)", opacity: 0.4 }}>
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-secondary" />
          <div className="space-y-1.5">
            <div className="h-3 bg-secondary rounded w-24" />
            <div className="h-2.5 bg-secondary rounded w-16" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-secondary rounded w-full" />
          <div className="h-3 bg-secondary rounded w-4/5" />
          <div className="h-3 bg-secondary rounded w-3/5" />
        </div>
      </div>
      {/* ロックオーバーレイ */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
          <Lock className="w-5 h-5 text-yellow-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold">ここから先は限定プランへの加入が必要です</p>
          <p className="text-xs text-muted-foreground">この投稿は <span className="text-yellow-400 font-bold">{planName}</span> 加入者のみ閲覧できます</p>
        </div>
        <Link to="/plan-select">
          <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90">
            <Lock className="w-3.5 h-3.5" />
            プランに加入する
          </Button>
        </Link>
      </div>
    </div>
  );
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
    refetchInterval: 15000,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["user-subscriptions-community", user?.email],
    queryFn: () => base44.entities.PlanSubscription.filter({ user_email: user.email, status: "active" }),
    enabled: !!user,
  });

  const { data: channel } = useQuery({
    queryKey: ["my-channel-community", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0]),
    enabled: !!user,
  });

  // 各投稿の投稿者チャンネルオーナーメールを逆引きするため、ユニークなchannel_idを収集
  const channelIds = [...new Set(posts.map(p => p.channel_id).filter(Boolean))];
  const { data: allChannels = [] } = useQuery({
    queryKey: ["channels-for-community", channelIds.join(",")],
    queryFn: () => base44.entities.Channel.list(),
    enabled: channelIds.length > 0,
  });

  const channelOwnerMap = Object.fromEntries(allChannels.map(c => [c.id, c.owner_email]));

  const userPlans = getUserPlans(user, subscriptions);

  // フィルタリング（投稿自体は常に取得、表示時に制御）
  const filteredPosts = posts.filter(post => {
    if (filter !== "all" && post.visibility !== filter) return false;
    return true;
  });

  // ピン留め優先ソート
  const sortedPosts = [
    ...filteredPosts.filter(p => p.is_pinned),
    ...filteredPosts.filter(p => !p.is_pinned),
  ];

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

      {/* 投稿フォーム（チャンネルオーナーのみ） */}
      {user && channel && <PostComposer user={user} channel={channel} />}
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
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPosts.map(post => {
            const canView = userPlans.includes(post.visibility);
            const postChannelOwner = channelOwnerMap[post.channel_id] || post.author_email;

            if (!canView) {
              return <LockedPostPlaceholder key={post.id} visibility={post.visibility} />;
            }
            return (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                userPlans={userPlans}
                channelOwnerEmail={postChannelOwner}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}