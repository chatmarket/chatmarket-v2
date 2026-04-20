import React, { useState, useEffect, useRef } from "react";
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
    // 【施策3】画質制限
    quality: "720p", // デフォルト: 720p
    // ラジオモード
    startAsRadioMode: false,
    radioBackgroundFile: null,
    // Archive settings
    saveArchive: false,
    archiveIsPaid: false,
    archivePrice: 150,
    archiveConsentConfirmed: false,
    // JASRAC著作権料
    musicUsageMode: "no", // "yes" | "no"
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
    prevCallCountRef.current = null; // 待機開始時にリセット（既存申請を通知しない）
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

  // 待機中の新規通話申し込み通知（前回のカウントと比較）
  useEffect(() => {
    if (!waiting) return;
    // 初回ロード時は通知せずカウントだけ記録
    if (prevCallCountRef.current === null) {
      prevCallCountRef.current = pendingCalls.length;
      return;
    }
    if (pendingCalls.length > prevCallCountRef.current) {
      const newCalls = pendingCalls.slice(prevCallCountRef.current);
      newCalls.forEach((call) => {
        toast.success(
          <div
            onClick={() => handleAcceptCall(call)}
            className="cursor-pointer hover:opacity-80 transition-opacity"
          >
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
      // 【施策3】実効画質: 価格に応じた画質を保存
      max_bitrate_restriction: effectiveQuality,
      // ラジオモード
      is_radio_mode: form.startAsRadioMode,
      radio_background_url,
      // コスト計算起点
      live_started_at: isLiveNow ? new Date().toISOString() : null,
      cost_input_yen: 0,
      cost_output_yen: 0,
      total_viewer_minutes: 0,
      revenue_coins: 0,
      // JASRAC著作権料フラグ
      has_music_usage: form.musicUsageMode === "yes",
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
  // 【施策1】無料配信は完全禁止 - 150円以上の設定を強制
  const hasVodPlan = user?.plan === "vod" || user?.plan === "basic" || user?.plan === "standard" || user?.plan === "premium" || user?.role === "admin";

  const isCampaign = channels[0]?.campaign_allowed === true;
  const progressiveRate = channels[0]?.progressive_rate || 0.85;
  
  // 【施策2】運営手数料のダイナミック調整: 基本15%から動的に15~20%へ
  // progressiveRate が高いほど、IVS等のインフラコストが増加するため手数料アップ
  let platformFeeRate = 0.15; // デフォルト15%
  if (progressiveRate >= 0.95) {
    platformFeeRate = 0.20; // 最高還元率95%時は運営20%
  } else if (progressiveRate >= 0.90) {
    platformFeeRate = 0.18; // 高還元率90%時は運営18%
  } else if (progressiveRate >= 0.87) {
    platformFeeRate = 0.16; // 標準還元率87%時は運営16%
  }
  // ライバー還元率 = 1 - platformFeeRate
  const liveRevenueRate = 1 - platformFeeRate;
  
  // 【画質連動型】価格帯に応じた画質制限
  // SD(480p): 15〜54円/15分, HD(720p): 55〜149円/15分, FHD(1080p): 150円以上/15分
  const LIVE_MIN_COINS_PER_15MIN = 15; // 最低15円（SD画質）
  const liveMinPrice = Math.ceil((form.duration / 15) * LIVE_MIN_COINS_PER_15MIN);
  const minPrice = mode === MODE_LIVE ? liveMinPrice : Math.ceil((form.duration / 15) * 15);
  const livePriceError = mode === MODE_LIVE && form.price < liveMinPrice;

  // 価格から実効画質を導出（総価格で判定）
  const getQualityForPrice = (price) => {
    if (price >= 150) return "1080p";
    if (price >= 55)  return "720p";
    return "480p";
  };
  const effectiveQuality = getQualityForPrice(form.price);

  const qualityOptions = [
    { label: "SD 480p", value: "480p",  minPrice: 15,  desc: "低コスト・入門向け" },
    { label: "HD 720p", value: "720p",  minPrice: 55,  desc: "標準・推奨" },
    { label: "FHD 1080p", value: "1080p", minPrice: 150, desc: "高画質・プロ向け" },
  ];

  // 選択中の画質に対応した最低価格チェック
  const selectedQualityOption = qualityOptions.find(q => q.value === effectiveQuality) || qualityOptions[0];
  const price1080pError = false; // 価格連動なのでエラーはlivePriceErrorで統合

  // アーカイブ価格の自動計算
  const autoArchivePrice = Math.ceil((form.duration / 15) * (effectiveQuality === "1080p" ? 100 : effectiveQuality === "720p" ? 75 : 50));

  const qualityRestrictionWarning =
    effectiveQuality === "480p"  ? `📺 SD 480p（15〜54円/15分）— 低コスト配信` :
    effectiveQuality === "720p"  ? `📺 HD 720p（55〜149円/15分）— 標準画質` :
                                   `📺 FHD 1080p（150円以上/15分）— 高画質`;

  // 画質変更時にアーカイブ価格を自動更新
  useEffect(() => {
    if (form.saveArchive && form.archiveIsPaid) {
      setForm(f => ({ ...f, archivePrice: autoArchivePrice }));
    }
  }, [effectiveQuality, form.duration, form.saveArchive, form.archiveIsPaid]);



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
          streamQuality={effectiveQuality}
          initialRadioMode={form.startAsRadioMode}
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

            {/* ラジオモード選択 */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.startAsRadioMode}
                  onChange={(e) => setForm({ ...form, startAsRadioMode: e.target.checked })}
                  className="w-5 h-5 accent-amber-400 rounded"
                />
                <div className="flex-1">
                  <p className="font-bold text-amber-300 group-hover:text-amber-200 transition-colors">
                    📻 ラジオモードで配信開始
                  </p>
                  <p className="text-xs text-amber-200/70 mt-0.5">
                    映像を停止し、音声に特化した低帯域配信（64kbps）で開始します
                  </p>
                </div>
              </label>
              {form.startAsRadioMode && (
                <div className="space-y-3 ml-8">
                  <div className="text-xs text-amber-200/80 bg-black/20 rounded-lg p-2.5 border border-amber-500/20">
                    ✓ 配信開始時に映像が停止されます。配信中いつでも「ゲーム配信モード」に切り替え可能です。
                  </div>

                  {/* ラジオモード背景画像 */}
                  <div className="space-y-2">
                    <Label className="text-amber-300">📸 ラジオモード背景画像（任意）</Label>
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
                    <p className="text-xs text-amber-200/60">推奨: 1280×720px 以上、10MB以下</p>
                  </div>
                </div>
              )}
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

        {/* Pricing */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center gap-2">
            <Label>販売単価</Label>
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

              {/* 画質選択（価格に応じた制限あり・ラジオモードでは非表示） */}
              {!form.startAsRadioMode && (
               <>
               <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  📺 配信画質
                  <span className="text-[10px] text-muted-foreground font-normal">（価格に応じて選択可）</span>
                </Label>
                <div className="grid grid-cols-3 gap-2">
                  {qualityOptions.map((opt) => {
                    const isAvailable = form.price >= opt.minPrice;
                    const isActive = form.quality === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setForm({ ...form, quality: opt.value })}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 cursor-pointer"
                            : isAvailable
                            ? "border-border bg-secondary hover:border-primary/50 cursor-pointer"
                            : "border-border bg-secondary opacity-30 cursor-not-allowed"
                        }`}
                      >
                        <span className={`font-bold text-sm ${isActive ? "text-primary" : isAvailable ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.minPrice}円〜/15分</span>
                        {!isAvailable && <span className="text-[10px] text-destructive/70">🔒 価格不足</span>}
                        {isActive && <span className="text-[10px] text-primary font-bold">✓ 選択中</span>}
                      </button>
                    );
                  })}
                </div>
                {/* ヘルプチップ */}
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none">
                    💡 なぜ価格で画質が制限されるの？
                  </summary>
                  <p className="mt-1.5 text-muted-foreground bg-secondary/60 rounded-lg px-3 py-2 leading-relaxed">
                    世界一安価な価格設定（15円〜）を実現するため、価格帯に応じたインフラ最適化を行っています。低価格ではSD品質のサーバーを使用してコストを抑え、より多くのファンと繋がれる環境を提供しています。価格を上げることで高品質なインフラが確保され、HD・FHD配信が可能になります。
                  </p>
                </details>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  💰 販売単価（15分単位）
                  <span className="text-[10px] text-green-400 font-bold">あなたの手取り {Math.round(form.price * liveRevenueRate)}〜{Math.round(form.price * 0.95)}円</span>
                </Label>
                <p className="text-xs text-muted-foreground">ファンが支払う金額。最大{Math.round(liveRevenueRate * 100)}%があなたの報酬になります。</p>
                <Input
                  type="number"
                  min={liveMinPrice}
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
                {livePriceError ? (
                  <p className="text-xs text-destructive font-semibold">
                    ⛔ 最低{liveMinPrice}コイン必須（{form.duration}分）
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    最低: {liveMinPrice}コイン / {form.duration}分
                  </p>
                )}

                {/* セルフブランディング啓蒙メッセージ（55円以下の場合） */}
                {form.price > 0 && form.price <= 55 && !livePriceError && (
                  <div className="rounded-xl p-4 space-y-2 border"
                    style={{
                      background: "linear-gradient(135deg, rgba(168,85,247,0.08), rgba(99,102,241,0.06))",
                      borderColor: "rgba(168,85,247,0.35)",
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="text-purple-400 text-sm">💎</span>
                      <p className="text-xs font-black text-purple-300 tracking-wide">セルフブランディングのアドバイス</p>
                    </div>
                    <p className="text-xs text-purple-200/80 leading-relaxed">
                      極端な低価格設定は、あなたの素晴らしいスキルや魅力の価値を、自分自身で低く見積もってしまっていませんか？<br /><br />
                      初回のファン獲得には有効ですが、あなたの価値はもっと高いはずです。<br />
                      <span className="text-purple-300 font-bold">55円（HD）や150円（FHD）</span> といった適切な価格設定は、あなたを大切にしてくれる「質の高いファン」を惹きつける鍵となります。
                    </p>
                    <p className="text-[10px] text-purple-400/60 italic border-t border-purple-500/20 pt-2">
                      EN: Don't undersell yourself. Your talent deserves a premium audience. Consider a price that reflects your true value.
                    </p>
                  </div>
                )}

                {/* 収益シミュレーター */}
                 {form.price > 0 && !livePriceError && (
                   <RevenueSimulator 
                     price={form.price} 
                     duration={form.duration} 
                     revenueRate={liveRevenueRate}
                   />
                 )}

                {/* リアルタイム画質プラン案内 */}
                 {form.price > 0 && !livePriceError && (() => {
                   if (effectiveQuality === "480p") return (
                    <div className="rounded-lg p-3 text-xs bg-green-500/10 border border-green-500/30 space-y-0.5">
                      <p className="font-bold text-green-400">🌱 エコノミープラン：標準画質（480p）での配信となります。</p>
                      <p className="text-green-300/80">※ 初めてのファン獲得に最適！</p>
                    </div>
                  );
                  if (effectiveQuality === "720p") return (
                    <div className="rounded-lg p-3 text-xs bg-blue-500/10 border border-blue-500/30 space-y-0.5">
                      <p className="font-bold text-blue-400">⭐ スタンダードプラン：高画質（720p）での配信となります。</p>
                      <p className="text-blue-300/80">※ 一番人気の設定です。</p>
                    </div>
                  );
                  return (
                    <div className="rounded-lg p-3 text-xs bg-amber-500/10 border border-amber-500/30 space-y-0.5">
                      <p className="font-bold text-amber-400">👑 プレミアムプラン：最高画質（1080p）での配信となります。</p>
                      <p className="text-amber-300/80">※ プロフェッショナルな表現に。</p>
                    </div>
                  );
                })()}

                <div className="rounded-lg p-3 text-xs space-y-1.5 bg-secondary/60">
                  <p className="text-muted-foreground">
                    ライバー報酬: <span className="text-primary font-bold">{Math.floor(form.price * liveRevenueRate)}コイン（{Math.round(liveRevenueRate * 100)}%）</span>
                  </p>
                  <p className="text-muted-foreground">
                    運営手数料: {Math.floor(form.price * platformFeeRate)}コイン（{Math.round(platformFeeRate * 100)}%）
                  </p>
                </div>
              </div>
              </>
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
                <Label className="flex items-center gap-2">
                  💰 販売単価（15分単位）
                  <span className="text-[10px] text-green-400 font-bold">あなたの手取り {Math.round(form.price * 0.85)}〜{Math.round(form.price * 0.95)}円</span>
                </Label>
                <p className="text-xs text-muted-foreground">ファンが支払う金額。最大85%があなたの報酬になります。</p>
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

          {/* JASRAC著作権料セクション - 必須選択 */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-destructive/30">
          <div className="space-y-3">
            <Label className="text-sm font-bold">🎵 音楽の利用について</Label>
            <p className="text-xs text-muted-foreground">JASRAC包括契約に基づき著作権料を徴収します</p>

            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{ borderColor: form.musicUsageMode === "yes" ? "var(--color-primary)" : undefined, backgroundColor: form.musicUsageMode === "yes" ? "rgba(160, 84, 39, 0.1)" : undefined }}>
                <input
                  type="radio"
                  name="musicUsage"
                  value="yes"
                  checked={form.musicUsageMode === "yes"}
                  onChange={() => setForm({ ...form, musicUsageMode: "yes" })}
                  className="w-5 h-5 accent-primary"
                />
                <div>
                  <p className="font-semibold text-sm">音楽を利用する</p>
                  <p className="text-xs text-muted-foreground">歌唱・演奏・BGMなど音楽コンテンツを含みます</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-secondary/50 transition-colors" style={{ borderColor: form.musicUsageMode === "no" ? "var(--color-primary)" : undefined, backgroundColor: form.musicUsageMode === "no" ? "rgba(160, 84, 39, 0.1)" : undefined }}>
                <input
                  type="radio"
                  name="musicUsage"
                  value="no"
                  checked={form.musicUsageMode === "no"}
                  onChange={() => setForm({ ...form, musicUsageMode: "no" })}
                  className="w-5 h-5 accent-primary"
                />
                <div>
                  <p className="font-semibold text-sm">音楽を利用しない</p>
                  <p className="text-xs text-muted-foreground">音楽コンテンツは含みません</p>
                </div>
              </label>
            </div>

            {/* 著作権料詳細 */}
            {form.musicUsageMode === "yes" && (
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 space-y-3">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-purple-300">📋 著作権料について</p>
                  <p className="text-xs text-purple-200/80 leading-relaxed">
                    JASRAC包括契約に基づき、この配信の売上から<span className="font-bold text-purple-300">3%</span>が著作権料として自動的に徴収されます。
                  </p>
                  <div className="bg-purple-500/20 rounded-lg p-2.5 text-xs text-purple-200 space-y-1">
                    <p><strong>売上：</strong> ¥100の場合</p>
                    <p className="text-purple-300">→ あなたの報酬: ¥{Math.round(100 * liveRevenueRate * 0.97)}円（報酬率 {Math.round(liveRevenueRate * 97)}%）</p>
                    <p>→ 運営手数料: {Math.round(platformFeeRate * 100)}%</p>
                    <p>→ 著作権料: ¥3（3%）</p>
                  </div>
                </div>

                {/* 虚偽申告時の請求金額 */}
                <div className="bg-red-500/15 border border-red-500/40 rounded-lg p-3 space-y-1">
                  <p className="text-xs font-bold text-red-400">⚠️ 虚偽申告について</p>
                  <p className="text-xs text-red-300/90 leading-relaxed">
                    音楽を利用していないのに「利用する」とチェックした場合、または音楽を利用しているのに「利用しない」と申告した場合、実際の著作権料との差額を<span className="font-bold">別途請求</span>します。最大<span className="font-bold text-red-400">月額 ¥500,000</span>の罰金が科される場合があります。
                  </p>
                </div>

                {/* 選択が必須であることの警告 */}
                <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-orange-300">
                    音楽利用の選択は<span className="font-bold">必須</span>です。正確に申告しない場合、配信を開始することができません。
                  </p>
                </div>
              </div>
            )}
            </div>
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

              {form.saveArchive && form.archiveIsPaid && (
               <>
               <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-300 space-y-1">
               <p className="font-semibold">💾 アーカイブ販売価格（自動設定）</p>
               <p>
                 {effectiveQuality === "1080p"
                   ? `1080p高画質配信のため、販売価格は自動的に ¥${autoArchivePrice}/15分 に設定されます。`
                   : `720p標準画質のため、販売価格は ¥${autoArchivePrice}/15分 に設定可能です。`}
               </p>
               <p className="text-[10px] text-blue-400 border-t border-blue-500/30 pt-1">
                 ※ 高画質ソースの維持コストを考慮した設定です
               </p>
               </div>

               {/* 【新機能】Stripe手数料・運営利益の透明性表示 */}
               <StripeFeeProfitBreakdown 
                 price={form.price} 
                 duration={form.duration}
                 quality={effectiveQuality}
               />
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
        </div>
        );
        }