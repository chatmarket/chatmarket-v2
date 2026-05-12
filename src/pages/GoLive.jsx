import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Loader2, Image, CheckCircle2, Copy, Smartphone, ArrowRight, Zap } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";
import StreamKeySecurityDisplay from "../components/live/StreamKeySecurityDisplay";
import TroubleshootingGuide from "../components/live/TroubleshootingGuide";
import StreamSetupCards from "../components/live/StreamSetupCards";
import ObsQuickSetupGuide from "../components/live/ObsQuickSetupGuide";
import BroadcasterSetupGuide from "../components/broadcast/BroadcasterSetupGuide";
import { RefreshCw, ShieldCheck } from "lucide-react";

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
  const [refreshingKey, setRefreshingKey] = useState(false);
  const [keyFetchedAt, setKeyFetchedAt] = useState(null);

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

  // 一般ユーザー用の判定（adminは別ルートで処理）
  const canUseLiveStream = isTestAccount || !!ppvSubscription || !!campaignGrantee;
  const planCheckError = ppvError || campaignError;

  useEffect(() => {
    if (!modeInitialized && user) {
      // adminは即座にLIVEモードへ（PPVチェック待ち不要）
      if (user.role === "admin") {
        setMode(MODE_LIVE);
        setModeInitialized(true);
        return;
      }
      // 一般ユーザーはPPV/キャンペーンのロード完了を待つ
      if (!ppvLoading && !campaignLoading) {
        if (canUseLiveStream) setMode(MODE_LIVE);
        setModeInitialized(true);
      }
    }
  }, [user, ppvLoading, campaignLoading, canUseLiveStream, modeInitialized]);

  // チャンネルに既存の固定キーがあればフォーム表示時に自動ロード
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

  // AWS から最新のストリームキーを取得・再生成する
  const handleRefreshKey = async () => {
    // Channelエンティティの固定キーからARNを取得
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

      // Channelエンティティにも最新キーを保存
      if (channel?.id) {
        await base44.entities.Channel.update(channel.id, {
          ivs_stream_key: data.streamKey,
          ivs_ingest_endpoint: data.ingestEndpoint,
        });
      }

      toast.success(data.regenerated
        ? "🔑 新しいストリームキーを生成しました！OBSに貼り直してください"
        : "✅ ストリームキーを最新情報に更新しました");
    } catch (err) {
      toast.error("キー更新失敗: " + err.message);
    } finally {
      setRefreshingKey(false);
    }
  };

  const handleForceReprovision = async () => {
    if (!liveStreamId) {
      toast.error("配信枠を作成してください");
      return;
    }
    if (!confirm("⚠️ IVSチャンネルを強制リセットします。既存のキーは無効になります。続行しますか？")) {
      return;
    }
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

      toast.success("🔄 IVSチャンネルを強制リセットしました！新しいキーが生成されています。");
    } catch (err) {
      toast.error("強制リセット失敗: " + err.message);
    } finally {
      setRefreshingKey(false);
    }
  };

  // 完全RTMPS URL（スマホアプリ用）
  const fullRtmpsUrl = manualIngestEndpoint && manualStreamKey
    ? `rtmps://${manualIngestEndpoint}:443/app/${manualStreamKey}`
    : "";

  // ライブ配信開始ボタン処理
  const handleStartLive = () => {
    if (!user) {
      base44.auth.redirectToLogin();
      return;
    }
    // 管理者は無条件で進める（クエリ不要）
    if (isAdmin) {
      setMode(MODE_LIVE);
      return;
    }
    // ロード中はボタンを無効化しているので到達しないが念のため
    if (ppvLoading || campaignLoading) return;
    // 通信エラー時はplan-selectに飛ばさずトースト案内
    if (planCheckError) {
      toast.error("通信エラーが発生しました。画面を再読み込みしてください。");
      return;
    }
    if (canUseLiveStream) {
      setMode(MODE_LIVE);
    } else {
      navigate("/plan-select");
    }
  };

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    // 整数バリデーション
    const priceInt = Math.floor(Number(form.price));
    if (priceInt > 0 && priceInt < 15) {
      toast.error("視聴価格は最低15コイン（SD 480p）以上で設定してください");
      return;
    }
    if (Number(form.price) !== priceInt) {
      toast.error("視聴価格は整数で入力してください（小数点不可）");
      return;
    }
    setCreating(true);

    try {
      let channel = channels[0];
      if (!channel) {
        try {
          channel = await base44.entities.Channel.create({ 
            name: user.full_name + "のチャンネル", 
            owner_email: user.email 
          });
        } catch (err) {
          toast.error('チャンネル作成に失敗しました。');
          setCreating(false);
          return;
        }
      }

      // ステップ1: 配信者固有のストリームキー初期化（初回のみ）
      let channelArn = channel.ivs_channel_arn;
      let streamKey = channel.ivs_stream_key;
      let ingestEndpoint = channel.ivs_ingest_endpoint;
      let playbackUrl = channel.ivs_playback_url;

      if (!streamKey) {
        // 初回: IVSチャンネル＋ストリームキーを生成
        const provisionRes = await base44.functions.invoke('provisionChannelStreamKey', { 
          channel_id: channel.id 
        });
        
        if (!provisionRes?.data?.success) {
          toast.error(provisionRes?.data?.error || 'ストリームキーの初期化に失敗しました');
          setCreating(false);
          return;
        }

        channelArn = provisionRes.data.channel_arn;
        streamKey = provisionRes.data.stream_key;
        ingestEndpoint = provisionRes.data.ingest_endpoint;
        playbackUrl = provisionRes.data.playback_url;

        toast.success("🎉 あなたの配信キーを作成しました。生涯この1つのキーで配信できます。");
      }

      setIvsStream({ 
        streamKey, 
        ingestEndpoint, 
        playbackUrl, 
        channelArn 
      });
      setManualStreamKey(streamKey);
      setManualIngestEndpoint(ingestEndpoint);
      setKeyFetchedAt(new Date());

      // ステップ2: サムネイルアップロード
      let thumbnail_url = "";
      if (thumbnailFile) {
        try {
          const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
          thumbnail_url = res.file_url;
          setThumbnailUrl(thumbnail_url);
        } catch (err) {}
      }

      // ステップ3: 配信フレーム作成
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
    } catch (err) {
      console.error('配信作成エラー:', err);
      toast.error('配信作成に失敗しました: ' + err.message);
      setCreating(false);
    }
  };

  // モード選択画面
  if (mode === MODE_SELECT) {
    const isChecking = !isAdmin && (ppvLoading || campaignLoading || !user);
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-6">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-black text-white mb-1">配信・通話モードを選択</h1>
          <p className="text-muted-foreground text-sm">用途に合わせて選んでください</p>
        </div>

        {/* 通信エラー案内 */}
        {planCheckError && (
          <div className="w-full bg-red-500/10 border border-red-500/40 rounded-xl px-4 py-3 text-center">
            <p className="text-sm text-red-400 font-bold">⚠️ 加入状況の確認中にエラーが発生しました</p>
            <button onClick={() => window.location.reload()} className="mt-2 text-xs text-red-300 underline underline-offset-2">
              画面を再読み込みしてください
            </button>
          </div>
        )}

        <div className="w-full grid grid-cols-1 gap-4">
          <button
            onClick={handleStartLive}
            disabled={isChecking || !!planCheckError}
            className="flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-border bg-card hover:border-red-500/70 hover:bg-red-500/5 transition-all group text-left disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center group-hover:bg-red-500/25 transition-colors">
              {isChecking ? <Loader2 className="w-8 h-8 text-red-400 animate-spin" /> : <Radio className="w-8 h-8 text-red-400" />}
            </div>
            <div>
              <p className="font-black text-white text-lg mb-1">1対多 ライブ配信</p>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {isChecking ? "プラン加入状況を確認中..." : "複数の視聴者に向けてリアルタイムで配信。エールコインや視聴料を得る事が出来ます。"}
              </p>
            </div>
            <span className="mt-auto w-full py-2.5 rounded-xl bg-red-500 text-white text-sm font-black text-center group-hover:bg-red-600 transition-colors flex items-center justify-center gap-2">
              {isChecking && <Loader2 className="w-4 h-4 animate-spin" />}
              {isChecking ? "確認中..." : "ライブ配信を開始"}
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



  // ── 配信セットアップフォーム ──
  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10 overflow-y-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6 lg:mb-8">
        <button onClick={() => setMode(MODE_SELECT)} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 mr-1">← 戻る</button>
        <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-5 h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-xl lg:text-3xl font-black text-white">ライブ配信セットアップ</h1>
        <span className="ml-auto text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-3 py-1 rounded-full">1対多 PPV配信</span>
      </div>

      {/* ── PRISM Live Studio 専用セクション（キー取得後） ── */}
      {liveStreamId && (
        <div className="mb-8 space-y-4">
          {/* 上部: キー情報 */}
          <div className="bg-gradient-to-br from-purple-950 to-purple-900 border-2 border-purple-500/60 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center">
                  <span className="text-xl">✨</span>
                </div>
                <div>
                  <p className="text-xs font-black text-purple-300 uppercase tracking-widest">Prism Live Studio 用</p>
                  <h2 className="text-lg font-black text-white">配信3ステップ — コピペで準備完了</h2>
                  {keyFetchedAt && (
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {channels[0]?.ivs_stream_key ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/15 border border-primary/30 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse inline-block" />
                          🔒 あなた専用の固定キー（生涯有効）
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-green-400 bg-green-500/15 border border-green-500/30 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
                          AWS取得済み {keyFetchedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefreshKey}
                  disabled={refreshingKey}
                  className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 rounded-xl text-xs font-black transition-colors disabled:opacity-50 shrink-0"
                >
                  {refreshingKey
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />更新中...</>
                    : <><RefreshCw className="w-3.5 h-3.5" />🔑 鍵を再取得</>}
                </button>
                <button
                  onClick={handleForceReprovision}
                  disabled={refreshingKey}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 rounded-xl text-xs font-black transition-colors disabled:opacity-50 shrink-0"
                  title="チャンネル全体をリセット（最終手段）"
                >
                  {refreshingKey
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /></>
                    : <><Zap className="w-3.5 h-3.5" />⚡ 強制リセット</>}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {[
                { num: "①", label: "配信先（Server URL）", value: `rtmps://${manualIngestEndpoint}:443/app/`, msg: "配信先をコピーしました" },
                { num: "②", label: "ストリームキー（Stream Key）", value: manualStreamKey, msg: "ストリームキーをコピーしました" },
                { num: "③", label: "チャット表示用URL（Web Overlay）", value: `${window.location.origin}/overlay.html?id=${liveStreamId}`, msg: "チャットURLをコピーしました" },
              ].map(({ num, label, value, msg }) => (
                <div key={num} className="bg-background/50 border border-purple-500/30 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-purple-500 text-white font-black text-xs flex items-center justify-center shrink-0">{num}</span>
                    <p className="font-bold text-white text-sm">{label}</p>
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="text" readOnly value={value}
                      className="flex-1 bg-zinc-950 border border-purple-500/40 rounded-lg px-3 py-2 text-xs text-zinc-300 font-mono truncate" />
                    <button onClick={() => { navigator.clipboard.writeText(value); toast.success(msg); }}
                      className="shrink-0 px-3 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg text-xs font-bold transition-colors">
                      Copy
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-purple-300/70 mt-3 pl-1">💬 Prism の「Web Overlay」に③のURLを貼り付けるとリアルタイムチャット・投げ銭通知が表示されます</p>
          </div>

          {/* 下部: モバイル縦型プレビュー＆URLハイライト */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* プレビュー（左・モバイル縦型） */}
            <div className="bg-gradient-to-br from-blue-950 to-blue-900 border-2 border-blue-500/60 rounded-2xl overflow-hidden shadow-lg">
              <div className="px-5 py-4 border-b border-blue-700/50">
                <p className="text-xs font-black text-blue-300 uppercase tracking-widest">📱 モバイル縦型プレビュー（9:16）</p>
                <p className="text-xs text-blue-300/70 mt-1">PRISMで表示される実際のレイアウト</p>
              </div>
              <div className="p-4 bg-black/30 flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
                {/* モバイル枠 */}
                <div className="relative bg-black rounded-2xl border-4 border-blue-400 overflow-hidden shadow-2xl" style={{ width: "280px", aspectRatio: "9/16" }}>
                  {/* 透過背景 */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div style={{ backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,.1) 10px, rgba(255,255,255,.1) 20px)", height: "100%" }} />
                  </div>
                  
                  {/* チャット表示エリア（下半分） */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2 p-3 flex flex-col-reverse gap-2 overflow-hidden">
                    <div className="text-[10px] text-green-400 font-bold whitespace-nowrap text-shadow">
                      <span className="text-green-400">配信者:</span> <span className="text-white">こんにちは！</span>
                    </div>
                    <div className="text-[10px] text-green-400 font-bold whitespace-nowrap text-shadow">
                      <span className="text-green-400">視聴者A:</span> <span className="text-white">応援してます</span>
                    </div>
                    <div className="text-[10px] text-blue-300 font-bold py-1.5 px-2 rounded bg-amber-500/20 border border-amber-500/40 text-center whitespace-nowrap">
                      ✨ 視聴者B から 500 コイン!
                    </div>
                  </div>
                  
                  {/* PRISM配信エリア表示 */}
                  <div className="absolute top-2 left-0 right-0 text-center text-[8px] text-blue-300/60">
                    PRISM Web Overlay
                  </div>
                </div>
              </div>
            </div>

            {/* URL強調セクション（右） */}
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-green-950 to-green-900 border-2 border-green-500/60 rounded-2xl p-5 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">🎯</span>
                  <p className="font-black text-white">③ Web Overlay URLをコピー</p>
                </div>
                <p className="text-xs text-green-200 mb-4 leading-relaxed">
                  このURLを「<strong>PRISMの Web Overlay 欄</strong>」に貼り付けるだけで、リアルタイムチャット・投げ銭通知がスマホ画面に表示されます。
                </p>
                
                {/* URLボックス */}
                <div className="bg-black/50 border border-green-500/40 rounded-xl p-4 space-y-2 mb-3">
                  <p className="text-[10px] text-green-300/70 font-bold uppercase tracking-widest">完全URL（コピー対象）</p>
                  <div className="flex gap-2 items-stretch">
                    <input 
                      type="text" 
                      readOnly 
                      value={`${window.location.origin}/overlay.html?id=${liveStreamId}`}
                      className="flex-1 bg-zinc-950 border border-green-500/30 rounded-lg px-3 py-2.5 text-xs text-green-300 font-mono break-all leading-tight overflow-hidden"
                    />
                  </div>
                </div>

                {/* メインCTA */}
                <button 
                  onClick={() => { 
                    navigator.clipboard.writeText(`${window.location.origin}/overlay.html?id=${liveStreamId}`);
                    toast.success("✅ Web Overlay URLをコピーしました！\nPRISMに貼り付けてください");
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-black font-black text-sm rounded-xl transition-all shadow-lg shadow-green-500/30 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  URLをコピー ＆ PRISMに貼る
                </button>
              </div>

              {/* 手順メモ */}
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-4">
                <p className="text-xs font-bold text-blue-300 mb-2">手順：</p>
                <ol className="space-y-1.5 text-xs text-blue-200 list-decimal list-inside">
                  <li>上のボタンでURLをコピー</li>
                  <li>PRISM を開く</li>
                  <li>設定 → <strong>Web Overlay</strong></li>
                  <li>URLを貼り付け → 完了 ✅</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PC向け2カラムレイアウト ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">

        {/* ══ 左カラム: 配信設定フォーム ══ */}
        <div className="space-y-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-red-500 rounded-full" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">配信設定</h2>
          </div>



          {/* 🚀 推奨設定ガイド（超低遅延） */}
          <div className="bg-gradient-to-r from-cyan-950 to-blue-950 border-2 border-cyan-500/60 rounded-2xl p-4 shadow-lg">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="text-xs font-black text-cyan-300 uppercase tracking-widest">超低遅延設定（推奨）</p>
                <p className="text-white font-black text-sm">10秒以下のリアルタイム配信</p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs text-cyan-100/80">
              <div className="bg-black/30 rounded-lg p-3 space-y-1">
                <p className="font-bold text-cyan-300">🎬 OBS Studio</p>
                <p>• ビットレート: 2500-4000 Kbps</p>
                <p>• キーフレーム: <span className="font-bold text-cyan-400">2秒固定</span></p>
                <p>• プロファイル: Main / High</p>
              </div>
              <div className="bg-black/30 rounded-lg p-3 space-y-1">
                <p className="font-bold text-cyan-300">📱 Prism Live Studio</p>
                <p>• ビットレート: 2000-3500 Kbps</p>
                <p>• キーフレーム: <span className="font-bold text-cyan-400">2秒固定</span></p>
                <p>• 網環境: WiFi推奨</p>
              </div>
            </div>
            <p className="text-[10px] text-cyan-300/60 mt-2 pl-1">💡 IVS LOW遅延モード有効 | 推奨上り速度: 5Mbps以上</p>
          </div>

          {/* OBS/PRISM詳細設定ガイド */}
          <BroadcasterSetupGuide />

          {/* PC/スマホ配信ツール（フォーム前） */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-zinc-800">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">配信アプリを選択</p>
            </div>
            <div className="p-4">
              <StreamSetupCards
                user={user}
                streamKey={manualStreamKey}
                ingestEndpoint={manualIngestEndpoint}
                fullRtmpsUrl={fullRtmpsUrl}
              />
            </div>
          </div>

          <form onSubmit={handleStart} className="space-y-4 pb-8">

            {/* サムネイル */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">サムネイル画像</Label>
              <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-zinc-700 rounded-xl cursor-pointer hover:border-primary/60 transition-colors bg-zinc-900/60 hover:bg-zinc-900">
                <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files[0])} />
                {thumbnailFile ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Image className="w-5 h-5" />
                    <span className="text-sm font-medium">{thumbnailFile.name}</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <Image className="w-6 h-6 text-zinc-500 mx-auto mb-1" />
                    <p className="text-xs text-zinc-500">クリックして選択（推奨: 1280×720px）</p>
                  </div>
                )}
              </label>
            </div>

            {/* タイトル */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-red-400 uppercase tracking-widest">配信タイトル *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="配信タイトルを入力" required
                className="bg-zinc-800 border border-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 text-white placeholder:text-zinc-500 h-11" />
            </div>

            {/* 説明 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">説明</Label>
              <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="配信の説明・内容を入力"
                className="bg-zinc-800 border border-zinc-600 focus:border-zinc-400 text-white placeholder:text-zinc-500 resize-none" rows={3} />
            </div>

            {/* 予定日時 + 配信時間（横並び） */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">配信日時</Label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" checked={!form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.checked ? "" : new Date().toISOString().slice(0, 16) })}
                      className="w-3.5 h-3.5 accent-primary rounded" />
                    <span className="text-xs text-primary font-bold">即配信</span>
                  </label>
                </div>
                {form.scheduled_at ? (
                  <Input type="datetime-local" value={form.scheduled_at}
                    onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                    className="bg-zinc-800 border border-zinc-600 text-white h-11" />
                ) : (
                  <div className="h-11 bg-zinc-800/40 border border-zinc-700 rounded-md flex items-center px-3">
                    <span className="text-xs text-primary font-bold">▶ 今すぐ配信</span>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-zinc-400 uppercase tracking-widest">配信予定時間</Label>
                <select value={form.availableTime} onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
                  className="w-full h-11 rounded-md bg-zinc-800 border border-zinc-600 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-400">
                  <option value="">未定</option>
                  <option value="30分">30分</option>
                  <option value="1時間">1時間</option>
                  <option value="1時間30分">1時間30分</option>
                  <option value="2時間">2時間（最大）</option>
                </select>
              </div>
            </div>

            {/* 価格 */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-red-400 uppercase tracking-widest">視聴価格（コイン）* <span className="text-zinc-500 font-normal normal-case">（整数・最低15コイン）</span></Label>
              <Input
                type="number"
                min={15}
                step={1}
                value={form.price}
                onChange={(e) => {
                  const raw = Math.floor(Number(e.target.value));
                  setForm({ ...form, price: isNaN(raw) || raw < 0 ? 0 : raw });
                }}
                required
                className="bg-zinc-800 border border-zinc-600 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 text-white h-11"
              />
              {form.price > 0 && form.price < 15 && (
                <p className="text-xs text-red-400 font-bold">⚠️ 最低15コイン以上で設定してください（SD 480p）</p>
              )}
              {(() => {
                const p = form.price;
                const activeQuality = p >= 150 ? "FHD 1080p" : p >= 55 ? "HD 720p" : "SD 480p";
                return (
                  <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 space-y-2 mt-1">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">📊 価格 → 画質 自動決定</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {[
                        { quality: "SD 480p", minCoins: 15, maxCoins: 54, color: "zinc" },
                        { quality: "HD 720p", minCoins: 55, maxCoins: 149, color: "blue" },
                        { quality: "FHD 1080p", minCoins: 150, maxCoins: null, color: "primary" },
                      ].map(({ quality, minCoins, maxCoins, color }) => {
                        const isActive = quality === activeQuality;
                        const activeClasses = color === "primary" ? "bg-primary text-primary-foreground ring-2 ring-primary/50" : color === "blue" ? "bg-blue-600 text-white ring-2 ring-blue-500/50" : "bg-zinc-600 text-white ring-2 ring-zinc-500/50";
                        return (
                          <div key={quality} className={`rounded-lg p-2 text-center border transition-all ${isActive ? `${activeClasses} border-transparent` : "border-zinc-700 bg-zinc-800/40"}`}>
                            <p className={`text-[10px] font-black ${isActive ? "" : "text-zinc-400"}`}>{quality}</p>
                            <p className={`text-[9px] mt-0.5 ${isActive ? "opacity-80" : "text-zinc-500"}`}>{maxCoins ? `${minCoins}〜${maxCoins}` : `${minCoins}+`}コイン</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* アーカイブVOD販売設定 */}
            <div className="space-y-2 border rounded-2xl p-4 bg-blue-500/5 border-blue-500/30">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-blue-300 flex items-center gap-2">
                  🎬 配信終了後にアーカイブ販売する
                </label>
                <button type="button"
                  onClick={() => setArchiveVodEnabled((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${archiveVodEnabled ? "bg-blue-500" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${archiveVodEnabled ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              <p className="text-xs text-zinc-400">
                {archiveVodEnabled
                  ? `✅ 配信終了後、自動的に¥${parseInt(form.price) || 0}コインで販売開始されます`
                  : "配信終了後はアーカイブを非販売にします（後からマイチャンネルで変更可）"}
              </p>
            </div>

            {/* チケット販売設定 */}
            <div className={`space-y-3 border rounded-2xl p-4 ${canUseLiveStream && ppvSubscription ? "bg-yellow-500/5 border-yellow-500/30" : "bg-zinc-900/40 border-zinc-700/50 opacity-60"}`}>
              <div className="flex items-center justify-between">
                <label className={`text-sm font-bold flex items-center gap-2 ${canUseLiveStream && ppvSubscription ? "text-yellow-400" : "text-zinc-500"}`}>
                  🎫 チケット販売（PPVプラン限定）
                </label>
                <button type="button" disabled={!canUseLiveStream || !ppvSubscription}
                  onClick={() => setTicketEnabled((v) => !v)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${ticketEnabled && ppvSubscription ? "bg-yellow-500" : "bg-zinc-700"}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${ticketEnabled && ppvSubscription ? "left-6" : "left-0.5"}`} />
                </button>
              </div>
              {ticketEnabled && (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">配信時間（15分単位・最大2時間）</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {TICKET_DURATIONS.map((m) => (
                        <button key={m} type="button"
                          onClick={() => { setTicketDurationMinutes(m); setTicketPriceYen(Math.ceil((m / 15) * 150)); }}
                          className={`rounded-lg py-1.5 text-xs font-bold transition-all ${ticketDurationMinutes === m ? "bg-yellow-500 text-black" : "bg-zinc-800 hover:bg-yellow-500/20 text-zinc-300"}`}>
                          {m}分
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">チケット価格（最低 ¥{minTicketPrice}）</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min={minTicketPrice} step={1} value={ticketPriceYen}
                        onChange={(e) => setTicketPriceYen(Math.max(minTicketPrice, Math.floor(Number(e.target.value)) || minTicketPrice))}
                        className="flex-1 rounded-lg bg-zinc-800 border border-zinc-600 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-yellow-500/50" />
                      <span className="text-sm text-zinc-400">円</span>
                    </div>
                    <p className="text-[10px] text-yellow-400">配信者受取: <span className="font-bold">¥{Math.floor(ticketPriceYen * 0.85)}</span>（85%）</p>
                  </div>
                </div>
              )}
            </div>

            {/* 送信ボタン */}
            <Button type="submit" disabled={creating || !form.title || (Number(form.price) > 0 && Math.floor(Number(form.price)) < 15)} className="w-full h-12 bg-red-500 hover:bg-red-600 text-white font-black text-base gap-2 shadow-lg shadow-red-500/20">
              {creating ? (
                <><Loader2 className="w-5 h-5 animate-spin" />配信枠を準備中...</>
              ) : (
                <><Radio className="w-5 h-5" />ストリーミングキー取得</>
              )}
            </Button>
          </form>
        </div>

        {/* ══ 右カラム: 配信ツール・ヘルプ ══ */}
        <div className="space-y-5 lg:sticky lg:top-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-primary rounded-full" />
            <h2 className="text-base font-black text-white uppercase tracking-wider">配信ツール＆ヘルプ</h2>
          </div>

          {/* 配信マニュアルへのバナー */}
          <a href="/streaming-manual" className="block group">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30 hover:border-primary/60 transition-all p-5 hover:shadow-lg hover:shadow-primary/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">📘 配信マニュアル</p>
                  <p className="text-sm font-black text-white">OBS・Prism Live Studio の詳しい使い方</p>
                  <p className="text-xs text-zinc-400 mt-1">手順・接続方法・よくあるトラブルをカバー</p>
                </div>
                <ArrowRight className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </a>

          {/* OBS/PRISM 簡潔セットアップガイド（配信枠作成後） */}
          {liveStreamId && manualStreamKey && (
            <ObsQuickSetupGuide
              streamKey={manualStreamKey}
              ingestEndpoint={manualIngestEndpoint}
              streamId={liveStreamId}
            />
          )}

          {/* よくあるトラブル */}
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="px-4 pt-4 pb-2 border-b border-zinc-800">
              <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">⚡ よくあるトラブル</p>
            </div>
            <div className="p-4">
              <TroubleshootingGuide />
            </div>
          </div>

          {/* 配信手順メモ */}
          <div className="bg-zinc-900/60 border border-zinc-700/50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-3">🚀 配信の流れ</p>
            {[
              "① 左側のフォームに配信情報を入力",
              "② 「配信スタート」でキーを取得",
              "③ OBS / Prism にキーをコピペ",
              "④ 配信アプリで「配信開始」を押す",
              "⑤ ChatMarket でON AIRを確認！",
            ].map((step) => (
              <div key={step} className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-primary mt-1.5 shrink-0" />
                <p className="text-xs text-zinc-400">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}