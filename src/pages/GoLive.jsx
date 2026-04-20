import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Radio, Loader2, Image, PhoneCall, Video, AlertTriangle, ExternalLink, Users, Clock, CheckCircle2, XCircle, UserCheck, Check } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";
import StreamStyleModal from "../components/live/StreamStyleModal";
import StripeFeeProfitBreakdown from "../components/live/StripeFeeProfitBreakdown";
import RevenueSimulator from "../components/live/RevenueSimulator";

const MODE_LIVE = "live";
const MODE_CALL = "call";
const STREAM_TYPE_WEBRTC = "webrtc";

export default function GoLive() {
  const navigate = useNavigate();
  const prevCallCountRef = useRef(null);
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [mode, setMode] = useState(MODE_LIVE);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [showStreamStyleModal, setShowStreamStyleModal] = useState(false);
  const queryClient = useQueryClient();
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [ivsStream, setIvsStream] = useState(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    availableTime: "",
    duration: 60,
    price: 50,
    isPaid: true,
    streamType: STREAM_TYPE_WEBRTC,
    quality: "basic",
    startAsRadioMode: true, // ラジオモード強制
    radioBackgroundFile: null,
    saveArchive: false,
    archiveIsPaid: false,
    archivePrice: 150,
    archiveConsentConfirmed: false,
    musicUsageMode: "no",
  });
  const [manualStreamKey, setManualStreamKey] = useState("");
  const [manualIngestEndpoint, setManualIngestEndpoint] = useState("");

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
    prevCallCountRef.current = null;
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

  useEffect(() => {
    if (!waiting) return;
    if (prevCallCountRef.current === null) {
      prevCallCountRef.current = pendingCalls.length;
      return;
    }
    if (pendingCalls.length > prevCallCountRef.current) {
      const newCalls = pendingCalls.slice(prevCallCountRef.current);
      newCalls.forEach((call) => {
        toast.success(
          <div onClick={() => handleAcceptCall(call)} className="cursor-pointer hover:opacity-80 transition-opacity">
            <p className="font-bold">📞 通話申し込みが届きました</p>
            <p className="text-sm">{call.caller_name || call.caller_email}</p>
            <p className="text-xs opacity-70 mt-1">クリックして通話を開始</p>
          </div>,
          { duration: 10000 }
        );
      });
    }
    prevCallCountRef.current = pendingCalls.length;
  }, [pendingCalls.length, waiting]);

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    if (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed) {
      toast.error("アーカイブを有料公開する場合、通話相手の同意確認が必要です。");
      return;
    }

    setCreating(true);

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

    let radio_background_url = "";
    if (form.radioBackgroundFile) {
      const res = await base44.integrations.Core.UploadFile({ file: form.radioBackgroundFile });
      radio_background_url = res.file_url;
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
      max_bitrate_restriction: effectiveQuality,
      is_radio_mode: form.startAsRadioMode,
      radio_background_url,
      live_started_at: isLiveNow ? new Date().toISOString() : null,
      cost_input_yen: 0,
      cost_output_yen: 0,
      total_viewer_minutes: 0,
      revenue_coins: 0,
      has_music_usage: form.musicUsageMode === "yes",
    });

    await base44.entities.Channel.update(channel.id, { is_live: true });

    setCreating(false);

    if (mode === MODE_CALL) {
      navigate(`/call/${stream.id}`);
    } else {
      setLiveStreamId(stream.id);
    }
  };

  const hasVodPlan = user?.plan === "vod" || user?.plan === "basic" || user?.plan === "standard" || user?.plan === "premium" || user?.role === "admin";
  const isCampaign = channels[0]?.campaign_allowed === true;
  const progressiveRate = channels[0]?.progressive_rate || 0.85;
  
  let platformFeeRate = 0.15;
  if (progressiveRate >= 0.95) {
    platformFeeRate = 0.20;
  } else if (progressiveRate >= 0.90) {
    platformFeeRate = 0.18;
  } else if (progressiveRate >= 0.87) {
    platformFeeRate = 0.16;
  }
  const liveRevenueRate = 1 - platformFeeRate;
  
  const LIVE_MIN_COINS_PER_15MIN = 15;
  const liveMinPrice = Math.ceil((form.duration / 15) * LIVE_MIN_COINS_PER_15MIN);
  const minPrice = mode === MODE_LIVE ? liveMinPrice : Math.ceil((form.duration / 15) * 15);
  const livePriceError = mode === MODE_LIVE && form.price < liveMinPrice;

  // AWS IVS Basic チャンネル：品質固定
  const effectiveQuality = "basic"; // 常に 640x360 30fps 600kbps

  // Basic チャンネル専用（他の選択肢なし）
  const qualityOptions = [
    { label: "Basic チャンネル (640x360 30fps)", value: "basic", minPrice: 15, desc: "AWS IVS Basic 準拠" },
  ];

  const selectedQualityOption = qualityOptions[0];
  const autoArchivePrice = Math.ceil((form.duration / 15) * 50); // Basic = 50円/15分固定

  useEffect(() => {
    if (form.saveArchive && form.archiveIsPaid) {
      setForm(f => ({ ...f, archivePrice: autoArchivePrice }));
    }
  }, [effectiveQuality, form.duration, form.saveArchive, form.archiveIsPaid]);

  // ラジオモード時は 50 コイン/60分 固定（Basic チャンネル仕様）
  useEffect(() => {
    if (form.startAsRadioMode) {
      setForm(f => ({ ...f, price: 50, quality: "basic" }));
    }
  }, [form.startAsRadioMode]);

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
          ivsStreamKey={manualStreamKey || ivsStream?.streamKey}
          ivsIngestEndpoint={manualIngestEndpoint || ivsStream?.ingestEndpoint}
          onEnd={() => navigate("/")}
          streamQuality={effectiveQuality}
          initialRadioMode={form.startAsRadioMode}
        />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold">配信・通話を開始</h1>
      </div>

      {showStreamStyleModal && (
        <StreamStyleModal
          onSelect={(style) => {
            setForm((f) => ({ ...f, streamType: STREAM_TYPE_WEBRTC }));
            setShowStreamStyleModal(false);
          }}
          onClose={() => setShowStreamStyleModal(false)}
        />
      )}

      {/* ラジオモード固定 */}
      {!mode && setMode(MODE_LIVE)}



      {/* === AWS IVS 手動認証（必須） ===*/}
      {mode === MODE_LIVE && (
        <div className="space-y-4 bg-green-500/10 rounded-2xl p-6 border-2 border-green-500/60 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-lg">🔑</span>
            </div>
            <div className="flex-1">
              <p className="font-black text-green-400 text-sm">AWS IVS ストリーム情報（手動入力）</p>
              <p className="text-xs text-green-300/80 mt-0.5">AWSコンソール → IVS → チャンネル詳細から、以下をコピーしてください</p>
            </div>
          </div>

          <div className="space-y-3 bg-black/20 rounded-xl p-4">
            <div className="space-y-1">
              <label className="block text-xs font-bold text-green-300 uppercase tracking-widest">Ingest Endpoint</label>
              <input
                type="text"
                value={manualIngestEndpoint}
                onChange={(e) => setManualIngestEndpoint(e.target.value)}
                placeholder="例: rtmps://a1b2c3d4.ivs.ap-northeast-1.amazonaws.com:443/app/"
                className="w-full bg-secondary border border-green-500/40 rounded-lg px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-green-400"
                autoComplete="off"
                spellCheck="false"
              />
              <p className="text-[10px] text-muted-foreground">AWS IVS チャンネル詳細の「Server」欄をコピー</p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-green-300 uppercase tracking-widest">Stream Key</label>
              <input
                type="text"
                value={manualStreamKey}
                onChange={(e) => setManualStreamKey(e.target.value)}
                placeholder="例: arn:aws:ivs:ap-northeast-1:123456789012:stream-key/abcDefGhIjK"
                className="w-full bg-secondary border border-green-500/40 rounded-lg px-3 py-2.5 text-xs font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-green-400"
                autoComplete="off"
                spellCheck="false"
              />
              <p className="text-[10px] text-muted-foreground">AWS IVS チャンネル詳細の「Key」欄をコピー</p>
            </div>
          </div>

          {manualIngestEndpoint && manualStreamKey && (
            <div className="bg-green-500/20 border border-green-400/60 rounded-lg px-4 py-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
              <span className="text-xs font-bold text-green-300">✅ 認証情報が入力されました</span>
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleStart} className="space-y-4 sm:space-y-6 pb-20">
        {/* ラジオモード情報 */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📻</span>
            <h3 className="font-bold text-amber-300">ラジオモード配信</h3>
          </div>
          <p className="text-xs text-amber-200/80">
            静止画＋音声のみ。AWS IVS Basic チャンネル（640×360 30fps 600kbps）で安定配信します。
          </p>
          <div className="space-y-2">
            <Label className="text-amber-300 text-xs">背景画像（任意）</Label>
            <label className="flex flex-col items-center justify-center h-20 border-2 border-dashed border-amber-500/40 rounded-lg cursor-pointer hover:border-amber-500/60 bg-black/20 transition-colors">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => setForm({ ...form, radioBackgroundFile: e.target.files[0] })}
              />
              {form.radioBackgroundFile ? (
                <div className="text-center">
                  <Image className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                  <p className="text-xs text-amber-300">{form.radioBackgroundFile.name}</p>
                </div>
              ) : (
                <div className="text-center">
                  <Image className="w-5 h-5 text-amber-500/50 mx-auto mb-1" />
                  <p className="text-xs text-amber-300/70">プロフ画像など背景を選択</p>
                </div>
              )}
            </label>
          </div>
        </div>

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
          <div className="flex items-center justify-between gap-3">
            <Label>予定日時（任意）</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.checked ? "" : form.scheduled_at })}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm text-primary font-semibold">即配信</span>
            </label>
          </div>
          <Input
            type="datetime-local"
            value={form.scheduled_at}
            onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
            disabled={!form.scheduled_at}
            className="bg-secondary border-0 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="予定日時を指定する場合はここに入力"
          />
          {!form.scheduled_at && (
            <p className="text-xs text-primary font-semibold">⚡ 即配信モード：チェック外すと予定日時を設定できます</p>
          )}
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

        {/* === 固定価格（ラジオモード専用） === */}
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💰</span>
              <Label className="text-sm font-bold">視聴価格（固定）</Label>
            </div>
            <div className="bg-secondary rounded-lg p-4 border border-green-500/20">
              <p className="text-2xl font-black text-green-400">50 コイン</p>
              <p className="text-xs text-muted-foreground mt-2">ラジオモード配信の固定価格。60分間の連続視聴が可能です。</p>
            </div>
          </div>
        </div>





        {/* === SUBMIT BUTTON === */}
        <Button
          type="submit"
          disabled={creating || !form.title || (mode === MODE_LIVE && !form.startAsRadioMode && livePriceError) || form.price <= 0 || (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed)}
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