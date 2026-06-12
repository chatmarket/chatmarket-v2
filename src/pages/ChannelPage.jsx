import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import RevenueRankingWidget from "../components/ranking/RevenueRankingWidget";
import { Button } from "@/components/ui/button";
import { Users, Video, Radio, MessageCircle, Upload, Bell, BellOff, Home, CalendarDays, Flag, Users as UsersIcon, Gem, Shield, Phone, PhoneOff, Camera } from "lucide-react";
import ReportChannelDialog from "../components/channel/ReportChannelDialog";
import OshiRegisterButton from "../components/home/OshiRegisterButton";
import CategoryBadge from "../components/channel/CategoryBadge";
import MusicianProfileBadge from "../components/profile/MusicianProfileBadge";
import FanCommunityTab from "../components/community/FanCommunityTab";
import VaultTab from "../components/vault/VaultTab";
import SanctumTab from "../components/vault/SanctumTab";
import ReferralSharePanel from "../components/channel/ReferralSharePanel";
import MetaHelmet from "../components/layout/MetaHelmet";
import { captureRefFromUrl } from "@/lib/referral";
import { isMusician } from "@/lib/roleTerminology";
import ProfileBadges from "@/components/profile/ProfileBadges";
import ChekiPurchaseModal from "@/components/cheki/ChekiPurchaseModal.jsx";
import ChatReadingApplyModal from "@/components/fortune/ChatReadingApplyModal";
import ProductCard from "@/components/shop/ProductCard";
import MusicProductCard from "@/components/shop/MusicProductCard";

export default function ChannelPage() {
  const { channelId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [showReport, setShowReport] = useState(false);
  const [activeTab, setActiveTab] = useState("videos"); // "videos" | "vault" | "sanctum" | "community"
  const [selectedCheki, setSelectedCheki] = useState(null);
  const [selectedChatMenu, setSelectedChatMenu] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    // 紹介コードをURLから取得してlocalStorageに保存
    captureRefFromUrl();
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setCurrentUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel", channelId],
    queryFn: async () => {
      console.log(`[ChannelPage] Fetching channel with ID: ${channelId}`);
      const channels = await base44.entities.Channel.filter({ id: channelId });
      console.log(`[ChannelPage] Filter result:`, channels);
      if (channels.length === 0) {
        console.error(`[ChannelPage] No channel found for ID: ${channelId}`);
      }
      return channels[0];
    },
    enabled: !!channelId,
  });

  const { data: chatMenus = [] } = useQuery({
    queryKey: ["channel-chat-menus", channelId],
    queryFn: () => base44.entities.ChatReadingMenu.filter({ channel_id: channelId, is_active: true }, "sort_order"),
    enabled: !!channelId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["channel-products", channelId],
    queryFn: () => base44.entities.Product.filter({ channel_id: channelId, is_active: true, is_digital: true }, "-created_date", 20),
    enabled: !!channelId,
  });

  const { data: chekis = [] } = useQuery({
    queryKey: ["channel-chekis", channelId],
    queryFn: () => base44.entities.DigitalCheki.filter({ channel_id: channelId, is_active: true }, "-created_date"),
    enabled: !!channelId,
  });

  const { data: videos = [] } = useQuery({
    queryKey: ["channel-videos", channelId],
    queryFn: () => base44.entities.Video.filter({ channel_id: channelId }, "-created_date"),
    enabled: !!channelId,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["channel-streams", channelId],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channelId, status: "live" }),
    enabled: !!channelId,
  });

  const { data: followData = [] } = useQuery({
    queryKey: ["channel-follow", channelId, currentUser?.email],
    queryFn: () => base44.entities.ChannelFollow.filter({ channel_id: channelId, follower_email: currentUser.email }),
    enabled: !!currentUser,
  });

  const { data: followerCount = [] } = useQuery({
    queryKey: ["channel-follower-count", channelId],
    queryFn: () => base44.entities.ChannelFollow.filter({ channel_id: channelId }),
  });

  const isFollowing = followData.length > 0;

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (isFollowing) {
        await base44.entities.ChannelFollow.delete(followData[0].id);
      } else {
        await base44.entities.ChannelFollow.create({
          channel_id: channelId,
          channel_name: channel?.name || "",
          follower_email: currentUser.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["channel-follow", channelId, currentUser?.email] });
      queryClient.invalidateQueries({ queryKey: ["channel-follower-count", channelId] });
    },
  });

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-secondary rounded-2xl" />
          <div className="h-6 bg-secondary rounded w-1/3" />
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="text-center py-24">
        <p className="text-muted-foreground">チャンネルが見つかりません</p>
      </div>
    );
  }

  const isOwner = currentUser?.email === channel.owner_email;

  // OGP用メタ情報
  const ogTitle = channel.is_live
    ? `🔴 ライブ中：${channel.name} | Chat Market`
    : `${channel.name} | Chat Market`;
  const ogDescription = channel.description
    ? channel.description.slice(0, 100)
    : `${channel.name}のチャンネル。占い鑑定・ライブ配信はChat Marketで。`;
  const ogImage = channel.avatar_url || "https://chatmarket.info/og-image.png";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
      <MetaHelmet
        title={ogTitle}
        description={ogDescription}
        image={ogImage}
      />
      {/* Channel header card */}
      <div className="bg-card rounded-xl sm:rounded-2xl border border-border/50 p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-5">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0 ring-2 ring-border">
            {channel.avatar_url ? (
              <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black truncate">{channel.name}</h1>
              {currentUser && isMusician(currentUser) && (
                <MusicianProfileBadge isMusicianRole={true} size="md" />
              )}
            </div>

            {/* Category & Tags */}
            {(channel.category_id || channel.tags?.length > 0) && (
              <div className="mt-1.5">
                <CategoryBadge categoryId={channel.category_id} tags={channel.tags} />
              </div>
            )}

            {/* Description / Bio */}
            {channel.description && (
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed whitespace-pre-wrap">
                {channel.description}
              </p>
            )}

            {/* Musician 情報（user.role === "musician" の時だけ表示） */}
            {currentUser && isMusician(currentUser) && (
              <div className="mt-3 bg-gradient-to-br from-purple-500/10 to-pink-500/5 border border-purple-500/25 rounded-xl p-3 space-y-2">
                <p className="text-xs font-black text-purple-400 flex items-center gap-1.5">🎸 ミュージシャンプロフィール</p>
                {channel.description && (
                  <div>
                    <p className="text-sm text-foreground/90">{channel.description}</p>
                  </div>
                )}
              </div>
            )}

            {/* 占い師専用情報（stream_category === "fortune" の時だけ表示） */}
            {channel.stream_category === "fortune" && !isMusician(currentUser) && (
              <div className="mt-3 bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/25 rounded-xl p-3 space-y-2">
                <p className="text-xs font-black text-purple-400 flex items-center gap-1.5">🔮 占い師プロフィール</p>

                {/* 対応鑑定スタイルバッジ */}
                {channel.fortune_session_types?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {channel.fortune_session_types.includes("video") && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        📹 ビデオ鑑定
                      </span>
                    )}
                    {channel.fortune_session_types.includes("chat") && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        💬 チャット鑑定
                      </span>
                    )}
                  </div>
                )}

                {channel.fortune_arts && (
                  <div>
                    <p className="text-[10px] text-purple-400/70 font-semibold uppercase tracking-widest">占術</p>
                    <p className="text-sm text-foreground/90">{channel.fortune_arts}</p>
                  </div>
                )}
                {channel.fortune_genres && (
                  <div>
                    <p className="text-[10px] text-purple-400/70 font-semibold uppercase tracking-widest">相談ジャンル</p>
                    <p className="text-sm text-foreground/90">{channel.fortune_genres}</p>
                  </div>
                )}
                {channel.fortune_experience && (
                  <div>
                    <p className="text-[10px] text-purple-400/70 font-semibold uppercase tracking-widest">実績・資格</p>
                    <p className="text-sm text-foreground/90 whitespace-pre-wrap">{channel.fortune_experience}</p>
                  </div>
                )}
              </div>
            )}

            {/* バッジ */}
            {channel.badges?.length > 0 && (
              <div className="mt-2">
                <ProfileBadges badges={channel.badges} compact />
              </div>
            )}

            {/* Stats row */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 sm:mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Video className="w-3.5 h-3.5" /> {videos.length} 動画
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" /> {followerCount.length} フォロワー
              </span>
              {channel.is_live && (
                <span className="flex items-center gap-1 text-red-400 font-semibold">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> 配信中
                </span>
              )}
              {channel.call_enabled ? (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-green-500/15 text-green-400 border border-green-500/30">
                  <Phone className="w-3 h-3" />
                  通話受付中
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/5 text-muted-foreground border border-border/50">
                  <PhoneOff className="w-3 h-3" />
                  通話オフ
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
            <Link to="/">
              <Button size="sm" variant="outline" className="gap-2 w-full">
                <Home className="w-4 h-4" /> TOPに戻る
              </Button>
            </Link>
            {isOwner ? (
              <>
                <Link to="/my-channel">
                  <Button size="sm" variant="secondary" className="gap-2 w-full">
                    <Upload className="w-4 h-4" /> チャンネル管理
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!currentUser) { base44.auth.redirectToLogin(); return; }
                    toggleFollow.mutate();
                  }}
                  className={`gap-2 w-full ${isFollowing ? "bg-secondary hover:bg-destructive/20 text-foreground" : "bg-primary hover:bg-primary/90"}`}
                >
                  {isFollowing ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  {isFollowing ? "フォロー中" : "フォローする"}
                </Button>
                <OshiRegisterButton channel={channel} user={currentUser} />
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-2 w-full"
                  onClick={() => navigate(`/chat/${channelId}`)}
                >
                  <MessageCircle className="w-4 h-4" />
                  チャットで問い合わせ
                </Button>
                {channel.call_enabled && (
                  <>
                    <Button
                      size="sm"
                      className="gap-2 w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-black shadow-lg shadow-green-500/30 animate-pulse hover:animate-none transition-all scale-100 hover:scale-105"
                      onClick={async () => {
                        if (!currentUser) { base44.auth.redirectToLogin(); return; }
                        try {
                          // ビデオ通話リクエストを作成（callerとしてリクエスト）
                          const call = await base44.entities.VideoCall.create({
                            caller_email: currentUser.email,
                            caller_name: currentUser.full_name || currentUser.email,
                            callee_email: channel.owner_email,
                            callee_channel_id: channelId,
                            callee_name: channel.name,
                            status: "pending",
                            message: `${currentUser.full_name || currentUser.email}が通話をリクエストしました`,
                          });
                          console.log('[ChannelPage] ✅ Call request created:', call.id);
                          // 通話リクエスト画面へ遷移
                          navigate(`/video-call/${call.id}`);
                        } catch (err) {
                          console.error('[ChannelPage] ❌ Call request failed:', err);
                        }
                      }}
                    >
                      <Phone className="w-4 h-4" />
                      今すぐ通話をリクエスト
                    </Button>
                    <Link to={`/call-calendar/${channelId}`}>
                      <Button size="sm" className="gap-2 w-full bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
                        <CalendarDays className="w-4 h-4" />
                        通話を予約する
                      </Button>
                    </Link>
                  </>
                )}
                {/* Digital Cheki feature is frozen / hidden for now. Cheki purchase button suppressed. */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 w-full text-muted-foreground hover:text-red-400 text-xs"
                  onClick={() => setShowReport(true)}
                >
                  <Flag className="w-3.5 h-3.5" /> このチャンネルを通報
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <ReportChannelDialog
        channel={channel}
        user={currentUser}
        open={showReport}
        onClose={() => setShowReport(false)}
      />

      {/* Tab navigation */}
      <div className="border-b border-border/50 mb-6 sm:mb-8 flex gap-1 overflow-x-auto scrollbar-hide">
        {[
          { key: "videos", icon: Video, label: `動画 (${videos.length})` },
          // Digital Cheki feature is frozen / hidden for now. Cheki tab suppressed.
          { key: "vault", icon: Gem, label: "宝物庫", badge: "NEW", badgeColor: "bg-amber-500/20 text-amber-400" },
          { key: "sanctum", icon: Shield, label: "The Sanctum", badge: "FC", badgeColor: "bg-purple-500/20 text-purple-400" },
          { key: "community", icon: UsersIcon, label: "コミュニティ" },
        ].map(({ key, icon: Icon, label, badge, badgeColor }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-3 font-semibold text-sm border-b-2 transition-colors whitespace-nowrap shrink-0 ${
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {badge && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${badgeColor}`}>{badge}</span>}
          </button>
        ))}
      </div>

      {/* Live streams */}
      {activeTab === "videos" && liveStreams.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Radio className="w-5 h-5 text-red-400" /> ライブ配信中
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {liveStreams.map((s) => (
              <LiveStreamCard key={s.id} stream={s} channelCallEnabled={channel.call_enabled} />
            ))}
          </div>
        </section>
      )}

      {/* Videos tab */}
      {activeTab === "videos" && (
        <section>
          <h2 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" /> 投稿動画
            <span className="text-sm font-normal text-muted-foreground">（{videos.length}本）</span>
          </h2>
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground">まだ動画がありません</p>
            </div>
          )}
        </section>
      )}

      {/* Digital Cheki feature is frozen / hidden for now. Cheki tab content suppressed. */}

      {/* Vault tab */}
      {activeTab === "vault" && (
        <VaultTab channel={channel} currentUser={currentUser} />
      )}

      {/* Sanctum tab */}
      {activeTab === "sanctum" && (
        <SanctumTab channel={channel} currentUser={currentUser} />
      )}

      {/* Community tab */}
      {activeTab === "community" && (
        <FanCommunityTab
          channel={channel}
          currentUser={currentUser}
          isOwner={isOwner}
          isFollower={isFollowing}
        />
      )}

      {/* デジタル商品販売セクション（カテゴリ別セクション名・カード種別） */}
      {products.length > 0 && (() => {
        const isFortune = channel.stream_category === "fortune" || channel.service_category === "fortune_telling";
        const isEdu = channel.service_category === "language" || channel.service_category === "education" || channel.category_id === "education";
        const isMusic = !isFortune && !isEdu
          && (channel.category_id === "hobby" || channel.category_id === "entertainment" || !channel.category_id)
          && (channel.service_category === "other" || channel.service_category === "idol" || !channel.service_category)
          && (channel.tags || []).some(t => ["音楽", "ミュージシャン", "バンド", "作曲", "DTM", "シンガー"].includes(t));
        const sectionLabel = isFortune ? "🔮 鑑定書・デジタルコンテンツ"
          : isEdu ? "📚 教材・デジタル資料"
          : isMusic ? "🎵 楽曲・音源販売"
          : "💾 デジタルコンテンツ";
        return (
          <section className="mb-6">
            <h2 className="text-base sm:text-lg font-bold mb-1">{sectionLabel}</h2>
            {isMusic && (
              <p className="text-xs text-muted-foreground mb-3">オリジナル曲、EP、BGM素材などをデジタル作品として購入できます。</p>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map(product => (
                isMusic
                  ? <MusicProductCard key={product.id} product={product} />
                  : <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </section>
        );
      })()}

      {/* チャット鑑定メニュー（占い師チャンネルのみ） */}
      {channel.stream_category === "fortune" && chatMenus.length > 0 && !isOwner && (
        <section className="mb-6">
          <h2 className="text-base sm:text-lg font-bold mb-3 flex items-center gap-2">
            <span>🔮</span> チャット鑑定メニュー
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {chatMenus.map(menu => (
              <div key={menu.id} className="bg-card border border-purple-500/25 rounded-2xl p-4 hover:border-purple-500/50 transition-all space-y-2">
                <p className="font-black text-sm">{menu.title}</p>
                {menu.description && <p className="text-xs text-muted-foreground line-clamp-3">{menu.description}</p>}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground text-base">¥{menu.price_yen?.toLocaleString()}</span>
                  <span className="flex items-center gap-1">⏰ {menu.estimated_reply_hours || 24}時間以内返信</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    if (!currentUser) { base44.auth.redirectToLogin(); return; }
                    setSelectedChatMenu(menu);
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold gap-2"
                >
                  <span>🔮</span> チャット鑑定を申し込む
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Digital Cheki feature is frozen / hidden for now. ChekiPurchaseModal suppressed. */}

      {selectedChatMenu && (
        <ChatReadingApplyModal
          menu={selectedChatMenu}
          channel={channel}
          user={currentUser}
          onClose={() => setSelectedChatMenu(null)}
        />
      )}

      {/* オーナー向け：SNS紹介シェアパネル */}
      {isOwner && (
        <div className="mt-8">
          <ReferralSharePanel channel={channel} />
        </div>
      )}
    </div>
  );
}