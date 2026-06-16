import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { PhoneCall, MessageCircle, User } from "lucide-react";
import ScrollRow from "./ScrollRow";
import { toast } from "sonner";
import { getLang, getCountry, LearningStatusBadge } from "@/components/channel/GlobalProfilePanel";

// ゴーストサンプル — AWSに一切通信しないダミーカード（実際の通話不可）
const GHOST_CHANNELS = [
  { id: "ghost-1", name: "ゆいか", call_theme: "恋愛相談・悩み聞きます💕", call_available_dates: "毎日20時〜深夜", avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop", tags: ["恋愛", "相談"] },
  { id: "ghost-2", name: "りょう", call_theme: "ビジネス・副業相談🔥", call_available_dates: "平日19時〜22時", avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop", tags: ["ビジネス"] },
  { id: "ghost-3", name: "さくら", call_theme: "英会話・語学練習🌸", call_available_dates: "土日終日OK", avatar_url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop", tags: ["英語", "語学"] },
  { id: "ghost-4", name: "たくみ", call_theme: "プログラミング・ITなんでも💻", call_available_dates: "毎晩21時〜", avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop", tags: ["IT", "プログラミング"] },
  { id: "ghost-5", name: "みお", call_theme: "メンタルケア・話し相手🌙", call_available_dates: "深夜0時〜3時も対応", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop", tags: ["メンタル"] },
  { id: "ghost-6", name: "けんじ", call_theme: "筋トレ・ダイエット指導💪", call_available_dates: "朝6時〜・夜22時〜", avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop", tags: ["筋トレ"] },
];

function CallWaitingRowComponent({ user, categoryFilter = "all", filteredChannels = null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: allChannels = [] } = useQuery({
    queryKey: ["call-enabled-channels"],
    queryFn: () => base44.entities.Channel.filter({ call_enabled: true }, "-updated_date", 200),
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    // リアルタイム購読（subscribe）で変更を検知するためポーリング不要
  });

  // Channel の変更をリアルタイム購読 → 待機ON/OFFを即座に反映
  useEffect(() => {
    const unsub = base44.entities.Channel.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["call-enabled-channels"] });
    });
    return unsub;
  }, [queryClient]);

  // ログイン中ユーザーが owner のチャンネルIDセットを作成
  const myChannelIds = new Set(
    user ? allChannels.filter(ch => ch.owner_email === user.email).map(ch => ch.id) : []
  );

  const handleChat = (channelId) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    navigate(`/chat/${channelId}`);
  };

  // カテゴリフィルター適用 — call_enabled チャンネルをカテゴリで絞るだけ
  const baseChannels = categoryFilter === "all"
    ? allChannels
    : categoryFilter === "fortune"
      ? allChannels.filter(ch => ch.stream_category === "fortune")
      : categoryFilter === "chat"
        ? allChannels.filter(ch => ch.stream_category === "chat" || !ch.stream_category)
        : allChannels;

  // 占いカテゴリのゴーストを追加（all/fortuneタブのみ）
  const FORTUNE_GHOSTS = categoryFilter === "fortune" ? [
    { id: "ghost-f1", name: "天宮みくり", call_theme: "タロット鑑定💎恋愛・仕事なんでも", call_available_dates: "毎晩20時〜", stream_category: "fortune", avatar_url: "https://images.unsplash.com/photo-1581091870627-7d2b3e8a2b97?w=200&h=200&fit=crop" },
    { id: "ghost-f2", name: "蒼月れいか", call_theme: "西洋占星術🌙本格的なホロスコープ", call_available_dates: "土日・祝日終日", stream_category: "fortune", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop" },
  ] : [];

  const ghostsToShow = categoryFilter === "fortune" ? FORTUNE_GHOSTS
    : categoryFilter === "chat" ? GHOST_CHANNELS
    : [...GHOST_CHANNELS, ...FORTUNE_GHOSTS];

  // 実チャンネル + ゴーストを合わせて表示
  const displayChannels = [...baseChannels, ...ghostsToShow];
  const half = Math.ceil(displayChannels.length / 2);
  const rows = [displayChannels.slice(0, half), displayChannels.slice(half)].filter(r => r.length > 0);
  const isOwnChannel = (channel) => myChannelIds.has(channel.id);

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse shrink-0" />
        <h2 className="text-xl font-bold">今すぐ相談できるクリエイター</h2>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        通話受付中のクリエイターに、ビデオ通話やメッセージで相談できます。
      </p>

      {rows.map((row, idx) => (
        <ScrollRow key={idx} cardWidth={200}>
          {row.map((channel) => {
            const isGhost = channel.id.startsWith("ghost-");
            return (
              <CallWaitingCard
                key={channel.id}
                channel={channel}
                user={user}
                onChat={() => !isGhost && handleChat(channel.id)}
                isOwnChannel={isOwnChannel(channel)}
                isGhost={isGhost}
              />
            );
          })}
        </ScrollRow>
      ))}
    </section>
  );
}

function CallWaitingCard({ channel, user, onChat, isOwnChannel, isGhost }) {
  const navigate = useNavigate();
  const [calling, setCalling] = useState(false);
  const cardChannelId = channel.id;
  const cardChannelName = channel.name;

  const handleInstantCall = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (calling) return;
    setCalling(true);
    try {
      // VideoCallレコードを即座に作成して通話ページへ直行
      const newCall = await base44.entities.VideoCall.create({
        caller_email: user.email,
        caller_name: user.full_name || user.email,
        callee_email: channel.owner_email,
        callee_name: channel.name,
        callee_channel_id: cardChannelId,
        status: "pending",
        is_paid: false,
        price: 0,
        coin_price_per_15min: 150,
        duration_minutes: 30,
        message: "今すぐ通話リクエスト（待機中）",
      });
      navigate(`/video-call/${newCall.id}`);
    } catch (err) {
      toast.error("通話リクエストの作成に失敗しました");
      setCalling(false);
    }
  };

  return (
    <div className={`w-[200px] shrink-0 rounded-2xl overflow-hidden card-float border ${
      channel.stream_category === "fortune"
        ? "bg-purple-500/10 border-purple-500/30"
        : "bg-green-500/10 border-green-500/30"
    }`}>
      {/* Avatar */}
      <div className="relative h-24 bg-gradient-to-br from-primary/10 to-secondary flex items-center justify-center">
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt={channel.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
          </div>
        )}
        <div className={`absolute top-2 left-2 flex items-center gap-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
          channel.is_live ? "bg-red-500/90" : channel.stream_category === "fortune" ? "bg-purple-500/90" : "bg-green-500/90"
        }`}>
          <span className={`w-1 h-1 rounded-full bg-white ${channel.is_live ? "" : "animate-pulse"}`} />
          {channel.is_live ? "📡 配信中" : channel.stream_category === "fortune" ? "🔮 占い" : "今すぐ通話可能"}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5 space-y-1.5">
        {/* 言語バッジ行 */}
        {(channel.native_language || (channel.learning_languages || []).length > 0) && (
          <div className="flex flex-wrap gap-1">
            {channel.native_language && (() => {
              const lang = getLang(channel.native_language);
              return lang ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-semibold leading-none">
                  {lang.flag} {lang.name}
                </span>
              ) : null;
            })()}
            {(channel.learning_languages || []).slice(0, 2).map(code => {
              const lang = getLang(code);
              return lang ? (
                <span key={code} className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-semibold leading-none">
                  {lang.flag} {lang.name}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* 待機タイトル（call_theme） */}
        <p className="text-xs font-black text-foreground line-clamp-2 leading-tight">
          {channel?.call_theme || "通話受付中"}
        </p>

        {/* 学習ステータス */}
        {channel.learning_status && (
          <LearningStatusBadge text={channel.learning_status} compact />
        )}

        {!isGhost ? (
          <Link to={`/channel/${cardChannelId}`}>
            <p className="text-[10px] text-muted-foreground truncate hover:text-primary transition-colors">{cardChannelName}</p>
          </Link>
        ) : (
          <p className="text-[10px] text-muted-foreground truncate">{cardChannelName}</p>
        )}

        {isGhost ? (
          <div className="w-full h-7 rounded-lg text-[11px] font-medium flex items-center justify-center text-muted-foreground/50 bg-white/2 border border-border/20">
            近日公開予定
          </div>
        ) : channel.is_live ? (
          /* 配信中 → 1対1不可 */
          <div className="space-y-1.5">
            <div className="w-full h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 bg-red-500/15 border border-red-500/30 text-red-400">
              📡 配信中につき1対1不可
            </div>
            <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1 border-border/40" onClick={() => navigate(`/channel/${cardChannelId}`)}>
              配信を見る →
            </Button>
          </div>
        ) : !isOwnChannel ? (
          <div className="space-y-1.5">
            {/* 即時通話ボタンを最前面に */}
            <button
              onClick={async () => {
                if (!user) { base44.auth.redirectToLogin(); return; }
                if (calling) return;
                setCalling(true);
                try {
                  const newCall = await base44.entities.VideoCall.create({
                    caller_email: user.email,
                    caller_name: user.full_name || user.email,
                    callee_email: channel.owner_email,
                    callee_name: channel.name,
                    callee_channel_id: cardChannelId,
                    status: "pending",
                    is_paid: false,
                    price: 0,
                    coin_price_per_15min: 150,
                    duration_minutes: 30,
                    message: "今すぐ通話リクエスト（待機中）",
                  });
                  navigate(`/video-call/${newCall.id}`);
                } catch {
                  toast.error("通話リクエストの作成に失敗しました");
                  setCalling(false);
                }
              }}
              className="w-full h-8 rounded-lg text-[11px] font-black flex items-center justify-center gap-1 transition-all active:scale-95"
              style={{
                background: calling ? "rgba(0,255,157,0.2)" : "linear-gradient(135deg,#00ff9d,#00c97a)",
                color: "#000",
                boxShadow: "0 0 10px rgba(0,255,157,0.4)",
              }}
            >
              <PhoneCall className="w-3 h-3" />
              {calling ? "接続中…" : "今すぐ通話"}
            </button>
            <Button size="sm" variant="outline" className="w-full h-7 text-[11px] gap-1 border-border/40" onClick={() => navigate(`/call-profile/${cardChannelId}`)}>
              <User className="w-3 h-3" /> 詳細を見る
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full h-7 text-[11px] bg-primary hover:bg-primary/90 gap-1"
            onClick={() => navigate(`/call-profile/${cardChannelId}`)}
          >
            <User className="w-3 h-3" /> プロフィールを見る
          </Button>
        )}
      </div>
    </div>
  );
}

export default React.memo(CallWaitingRowComponent);