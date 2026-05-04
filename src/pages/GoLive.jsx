import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Loader2, Image, CheckCircle2, Copy, Smartphone, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";
import StreamKeySecurityDisplay from "../components/live/StreamKeySecurityDisplay";
import TroubleshootingGuide from "../components/live/TroubleshootingGuide";
import StreamSetupCards from "../components/live/StreamSetupCards";

const MODE_SELECT = "select";
const MODE_LIVE = "live";

export default function GoLive() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(MODE_SELECT);
  const [modeInitialized, setModeInitialized] = useState(false);
  const [creating, setCreating] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [ivsStream, setIvsStream] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [manualStreamKey, setManualStreamKey] = useState("");
  const [manualIngestEndpoint, setManualIngestEndpoint] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    availableTime: "",
    price: "",
  });

  const [ticketEnabled, setTicketEnabled] = useState(false);
  const [ticketDurationMinutes, setTicketDurationMinutes] = useState(60);
  const [ticketPriceYen, setTicketPriceYen] = useState(600);

  const TICKET_DURATIONS = [15, 30, 45, 60, 75, 90, 105, 120];
  const minTicketPrice = Math.ceil((ticketDurationMinutes / 15) * 150);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
    });
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["my-channels", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }),
    enabled: !!user,
  });

  const { data: ppvSubscription = null, isLoading: ppvLoading } = useQuery({
    queryKey: ["ppv-subscription", user?.email],
    queryFn: async () => {
      // テストアカウント自動付与
      if (user?.email === 'ono@onestep-corp.com') return { plan_id: "ppv", status: "active" };
      const subs = await base44.entities.PlanSubscription.filter({ user_email: user.email, plan_id: "ppv", status: "active" });
      return subs[0] || null;
    },
    enabled: !!user,
  });

  const { data: campaignGrantee = null, isLoading: campaignLoading } = useQuery({
    queryKey: ["campaign-live-grantee", user?.email],
    queryFn: async () => {
      // テストアカウント自動付与
      if (user?.email === 'ono@onestep-corp.com') return { email: user.email, reason: "test_account" };
      const grantees = await base44.entities.CampaignLiveGrantee.filter({ email: user.email });
      const grantee = grantees[0];
      if (grantee && new Date(grantee.expires_at) > new Date()) return grantee;
      return null;
    },
    enabled: !!user,
  });

  const isTestAccount = user?.email === 'ono@onestep-corp.com';
  const canUseLiveStream = isTestAccount || !!ppvSubscription || !!campaignGrantee;

  useEffect(() => {
    if (!modeInitialized && user && !ppvLoading && !campaignLoading) {
      if (canUseLiveStream) setMode(MODE_LIVE);
      setModeInitialized(true);
    }
  }, [user, ppvLoading, campaignLoading, canUseLiveStream, modeInitialized]);

  // 完全RTMPS URL（スマホアプリ用）
  const fullRtmpsUrl = manualIngestEndpoint && manualStreamKey
    ? `rtmps://${manualIngestEndpoint}:443/app/${manualStreamKey}`
    : "";

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setCreating(true);

    const ivsRes = await base44.functions.invoke('createLiveStream', {});
    if (!ivsRes?.data?.streamId) {
      toast.error('配信枠の作成に失敗しました。');
      setCreating(false);
      return;
    }
    const ivsData = ivsRes.data;
    setIvsStream(ivsData);
    setManualStreamKey(ivsData.streamKey);
    // ingestEndpointはホスト名のみ保存（rtmps://なし）
    const host = ivsData.rtmpsUrl.replace("rtmps://", "").replace(":443/app/", "");
    setManualIngestEndpoint(host);

    const FIXED_PLAYBACK_URL = ivsData.playbackUrl || "https://27b83d82b8a7.ap-northeast-1.playback.live-video.net/api/video/v1/ap-northeast-1.813372611580.channel.pVdn6DgvnSMG.m3u8";

    let channel = channels[0];
    if (!channel) {
      try {
        channel = await base44.entities.Channel.create({ name: user.full_name + "のチャンネル", owner_email: user.email });
      } catch (err) {
        toast.error('チャンネル作成に失敗しました。');
        setCreating(false);
        return;
      }
    }

    let thumbnail_url = "";
    if (thumbnailFile) {
      try {
        const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
        thumbnail_url = res.file_url;
        setThumbnailUrl(thumbnail_url);
      } catch (err) {}
    }

    const getQualityFromPrice = (price) => {
      if (price === 0) return "1080p";
      if (price >= 150) return "1080p";
      if (price >= 55) return "720p";
      return "480p";
    };
    const autoQuality = getQualityFromPrice(form.price);
    const isLiveNow = !form.scheduled_at;

    try {
      const newStream = await base44.entities.LiveStream.create({
        title: form.title,
        description: form.description,
        channel_id: channel.id,
        channel_name: channel.name,
        channel_avatar: channel.avatar_url,
        thumbnail_url,
        status: isLiveNow ? "live" : "scheduled",
        scheduled_at: form.scheduled_at || null,
        available_time: form.availableTime || "",
        price: parseInt(form.price) || 0,
        viewer_count: 0,
        stream_type: "ivs",
        ivs_playback_url: FIXED_PLAYBACK_URL,
        ivs_channel_arn: ivsData.channelArn || "",
        ivs_stream_key: ivsData.streamKey || "",
        ivs_ingest_endpoint: ivsData.ingestEndpoint || "",
        max_bitrate_restriction: autoQuality,
        live_started_at: isLiveNow ? new Date().toISOString() : null,
        cost_input_yen: 0,
        cost_output_yen: 0,
        total_viewer_minutes: 0,
        revenue_coins: 0,
        is_ticket_enabled: ticketEnabled,
        ticket_price_yen: ticketEnabled ? Math.max(minTicketPrice, ticketPriceYen) : 0,
        ticket_duration_minutes: ticketEnabled ? ticketDurationMinutes : 0,
        ticket_total_revenue_yen: 0,
        ticket_purchases: [],
      });

      await base44.entities.Channel.update(channel.id, { is_live: true });
      setCreating(false);
      sessionStorage.setItem("liveStreamId", newStream.id);
      setLiveStreamId(newStream.id);
    } catch (err) {
      toast.error('配信作成に失敗しました: ' + err.message);
      setCreating(false);
    }
  };

  // モード選択画面
  if (mode === MODE_SELECT) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-6">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-black text-white mb-1">配信・通話モードを選択</h1>
          <p className="text-muted-foreground text-sm">用途に合わせて選んでください</p>
        </div>
        <div className="w-full grid grid-cols-1 gap-4">
          <button
            onClick={() => setMode(MODE_LIVE)}
            className="flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-border bg-card hover:border-red-500/70 hover:bg-red-500/5 transition-all group text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
              <Radio className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="font-black text-white text-lg mb-1">1対多 ライブ配信</p>
              <p className="text-muted-foreground text-sm leading-relaxed">複数の視聴者に向けてリアルタイムで配信。スーパーチャットやギフトを受け取れます。</p>
            </div>
            <span className="mt-auto w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-black text-center group-hover:bg-red-600 transition-colors">
              ライブ配信を開始
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 配信画面（BroadcasterStream）
  if (liveStreamId) {
    return (
      <div className="w-full">
        <BroadcasterStream
          streamId={liveStreamId}
          ivsStreamKey={manualStreamKey || ivsStream?.streamKey}
          ivsIngestEndpoint={manualIngestEndpoint || ivsStream?.ingestEndpoint}
          onEnd={() => navigate("/creator-dashboard")}
          thumbnailUrl={thumbnailUrl}
        />
      </div>
    );
  }

  // 利用不可
  if (!canUseLiveStream && modeInitialized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center space-y-6">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-black">1対多数配信はPPVプラン加入が必須です</h1>
        <p className="text-muted-foreground">1対多数のライブ配信とチケット制予約配信を利用するにはPPVプラン（¥9,900/月）への加入が必須です。</p>
        <button onClick={() => navigate("/plan-select")} className="bg-primary text-black font-black px-8 py-3 rounded-xl hover:bg-primary/90">
          PPVプランを確認する
        </button>
      </div>
    );
  }

  // ── 配信セットアップフォーム ──
  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => setMode(MODE_SELECT)} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 mr-1">← 戻る</button>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold">ライブ配信を開始</h1>
      </div>

      {/* ── 配信マニュアルへのバナー ── */}
      <div className="mb-8">
        <a href="/streaming-manual" className="block group">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/20 to-primary/10 border-2 border-primary/40 hover:border-primary/60 transition-all p-6 hover:shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-primary uppercase tracking-widest">📘 配信マニュアル</p>
                <h2 className="text-xl font-black text-white mt-2">OBS・Larix・Prism Live Studio の詳しい使い方</h2>
                <p className="text-muted-foreground text-sm mt-2">初心者でも迷わず配信できるよう、手順をわかりやすく整理しました。ダウンロード方法・接続方法・よくあるトラブルもカバー。</p>
              </div>
              <ArrowRight className="w-6 h-6 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </a>
      </div>

      {/* ── PC/スマホ配信 + よくあるトラブル ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
        <StreamSetupCards
          user={user}
          streamKey={manualStreamKey}
          ingestEndpoint={manualIngestEndpoint}
          fullRtmpsUrl={fullRtmpsUrl}
        />
        {/* よくあるトラブル */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5">
          <TroubleshootingGuide />
        </div>
      </div>

      <form onSubmit={handleStart} className="space-y-4 sm:space-y-6 pb-20">
        {/* サムネイル */}
        <div className="space-y-2">
          <Label>サムネイル画像</Label>
          <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files[0])} />
            {thumbnailFile ? (
              <div className="flex items-center gap-2 text-primary">
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">{thumbnailFile.name}</span>
              </div>
            ) : (
              <div className="text-center">
                <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">サムネイル画像を選択（推奨: 1280×720px）</p>
              </div>
            )}
          </label>
        </div>

        {/* タイトル */}
        <div className="space-y-2">
          <Label className="text-red-400 font-bold">配信タイトル *</Label>
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="配信タイトルを入力" className="bg-secondary border-2 border-red-500/50 focus:border-red-500" required />
        </div>

        {/* 説明 */}
        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="配信の説明を入力" className="bg-secondary border-0 resize-none" rows={3} />
        </div>

        {/* 予定日時 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>予定日時（任意）</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={!form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.checked ? "" : new Date().toISOString().slice(0, 16) })}
                className="w-4 h-4 accent-primary rounded" />
              <span className="text-sm text-primary font-semibold">即配信</span>
            </label>
          </div>
          {form.scheduled_at && (
            <Input type="datetime-local" value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-secondary border-0" />
          )}
        </div>

        {/* 配信予定時間 */}
        <div className="space-y-2">
          <Label>配信予定時間</Label>
          <select value={form.availableTime} onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
            className="w-full h-9 rounded-md bg-secondary border-0 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="">選択してください</option>
            <option value="30分">30分</option>
            <option value="1時間">1時間</option>
            <option value="1時間30分">1時間30分</option>
            <option value="2時間">2時間（最大）</option>
          </select>
          <p className="text-xs text-muted-foreground">最大2時間まで設定できます</p>
        </div>

        {/* 価格 */}
        <div className="space-y-2">
          <Label className="text-red-400 font-bold">視聴価格（コイン）*</Label>
          <Input type="number" min={0} value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
            className="bg-secondary border-2 border-red-500/50 focus:border-red-500" required />
          <p className="text-xs text-muted-foreground">0 = 無料配信</p>
          {(() => {
            const p = form.price;
            const activeQuality = p >= 150 ? "FHD 1080p" : p >= 55 ? "HD 720p" : "SD 480p";
            return (
              <div className="bg-secondary/60 border border-border/50 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs font-black text-foreground">📊 設定価格で画質が自動決定されます</p>
                <div className="space-y-2">
                  {[
                    { quality: "SD 480p", minCoins: 15, maxCoins: 54, badge: "bg-zinc-500/20 text-zinc-300", activeBadge: "bg-zinc-500 text-white" },
                    { quality: "HD 720p", minCoins: 55, maxCoins: 149, badge: "bg-blue-500/20 text-blue-300", activeBadge: "bg-blue-500 text-white" },
                    { quality: "FHD 1080p", minCoins: 150, maxCoins: null, badge: "bg-primary/20 text-primary", activeBadge: "bg-primary text-primary-foreground" },
                  ].map(({ quality, minCoins, maxCoins, badge, activeBadge }) => {
                    const isActive = quality === activeQuality;
                    return (
                      <div key={quality} className={`flex items-center gap-3 rounded-lg px-3 py-2 border transition-all ${isActive ? "bg-background border-primary/50 ring-1 ring-primary/30" : "bg-background/40 border-transparent"}`}>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 ${isActive ? activeBadge : badge}`}>{quality}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">
                            {maxCoins ? `${minCoins}〜${maxCoins}コイン` : `${minCoins}コイン以上`}（15分毎）
                          </p>
                        </div>
                        {isActive && <span className="text-[10px] font-black text-primary shrink-0">← 現在</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* チケット販売設定 */}
        <div className={`space-y-3 border rounded-2xl p-4 ${canUseLiveStream && ppvSubscription ? "bg-yellow-500/5 border-yellow-500/30" : "bg-muted/20 border-muted/40 opacity-60"}`}>
          <div className="flex items-center justify-between">
            <label className={`text-sm font-bold flex items-center gap-2 ${canUseLiveStream && ppvSubscription ? "text-yellow-400" : "text-muted-foreground"}`}>
              🎫 チケット販売（PPVプラン限定）
            </label>
            <button type="button" disabled={!canUseLiveStream || !ppvSubscription}
              onClick={() => setTicketEnabled((v) => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative ${ticketEnabled && ppvSubscription ? "bg-yellow-500" : "bg-secondary"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ticketEnabled && ppvSubscription ? "left-6" : "left-0.5"}`} />
            </button>
          </div>
          {ticketEnabled && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">配信時間（15分単位・最大2時間）</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {TICKET_DURATIONS.map((m) => (
                    <button key={m} type="button"
                      onClick={() => { setTicketDurationMinutes(m); setTicketPriceYen(Math.ceil((m / 15) * 150)); }}
                      className={`rounded-lg py-1.5 text-xs font-bold transition-all ${ticketDurationMinutes === m ? "bg-yellow-500 text-black" : "bg-secondary hover:bg-yellow-500/20"}`}>
                      {m}分
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">チケット価格（最低 ¥{minTicketPrice}）</label>
                <div className="flex items-center gap-2">
                  <input type="number" min={minTicketPrice} step={50} value={ticketPriceYen}
                    onChange={(e) => setTicketPriceYen(Math.max(minTicketPrice, parseInt(e.target.value) || minTicketPrice))}
                    className="flex-1 rounded-lg bg-secondary border-0 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-yellow-500/50" />
                  <span className="text-sm text-muted-foreground">円</span>
                </div>
                <p className="text-[10px] text-yellow-400">配信者受取: <span className="font-bold">¥{Math.floor(ticketPriceYen * 0.85)}</span>（85%）</p>
              </div>
            </div>
          )}
          {!canUseLiveStream && <p className="text-xs text-muted-foreground">PPVプランへの加入でチケット販売機能を利用できます</p>}
        </div>

        {/* 送信ボタン */}
        <Button type="submit" disabled={creating || !form.title} className="w-full h-10 sm:h-12 bg-red-500 hover:bg-red-600 text-white text-sm sm:text-base gap-2">
          {creating ? (
            <><Loader2 className="w-5 h-5 animate-spin" />準備中...</>
          ) : (
            <><Radio className="w-5 h-5" />配信スタート — キーを取得してOBS / アプリで配信</>
          )}
        </Button>
      </form>
    </div>
  );
}