import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Loader2, Image, Copy, ArrowRight, Zap, RefreshCw, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";

const MODE_SELECT = "select";
const MODE_LIVE = "live";

const STEPS = [
  { num: 1, label: "配信内容" },
  { num: 2, label: "収益設定" },
  { num: 3, label: "配信準備" },
];

export default function GoLive() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(MODE_SELECT);
  const [modeInitialized, setModeInitialized] = useState(false);
  const [creating, setCreating] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [keyReady, setKeyReady] = useState(false);
  const [goToBroadcast, setGoToBroadcast] = useState(false);
  const [ivsStream, setIvsStream] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [manualStreamKey, setManualStreamKey] = useState("");
  const [manualIngestEndpoint, setManualIngestEndpoint] = useState("");
  const [refreshingKey, setRefreshingKey] = useState(false);
  const [keyFetchedAt, setKeyFetchedAt] = useState(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [advancedOpen, setAdvancedOpen] = useState(false);

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
  const [archiveVodEnabled, setArchiveVodEnabled] = useState(true);

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

  const isAdmin = user?.role === 'admin';
  const isTestAccount = user?.email === 'ono@onestep-corp.com';

  const { data: ppvSubscription = null, isLoading: ppvLoading, isError: ppvError } = useQuery({
    queryKey: ["ppv-subscription", user?.email],
    queryFn: async () => {
      if (isTestAccount) return { plan_id: "ppv", status: "active" };
      const subs = await base44.entities.PlanSubscription.filter({ user_email: user.email, plan_id: "ppv", status: "active" });
      return subs[0] || null;
    },
    enabled: !!user && !isAdmin,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const { data: campaignGrantee = null, isLoading: campaignLoading, isError: campaignError } = useQuery({
    queryKey: ["campaign-live-grantee", user?.email],
    queryFn: async () => {
      if (isTestAccount) return { email: user.email, reason: "test_account" };
      const grantees = await base44.entities.CampaignLiveGrantee.filter({ email: user.email });
      const grantee = grantees[0];
      if (grantee && new Date(grantee.expires_at) > new Date()) return grantee;
      return null;
    },
    enabled: !!user && !isAdmin,
    staleTime: 0,
    gcTime: 0,
    retry: 2,
  });

  const canUseLiveStream = isTestAccount || !!ppvSubscription || !!campaignGrantee;
  const planCheckError = ppvError || campaignError;

  useEffect(() => {
    if (!modeInitialized && user) {
      if (user.role === "admin") {
        setMode(MODE_LIVE);
        setModeInitialized(true);
        return;
      }
      if (!ppvLoading && !campaignLoading) {
        if (canUseLiveStream) setMode(MODE_LIVE);
        setModeInitialized(true);
      }
    }
  }, [user, ppvLoading, campaignLoading, canUseLiveStream, modeInitialized]);

  useEffect(() => {
    if (channels[0]?.ivs_stream_key && !manualStreamKey) {
      const ch = channels[0];
      setManualStreamKey(ch.ivs_stream_key);
      setManualIngestEndpoint(ch.ivs_ingest_endpoint || "");
      setIvsStream({
        streamKey: ch.ivs_stream_key,
        ingestEndpoint: ch.ivs_ingest_endpoint,
        playbackUrl: ch.ivs_playback_url,
        channelArn: ch.ivs_channel_arn,
      });
      setKeyFetchedAt(new Date(ch.ivs_provisioned_at || Date.now()));
    }
  }, [channels]);

  const handleRefreshKey = async () => {
    const channel = channels[0];
    const channelArn = channel?.ivs_channel_arn || ivsStream?.channelArn;
    if (!channelArn) {
      toast.error("先に配信を開始してストリームキーを初期化してください");
      return;
    }
    setRefreshingKey(true);
    try {
      const res = await base44.functions.invoke('refreshIvsStreamKey', { channelArn });
      const data = res.data;
      if (!data?.streamKey) throw new Error(data?.error || "キー取得失敗");
      setManualStreamKey(data.streamKey);
      setManualIngestEndpoint(data.ingestEndpoint);
      setKeyFetchedAt(new Date());
      if (channel?.id) {
        await base44.entities.Channel.update(channel.id, {
          ivs_stream_key: data.streamKey,
          ivs_ingest_endpoint: data.ingestEndpoint,
        });
      }
      toast.success(data.regenerated ? "🔑 新しいストリームキーを生成しました！" : "✅ ストリームキーを更新しました");
    } catch (err) {
      toast.error("キー更新失敗: " + err.message);
    } finally {
      setRefreshingKey(false);
    }
  };

  const handleForceReprovision = async () => {
    if (!liveStreamId) { toast.error("配信枠を作成してください"); return; }
    if (!confirm("⚠️ IVSチャンネルを強制リセットします。既存のキーは無効になります。続行しますか？")) return;
    setRefreshingKey(true);
    try {
      const res = await base44.functions.invoke('forceReprovisionIvsChannel', { streamId: liveStreamId });
      const data = res.data;
      if (!data?.success) throw new Error(data?.error || "リセット失敗");
      setManualStreamKey(data.streamKey);
      setManualIngestEndpoint(data.ingestEndpoint);
      setKeyFetchedAt(new Date());
      await base44.entities.LiveStream.update(liveStreamId, {
        ivs_channel_arn: data.newChannelArn,
        ivs_stream_key: data.streamKey,
        ivs_ingest_endpoint: data.ingestEndpoint,
        ivs_playback_url: data.playbackUrl,
      });
      toast.success("🔄 IVSチャンネルを強制リセットしました！");
    } catch (err) {
      toast.error("強制リセット失敗: " + err.message);
    } finally {
      setRefreshingKey(false);
    }
  };

  const fullRtmpsUrl = manualIngestEndpoint && manualStreamKey
    ? `rtmps://${manualIngestEndpoint}:443/app/${manualStreamKey}`
    : "";

  const handleStartLive = () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    if (isAdmin) { setMode(MODE_LIVE); return; }
    if (ppvLoading || campaignLoading) return;
    if (planCheckError) { toast.error("通信エラーが発生しました。画面を再読み込みしてください。"); return; }
    if (canUseLiveStream) setMode(MODE_LIVE);
    else navigate("/plan-select");
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    const priceInt = Math.floor(Number(form.price));
    if (priceInt > 0 && priceInt < 15) { toast.error("視聴価格は最低15コイン以上で設定してください"); return; }
    if (Number(form.price) !== priceInt) { toast.error("視聴価格は整数で入力してください"); return; }
    setCreating(true);
    try {
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

      let channelArn = channel.ivs_channel_arn;
      let streamKey = channel.ivs_stream_key;
      let ingestEndpoint = channel.ivs_ingest_endpoint;
      let playbackUrl = channel.ivs_playback_url;

      if (!streamKey) {
        const provisionRes = await base44.functions.invoke('provisionChannelStreamKey', { channel_id: channel.id });
        if (!provisionRes?.data?.success) {
          toast.error(provisionRes?.data?.error || 'ストリームキーの初期化に失敗しました');
          setCreating(false);
          return;
        }
        channelArn = provisionRes.data.channel_arn;
        streamKey = provisionRes.data.stream_key;
        ingestEndpoint = provisionRes.data.ingest_endpoint;
        playbackUrl = provisionRes.data.playback_url;
        toast.success("🎉 あなたの配信キーを作成しました。");
      }

      setIvsStream({ streamKey, ingestEndpoint, playbackUrl, channelArn });
      setManualStreamKey(streamKey);
      setManualIngestEndpoint(ingestEndpoint);
      setKeyFetchedAt(new Date());

      let thumbnail_url = "";
      if (thumbnailFile) {
        try {
          const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
          thumbnail_url = res.file_url;
          setThumbnailUrl(thumbnail_url);
        } catch (err) {}
      }

      const getQualityFromPrice = (price) => {
        if (price === 0 || price >= 150) return "1080p";
        if (price >= 55) return "720p";
        return "480p";
      };
      const autoQuality = getQualityFromPrice(form.price);
      const isLiveNow = !form.scheduled_at;

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
        price: priceInt || 0,
        viewer_count: 0,
        stream_type: "ivs",
        ivs_playback_url: playbackUrl,
        ivs_channel_arn: channelArn,
        ivs_stream_key: streamKey,
        ivs_ingest_endpoint: ingestEndpoint,
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
        auto_archive_vod_enabled: archiveVodEnabled,
      });

      await base44.entities.Channel.update(channel.id, { is_live: true });

      setCreating(false);
      sessionStorage.setItem("liveStreamId", newStream.id);
      setLiveStreamId(newStream.id);
      setKeyReady(true);
    } catch (err) {
      console.error('配信作成エラー:', err);
      toast.error('配信作成に失敗しました: ' + err.message);
      setCreating(false);
    }
  };

  // ── MODE_SELECT ──
  if (mode === MODE_SELECT) {
    const isChecking = !isAdmin && (ppvLoading || campaignLoading || !user);
    return (
      <div className="max-w-lg mx-auto px-4 py-16 flex flex-col items-center gap-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <Radio className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-2xl font-black text-white">ライブ配信を開始</h1>
          <p className="text-muted-foreground text-sm">1対多のリアルタイム有料配信（PPV）</p>
        </div>

        {planCheckError && (
          <div className="w-full bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-red-400 font-bold">⚠️ 加入状況の確認中にエラーが発生しました</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-xs text-red-300 underline">画面を再読み込み</button>
          </div>
        )}

        <button
          onClick={handleStartLive}
          disabled={isChecking || !!planCheckError}
          className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-black text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
        >
          {isChecking ? <><Loader2 className="w-5 h-5 animate-spin" />確認中...</> : <><Radio className="w-5 h-5" />配信を始める</>}
        </button>
        <p className="text-xs text-muted-foreground text-center">PPVプランまたはキャンペーン対象者のみ利用可能</p>
      </div>
    );
  }

  // ── BroadcasterStream ──
  if (goToBroadcast && liveStreamId) {
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

  // ── 3ステップセットアップ ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => setMode(MODE_SELECT)} className="text-muted-foreground hover:text-foreground text-sm underline">← 戻る</button>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Radio className="w-5 h-5 text-red-400" />ライブ配信セットアップ
        </h1>
      </div>

      {/* ステップインジケーター */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => {
          const done = currentStep > s.num;
          const active = currentStep === s.num;
          return (
            <React.Fragment key={s.num}>
              <button
                onClick={() => { if (done || active) setCurrentStep(s.num); }}
                className={`flex flex-col items-center gap-1 flex-1 ${done || active ? "cursor-pointer" : "cursor-default opacity-40"}`}
              >
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm border-2 transition-all ${
                  done ? "bg-primary border-primary text-primary-foreground" :
                  active ? "bg-primary/20 border-primary text-primary" :
                  "bg-muted border-border text-muted-foreground"
                }`}>
                  {done ? <CheckCircle2 className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-semibold ${active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mb-5 transition-colors ${currentStep > s.num ? "bg-primary" : "bg-border"}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* ── STEP 1: 配信内容 ── */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-white border-l-4 border-red-500 pl-3">配信内容</h2>

          {/* タイトル */}
          <div className="space-y-1.5">
            <Label>配信タイトル <span className="text-red-400 text-xs">*必須</span></Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例：今夜の雑談ライブ"
              className="bg-secondary border-0 h-11"
            />
          </div>

          {/* 説明 */}
          <div className="space-y-1.5">
            <Label>説明（任意）</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="配信内容を簡単に説明してください"
              className="bg-secondary border-0 resize-none"
              rows={3}
            />
          </div>

          {/* 配信日時 + 配信予定時間 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>配信日時</Label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input type="checkbox" checked={!form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.checked ? "" : new Date().toISOString().slice(0, 16) })}
                    className="w-3.5 h-3.5 accent-primary" />
                  <span className="text-xs text-primary font-bold">即配信</span>
                </label>
              </div>
              {form.scheduled_at ? (
                <Input type="datetime-local" value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="bg-secondary border-0 h-11" />
              ) : (
                <div className="h-11 bg-secondary/40 border border-border/50 rounded-md flex items-center px-3">
                  <span className="text-xs text-primary font-bold">▶ 今すぐ配信</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>配信予定時間</Label>
              <select value={form.availableTime} onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
                className="w-full h-11 rounded-md bg-secondary px-3 text-sm text-foreground border-0 focus:outline-none">
                <option value="">未定</option>
                <option value="30分">30分</option>
                <option value="1時間">1時間</option>
                <option value="1時間30分">1時間30分</option>
                <option value="2時間">2時間</option>
              </select>
            </div>
          </div>

          {/* サムネイル */}
          <div className="space-y-1.5">
            <Label>サムネイル（任意）</Label>
            <label className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/60 transition-colors bg-secondary/30">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files[0])} />
              {thumbnailFile ? (
                <div className="flex items-center gap-2 text-primary">
                  <Image className="w-4 h-4" />
                  <span className="text-sm font-medium">{thumbnailFile.name}</span>
                </div>
              ) : (
                <div className="text-center">
                  <Image className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                  <p className="text-xs text-muted-foreground">クリックして選択（推奨: 1280×720px）</p>
                </div>
              )}
            </label>
          </div>

          <Button
            onClick={() => { if (!form.title) { toast.error("タイトルを入力してください"); return; } setCurrentStep(2); }}
            className="w-full h-11 bg-primary hover:bg-primary/90 font-bold gap-2"
          >
            次へ：収益設定 <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* ── STEP 2: 収益設定 ── */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-white border-l-4 border-yellow-400 pl-3">収益設定</h2>

          {/* 視聴価格 */}
          <div className="space-y-1.5">
            <Label>視聴価格（コイン）<span className="text-red-400 text-xs">*必須 / 最低15コイン</span></Label>
            <Input
              type="number" min={15} step={1}
              value={form.price}
              onChange={(e) => { const raw = Math.floor(Number(e.target.value)); setForm({ ...form, price: isNaN(raw) || raw < 0 ? 0 : raw }); }}
              className="bg-secondary border-0 h-11"
            />
            {(() => {
              const p = Number(form.price);
              if (p > 0 && p < 15) return <p className="text-xs text-red-400 font-bold">⚠️ 最低15コイン以上</p>;
              const quality = p === 0 || p >= 150 ? "FHD 1080p" : p >= 55 ? "HD 720p" : "SD 480p";
              if (p >= 15) return <p className="text-xs text-primary font-semibold">✓ 画質: {quality}（価格により自動決定）</p>;
              return null;
            })()}
          </div>

          {/* アーカイブVOD */}
          <div className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3">
            <div>
              <p className="text-sm font-bold">配信後にアーカイブ販売</p>
              <p className="text-xs text-muted-foreground">配信終了後に自動でVOD販売開始</p>
            </div>
            <button type="button"
              onClick={() => setArchiveVodEnabled((v) => !v)}
              className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${archiveVodEnabled ? "bg-primary" : "bg-zinc-700"}`}>
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${archiveVodEnabled ? "left-6" : "left-0.5"}`} />
            </button>
          </div>

          {/* チケット販売 */}
          <div className={`rounded-xl border p-4 space-y-3 ${canUseLiveStream && ppvSubscription ? "border-yellow-500/30 bg-yellow-500/5" : "border-border/50 bg-secondary/30 opacity-60"}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-yellow-400">🎫 チケット販売（PPVプラン限定）</p>
                <p className="text-xs text-muted-foreground">事前チケットで収益を確保</p>
              </div>
              <button type="button" disabled={!canUseLiveStream || !ppvSubscription}
                onClick={() => setTicketEnabled((v) => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${ticketEnabled && ppvSubscription ? "bg-yellow-500" : "bg-zinc-700"}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ticketEnabled && ppvSubscription ? "left-6" : "left-0.5"}`} />
              </button>
            </div>
            {ticketEnabled && (
              <div className="space-y-3 pt-2 border-t border-border/30">
                <div className="space-y-1.5">
                  <Label className="text-xs">配信時間（15分単位）</Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {TICKET_DURATIONS.map((m) => (
                      <button key={m} type="button"
                        onClick={() => { setTicketDurationMinutes(m); setTicketPriceYen(Math.ceil((m / 15) * 150)); }}
                        className={`rounded-lg py-1.5 text-xs font-bold transition-all ${ticketDurationMinutes === m ? "bg-yellow-500 text-black" : "bg-secondary hover:bg-yellow-500/20 text-muted-foreground"}`}>
                        {m}分
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">チケット価格（最低 ¥{minTicketPrice}）</Label>
                  <div className="flex items-center gap-2">
                    <input type="number" min={minTicketPrice} step={1} value={ticketPriceYen}
                      onChange={(e) => setTicketPriceYen(Math.max(minTicketPrice, Math.floor(Number(e.target.value)) || minTicketPrice))}
                      className="flex-1 rounded-lg bg-secondary px-3 py-2 text-sm text-foreground border-0 focus:outline-none" />
                    <span className="text-sm text-muted-foreground">円</span>
                  </div>
                  <p className="text-xs text-yellow-400">受取: <span className="font-bold">¥{Math.floor(ticketPriceYen * 0.85)}</span>（85%）</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setCurrentStep(1)} className="flex-1">← 戻る</Button>
            <Button onClick={() => setCurrentStep(3)} className="flex-1 h-11 bg-primary hover:bg-primary/90 font-bold gap-2">
              次へ：配信準備 <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: 配信準備 ── */}
      {currentStep === 3 && (
        <div className="space-y-5">
          <h2 className="text-lg font-black text-white border-l-4 border-green-400 pl-3">配信準備</h2>

          {/* キー未取得状態 */}
          {!keyReady && (
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3 opacity-60">
              <p className="text-sm font-bold text-muted-foreground text-center">ストリームキーを取得するとここに表示されます</p>
              {["Server URL", "Stream Key", "Web Overlay URL"].map((label) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs text-muted-foreground font-semibold">{label}</p>
                  <div className="h-9 bg-secondary/40 rounded-lg border border-border/30" />
                </div>
              ))}
            </div>
          )}

          {/* キー取得済み */}
          {keyReady && (
            <div className="bg-green-500/10 border-2 border-green-500/50 rounded-xl p-5 space-y-4">
              <p className="text-sm font-black text-green-300 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />配信ソフト（OBS / PRISM）に以下をコピーしてください
              </p>
              {[
                { label: "① Server URL", value: `rtmps://${manualIngestEndpoint}:443/app/`, msg: "Server URLをコピーしました" },
                { label: "② Stream Key", value: manualStreamKey, msg: "Stream Keyをコピーしました" },
                { label: "③ Web Overlay URL（PRISMに貼る）", value: `${window.location.origin}/overlay.html?id=${liveStreamId}`, msg: "Web Overlay URLをコピーしました" },
              ].map(({ label, value, msg }) => (
                <div key={label} className="space-y-1">
                  <p className="text-xs font-bold text-green-300">{label}</p>
                  <div className="flex gap-2">
                    <input readOnly value={value}
                      className="flex-1 bg-black/40 border border-green-500/30 rounded-lg px-3 py-2 text-xs font-mono text-green-200 truncate" />
                    <button onClick={() => { navigator.clipboard.writeText(value); toast.success(msg); }}
                      className="px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg text-xs font-bold transition-colors shrink-0 flex items-center gap-1">
                      <Copy className="w-3.5 h-3.5" />Copy
                    </button>
                  </div>
                </div>
              ))}

              {/* キー再取得 */}
              <button onClick={handleRefreshKey} disabled={refreshingKey}
                className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50">
                {refreshingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                キーを再取得する
              </button>

              {/* 強制リセット（折りたたみ） */}
              <div className="border-t border-border/30 pt-3">
                <button onClick={() => setAdvancedOpen(v => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {advancedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  上級者向けオプション
                </button>
                {advancedOpen && (
                  <div className="mt-3 p-3 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
                    <p className="text-xs text-red-400 font-bold">⚠️ 強制リセット（最終手段）</p>
                    <p className="text-xs text-muted-foreground">IVSチャンネルを完全にリセットします。既存のキーはすべて無効になります。</p>
                    <button onClick={handleForceReprovision} disabled={refreshingKey}
                      className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 rounded-lg text-xs font-black transition-colors disabled:opacity-50">
                      {refreshingKey ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                      IVSチャンネルを強制リセット
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* キー取得ボタン */}
          {!keyReady && (
            <Button
              onClick={handleStart}
              disabled={creating || !form.title || (Number(form.price) > 0 && Math.floor(Number(form.price)) < 15)}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black text-base gap-2 shadow-lg shadow-red-500/20"
            >
              {creating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />準備中...</>
              ) : (
                <><Radio className="w-5 h-5" />ストリーミングキーを取得する</>
              )}
            </Button>
          )}

          {/* 配信管理画面へ */}
          {keyReady && (
            <Button
              onClick={() => setGoToBroadcast(true)}
              className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black text-base gap-2 shadow-lg shadow-red-500/30"
            >
              <Radio className="w-5 h-5" />配信管理画面へ進む →
            </Button>
          )}

          <Button variant="outline" onClick={() => setCurrentStep(2)} className="w-full">← 収益設定に戻る</Button>
        </div>
      )}
    </div>
  );
}