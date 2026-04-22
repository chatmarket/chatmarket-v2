import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import CallWaitingWidget from "../components/dashboard/CallWaitingWidget";
import AcceptedCallsList from "../components/dashboard/AcceptedCallsList";
import BroadcasterStream from "../components/live/BroadcasterStream";
import { PhoneCall, Info, Radio, Loader2, Image, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function CallWaitingRoom() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // ライブ配信用
  const [liveStreamId, setLiveStreamId] = useState(null);
  const [ivsStream, setIvsStream] = useState(null);
  const [creating, setCreating] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [manualStreamKey, setManualStreamKey] = useState("");
  const [manualIngestEndpoint, setManualIngestEndpoint] = useState("");
  const [form, setForm] = useState({ title: "", price: 0 });
  const [showLiveForm, setShowLiveForm] = useState(false);

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel } = useQuery({
    queryKey: ["waiting-room-channel", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then((r) => r[0]),
    enabled: !!user,
  });

  const handleStartLive = async (e) => {
    e.preventDefault();
    if (!form.title) return;
    setCreating(true);

    const ivsRes = await base44.functions.invoke('createLiveStream', { isArchiveSaved: false });
    if (!ivsRes?.data?.streamId) {
      toast.error('配信枠の作成に失敗しました。');
      setCreating(false);
      return;
    }
    const ivsData = ivsRes.data;
    setIvsStream(ivsData);

    let ch = channel;
    if (!ch) {
      ch = await base44.entities.Channel.create({
        name: user.full_name + "のチャンネル",
        owner_email: user.email,
      });
    }

    let thumb_url = "";
    if (thumbnailFile) {
      const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
      thumb_url = res.file_url;
      setThumbnailUrl(thumb_url);
    }

    const autoQuality = form.price >= 150 ? "1080p" : form.price >= 55 ? "720p" : "1080p";

    const newStream = await base44.entities.LiveStream.create({
      title: form.title,
      channel_id: ch.id,
      channel_name: ch.name,
      channel_avatar: ch.avatar_url,
      thumbnail_url: thumb_url,
      status: "live",
      price: form.price,
      viewer_count: 0,
      stream_type: "webrtc",
      ivs_playback_url: ivsData.playbackUrl || "",
      max_bitrate_restriction: autoQuality,
      live_started_at: new Date().toISOString(),
      cost_input_yen: 0,
      cost_output_yen: 0,
      total_viewer_minutes: 0,
      revenue_coins: 0,
    });

    await base44.entities.Channel.update(ch.id, { is_live: true });
    setCreating(false);
    setLiveStreamId(newStream.id);
    setShowLiveForm(false);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* ヘッダー */}
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
          <PhoneCall className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black">通話待機画面</h1>
        <p className="text-sm text-muted-foreground">
          この画面を開いたまま待機してください。申込が届くと着信ポップアップが表示されます。
        </p>
      </div>

      {/* 案内 */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3 text-sm">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1 text-muted-foreground">
          <p>① 下の <span className="font-bold text-primary">「待機開始」</span> ボタンを押す</p>
          <p>② この画面を開いたまま待つ（待機中はライブ配信も同時にできます）</p>
          <p>③ 申込が来ると全画面着信ポップアップが自動で表示される</p>
          <p>④ 「承諾」を押すと即座に通話ルームへ移動</p>
        </div>
      </div>

      {/* 待機ウィジェット */}
      <CallWaitingWidget user={user} channel={channel} />

      {/* 承認済み通話入室 */}
      <AcceptedCallsList userEmail={user?.email} />

      {/* ─── ライブ配信セクション ─── */}
      <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
              <Radio className="w-4 h-4 text-red-400" />
            </div>
            <div>
              <p className="font-bold text-sm">ライブ配信</p>
              <p className="text-xs text-muted-foreground">待機中でも同時に配信できます</p>
            </div>
          </div>
          {!liveStreamId && !showLiveForm && (
            <Button
              size="sm"
              className="gap-1.5 bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setShowLiveForm(true)}
            >
              <Radio className="w-4 h-4" /> 配信を開始
            </Button>
          )}
        </div>

        {/* 配信設定フォーム */}
        {showLiveForm && !liveStreamId && (
          <form onSubmit={handleStartLive} className="p-5 space-y-4">
            {/* OBS設定（任意） */}
            <div className="bg-secondary rounded-xl p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground">OBS で配信する場合（任意）</p>
              <Input
                value={manualIngestEndpoint}
                onChange={(e) => setManualIngestEndpoint(e.target.value)}
                placeholder="Ingest Endpoint"
                className="bg-background font-mono text-xs"
              />
              <Input
                value={manualStreamKey}
                onChange={(e) => setManualStreamKey(e.target.value)}
                placeholder="Stream Key"
                className="bg-background font-mono text-xs"
              />
              {manualIngestEndpoint && manualStreamKey && (
                <p className="text-green-400 text-xs flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> OBS 情報入力済み</p>
              )}
            </div>

            {/* サムネイル */}
            <label className="flex items-center justify-center h-20 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-red-500/50 bg-secondary/50">
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setThumbnailFile(e.target.files[0])} />
              {thumbnailFile ? (
                <span className="text-sm text-primary flex items-center gap-2"><Image className="w-4 h-4" />{thumbnailFile.name}</span>
              ) : (
                <span className="text-xs text-muted-foreground flex items-center gap-2"><Image className="w-4 h-4" />サムネイル画像（任意）</span>
              )}
            </label>

            {/* タイトル */}
            <div className="space-y-1">
              <Label className="text-red-400 font-bold text-xs">配信タイトル *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="配信タイトルを入力"
                className="bg-secondary border-red-500/30"
                required
              />
            </div>

            {/* 価格 */}
            <div className="space-y-1">
              <Label className="text-xs">視聴価格（コイン）</Label>
              <Input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">0 = 無料配信</p>
            </div>

            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setShowLiveForm(false)}>
                キャンセル
              </Button>
              <Button type="submit" disabled={creating || !form.title} className="flex-1 bg-red-500 hover:bg-red-600 text-white gap-2">
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" />準備中...</> : <><Radio className="w-4 h-4" />配信スタート</>}
              </Button>
            </div>
          </form>
        )}

        {/* 配信中プレーヤー */}
        {liveStreamId && (
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
              <span className="text-sm font-bold text-red-400">配信中</span>
            </div>
            <BroadcasterStream
              streamId={liveStreamId}
              ivsStreamKey={manualStreamKey || ivsStream?.streamKey}
              ivsIngestEndpoint={manualIngestEndpoint || ivsStream?.ingestEndpoint}
              onEnd={() => { setLiveStreamId(null); setIvsStream(null); }}
              thumbnailUrl={thumbnailUrl}
            />
          </div>
        )}

        {/* 配信していない＆フォーム非表示の場合 */}
        {!liveStreamId && !showLiveForm && (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">
            待機しながら同時にライブ配信を行えます。<br />上の「配信を開始」ボタンを押してください。
          </div>
        )}
      </div>
    </div>
  );
}