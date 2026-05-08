import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

// サンプルライブストリーム（外部画像なし・ダミー）
// thumbnail_url / channel_avatar は null にしてコンポーネント側のフォールバックを使用
const SAMPLE_LIVESTREAMS = [
  { id: "sample_1", title: "朝のおはよう配信💖", channel_name: "あおいのチャンネル", channel_avatar: null, thumbnail_url: null, viewer_count: 342, price: 200, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
  { id: "sample_2", title: "ゲーム配信🎮", channel_name: "げーまーゆき", channel_avatar: null, thumbnail_url: null, viewer_count: 1205, price: 300, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
  { id: "sample_3", title: "料理の時間🍳", channel_name: "シェフたかし", channel_avatar: null, thumbnail_url: null, viewer_count: 567, price: 150, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
  { id: "sample_4", title: "音楽ライブ🎵", channel_name: "ミュージシャン太郎", channel_avatar: null, thumbnail_url: null, viewer_count: 2341, price: 500, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
  { id: "sample_5", title: "フィットネス配信💪", channel_name: "トレーナーアキ", channel_avatar: null, thumbnail_url: null, viewer_count: 876, price: 250, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
  { id: "sample_6", title: "お絵描き配信✨", channel_name: "イラストレーターまお", channel_avatar: null, thumbnail_url: null, viewer_count: 654, price: 180, status: "live", live_started_at: new Date().toISOString(), stream_type: "ivs" },
];
import { Radio, Play, Heart, ExternalLink, ChevronDown, ChevronUp, MessageCircle, Search, Zap, PhoneCall, PhoneOff, Settings, X } from "lucide-react";
import { isBefore } from "date-fns";
import { toast } from "sonner";
import { t } from "@/lib/i18n";
import { useInViewTrigger } from "@/hooks/useInViewTrigger";

const _RECRUIT_DEADLINE = new Date('2026-05-01T00:00:00+09:00');
const _now = new Date();
const SHOW_RECRUIT_BANNER = isBefore(_now, _RECRUIT_DEADLINE);

import VideoCard from "../components/cards/VideoCard";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { isAdmin } from "@/lib/adminConfig";
import LiveStreamCard from "../components/cards/LiveStreamCard";
import MessageModal from "../components/chat/MessageModal";
import ScrollRow from "../components/home/ScrollRow";
import CallWaitingRow from "../components/home/CallWaitingRow";
import CreatorRanking from "../components/home/CreatorRanking";
import PwaInstallGuideSection from "../components/home/PwaInstallGuideSection";
import ProgressiveIncentiveSection from "../components/home/ProgressiveIncentiveSection";
import ServerLimitBanner from "../components/home/ServerLimitBanner";
import HeroSlot from "../components/home/HeroSlot";
import GiantKillingBanner from "../components/home/GiantKillingBanner";
import MillionaireSupporters from "../components/home/MillionaireSupporters";
import QualityRevolutionBanner from "../components/home/QualityRevolutionBanner";
import PpvPricingTable from "../components/home/PpvPricingTable";
import FounderSection from "../components/home/FounderSection";


export default function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [myChannel, setMyChannel] = useState(null);
  const [togglingWait, setTogglingWait] = useState(false);
  const [showCallSettings, setShowCallSettings] = useState(false);
  const [callSettingsForm, setCallSettingsForm] = useState({ duration: 30, price: 150 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [cfExpanded, setCfExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryTab, setCategoryTab] = useState("all");
  const [enabledSections, setEnabledSections] = useState({
    callWaiting: true,  // 常に表示（IntersectionObserverの遅延を回避）
    liveStreams: true,  // 同様に常に取得開始
    popularVideos: false,
    featuredVideos: false,
    freeVideos: false,
    recentVideos: false,
    crowdfunding: false,
    ranking: false,
    millionaire: false,
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(async (u) => {
          setUser(u);
          // console.log("Current User:", u.email);
          const channels = await base44.entities.Channel.filter({ owner_email: u.email });
          if (channels[0]) {
            setMyChannel(channels[0]);
          }
        }).catch((err) => console.error("[Home] Auth error:", err));
      }
    });

    // Channel変更をリアルタイムで購読 → 画面即更新
    const unsub = base44.entities.Channel.subscribe((event) => {
      if (event.type === "update" && event.data?.call_enabled !== undefined) {
        // call_enabledが変わったら、関連クエリをリセット（キャッシュ無効化）
        queryClient.invalidateQueries({ queryKey: ["call-enabled-channels"] });
        queryClient.invalidateQueries({ queryKey: ["channels-all"] });
      }
    });
    return () => unsub();
  }, []);

  const openCallSettings = () => {
    if (!myChannel) return;
    setCallSettingsForm({
      duration: myChannel?.default_call_duration_minutes || 30,
      price: myChannel?.call_price_30min || 150,
    });
    setShowCallSettings(true);
  };

  const handleSaveCallSettings = async () => {
    if (!myChannel) return;
    const { duration, price } = callSettingsForm;
    const minPrice = Math.ceil((duration / 15) * 150);
    if (price < minPrice) {
      toast.error(`${duration}分の最低料金は¥${minPrice}です（150円/15分）`);
      return;
    }
    setSavingSettings(true);
    const update = { default_call_duration_minutes: duration };
    [15, 30, 45, 60].forEach((m) => { update[`call_price_${m}min`] = Math.round((price / duration) * m); });
    update[`call_price_${duration}min`] = price;
    await base44.entities.Channel.update(myChannel.id, update);
    setMyChannel({ ...myChannel, ...update });
    setSavingSettings(false);
    setShowCallSettings(false);
    toast.success("通話設定を保存しました");
  };

  const handleToggleWaiting = async () => {
    if (!myChannel) {
      // 自動的にチャンネルを再取得
      try {
        const channels = await base44.entities.Channel.filter({ owner_email: user.email });
        if (!channels[0]) {
          toast.error("チャンネルを先に作成してください");
          return;
        }
        setMyChannel(channels[0]);
        await base44.entities.Channel.update(channels[0].id, { call_enabled: true });
        setMyChannel({ ...channels[0], call_enabled: true });
        toast.success("✅ 待機中にしました。ファンに「今すぐ通話可能」と表示されます。");
      } catch (err) {
        toast.error("エラー: " + err.message);
      }
      setTogglingWait(false);
      return;
    }
    setTogglingWait(true);
    const newState = !myChannel.call_enabled;
    await base44.entities.Channel.update(myChannel.id, { call_enabled: newState });
    setMyChannel({ ...myChannel, call_enabled: newState });
    toast.success(newState ? "✅ 待機中にしました。ファンに「今すぐ通話可能」と表示されます。" : "待機を停止しました。");
    setTogglingWait(false);
  };

  // セクションのIntersection Observer トリガー
  const triggerSection = (key) => {
    setEnabledSections(prev => ({ ...prev, [key]: true }));
  };

  const { ref: callRef } = useInViewTrigger(() => triggerSection('callWaiting'));
  const { ref: liveRef } = useInViewTrigger(() => triggerSection('liveStreams'));
  const { ref: popularRef } = useInViewTrigger(() => triggerSection('popularVideos'));
  const { ref: featuredRef } = useInViewTrigger(() => triggerSection('featuredVideos'));
  const { ref: freeRef } = useInViewTrigger(() => triggerSection('freeVideos'));
  const { ref: recentRef } = useInViewTrigger(() => triggerSection('recentVideos'));
  const { ref: cfRef } = useInViewTrigger(() => triggerSection('crowdfunding'));
  const { ref: rankingRef } = useInViewTrigger(() => triggerSection('ranking'));
  const { ref: millionaireRef } = useInViewTrigger(() => triggerSection('millionaire'));

  const { data: channels = [] } = useQuery({
    queryKey: ["channels-all"],
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 50),
    enabled: true,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // カテゴリフィルター済みチャンネル
  const filteredChannels = channels.filter((ch) => {
    if (categoryTab === "all") return true;
    if (categoryTab === "fortune") return ch.stream_category === "fortune";
    if (categoryTab === "chat") return ch.stream_category === "chat" || !ch.stream_category;
    return true;
  });

  // ライブストリーム：本物 + ダミー統合
  const { data: liveStreams = [] } = useQuery({
    queryKey: ["livestreams-home"],
    queryFn: async () => {
      const real = await base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 6);
      // 本物が6件未満なら、ダミーを追加して計6件に統一
      if (real.length < 6) {
        return [...real, ...SAMPLE_LIVESTREAMS.slice(0, 6 - real.length)];
      }
      return real;
    },
    enabled: enabledSections.liveStreams,
    staleTime: 0,
    refetchInterval: 30000,
    gcTime: 0,
  });

  const { data: scheduledStreams = [] } = useQuery({
    queryKey: ["livestreams-scheduled"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "scheduled" }, "scheduled_at", 6),
    enabled: enabledSections.liveStreams,
    staleTime: 300000,
    gcTime: 600000,
  });

  const { data: popularVideos = [] } = useQuery({
    queryKey: ["videos-popular"],
    queryFn: async () => {
      const all = await base44.entities.Video.list("-view_count", 30);
      return all.filter((v) => !v.moderation_status || v.moderation_status === "approved");
    },
    enabled: enabledSections.popularVideos,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: featuredVideos = [] } = useQuery({
    queryKey: ["videos-featured"],
    queryFn: async () => {
      const all = await base44.entities.Video.list("-created_date", 30);
      return all.filter((v) => (!v.moderation_status || v.moderation_status === "approved") && !v.is_free && v.price > 0).slice(0, 8);
    },
    enabled: enabledSections.featuredVideos,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: freeVideos = [] } = useQuery({
    queryKey: ["videos-free"],
    queryFn: async () => {
      const all = await base44.entities.Video.list("-created_date", 30);
      return all.filter((v) => (!v.moderation_status || v.moderation_status === "approved") && v.is_free).slice(0, 8);
    },
    enabled: enabledSections.freeVideos,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: recentVideos = [] } = useQuery({
    queryKey: ["videos-recent"],
    queryFn: async () => {
      const all = await base44.entities.Video.list("-created_date", 30);
      return all.filter((v) => !v.moderation_status || v.moderation_status === "approved").slice(0, 8);
    },
    enabled: enabledSections.recentVideos,
    staleTime: 0,
    gcTime: 0,
  });

  const { data: crowdfundings = [] } = useQuery({
    queryKey: ["crowdfunding-active"],
    queryFn: () => base44.entities.CrowdfundingProject.filter({ status: "active" }, "-created_date", 8),
    enabled: enabledSections.crowdfunding,
    staleTime: 600000,
    gcTime: 1200000,
  });

  const getChannel = (video) => channels.find((c) => c.id === video.channel_id);

  const handleMessage = (video) => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    const channel = getChannel(video);
    if (channel) setMessageTarget({ channel, video });
  };

  const isEmpty = popularVideos.length === 0 && liveStreams.length === 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-8 py-4 sm:py-6 md:py-8 space-y-8 sm:space-y-10 md:space-y-12 lg:space-y-14 overflow-x-hidden">
      <MetaHelmet page="home" />

      {/* ジャイアント・キリング速報バナー（グローバル固定） */}
      <GiantKillingBanner />

      {/* サブスク無料キャンペーンバナー */}
      <Link to="/recruit" className="block">
        <div
          className="relative overflow-hidden rounded-2xl px-5 py-3 text-center cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
          style={{
            background: "linear-gradient(135deg, #1a0a2e 0%, #2d1060 50%, #1a0a2e 100%)",
            border: "2px solid #a855f7",
            boxShadow: "0 0 30px rgba(168,85,247,0.6), 0 0 60px rgba(168,85,247,0.2)",
          }}
        >
          <p className="font-black text-lg sm:text-xl" style={{ color: "#f5e27a", textShadow: "0 0 20px rgba(245,226,122,0.6)" }}>
            🎁 ライバー登録で12ヶ月無料！
          </p>
          <p className="text-xs mt-1" style={{ color: "#c084fc" }}>
            期間限定キャンペーン →
          </p>
        </div>
      </Link>

      {/* ステータス＋メッセージ */}
      <div className="text-center py-3 space-y-1">
        <p className="text-sm sm:text-base font-bold">まだ未完成、皆様と作り上げたいと思っています</p>
        <p className="text-[10px] sm:text-xs text-muted-foreground animate-pulse">⚡ ベータ版稼働中</p>
      </div>

      {/* ヒーロースロット（1位ライバー常駐枠） */}
      <HeroSlot />

      {/* 期間限定バナー（最小化） */}
      {SHOW_RECRUIT_BANNER && (
        <Link to="/recruit" className="block">
          <div className="rounded-2xl px-4 py-2 text-center font-black text-sm" style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.4)", color: "#fbbf24" }}>
            🎯 定員直前：ライバー募集中
          </div>
        </Link>
      )}

      {/* Hero — メッシュグラデーション体験型 */}
      <section className="relative overflow-hidden rounded-2xl text-center" style={{
        background: "linear-gradient(160deg, #0d1117 0%, #0a1628 40%, #0d1a12 80%, #0a0e18 100%)",
        border: "1px solid rgba(0,255,157,0.15)",
        minHeight: 480,
      }}>
        {/* メッシュグラデーション背景 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-20" style={{ background: "radial-gradient(ellipse, #00ff9d 0%, transparent 70%)", filter: "blur(60px)", animation: "meshFloat1 8s ease-in-out infinite" }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-15" style={{ background: "radial-gradient(ellipse, #7c3aed 0%, transparent 70%)", filter: "blur(50px)", animation: "meshFloat2 10s ease-in-out infinite" }} />
          <div className="absolute top-1/3 right-1/3 w-64 h-64 rounded-full opacity-12" style={{ background: "radial-gradient(ellipse, #0ea5e9 0%, transparent 70%)", filter: "blur(45px)", animation: "meshFloat3 7s ease-in-out infinite" }} />
          <div className="absolute bottom-1/3 left-1/5 w-72 h-72 rounded-full opacity-10" style={{ background: "radial-gradient(ellipse, #f59e0b 0%, transparent 70%)", filter: "blur(55px)", animation: "meshFloat1 12s ease-in-out infinite reverse" }} />
        </div>

        <div className="relative z-10 px-5 py-12 sm:py-16 md:py-20 space-y-8">

          {/* ブランドラベル */}
          <p style={{ color: "rgba(0,255,157,0.5)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            ChatMarket · Est. 2026
          </p>

          {/* メインキャッチコピー */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight"
              style={{ color: "#fff" }}>
              あなたの時間を<br />
              <span style={{
                background: "linear-gradient(135deg, #00ff9d, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>売上に変える</span>
            </h1>
            <p className="sr-only">チャットマーケット（Chat Market）- ライバー・占い師・クリエイター向けライブ配信・動画販売・1対1ビデオ通話プラットフォーム</p>
          </div>

          {/* アイコンのみのカテゴリ表現（説明ボックス廃止） */}
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {[
              { emoji: "🔮", label: "占い", color: "#a78bfa" },
              { emoji: "📚", label: "教育", color: "#60a5fa" },
              { emoji: "💬", label: "雑談", color: "#00ff9d" },
              { emoji: "🎵", label: "音楽", color: "#f59e0b" },
              { emoji: "🎮", label: "ゲーム", color: "#ef4444" },
            ].map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(`/search?q=${encodeURIComponent(cat.label)}`)}
                className="flex flex-col items-center gap-1.5 group transition-all hover:scale-110 active:scale-95"
              >
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl transition-all group-hover:shadow-lg"
                  style={{ background: `${cat.color}18`, border: `1px solid ${cat.color}40`, boxShadow: `0 0 0 0 ${cat.color}40` }}
                >
                  {cat.emoji}
                </div>
                <span className="text-[10px] sm:text-xs font-bold" style={{ color: cat.color }}>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* 検索フォーム */}
          <div className="w-full max-w-md mx-auto flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
                }
              }}
              placeholder={t("searchPlaceholder")}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-primary/50 transition-colors"
            />
            <Button
              onClick={() => { if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery)}`); }}
              className="bg-primary hover:bg-primary/90 px-4"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>

          {/* 単一CTA（ライバー登録） */}
          <Link to="/recruit">
            <button className="px-8 py-4 rounded-2xl font-black text-base text-black transition-all hover:scale-105 active:scale-95"
              style={{ background: "linear-gradient(135deg, #00ff9d, #00d4aa)", boxShadow: "0 0 25px rgba(0,255,157,0.4)" }}>
              <Radio className="w-5 h-5 inline mr-2" /> 今すぐ登録
            </button>
          </Link>

        </div>
      </section>

      <style>{`
        @keyframes meshFloat1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-20px) scale(1.1); } }
        @keyframes meshFloat2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-20px,30px) scale(1.08); } }
        @keyframes meshFloat3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(15px,25px) scale(1.05); } }
      `}</style>

      {/* PPV料金表 + 55円革命 → 「もっと知る」ボタン1つに集約 */}


      {/* サーバー安定化バナー */}
      <div className="px-0">
        <ServerLimitBanner />
      </div>

      {/* クリエイター向け: 待機中にするボタン */}
      {user && myChannel && (
        <div className={`rounded-2xl p-4 border flex items-center justify-between gap-4 ${myChannel?.call_enabled ? "bg-green-500/10 border-green-500/40" : "bg-card border-border/50"}`}>
          <div>
            <p className="font-bold text-sm flex items-center gap-2">
              {myChannel?.call_enabled
                ? <><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />今すぐ通話可能（待機中）</>
                : <><span className="w-2 h-2 rounded-full bg-zinc-500 inline-block" />通話待機 オフ</>}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {myChannel?.call_enabled ? "ファンに「今すぐ通話可能」と表示中" : "ONにするとファンからチャットで声がかかります"}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openCallSettings}
              className="w-9 h-9 rounded-xl border border-border/50 bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
              title="通話設定"
            >
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
            <Button
              onClick={handleToggleWaiting}
              disabled={togglingWait}
              className={`gap-2 ${myChannel?.call_enabled ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
            >
              {myChannel?.call_enabled
                ? <><PhoneOff className="w-4 h-4" />待機を停止</>
                : <><PhoneCall className="w-4 h-4" />待機中にする</>}
            </Button>
          </div>
        </div>
      )}

      {/* 通話設定モーダル */}
      {showCallSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-base flex items-center gap-2">
                <Settings className="w-4 h-4 text-primary" /> 通話設定
              </h3>
              <button onClick={() => setShowCallSettings(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">通話時間</label>
                <select
                  value={callSettingsForm.duration}
                  onChange={(e) => {
                    const d = parseInt(e.target.value);
                    setCallSettingsForm((f) => ({ ...f, duration: d, price: Math.max(f.price, Math.ceil((d / 15) * 150)) }));
                  }}
                  className="w-full rounded-xl bg-secondary border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                >
                  <option value={15}>15分</option>
                  <option value={30}>30分</option>
                  <option value={60}>60分</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">
                  料金（円）
                  <span className="ml-2 text-muted-foreground font-normal">
                    最低 ¥{Math.ceil((callSettingsForm.duration / 15) * 150)}
                  </span>
                </label>
                <input
                  type="number"
                  min={Math.ceil((callSettingsForm.duration / 15) * 150)}
                  step={10}
                  value={callSettingsForm.price}
                  onChange={(e) => setCallSettingsForm((f) => ({ ...f, price: parseInt(e.target.value) || 0 }))}
                  className="w-full rounded-xl bg-secondary border-0 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowCallSettings(false)}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-sm font-semibold hover:bg-secondary transition-colors"
              >
                キャンセル
              </button>
              <button
                onClick={handleSaveCallSettings}
                disabled={savingSettings}
                className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-black transition-colors disabled:opacity-50"
              >
                {savingSettings ? "保存中..." : "保存"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* カテゴリタブ */}
      <div className="flex gap-2 border-b border-border/30 pb-0">
        {[
          { key: "all", label: "すべて", emoji: "🌐" },
          { key: "fortune", label: "占い", emoji: "🔮" },
          { key: "chat", label: "雑談", emoji: "💬" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setCategoryTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-t-xl border-b-2 transition-all ${
              categoryTab === tab.key
                ? "border-primary text-foreground bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground hover:bg-white/5"
            }`}
          >
            <span>{tab.emoji}</span>
            {tab.label}
            {tab.key === "fortune" && (
              <span className="text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-full px-1.5 py-0.5 font-black">NEW</span>
            )}
          </button>
        ))}
      </div>

      {/* 1on1 待機中（カテゴリフィルター対応） */}
      <div ref={callRef} className="sticky top-16 z-20 bg-gradient-to-b from-background via-background to-transparent pb-4">
        {enabledSections.callWaiting && (
          <section className="px-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
              <h2 className="text-sm font-black">🔵 今すぐ通話可能</h2>
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">待機中</span>
            </div>
            <CallWaitingRow user={user} categoryFilter={categoryTab} filteredChannels={filteredChannels} />
          </section>
        )}
      </div>

      {/* ライブ配信中 / 配信予定 */}
      <div ref={liveRef}>
        {enabledSections.liveStreams && (liveStreams.length > 0 || scheduledStreams.length > 0) && (
          <section className="space-y-6">
            {/* ライブ配信中 */}
            {liveStreams.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold">{t("liveNowSection")}</h2>
                  <span className="text-xs text-red-400 bg-red-400/10 border border-red-400/30 rounded-full px-2 py-0.5 font-semibold">LIVE</span>
                </div>
                <ScrollRow cardWidth={280} mobileCardWidth="72vw">
                  {liveStreams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
                </ScrollRow>
              </div>
            )}

            {/* 配信予定 */}
            {scheduledStreams.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0" />
                  <h2 className="text-base sm:text-lg font-bold">配信予定</h2>
                  <span className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 font-semibold">SCHEDULED</span>
                </div>
                <ScrollRow cardWidth={280} mobileCardWidth="72vw">
                  {scheduledStreams.map((s) => <LiveStreamCard key={s.id} stream={s} />)}
                </ScrollRow>
              </div>
            )}
          </section>
        )}
      </div>

      {/* 人気の動画 (liveセクション直後に表示) */}
      <div ref={popularRef}>
        {enabledSections.popularVideos && (
          <section className="space-y-3 px-0">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-orange-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">人気の動画</h2>
              <span className="text-xs text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded-full px-2 py-0.5 font-semibold">HOT</span>
            </div>
            {popularVideos.filter(v => !v.moderation_status || v.moderation_status === "approved").length > 0 ? (
              <ScrollRow cardWidth={280} mobileCardWidth="72vw">
                {popularVideos
                  .filter(v => !v.moderation_status || v.moderation_status === "approved")
                  .map((v) => (
                    <div key={v.id} className="relative group">
                      <VideoCard video={v} />
                    </div>
                  ))}
              </ScrollRow>
            ) : (
              <p className="text-sm text-muted-foreground py-4">動画がまだありません</p>
            )}
            {/* カテゴリハッシュタグ */}
            <div className="pt-2 flex flex-wrap gap-2">
              {["エンタメ","音楽","ゲーム","教育","スポーツ","テクノロジー","ニュース","その他"].map((cat) => (
                <Link
                  key={cat}
                  to={`/search?q=${encodeURIComponent(cat)}`}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:border-primary/50 hover:text-primary transition-all"
                >
                  #{cat}
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* おすすめ有料動画 */}
      <div ref={featuredRef}>
        {enabledSections.featuredVideos && featuredVideos.length > 0 && (
          <section className="space-y-3 px-0">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-yellow-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">{t("recommendedPaidVideos")}</h2>
              <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 rounded-full px-2 py-0.5 font-semibold">PPV</span>
            </div>
            <ScrollRow cardWidth={280} mobileCardWidth="72vw">
              {featuredVideos.map((v) => (
                <div key={v.id} className="relative group">
                  <VideoCard video={v} />
                  <button
                    onClick={() => handleMessage(v)}
                    className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />{t("message")}
                  </button>
                </div>
              ))}
            </ScrollRow>
          </section>
        )}
      </div>

      {/* 無料動画 */}
      <div ref={freeRef}>
        {enabledSections.freeVideos && freeVideos.length > 0 && (
          <section className="space-y-3 px-0">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">{t("freeVideos")}</h2>
              <span className="text-xs text-primary bg-primary/10 border border-primary/30 rounded-full px-2 py-0.5 font-semibold">FREE</span>
            </div>
            <ScrollRow cardWidth={280} mobileCardWidth="72vw">
              {freeVideos.map((v) => (
                <div key={v.id} className="relative group">
                  <VideoCard video={v} />
                </div>
              ))}
            </ScrollRow>
          </section>
        )}
      </div>

      {/* 新着動画 */}
      <div ref={recentRef}>
        {enabledSections.recentVideos && recentVideos.length > 0 && (
          <section className="space-y-3 px-0">
            <div className="flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-blue-400 shrink-0" />
              <h2 className="text-base sm:text-lg font-bold">{t("latestVideos")}</h2>
              <span className="text-xs text-blue-400 bg-blue-400/10 border border-blue-400/30 rounded-full px-2 py-0.5 font-semibold">NEW</span>
            </div>
            <ScrollRow cardWidth={280} mobileCardWidth="72vw">
              {recentVideos.map((v) => (
                <div key={v.id} className="relative group">
                  <VideoCard video={v} />
                  <button
                    onClick={() => handleMessage(v)}
                    className="absolute bottom-14 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary/90 hover:bg-primary text-primary-foreground text-xs rounded-full px-3 py-1.5 flex items-center gap-1 shadow-lg"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />{t("message")}
                  </button>
                </div>
              ))}
            </ScrollRow>
          </section>
        )}
      </div>

      {/* クラウドファンディング */}
      <div ref={cfRef}>
        {enabledSections.crowdfunding && crowdfundings.length > 0 && (
          <section className="px-0">
            <div
              className="bg-gradient-to-br from-red-900/30 to-red-800/10 border border-red-500/30 rounded-2xl overflow-hidden cursor-pointer"
              onClick={() => setCfExpanded((v) => !v)}
            >
              <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 md:w-10 sm:h-9 md:h-10 rounded-lg sm:rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-xs sm:text-sm md:text-base flex items-center gap-1 sm:gap-2">
                      {t("crowdfunding")}
                      <span className="text-[10px] sm:text-xs font-bold bg-red-500 text-white px-1.5 sm:px-2 py-0.5 rounded-full">{crowdfundings.length}件</span>
                    </h2>
                    <p className="text-[10px] sm:text-xs text-red-300/70 hidden sm:block">NPO・社会課題プロジェクトを支援</p>
                  </div>
                </div>
                {cfExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 shrink-0" />}
              </div>
            </div>
            {cfExpanded && (
              <div className="border border-t-0 border-red-500/20 rounded-b-lg sm:rounded-b-2xl bg-red-950/10 divide-y divide-red-500/10">
                {crowdfundings.map((cf) => {
                  const goalPct = cf.goal_amount > 0 ? Math.min(100, Math.round((cf.total_raised / cf.goal_amount) * 100)) : null;
                  return (
                    <div key={cf.id} className="px-3 sm:px-4 md:px-5 py-2 sm:py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
                      <div className="flex-1 min-w-0 space-y-0.5 sm:space-y-1">
                        <p className="font-bold text-xs sm:text-sm line-clamp-1">{cf.title}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground">{cf.organization_name}</p>
                        <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-red-300">
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {cf.supporter_count || 0}人</span>
                          <span>¥{(cf.total_raised || 0).toLocaleString()}</span>
                          {goalPct !== null && <span>{goalPct}%達成</span>}
                        </div>
                      </div>
                      <Link to={`/crowdfunding/${cf.id}`} onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto">
                        <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white gap-1 shrink-0 text-xs px-3 w-full sm:w-auto">
                          {t("supportProject")} <ExternalLink className="w-3 h-3" />
                        </Button>
                      </Link>
                    </div>
                  );
                })}
                <div className="px-3 sm:px-4 md:px-5 py-2 sm:py-3 text-center">
                  <Link to="/crowdfunding">
                    <button className="text-xs text-red-400 hover:text-red-300 underline">{t("viewAll")}</button>
                  </Link>
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* クリエイターランキング */}
      <div ref={rankingRef}>
        {enabledSections.ranking && <CreatorRanking />}
      </div>

      {/* ミリオネア・サポーター */}
      <div ref={millionaireRef}>
        {enabledSections.millionaire && <MillionaireSupporters />}
      </div>

      {/* 空の状態 */}
       {isEmpty && (
         <div className="text-center py-12 sm:py-16 md:py-20 lg:py-24 text-muted-foreground px-4">
           <Radio className="w-12 h-12 mx-auto mb-4 opacity-30" />
           <p className="text-base sm:text-lg">{t("noContentMessage")}</p>
           <p className="text-xs sm:text-sm mt-1 sm:mt-2">{t("noContentSub")}</p>
         </div>
       )}

      <div className="px-0">
        <ProgressiveIncentiveSection />
      </div>

      {/* 社長の想い・Founderセクション */}
      <FounderSection />

      <div className="px-0">
        <PwaInstallGuideSection />
      </div>

      {messageTarget && (
        <MessageModal
          channel={messageTarget.channel}
          video={messageTarget.video}
          user={user}
          onClose={() => setMessageTarget(null)}
        />
      )}
    </div>
  );
}