import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Radio, Loader2, Image, CheckCircle2, Users, Clock, Copy, Smartphone } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import BroadcasterStream from "../components/live/BroadcasterStream";
import BrowserBroadcaster from "../components/live/BrowserBroadcaster";

const MODE_SELECT = "select";
const MODE_LIVE = "live";

export default function GoLive() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [mode, setMode] = useState(MODE_SELECT);
  const [creating, setCreating] = useState(false);
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [ivsStream, setIvsStream] = useState(null);
  const [showModeSelect, setShowModeSelect] = useState(false);
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
    setManualStreamKey(ivsData.streamKey);
    setManualIngestEndpoint(`rtmps://${ivsData.ingestEndpoint}:443/app/`);

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
      stream_type: "ivs",
      ivs_playback_url: ivsData.playbackUrl || "",
      ivs_stream_key: ivsData.streamKey || "",
      ivs_ingest_endpoint: ivsData.ingestEndpoint || "",
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
    console.log(`[GoLive] Created stream with quality: ${autoQuality}`);
    setLiveStreamId(newStream.id);
    
    // セッションストレージに配信情報を保存
    sessionStorage.setItem("liveStreamId", newStream.id);
    
    // 配信方式選択UI表示
    setShowModeSelect(true);
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


        </div>
      </div>
    );
  }

  // ブラウザ配信画面
  if (liveStreamId && localStorage.getItem("broadcastMode") === "browser") {
    return (
      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-4 sm:py-8 h-screen flex flex-col">
        <BrowserBroadcaster
          streamKey={ivsStream?.streamKey}
          ingestEndpoint={ivsStream?.ingestEndpoint}
          onEnd={() => {
            localStorage.removeItem("broadcastMode");
            navigate("/creator-dashboard");
          }}
        />
      </div>
    );
  }

  // OBS配信画面
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

  // 配信方式選択モーダル
  if (showModeSelect) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
        <div className="bg-card border border-border rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-black mb-2">配信方式を選択</h2>
            <p className="text-muted-foreground">OBSかブラウザから選んでください</p>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* OBS配信 */}
            <button
              onClick={() => {
                localStorage.removeItem("broadcastMode");
                setShowModeSelect(false);
              }}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Radio className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-black text-white">OBS配信</p>
                <p className="text-xs text-muted-foreground mt-1">RTMPSで高画質・高音質配信</p>
                <p className="text-[10px] text-zinc-500 mt-2">推奨：ゲーム、教育、プロフェッショナル</p>
              </div>
            </button>

            {/* ブラウザ配信 */}
            <button
              onClick={() => {
                localStorage.setItem("broadcastMode", "browser");
                setShowModeSelect(false);
              }}
              className="flex flex-col items-center gap-4 p-6 rounded-xl border-2 border-border hover:border-primary/50 hover:bg-primary/5 transition-all group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <Smartphone className="w-7 h-7 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-black text-white">ブラウザ配信</p>
                <p className="text-xs text-muted-foreground mt-1">スマホ・PCから即配信</p>
                <p className="text-[10px] text-zinc-500 mt-2">推奨：初心者、雑談、日常配信</p>
              </div>
            </button>
          </div>

          <button
            onClick={() => {
              setShowModeSelect(false);
              setLiveStreamId(null);
            }}
            className="w-full py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-sm font-semibold"
          >
            キャンセル
          </button>
        </div>
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

      {/* OBS 配信キー自動生成・表示 */}
      <div className="space-y-4 bg-primary/10 border border-primary/30 rounded-2xl p-5 mb-6">
        <p className="text-sm font-bold text-primary">🎬 OBS で配信する</p>
        <p className="text-xs text-muted-foreground">タイトル、価格、配信スタートを押すと表示されます（スマホと同時配信OK）</p>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">RTMPS Server URL</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={manualIngestEndpoint || "作成後に表示"}
                className="flex-1 bg-background font-mono text-xs rounded-md px-3 py-2 border border-border"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (manualIngestEndpoint) {
                    navigator.clipboard.writeText(manualIngestEndpoint);
                    toast.success("コピーしました");
                  }
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-bold text-muted-foreground uppercase tracking-widest">Stream Key</label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                readOnly
                value={manualStreamKey || "作成後に表示"}
                className="flex-1 bg-background font-mono text-xs rounded-md px-3 py-2 border border-border"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (manualStreamKey) {
                    navigator.clipboard.writeText(manualStreamKey);
                    toast.success("コピーしました");
                  }
                }}
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
        {manualIngestEndpoint && manualStreamKey && (
          <div className="flex items-center gap-2 text-green-400 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4" /> OBS キー取得完了 ✅
          </div>
        )}
        <a
          href="https://live-chat-market.com/obs-guide"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-semibold underline underline-offset-2 transition-colors"
        >
          → OBS設定ガイド
        </a>
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
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="配信タイトルを入力"
            className="bg-secondary border-2 border-red-500/50 focus:border-red-500"
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
          <Label className="text-red-400 font-bold">視聴価格（コイン）*</Label>
          <Input
            type="number"
            min={0}
            value={form.price}
            onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
            className="bg-secondary border-2 border-red-500/50 focus:border-red-500"
            required
          />
          <p className="text-xs text-muted-foreground">0 = 無料配信</p>

          {/* 画質別料金ガイド */}
          {(() => {
            const p = form.price;
            const activeQuality = p >= 150 ? "FHD 1080p" : p >= 55 ? "HD 720p" : "SD 480p";
            return (
              <div className="bg-secondary/60 border border-border/50 rounded-xl p-4 space-y-3 mt-2">
                <p className="text-xs font-black text-foreground">📊 設定価格で画質が自動決定されます（視聴者1人の場合）</p>
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
                            {maxCoins ? `${minCoins}〜${maxCoins}コイン` : `${minCoins}コイン以上`}（視聴者価格15分毎）
                          </p>
                          <p className="text-xs text-muted-foreground">
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