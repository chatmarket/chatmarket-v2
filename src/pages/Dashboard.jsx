/**
 * Dashboard — ファン / クリエイター デュアルモード
 *
 * UX設計方針:
 * - モード記憶: localStorage で最後のモードを保持（再訪時に即表示）
 * - チャンネル未作成ユーザーはファンモードのみ表示（混乱防止）
 * - 支払い導線: コイン購入→1タップ、出金申請→1タップ（最短3ステップ）
 * - Progressive disclosure: 重要情報を上、詳細は「もっと見る」で後退
 */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye, Mic, Radio, Coins, TrendingUp, Wallet, Phone,
  Play, Heart, Users, History, ChevronRight, Bell,
  Upload, Video, ArrowUpRight, Zap, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import EarningsSummaryCard from "../components/dashboard/EarningsSummaryCard";
import AcceptedCallsList from "../components/dashboard/AcceptedCallsList";
import IncomingMessagesWidget from "../components/dashboard/IncomingMessagesWidget";
import RecommendedCreators from "../components/dashboard/RecommendedCreators";

// ── モード定数 ──
const MODE_FAN = "fan";
const MODE_CREATOR = "creator";

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(() => localStorage.getItem("dashboard_mode") || MODE_FAN);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const switchMode = (m) => {
    setMode(m);
    localStorage.setItem("dashboard_mode", m);
  };

  // ── データ取得 ──
  const { data: channel } = useQuery({
    queryKey: ["dashboard-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0] || null),
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["dashboard-wallet", user?.email],
    queryFn: () => base44.entities.YellCoinWallet.filter({ user_email: user.email }).then(r => r[0] || null),
    enabled: !!user,
  });

  const { data: history = [] } = useQuery({
    queryKey: ["dashboard-history", user?.email],
    queryFn: () => base44.entities.WatchHistory.filter({ user_email: user.email }, "-updated_date", 5),
    enabled: !!user,
  });

  const { data: followedChannels = [] } = useQuery({
    queryKey: ["dashboard-follows", user?.email],
    queryFn: () => base44.entities.ChannelFollow.filter({ follower_email: user.email }, "-created_date", 10),
    enabled: !!user,
  });

  const { data: allChannels = [] } = useQuery({
    queryKey: ["dashboard-all-channels"],
    queryFn: () => base44.entities.Channel.list("-updated_date", 50),
    enabled: followedChannels.length > 0,
  });

  // クリエイターデータ
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

  const { data: superChats = [] } = useQuery({
    queryKey: ["dashboard-sc", user?.email],
    queryFn: () => base44.entities.SuperChat.filter({ callee_email: user.email }, "-created_date", 50),
    enabled: !!user && mode === MODE_CREATOR,
  });

  const { data: videoCalls = [] } = useQuery({
    queryKey: ["dashboard-vc", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email, status: "ended" }, "-created_date", 50),
    enabled: !!user && mode === MODE_CREATOR,
  });

  const { data: purchases = [] } = useQuery({
    queryKey: ["dashboard-purchases", channel?.id],
    queryFn: () => base44.entities.Purchase.filter({ channel_id: channel.id, status: "completed" }, "-created_date", 50),
    enabled: !!channel && mode === MODE_CREATOR,
  });

  const { data: upcomingAppointments = [] } = useQuery({
    queryKey: ["dashboard-appointments", channel?.id],
    queryFn: () => base44.entities.Appointment.filter({ channel_id: channel.id, status: "accepted" }, "confirmed_date", 3),
    enabled: !!channel && mode === MODE_CREATOR,
  });

  // 収益計算
  const thisMonth = (item) => item.created_date >= monthStart && item.created_date <= monthEnd;
  const monthSC = superChats.filter(thisMonth);
  const monthVC = videoCalls.filter(thisMonth);
  const monthP = purchases.filter(thisMonth);
  const scRevenue = monthSC.reduce((s, c) => s + (c.amount || 0) * 0.9, 0);
  const vcRevenue = monthVC.reduce((s, c) => s + (c.price || 0) * 0.85, 0);
  const pRevenue = monthP.reduce((s, c) => s + (c.amount || 0) * 0.85, 0);
  const totalRevenue = scRevenue + vcRevenue + pRevenue;

  const followedChannelData = allChannels.filter(ch =>
    followedChannels.some(f => f.channel_id === ch.id)
  );

  const hasChannel = !!channel;
  const coinBalance = wallet?.balance ?? 0;

  if (!user) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );

  const firstName = user.full_name?.split(/\s/)[0] || user.email?.split("@")[0] || "ゲスト";

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* ── モードトグル ── */}
      {hasChannel && (
        <div className="flex justify-center mb-6">
          <div className="flex bg-secondary border border-border/50 rounded-xl p-1 gap-1">
            <button
              onClick={() => switchMode(MODE_FAN)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === MODE_FAN
                  ? "bg-card text-foreground shadow border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Eye className={`w-4 h-4 ${mode === MODE_FAN ? "text-primary" : ""}`} />
              ファン
            </button>
            <button
              onClick={() => switchMode(MODE_CREATOR)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === MODE_CREATOR
                  ? "bg-card text-foreground shadow border border-border/50"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mic className={`w-4 h-4 ${mode === MODE_CREATOR ? "text-red-400" : ""}`} />
              クリエイター
            </button>
          </div>
        </div>
      )}

      {/* ════════════════════════════════
          FAN MODE
      ════════════════════════════════ */}
      {mode === MODE_FAN && (
        <div className="space-y-5">

              {/* 挨拶 + コイン残高 */}
          <div className="flex items-center justify-between">
            <div>
              {followedChannels.length === 0 && history.length === 0 ? (
                <h1 className="text-xl font-bold">まず好きなクリエイターを見つけよう！</h1>
              ) : (
                <>
                  <h1 className="text-xl font-bold">おかえり、{firstName}さん 👋</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    フォロー中 {followedChannels.length}チャンネル
                  </p>
                </>
              )}
            </div>
            {/* コイン残高 + チャージ導線 — 残高1以上のみ表示 */}
            {coinBalance > 0 && (
              <Link to="/coin-charge">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all hover:opacity-80 ${
                  coinBalance < 100
                    ? "bg-red-500/10 border-red-500/30 animate-pulse"
                    : "bg-yellow-500/10 border-yellow-500/30"
                }`}>
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-black text-sm text-yellow-400">{coinBalance.toLocaleString()}</span>
                  {coinBalance < 100 && (
                    <span className="text-[10px] text-red-400 font-bold">チャージ</span>
                  )}
                </div>
              </Link>
            )}
          </div>

          {/* オンボーディング CTA（フォロー0 かつ 履歴0） */}
          {followedChannels.length === 0 && history.length === 0 ? (
            <Link to="/search">
              <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30 rounded-2xl p-6 flex flex-col items-center gap-3 text-center hover:border-primary/60 transition-all">
                <span className="text-4xl">🔍</span>
                <div>
                  <p className="text-base font-black">クリエイターを探す</p>
                  <p className="text-sm text-muted-foreground mt-1">ライブ配信・動画・通話ができるクリエイターが見つかります</p>
                </div>
                <Button className="bg-primary hover:bg-primary/90 gap-2 mt-1">
                  さがすページへ <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </Link>
          ) : (
            <>
              {/* ライブ中チャンネル（最優先表示） */}
              <LiveNowSection followedChannelIds={followedChannels.map(f => f.channel_id)} />

              {/* 続きを見る */}
              {history.length > 0 && (
                <section>
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5" /> 続きを見る
                    </h2>
                    <Link to="/my-library" className="text-xs text-primary hover:underline">すべて</Link>
                  </div>
                  <div className="space-y-2">
                    {history.slice(0, 3).map(item => (
                      <Link key={item.id} to={`/watch/${item.video_id}`}>
                        <div className="flex gap-3 items-center bg-card border border-border/50 rounded-xl p-3 hover:border-primary/30 transition-all">
                          <div className="w-20 h-12 rounded-lg overflow-hidden shrink-0 relative">
                            {item.video_thumbnail ? (
                              <img src={item.video_thumbnail} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)" }}>
                                <span className="absolute text-white/30 font-black text-2xl select-none">
                                  {(item.channel_name || "?")[0].toUpperCase()}
                                </span>
                                <Play className="relative w-5 h-5 text-white/70" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold line-clamp-1">{item.video_title}</p>
                            <p className="text-xs text-muted-foreground">{item.channel_name}</p>
                          </div>
                          <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* フォロー中クリエイター（ストーリー型） */}
              {followedChannelData.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-1.5 mb-2">
                    <Users className="w-3.5 h-3.5" /> フォロー中
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-1">
                    {followedChannelData.map(ch => {
                      const isLive = ch.is_live;
                      return (
                        <Link key={ch.id} to={`/channel/${ch.id}`} className="flex flex-col items-center gap-1.5 shrink-0">
                          <div className={`w-14 h-14 rounded-full overflow-hidden border-2 ${isLive ? "border-red-500 p-0.5" : "border-border"}`}>
                            <div className="w-full h-full rounded-full overflow-hidden bg-secondary flex items-center justify-center">
                              {ch.avatar_url
                                ? <img src={ch.avatar_url} alt={ch.name} className="w-full h-full object-cover" />
                                : <span className="text-lg font-bold text-muted-foreground">{ch.name?.[0]}</span>
                              }
                            </div>
                          </div>
                          <span className="text-[10px] text-center font-medium max-w-[56px] line-clamp-1">{ch.name}</span>
                          {isLive && <span className="text-[9px] font-black text-red-400">LIVE</span>}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}

          {/* クイックアクション */}
          <div className="grid grid-cols-2 gap-3">
            <Link to="/search">
              <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold">ライバーを探す</p>
                  <p className="text-[11px] text-muted-foreground">通話・ライブ</p>
                </div>
              </div>
            </Link>
            <Link to="/my-library">
              <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 hover:border-primary/30 transition-all">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Heart className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-bold">マイライブラリ</p>
                  <p className="text-[11px] text-muted-foreground">購入済み・お気に入り</p>
                </div>
              </div>
            </Link>
          </div>

          {/* おすすめクリエイター */}
          <RecommendedCreators />

          {/* クリエイター切り替え誘導（チャンネルなし） */}
          {!hasChannel && (
            <Link to="/my-channel">
              <div className="border border-dashed border-primary/40 rounded-xl p-4 flex items-center justify-between hover:bg-primary/5 transition-all">
                <div>
                  <p className="text-sm font-bold">🎙 クリエイターとして配信・販売する</p>
                  <p className="text-xs text-muted-foreground mt-0.5">チャンネルを作って収益を得る</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </Link>
          )}

          {/* チャンネルあり → クリエイターモードへ誘導 */}
          {hasChannel && (
            <button
              onClick={() => switchMode(MODE_CREATOR)}
              className="w-full border border-dashed border-border/50 rounded-xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-all text-left"
            >
              <div>
                <p className="text-sm font-bold flex items-center gap-2">
                  <Mic className="w-4 h-4 text-red-400" /> クリエイターモードへ
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">売上・配信・通話管理</p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}

      {/* ════════════════════════════════
          CREATOR MODE
      ════════════════════════════════ */}
      {mode === MODE_CREATOR && (
        <div className="space-y-5">

          {/* ヘッダー + ライブ開始（最重要CTA） */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">こんにちは、{firstName}さん</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                今月の収益: <strong className="text-primary">¥{totalRevenue.toLocaleString()}</strong>
              </p>
            </div>
            <Link to="/go-live">
              <Button className="gap-2 bg-red-500 hover:bg-red-600 text-white font-black">
                <Radio className="w-4 h-4" /> LIVE
              </Button>
            </Link>
          </div>

          {/* 承認済み通話（最優先: 今すぐやること） */}
          <AcceptedCallsList userEmail={user.email} />

          {/* 受信メッセージ */}
          <IncomingMessagesWidget userEmail={user.email} />

          {/* 今月サマリー 4メトリクス */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "今月の収益", value: `¥${totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
              { label: "ビデオ通話", value: `${monthVC.length}件`, icon: Phone, color: "text-blue-400", bg: "bg-blue-500/10" },
              { label: "エール", value: `${monthSC.length}件`, icon: Coins, color: "text-yellow-400", bg: "bg-yellow-500/10" },
              { label: "コンテンツ販売", value: `${monthP.length}件`, icon: Video, color: "text-purple-400", bg: "bg-purple-500/10" },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-card border border-border/50 rounded-xl p-4">
                <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <Icon className={`w-4 h-4 ${color}`} />
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-black ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* ★ 支払い導線（出金）— 最短2タップ: ここ→払い出し申請 */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">出金可能残高</p>
                <p className="text-xl font-black text-primary">¥{totalRevenue.toLocaleString()}</p>
              </div>
            </div>
            <Link to="/withdrawal-request">
              <Button size="sm" className="gap-1.5 bg-primary hover:bg-primary/90 font-black">
                出金申請 <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          {/* 今後の予約 */}
          {upcomingAppointments.length > 0 && (
            <section>
              <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> 今後のビデオ通話予約
              </h2>
              <div className="bg-card border border-border/50 rounded-xl divide-y divide-border/50">
                {upcomingAppointments.map(appt => (
                  <div key={appt.id} className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                      {appt.requester_name?.[0] || "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{appt.requester_name}</p>
                      <p className="text-xs text-muted-foreground">{appt.confirmed_date} {appt.confirmed_time}</p>
                    </div>
                    <Link to={`/fortune-calendar`}>
                      <Button size="sm" variant="outline" className="text-xs">入室</Button>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* クイックアクション — 最頻操作を最小クリックで */}
          <section>
            <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-2">クイックアクション</h2>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "ライブ配信", icon: Radio, to: "/go-live", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                { label: "1対1通話", icon: Phone, to: "/call-waiting", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                { label: "動画アップ", icon: Upload, to: "/upload", color: "text-primary", bg: "bg-primary/10 border-primary/20" },
                { label: "収益管理", icon: Wallet, to: "/revenue", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
                { label: "詳細分析", icon: TrendingUp, to: "/creator-dashboard", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                { label: "チャンネル", icon: Users, to: "/my-channel", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
              ].map(({ label, icon: Icon, to, color, bg }) => (
                <Link key={to} to={to}>
                  <div className={`border rounded-xl p-3 flex flex-col items-center gap-1.5 hover:opacity-80 transition-opacity ${bg}`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                    <span className="text-[11px] font-semibold text-center">{label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ファンモードへ切り替え */}
          <button
            onClick={() => switchMode(MODE_FAN)}
            className="w-full border border-dashed border-border/50 rounded-xl p-4 flex items-center justify-between hover:bg-secondary/50 transition-all text-left"
          >
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <Eye className="w-4 h-4 text-primary" /> ファンモードへ
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">購入済みコンテンツ・フォロー中のチャンネル</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── ライブ中チャンネルセクション ──
function LiveNowSection({ followedChannelIds }) {
  const { data: liveStreams = [] } = useQuery({
    queryKey: ["live-now-dashboard"],
    queryFn: () => base44.entities.LiveStream.filter({ status: "live" }, "-created_date", 10),
    refetchInterval: 30000,
  });

  const relevant = liveStreams.filter(s =>
    followedChannelIds.includes(s.channel_id) || liveStreams.length <= 3
  ).slice(0, 3);

  if (relevant.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-2">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase">今ライブ中</h2>
      </div>
      <div className="space-y-2">
        {relevant.map(stream => (
          <Link key={stream.id} to={`/live/${stream.id}`}>
            <div className="flex gap-3 items-center bg-card border border-red-500/20 rounded-xl p-3 hover:border-red-500/50 transition-all">
              <div className="w-12 h-12 rounded-lg bg-secondary overflow-hidden shrink-0 flex items-center justify-center">
                {stream.thumbnail_url
                  ? <img src={stream.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  : <Radio className="w-5 h-5 text-red-400" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold line-clamp-1">{stream.title}</p>
                <p className="text-xs text-muted-foreground">{stream.channel_name}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[9px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded">LIVE</span>
                <span className="text-[10px] text-muted-foreground">{(stream.viewer_count || 0).toLocaleString()}人</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}