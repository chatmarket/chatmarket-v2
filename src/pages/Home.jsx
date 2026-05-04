import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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


export default function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [myChannel, setMyChannel] = useState(null);
  const [togglingWait, setTogglingWait] = useState(false);
  const [showCallSettings, setShowCallSettings] = useState(false);
  const [callSettingsForm, setCallSettingsForm] = useState({ duration: 30, price: 150 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [messageTarget, setMessageTarget] = useState(null);
  const [cfExpanded, setCfExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enabledSections, setEnabledSections] = useState({
    callWaiting: false,
    liveStreams: false,
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
    queryFn: () => base44.entities.Channel.list("-monthly_revenue_coins", 30),
    enabled: true,
    staleTime: 600000,
    gcTime: 1200000,
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

      {/* ネオン白文字のメッセージ */}
      <div className="text-center py-3 neon-messages">
        <p className="neon-white-message text-xs sm:text-sm font-bold tracking-tight">
          まだ、未完成。皆様の意見を聞きながら進化していきます。
        </p>
        <p className="neon-blue-message text-[10px] sm:text-xs font-semibold mt-1">
          ベータ版稼働中、一部機能が正常に利用出来ない場合もありますので予めご了承下さい
        </p>
      </div>

      {/* ヒーロースロット（1位ライバー常駐枠） */}
      <HeroSlot />

      {/* 期間限定ライバー募集バナー（〜4/30） */}
      {SHOW_RECRUIT_BANNER && (
        <Link to="/recruit" className="block">
          <div
            className="relative overflow-hidden rounded-2xl px-5 py-4 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
            style={{
              background: "linear-gradient(135deg, #1a0800 0%, #3d1500 50%, #1a0800 100%)",
              border: "2px solid #f59e0b",
              boxShadow: "0 0 25px rgba(245,158,11,0.6), 0 0 50px rgba(245,158,11,0.2)",
            }}
          >
            {/* パルス装飾 */}
            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-amber-400 animate-ping opacity-75" />
            <div className="absolute top-3 right-3 w-3 h-3 rounded-full bg-amber-400" />

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.25)", border: "1px solid #f59e0b" }}>
                <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
              </div>
              <div className="flex-1 text-center sm:text-left">
                 <p className="text-[11px] font-bold mb-0.5" style={{ color: "#fbbf24", letterSpacing: "0.1em" }}>
                    定員になり次第終了
                  </p>
                  <p className="font-black text-sm sm:text-base leading-tight" style={{ color: "#fef3c7" }}>
                    {t("recruitBannerText")}
                  </p>
               </div>
              <div className="shrink-0 px-4 py-2 rounded-xl font-black text-sm whitespace-nowrap"
                 style={{
                   background: "linear-gradient(135deg, #f59e0b, #d97706)",
                   color: "#1a0800",
                   boxShadow: "0 0 12px rgba(245,158,11,0.7)",
                 }}>
                 {t("securePro")}
               </div>
            </div>
          </div>
        </Link>
      )}

      {/* Hero — ブランドメッセージ刷新 */}
      <section className="relative overflow-hidden rounded-2xl text-center" style={{
        background: "linear-gradient(160deg, #0d1117 0%, #0a1628 40%, #0d1a12 80%, #0a0e18 100%)",
        border: "1px solid rgba(0,255,157,0.15)",
      }}>
        {/* 光のオーロラ背景 */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10" style={{ background: "radial-gradient(ellipse, #00ff9d 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 rounded-full opacity-8" style={{ background: "radial-gradient(ellipse, #60a5fa 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(0,255,157,1) 1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,1) 1px,transparent 1px)", backgroundSize: "50px 50px" }} />
        </div>

        <div className="relative z-10 px-5 py-12 sm:py-16 md:py-20 space-y-8">

          {/* ブランドラベル */}
          <p style={{ color: "rgba(0,255,157,0.5)", fontSize: "10px", letterSpacing: "0.2em", textTransform: "uppercase" }}>
            ChatMarket · Est. 2026
          </p>

          {/* メインキャッチコピー */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight tracking-tight"
              style={{ color: "#fff" }}>
              あなたの15分を、<br />
              <span style={{
                background: "linear-gradient(135deg, #00ff9d, #60a5fa, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>いくらで売りますか？</span>
            </h1>
            <p className="text-sm sm:text-base text-white/40 italic" style={{ letterSpacing: "0.05em" }}>
              "What price for your 15 minutes of skill?"
            </p>
          </div>

          {/* 理念テキスト */}
          <div className="mx-auto max-w-xl space-y-3">
            <div className="rounded-2xl px-6 py-5 text-left space-y-3"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(10px)" }}>
              <p className="text-sm sm:text-base leading-relaxed text-white/80">
                「<span className="text-white font-bold">私なんかが稼げるの？</span>」そう思う必要はありません。
              </p>
              <p className="text-xs sm:text-sm leading-relaxed text-white/60">
                あなたが「普通」だと思っている経験や言葉は、世界のどこかで誰かを救う特別な価値になります。
                ChatMarketは、安売りではなく、<span className="text-primary font-semibold">あなたの価値を正しく証明し、独り立ちするための場所</span>です。
              </p>
              {/* 画質×価値の補足 */}
              <div className="flex items-start gap-2 pt-1 border-t border-white/5">
                <span className="text-[10px] text-primary/70 font-mono leading-relaxed mt-0.5">▸</span>
                <p className="text-[11px] text-white/40 leading-relaxed">
                  あなたのスキルに、ふさわしい価格設定を。SD 15円〜 / HD 55円〜 / FHD 150円〜 と、成長に合わせて単価をランクアップできます。
                </p>
              </div>
            </div>
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

          {/* CTA ボタン */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Link to="/recruit" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-black text-sm text-black transition-all hover:scale-105 active:scale-95"
                style={{ background: "linear-gradient(135deg, #00ff9d, #00d4aa)", boxShadow: "0 0 25px rgba(0,255,157,0.4)" }}>
                <Radio className="w-4 h-4" /> 自分の価値を証明する（ライバー登録）
              </button>
            </Link>
            <Link to="/search" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl font-bold text-sm text-white border transition-all hover:border-primary/60 hover:bg-primary/5"
                style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.04)" }}>
                <Play className="w-4 h-4" /> 宝物を見つける（視聴を始める）
              </button>
            </Link>
          </div>

          {/* 即登録ステップ（3タップ導線） */}
          {!user && (
            <div className="mx-auto max-w-sm">
              <p className="text-[10px] text-white/25 mb-2 text-center tracking-widest uppercase">— 登録は30秒 —</p>
              <div className="flex items-center justify-center gap-1 text-[10px] text-white/40">
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center font-black shrink-0">1</span>
                <span>メールアドレスで登録</span>
                <span className="mx-1 text-white/20">›</span>
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center font-black shrink-0">2</span>
                <span>プランを選ぶ</span>
                <span className="mx-1 text-white/20">›</span>
                <span className="bg-primary/20 text-primary rounded-full w-5 h-5 flex items-center justify-center font-black shrink-0">3</span>
                <span>今すぐ配信</span>
              </div>
            </div>
          )}

        </div>
      </section>

      {/* PPV料金表 */}
      <div className="px-0">
        <PpvPricingTable />
      </div>

      {/* 55円革命バナー */}
      <div className="px-0">
        <QualityRevolutionBanner />
      </div>

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

      {/* 1on1 待機中 */}
      <div ref={callRef}>
        {enabledSections.callWaiting && (
          <section className="px-0">
            <CallWaitingRow user={user} />
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