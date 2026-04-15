import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Radio, Loader2, Image, PhoneCall, Video, AlertTriangle, ExternalLink, Users, Clock, CheckCircle2, XCircle, UserCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";
import StreamStyleModal from "../components/live/StreamStyleModal";

const MODE_LIVE = "live";
const MODE_CALL = "call";
const STREAM_TYPE_WEBRTC = "webrtc";

export default function GoLive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState(MODE_LIVE);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [showStreamStyleModal, setShowStreamStyleModal] = useState(false); // 待機モード中
  const queryClient = useQueryClient();
  const [liveStreamId, setLiveStreamId] = useState(null); // 配信中のstream ID
  const [ivsStream, setIvsStream] = useState(null); // { streamId, streamKey, ingestEndpoint, playbackUrl }

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    availableTime: "",
    duration: mode === MODE_LIVE ? 60 : 15,
    price: mode === MODE_LIVE ? 150 : 150,
    isPaid: true,
    streamType: STREAM_TYPE_WEBRTC,
    // Archive settings
    saveArchive: false,
    archiveIsPaid: false,
    archivePrice: 150,
    archiveConsentConfirmed: false,
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then((u) => {
          setUser(u);
        }).catch(() => {});
      } else {
        base44.auth.redirectToLogin();
      }
    });
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["my-channels", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }),
    enabled: !!user,
  });

  // 自分のチャンネルへの通話申請（pending）を取得
  const { data: pendingCalls = [] } = useQuery({
    queryKey: ["pending-calls", channels[0]?.id],
    queryFn: () => base44.entities.VideoCall.filter({ callee_channel_id: channels[0].id, status: "pending" }, "-created_date", 20),
    enabled: !!channels[0]?.id && waiting,
    refetchInterval: waiting ? 4000 : false,
  });

  const handleStartWaiting = async () => {
    let ch = channels[0];
    if (!ch) {
      ch = await base44.entities.Channel.create({ name: user.full_name + "のチャンネル", owner_email: user.email });
      queryClient.invalidateQueries({ queryKey: ["my-channels", user.email] });
    }
    setChannel(ch);
    await base44.entities.Channel.update(ch.id, { call_enabled: true });
    queryClient.invalidateQueries({ queryKey: ["my-channels", user.email] });
    setWaiting(true);
    toast.success("待機モードを開始しました。通話希望者を待っています。");
  };

  const handleStopWaiting = async () => {
    if (channels[0]) await base44.entities.Channel.update(channels[0].id, { call_enabled: false });
    setWaiting(false);
    toast.info("待機モードを終了しました。");
  };

  const handleAcceptCall = (call) => {
    navigate(`/call/${call.id}`);
  };

  const handleDeclineCall = async (call) => {
    await base44.entities.VideoCall.update(call.id, { status: "declined" });
    queryClient.invalidateQueries({ queryKey: ["pending-calls", channels[0]?.id] });
    toast.info("通話申請を断りました。");
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    // Archive consent check
    if (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed) {
      toast.error("アーカイブを有料公開する場合、通話相手の同意確認が必要です。");
      return;
    }

    setCreating(true);

    // IVS ライブ枠を作成（WebRTC配信の場合）
    let ivsData = null;
    if (mode === MODE_LIVE && form.streamType === STREAM_TYPE_WEBRTC) {
      const ivsRes = await base44.functions.invoke('createLiveStream', { isArchiveSaved: form.saveArchive });
      if (!ivsRes?.data?.streamId) {
        toast.error('配信枠の作成に失敗しました。もう一度お試しください。');
        setCreating(false);
        return;
      }
      ivsData = ivsRes.data;
      setIvsStream(ivsData);
    }

    let channel = channels[0];
    if (!channel) {
      channel = await base44.entities.Channel.create({
        name: user.full_name + "のチャンネル",
        owner_email: user.email,
      });
    }

    let thumbnail_url = "";
    if (thumbnailFile) {
      const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
      thumbnail_url = res.file_url;
    }

    const isLiveNow = !form.scheduled_at;
    const stream = await base44.entities.LiveStream.create({
      title: form.title,
      description: form.description,
      channel_id: channel.id,
      channel_name: channel.name,
      channel_avatar: channel.avatar_url,
      thumbnail_url,
      status: isLiveNow ? "live" : "scheduled",
      scheduled_at: form.scheduled_at || null,
      available_time: form.availableTime || "",
      price: form.price,
      viewer_count: 0,
      stream_type: form.streamType,
      ivs_playback_url: ivsData ? ivsData.playbackUrl : "",
      // コスト計算起点
      live_started_at: isLiveNow ? new Date().toISOString() : null,
      cost_input_yen: 0,
      cost_output_yen: 0,
      total_viewer_minutes: 0,
      revenue_coins: 0,
    });

    await base44.entities.Channel.update(channel.id, { is_live: true });

    setCreating(false);

    if (mode === MODE_CALL) {
      navigate(`/call/${stream.id}`);
    } else {
      // ブラウザ配信
      setLiveStreamId(stream.id);
    }
  };

  // ライブ配信の最低コイン価格（プログレッシブ還元率連動）
  // キャンペーン許可: 制限なし
  // progressive_rate >= 0.95: 200コイン/15分
  // progressive_rate >= 0.90: 175コイン/15分
  // 通常 (0.85〜0.89): 150コイン/15分
  // VODプラン加入チェック（アーカイブ販売にはVODプラン必要）
  const hasVodPlan = user?.plan === "vod" || user?.plan === "basic" || user?.plan === "standard" || user?.plan === "premium" || user?.role === "admin";

  const isCampaign = channels[0]?.campaign_allowed === true;
  const progressiveRate = channels[0]?.progressive_rate || 0.85;
  const LIVE_MIN_COINS_PER_15MIN = channels[0]?.live_min_per_15min
    || (progressiveRate >= 0.95 ? 200 : progressiveRate >= 0.90 ? 175 : 150);
  const liveRevenueRate = progressiveRate;
  const liveMinPrice = isCampaign ? 0 : Math.ceil((form.duration / 15) * LIVE_MIN_COINS_PER_15MIN);
  const minPrice = mode === MODE_LIVE ? liveMinPrice : Math.ceil((form.duration / 15) * 150);
  const livePriceError = mode === MODE_LIVE && !isCampaign && form.price < liveMinPrice && liveMinPrice > 0;



  // 配信中の場合はBroadcasterStreamを表示
  if (liveStreamId) {
    return (
      <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold">配信中</h1>
        </div>
        <BroadcasterStream
          streamId={liveStreamId}
          ivsStreamKey={ivsStream?.streamKey}
          ivsIngestEndpoint={ivsStream?.ingestEndpoint}
          onEnd={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold">配信・通話を開始</h1>
      </div>

      {/* Stream Style Modal */}
      {showStreamStyleModal && (
        <StreamStyleModal
          onSelect={(style) => {
            setForm((f) => ({ ...f, streamType: STREAM_TYPE_WEBRTC }));
            setShowStreamStyleModal(false);
          }}
          onClose={() => setShowStreamStyleModal(false)}
        />
      )}

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 sm:mb-8">
        <button
          type="button"
          onClick={() => {
            const plan = user?.plan;
            const isEligible = plan === "basic" || plan === "standard" || plan === "premium" || user?.role === "admin";
            if (!isEligible) {
              toast.error("1対多ライブ配信はBASICプラン以上でご利用いただけます。");
              navigate("/plan-select");
              return;
            }
            setMode(MODE_LIVE); setShowStreamStyleModal(true);
          }}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
            mode === MODE_LIVE
              ? "border-red-500 bg-red-500/10"
              : "border-border bg-card hover:border-border/70"
          }`}
        >
          <Radio className={`w-7 h-7 ${mode === MODE_LIVE ? "text-red-400" : "text-muted-foreground"}`} />
          <span className={`font-bold text-sm ${mode === MODE_LIVE ? "text-red-400" : "text-muted-foreground"}`}>
            1対多 ライブ配信
          </span>
          <span className="text-xs text-muted-foreground text-center">多数の視聴者に向けた有料ライブ配信（PPV）</span>
          {user && !["basic","standard","premium"].includes(user?.plan) && user?.role !== "admin" && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full">BASICプラン以上</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setMode(MODE_CALL)}
          className={`flex flex-col items-center gap-2 p-5 rounded-2xl border-2 transition-all ${
            mode === MODE_CALL
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover:border-border/70"
          }`}
        >
          <PhoneCall className={`w-7 h-7 ${mode === MODE_CALL ? "text-primary" : "text-muted-foreground"}`} />
          <span className={`font-bold text-sm ${mode === MODE_CALL ? "text-primary" : "text-muted-foreground"}`}>
            1対1 ビデオ通話
          </span>
          <span className="text-xs text-muted-foreground text-center">特定の相手と双方向ビデオ通話（有料対応）</span>
        </button>
      </div>

      {/* 待機モード（通話モードのみ） */}
      {mode === MODE_CALL && (
        <div className="mb-6">
          {!waiting ? (
            <button
              type="button"
              onClick={handleStartWaiting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary/60 transition-all text-primary font-bold"
            >
              <Users className="w-5 h-5" />
              待機して通話希望者を募る
            </button>
          ) : (
            <div className="bg-primary/10 border border-primary/30 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-bold text-sm text-green-400">待機中 — 通話希望者を待っています</span>
                </div>
                <button onClick={handleStopWaiting} className="text-xs text-muted-foreground hover:text-destructive underline">
                  待機終了
                </button>
              </div>

              {pendingCalls.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  まだ通話申請がありません
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">通話申請 ({pendingCalls.length}件)</p>
                  {pendingCalls.map((call) => (
                    <div key={call.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <UserCheck className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{call.caller_name || call.caller_email}</p>
                        <p className="text-xs text-muted-foreground truncate">{call.caller_email}</p>
                        {call.message && (
                          <p className="text-xs text-foreground/70 mt-1 line-clamp-2 bg-secondary px-2 py-1 rounded">💬 {call.message}</p>
                        )}
                        <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                          {call.duration_minutes && <span>⏱ {call.duration_minutes}分</span>}
                          {call.price > 0 && <span className="text-primary font-bold">¥{call.price.toLocaleString()}</span>}
                          {call.is_free_call && <span className="text-green-400">無料枠</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1 h-8 text-xs" onClick={() => handleAcceptCall(call)}>
                          <CheckCircle2 className="w-3.5 h-3.5" /> 承認
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 h-8 text-xs" onClick={() => handleDeclineCall(call)}>
                          <XCircle className="w-3.5 h-3.5" /> 断る
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleStart} className="space-y-4 sm:space-y-6">
        {/* ブラウザ配信固定 */}
        {mode === MODE_LIVE && (
          <div className="space-y-3">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-300">
              <p className="font-bold">配信方式</p>
              <p className="mt-1">ブラウザから直接配信します。カメラが必要です。</p>
            </div>
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-xs text-orange-300 leading-relaxed">
                <strong>自動強制終了について：</strong>配信開始後、視聴者が0人の状態が<strong>5分間継続</strong>した場合、サーバー負荷を避けるためシステムが自動的に配信を強制終了します。
              </p>
            </div>
          </div>
        )}

        {/* Thumbnail */}
        <div className="space-y-2">
          <Label>サムネイル画像</Label>
          <label className="flex flex-col items-center justify-center h-24 sm:h-28 border-2 border-dashed border-border rounded-lg sm:rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setThumbnailFile(e.target.files[0])}
            />
            {thumbnailFile ? (
              <div className="flex items-center gap-2 text-primary">
                <Image className="w-5 h-5" />
                <span className="text-sm font-medium">{thumbnailFile.name}</span>
              </div>
            ) : (
              <div className="text-center">
                <Image className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">サムネイル画像を選択</p>
              </div>
            )}
          </label>
          <p className="text-xs text-muted-foreground">推奨サイズ: 1280 × 720px (16:9)</p>
        </div>

        <div className="space-y-2">
          <Label>{mode === MODE_LIVE ? "配信タイトル" : "通話タイトル"}</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={mode === MODE_LIVE ? "配信タイトルを入力" : "通話の内容・タイトルを入力"}
            className="bg-secondary border-0"
          />
        </div>

        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={mode === MODE_LIVE ? "配信の説明を入力" : "通話の目的・内容を入力"}
            className="bg-secondary border-0 resize-none"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>予定日時（任意）</Label>
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            className="bg-secondary border-0"
          />
        </div>

        <div className="space-y-2">
          <Label>対応可能時間</Label>
          <Input
            type="text"
            value={form.availableTime}
            onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
            placeholder="例: 14:00〜18:00"
            className="bg-secondary border-0"
          />
        </div>

        {/* Pricing */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-2">
            <Label>料金設定</Label>
            <span className="text-xs text-muted-foreground">
              {mode === MODE_LIVE ? "ライブ配信は必ず有料設定が必要です" : "1対1通話は必ず有料設定が必要です"}
            </span>
          </div>

          {mode === MODE_LIVE && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>配信時間（最大120分）</Label>
                <Select
                  value={String(form.duration)}
                  onValueChange={(v) => setForm({ ...form, duration: parseInt(v) })}
                >
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => (i + 1) * 15).map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {Math.floor(min / 60) > 0 ? `${Math.floor(min / 60)}時間` : ""}{min % 60 > 0 ? `${min % 60}分` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">1配信あたり最大120分まで設定可能です。</p>
              </div>

              <div className="space-y-2">
                <Label>チケット料金（エールコイン）</Label>
                <Input
                  type="number"
                  min={isCampaign ? 0 : liveMinPrice}
                  max={1000000}
                  step={1}
                  value={form.price}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0;
                    setForm({ ...form, price: Math.min(val, 1000000) });
                  }}
                  className={`bg-secondary border-0 ${livePriceError ? "ring-1 ring-destructive" : ""}`}
                  placeholder={String(liveMinPrice)}
                />
                {isCampaign ? (
                  <p className="text-xs text-yellow-400">🏷️ キャンペーン許可済み — 最低価格制限なし</p>
                ) : (
                  <p className={`text-xs ${livePriceError ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                    最低設定: {liveMinPrice}コイン / {form.duration}分（15分150コイン・還元率{Math.round(liveRevenueRate * 100)}%連動）
                    {livePriceError && " ← この価格では設定できません"}
                  </p>
                )}
                <div className="bg-secondary/60 rounded-lg p-2.5 text-xs text-muted-foreground space-y-1">
                  {progressiveRate >= 0.95 && (
                    <p className="text-yellow-400 font-bold">👑 最高還元率95%: 最低200コイン/15分が必須です</p>
                  )}
                  {progressiveRate >= 0.90 && progressiveRate < 0.95 && (
                    <p className="text-orange-400 font-bold">🔥 高還元率{Math.round(progressiveRate * 100)}%: 最低175コイン/15分が必須です</p>
                  )}
                  <p>ライバー報酬: <span className="text-primary font-bold">{Math.floor(form.price * liveRevenueRate)}コイン（{Math.round(liveRevenueRate * 100)}%）</span></p>
                  <p>運営収益: {Math.floor(form.price * (1 - liveRevenueRate))}コイン（{Math.round((1 - liveRevenueRate) * 100)}%）</p>
                </div>
              </div>
            </div>
          )}

          {mode === MODE_CALL && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>時間（15分単位）</Label>
                <Select
                  value={String(form.duration)}
                  onValueChange={(v) => setForm({ ...form, duration: parseInt(v), price: (parseInt(v) / 15) * 150 })}
                >
                  <SelectTrigger className="bg-secondary border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 8 }, (_, i) => (i + 1) * 15).map((min) => (
                      <SelectItem key={min} value={String(min)}>
                        {Math.floor(min / 60) > 0 ? `${Math.floor(min / 60)}時間` : ""}{min % 60 > 0 ? `${min % 60}分` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>料金（円）</Label>
                <Input
                  type="number"
                  min={minPrice}
                  max={1000000}
                  step={1}
                  value={form.price}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || minPrice;
                    setForm({ ...form, price: Math.max(Math.min(val, 1000000), minPrice) });
                  }}
                  className="bg-secondary border-0"
                  placeholder={String(minPrice)}
                />
                <p className="text-xs text-muted-foreground">
                  最低価格: ¥{minPrice.toLocaleString()} / {form.duration}分
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Archive Settings */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <Label className="flex items-center gap-1.5">
                <Video className="w-4 h-4 text-primary" /> アーカイブを保存する
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">配信・通話終了後に録画を記録します</p>
            </div>
            <Switch
              checked={form.saveArchive}
              onCheckedChange={(v) => setForm({ ...form, saveArchive: v, archiveIsPaid: false, archiveConsentConfirmed: false })}
            />
          </div>

          {form.saveArchive && (
            <div className="space-y-4 pt-2 border-t border-border/50">
              {(() => {
                const canSellArchive = ["basic","standard","premium"].includes(user?.plan) || user?.role === "admin";
                return (
                <div className="flex items-center justify-between">
                  <div>
                    <Label>アーカイブを有料公開する</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">¥150〜自由設定で動画として販売できます</p>
                    {!canSellArchive && (
                      <p className="text-xs text-yellow-400 mt-1">⚠️ BASICプラン以上で利用可能</p>
                    )}
                  </div>
                  <Switch
                     checked={form.archiveIsPaid}
                     disabled={!canSellArchive}
                     onCheckedChange={(v) => {
                       if (!canSellArchive) { toast.error("アーカイブ販売はBASICプラン以上でご利用いただけます。"); return; }
                       if (v && !hasVodPlan) {
                         toast.error("アーカイブを有料販売するにはVODプランへの加入が必要です。", { duration: 5000 });
                         navigate("/plan-select");
                         return;
                       }
                       setForm({ ...form, archiveIsPaid: v, archiveConsentConfirmed: false });
                     }}
                   />
                </div>
                );
              })()}

              {form.archiveIsPaid && (
                <>
                  <div className="space-y-2">
                    <Label>アーカイブ販売価格（円）</Label>
                    <Input
                     type="number"
                     min={150}
                     step={1}
                     value={form.archivePrice}
                     onChange={(e) => setForm({ ...form, archivePrice: Math.max(150, parseInt(e.target.value) || 150) })}
                     className="bg-secondary border-0"
                     placeholder="150"
                    />
                    <p className="text-xs text-muted-foreground">¥150〜自由に設定できます</p>
                  </div>

                  {/* Consent notice */}
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-orange-400">肖像権・同意について（重要）</p>
                        <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                          <li>通話・配信に映り込む相手（第三者）の肖像権を尊重してください。</li>
                          <li>アーカイブを有料公開する場合、映り込んだすべての方から<span className="text-orange-300 font-semibold">事前に書面または口頭による明示的な同意</span>を得る必要があります。</li>
                          <li>同意を得ていないアーカイブの公開は肖像権侵害となり、法的責任を負う可能性があります。</li>
                          <li>当プラットフォームは同意の有無を確認する義務を負わず、投稿者が全責任を負うものとします。</li>
                        </ul>
                      </div>
                    </div>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={form.archiveConsentConfirmed}
                        onChange={(e) => setForm({ ...form, archiveConsentConfirmed: e.target.checked })}
                        className="mt-0.5 accent-orange-400 w-4 h-4"
                      />
                      <span className="text-xs text-foreground/80 leading-relaxed group-hover:text-foreground transition-colors">
                        映り込む全員から肖像権に関する同意を得ており、本規約に同意してアーカイブを有料公開します。
                      </span>
                    </label>
                  </div>
                </>
              )}

              {form.saveArchive && !form.archiveIsPaid && (
                <p className="text-xs text-muted-foreground">
                  ※ 有料公開しない場合、アーカイブはあなたの記録用として非公開で保存されます。
                </p>
              )}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={creating || !form.title || livePriceError || form.price <= 0 || (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed)}
          className={`w-full h-10 sm:h-12 text-white text-sm sm:text-base gap-2 ${mode === MODE_LIVE ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              準備中...
            </>
          ) : mode === MODE_LIVE ? (
            <>
              <Radio className="w-5 h-5" />
              ライブ配信スタート
            </>
          ) : (
            <>
              <PhoneCall className="w-5 h-5" />
              ビデオ通話を開始
            </>
          )}
        </Button>
      </form>
    </div>
  );
}