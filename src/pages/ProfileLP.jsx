import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { MessageCircle, Radio, ShoppingBag, Heart, Star, Users, ExternalLink, Play } from "lucide-react";

const FONT_MAP = {
  gothic: "'Noto Sans JP', sans-serif",
  mincho: "'Noto Serif JP', serif",
  maru: "'Rounded Mplus 1c', 'Noto Sans JP', sans-serif",
  modern: "'Inter', 'Noto Sans JP', sans-serif",
};

const CATEGORY_DEFAULT_COLORS = {
  fortune_telling: { accent: "#8b5cf6", bg: "#0d0a1a" },
  idol: { accent: "#ec4899", bg: "#1a0a12" },
  business: { accent: "#3b82f6", bg: "#0a0f1a" },
  language: { accent: "#10b981", bg: "#091a12" },
  fitness: { accent: "#f59e0b", bg: "#1a1205" },
  education: { accent: "#06b6d4", bg: "#05131a" },
  other: { accent: "#6366f1", bg: "#0f1729" },
};

function LinkButton({ href, icon: Icon, label, color, bg, external }) {
  const inner = (
    <div
      className="w-full flex items-center gap-4 px-6 py-4 rounded-2xl font-bold text-base transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
      style={{ background: bg, border: `1.5px solid ${color}40`, color }}
    >
      <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${color}20` }}>
        <Icon className="w-5 h-5" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <ExternalLink className="w-4 h-4 opacity-50" />
    </div>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer">{inner}</a>;
  return <Link to={href}>{inner}</Link>;
}

export default function ProfileLP() {
  const { username } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["profile-lp-channel", username],
    queryFn: async () => {
      // username または channel id で検索
      const byUsername = await base44.entities.Channel.filter({ username });
      if (byUsername.length > 0) return byUsername[0];
      // fallback: channel id で検索
      const byId = await base44.entities.Channel.filter({ id: username });
      return byId[0] || null;
    },
    enabled: !!username,
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ["profile-lp-lives", channel?.id],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channel.id, status: "live" }, "-created_date", 3),
    enabled: !!channel?.id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["profile-lp-products", channel?.id],
    queryFn: () => base44.entities.Product.filter({ channel_id: channel.id, is_active: true }, "-created_date", 6),
    enabled: !!channel?.id,
  });

  const { data: chekis = [] } = useQuery({
    queryKey: ["profile-lp-chekis", channel?.id],
    queryFn: () => base44.entities.DigitalCheki.filter({ channel_id: channel.id, is_active: true }, "-created_date", 4),
    enabled: !!channel?.id,
  });

  const { data: crowdfunding = [] } = useQuery({
    queryKey: ["profile-lp-cf", channel?.owner_email],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ owner_email: channel.owner_email, status: "active" }, "-created_date", 2),
    enabled: !!channel?.owner_email,
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!channel) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
      <p className="text-muted-foreground text-lg">チャンネルが見つかりませんでした</p>
      <Link to="/" className="text-primary underline text-sm">トップへ戻る</Link>
    </div>
  );

  const defaults = CATEGORY_DEFAULT_COLORS[channel.service_category] || CATEGORY_DEFAULT_COLORS.other;
  const accentColor = channel.lp_accent_color || defaults.accent;
  const bgColor = channel.lp_bg_color || defaults.bg;
  const fontFamily = FONT_MAP[channel.lp_font] || FONT_MAP.gothic;

  const hasLive = liveStreams.length > 0;
  const hasProducts = products.length > 0 || chekis.length > 0;
  const hasCrowdfunding = crowdfunding.length > 0;

  return (
    <div
      className="min-h-screen py-10 px-4"
      style={{ background: `linear-gradient(160deg, ${bgColor} 0%, #0a0a14 100%)`, fontFamily }}
    >
      <div className="max-w-md mx-auto space-y-6">

        {/* プロフィールヘッダー */}
        <div className="text-center space-y-4 pt-4">
          {channel.avatar_url ? (
            <img
              src={channel.avatar_url}
              alt={channel.name}
              className="w-24 h-24 rounded-full mx-auto object-cover shadow-2xl"
              style={{ border: `3px solid ${accentColor}60` }}
            />
          ) : (
            <div
              className="w-24 h-24 rounded-full mx-auto flex items-center justify-center text-4xl font-black shadow-2xl"
              style={{ background: `${accentColor}25`, border: `3px solid ${accentColor}60`, color: accentColor }}
            >
              {channel.name?.[0] || "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-black text-white">{channel.name}</h1>
            {channel.username && (
              <p className="text-sm mt-0.5" style={{ color: `${accentColor}cc` }}>@{channel.username}</p>
            )}
          </div>
          {channel.description && (
            <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto line-clamp-3">{channel.description}</p>
          )}

          {/* スタッツ */}
          <div className="flex justify-center gap-6 text-center">
            {channel.subscriber_count > 0 && (
              <div>
                <p className="text-lg font-black text-white">{channel.subscriber_count.toLocaleString()}</p>
                <p className="text-xs text-white/40">フォロワー</p>
              </div>
            )}
            {channel.avg_rating > 0 && (
              <div>
                <p className="text-lg font-black text-white flex items-center gap-1 justify-center">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{channel.avg_rating.toFixed(1)}
                </p>
                <p className="text-xs text-white/40">{channel.review_count}件の評価</p>
              </div>
            )}
          </div>
        </div>

        {/* ライブ中バナー */}
        {hasLive && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3 animate-pulse"
            style={{ background: `${accentColor}18`, border: `1.5px solid ${accentColor}50` }}
          >
            <span className="w-3 h-3 rounded-full bg-red-500 shadow-lg shrink-0" style={{ boxShadow: "0 0 8px #ef4444" }} />
            <div className="flex-1">
              <p className="text-xs font-black text-red-400">LIVE 配信中</p>
              <p className="text-sm font-bold text-white">{liveStreams[0]?.title || "ライブ配信中"}</p>
            </div>
            <Link to={`/live/${liveStreams[0]?.id}`}>
              <button
                className="px-4 py-2 rounded-xl text-xs font-black text-white"
                style={{ background: `linear-gradient(135deg, #ef4444, #dc2626)` }}
              >
                <Play className="w-3 h-3 inline mr-1" />参加
              </button>
            </Link>
          </div>
        )}

        {/* リンクボタン群 */}
        <div className="space-y-3">

          {/* チャンネルページ */}
          <LinkButton
            href={`/channel/${channel.id}`}
            icon={Users}
            label="チャンネルを見る"
            color={accentColor}
            bg={`${accentColor}12`}
          />

          {/* クリエイターチャット（1対1） */}
          <LinkButton
            href={`/chat/${channel.id}`}
            icon={MessageCircle}
            label="メッセージを送る"
            color="#10b981"
            bg="#10b98112"
          />

          {/* 通話予約 */}
          {channel.call_enabled && (
            <LinkButton
              href={`/call-request/${channel.id}`}
              icon={Radio}
              label="ビデオ通話を予約する"
              color="#3b82f6"
              bg="#3b82f612"
            />
          )}

          {/* 販売中の商品 */}
          {hasProducts && (
            <div className="space-y-2">
              <p className="text-xs font-black tracking-widest text-white/30 uppercase px-1">販売中のコンテンツ</p>
              {chekis.slice(0, 2).map((c) => (
                <LinkButton
                  key={c.id}
                  href={`/channel/${channel.id}`}
                  icon={Heart}
                  label={`📸 ${c.title} — ¥${c.price.toLocaleString()}`}
                  color="#ec4899"
                  bg="#ec489912"
                />
              ))}
              {products.slice(0, 2).map((p) => (
                <LinkButton
                  key={p.id}
                  href={`/channel/${channel.id}`}
                  icon={ShoppingBag}
                  label={`🛍 ${p.title} — ¥${p.price.toLocaleString()}`}
                  color={accentColor}
                  bg={`${accentColor}12`}
                />
              ))}
            </div>
          )}

          {/* クラウドファンディング */}
          {hasCrowdfunding && (
            <div className="space-y-2">
              <p className="text-xs font-black tracking-widest text-white/30 uppercase px-1">支援プロジェクト</p>
              {crowdfunding.map((cf) => (
                <LinkButton
                  key={cf.id}
                  href={`/crowdfunding/${cf.id}`}
                  icon={Heart}
                  label={`❤️ ${cf.title}`}
                  color="#f59e0b"
                  bg="#f59e0b12"
                />
              ))}
            </div>
          )}
        </div>

        {/* SNSリンク */}
        {channel.social_links && Object.values(channel.social_links).some(Boolean) && (
          <div className="flex justify-center gap-4 pt-2">
            {channel.social_links.x && (
              <a href={channel.social_links.x} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white/80 transition-colors text-xs font-bold">𝕏</a>
            )}
            {channel.social_links.instagram && (
              <a href={channel.social_links.instagram} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white/80 transition-colors text-xs font-bold">Instagram</a>
            )}
            {channel.social_links.tiktok && (
              <a href={channel.social_links.tiktok} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white/80 transition-colors text-xs font-bold">TikTok</a>
            )}
            {channel.social_links.youtube && (
              <a href={channel.social_links.youtube} target="_blank" rel="noopener noreferrer"
                className="text-white/40 hover:text-white/80 transition-colors text-xs font-bold">YouTube</a>
            )}
          </div>
        )}

        {/* フッター */}
        <div className="text-center pt-4 pb-8">
          <a href="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            Powered by Chat Market
          </a>
        </div>
      </div>
    </div>
  );
}