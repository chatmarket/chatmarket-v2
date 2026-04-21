import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Loader2, Image, PhoneCall, CheckCircle2, Users, Clock, Video } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";

const MODE_SELECT = "select";
const MODE_LIVE = "live";
const MODE_CALL = "call";

export default function GoLive() {
  const navigate = useNavigate();
  const prevCallCountRef = useRef(null);
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(MODE_SELECT);
  const [creating, setCreating] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const queryClient = useQueryClient();
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
    price: 150,
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) {
        base44.auth.me().then(setUser).catch(() => {});
      }
      // 選択画面は未ログインでも表示し、アクション時にリダイレクト
    });
  }, []);

  const requireAuth = (fn) => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      fn();
    });
  };

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

  const handleAcceptCall = (call) => navigate(`/call/${call.id}`);

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
      pendingCalls.slice(prevCallCountRef.current).forEach((call) => {
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

    setCreating(true);

    // IVS チャンネル作成（バックエンド）
    const ivsRes = await base44.functions.invoke('createLiveStream', { isArchiveSaved: false });
    if (!ivsRes?.data?.streamId) {
      toast.error('配信枠の作成に失敗しました。');
      setCreating(false);
      return;
    }
    const ivsData = ivsRes.data;
    setIvsStream(ivsData);

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
      setThumbnailUrl(thumbnail_url);
    }

    // 価格から画質を自動決定
    const getQualityFromPrice = (price) => {
      if (price === 0) return "1080p"; // 無料は最高画質
      if (price >= 150) return "1080p"; // FHD
      if (price >= 55) return "720p";   // HD
      return "480p";                    // SD
    };
    const autoQuality = getQualityFromPrice(form.price);
    console.log(`[GoLive] Price: ${form.price}, Auto Quality: ${autoQuality}`);

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
      price: form.price,
      viewer_count: 0,
      stream_type: "webrtc",
      ivs_playback_url: ivsData.playbackUrl || "",
      max_bitrate_restriction: autoQuality,
      live_started_at: isLiveNow ? new Date().toISOString() : null,
      cost_input_yen: 0,
      cost_output_yen: 0,
      total_viewer_minutes: 0,
      revenue_coins: 0,
    });

    await base44.entities.Channel.update(channel.id, { is_live: true });

    setCreating(false);
    // Base44エンティティのIDを使う（IVS ARNではない）
    setLiveStreamId(newStream.id);
  };

  // モード選択画面
  if (mode === MODE_SELECT) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 flex flex-col items-center gap-6">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-black text-white mb-1">配信・通話モードを選択</h1>
          <p className="text-muted-foreground text-sm">用途に合わせて選んでください</p>
        </div>
        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 1対多ライブ配信 */}
          <button
            onClick={() => requireAuth(() => setMode(MODE_LIVE))}
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

          {/* 1対1ビデオ通話 */}
          <button
            onClick={() => requireAuth(() => navigate("/call-slots"))}
            className="flex flex-col items-center gap-4 p-7 rounded-2xl border-2 border-border bg-card hover:border-primary/70 hover:bg-primary/5 transition-all group text-left"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
              <Video className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="font-black text-white text-lg mb-1">1対1 ビデオ通話</p>
              <p className="text-muted-foreground text-sm leading-relaxed">ファンと1対1でプライベートな通話。通話スロットの管理や着信待機ができます。</p>
            </div>
            <span className="mt-auto w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-black text-center group-hover:bg-primary/90 transition-colors">
              通話管理ページへ
            </span>
          </button>
        </div>
      </div>
    );
  }

  // 配信中画面
  if (liveStreamId) {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
          <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
          </div>
          <h1 className="text-lg sm:text-2xl font-bold">配信中</h1>
        </div>
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

  return (
    <div className="max-w-2xl mx-auto px-3 sm:px-4 py-6 sm:py-12 h-screen overflow-y-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <button onClick={() => setMode(MODE_SELECT)} className="text-muted-foreground hover:text-foreground text-sm underline underline-offset-2 mr-1">← 戻る</button>
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
          <Radio className="w-4 h-4 sm:w-5 sm:h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-lg sm:text-2xl font-bold">ライブ配信を開始</h1>
      </div>

      {/* OBS 手動入力（任意） */}
      <div className="space-y-4 bg-secondary rounded-2xl p-5 border border-border mb-6">
        <p className="text-sm font-bold text-foreground">🎙️ OBS で配信する場合（任意）</p>
        <p className="text-xs text-muted-foreground">入力しなくてもブラウザのカメラ・マイクで配信できます</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Ingest Endpoint</label>
            <Input
              type="text"
              value={manualIngestEndpoint}
              onChange={(e) => setManualIngestEndpoint(e.target.value)}
              placeholder="rtmps://xxxx.global-contribute.live-video.net:443/app/"
              className="bg-background font-mono text-xs"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Stream Key</label>
            <Input
              type="text"
              value={manualStreamKey}
              onChange={(e) => setManualStreamKey(e.target.value)}
              placeholder="sk_ap-northeast-1_xxxxx"
              className="bg-background font-mono text-xs"
              autoComplete="off"
            />
          </div>
        </div>
        {manualIngestEndpoint && manualStreamKey && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> OBS 情報が入力されました
          </div>
        )}
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
          <Label>配信タイトル *</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="配信タイトルを入力"
            className="bg-secondary border-0"
            required
          />
        </div>

        {/* 説明 */}
        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="配信の説明を入力"
            className="bg-secondary border-0 resize-none"
            rows={3}
          />
        </div>

        {/* 予定日時 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label>予定日時（任意）</Label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={!form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.checked ? "" : new Date().toISOString().slice(0, 16) })}
                className="w-4 h-4 accent-primary rounded"
              />
              <span className="text-sm text-primary font-semibold">即配信</span>
            </label>
          </div>
          {form.scheduled_at && (
            <Input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              className="bg-secondary border-0"
            />
          )}
        </div>

        {/* 対応可能時間 */}
        <div className="space-y-2">
          <Label>配信予定時間</Label>
          <select
            value={form.availableTime}
            onChange={(e) => setForm({ ...form, availableTime: e.target.value })}
            className="w-full h-9 rounded-md bg-secondary border-0 px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
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
          <Label>視聴価格（コイン）</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
            className="bg-secondary border-0"
          />
          <p className="text-xs text-muted-foreground">0 = 無料配信</p>

          {/* 画質別料金ガイド */}
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
                            {maxCoins ? `${minCoins}〜${maxCoins}コイン` : `${minCoins}コイン以上`}
                            {" → "}配信者収益 <span className="text-green-400 font-bold">¥{Math.floor((isActive ? (p || minCoins) : minCoins) * 0.85)}</span>（85%）
                          </p>
                        </div>
                        {isActive && <span className="text-[10px] font-black text-primary shrink-0">← 現在</span>}
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  ※ 無料配信（0コイン）はFHD 1080pで配信されます。配信者への還元は視聴者支払額の85%（BASICプラン加入者）です。
                </p>
              </div>
            );
          })()}
        </div>

        {/* 送信 */}
        <Button
          type="submit"
          disabled={creating || !form.title}
          className="w-full h-10 sm:h-12 text-white text-sm sm:text-base gap-2 bg-red-500 hover:bg-red-600"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              準備中...
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              ライブ配信スタート
            </>
          )}
        </Button>
      </form>
    </div>
  );
}