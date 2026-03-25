import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Radio, Loader2, Image, PhoneCall, Video, AlertTriangle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

const MODE_LIVE = "live";
const MODE_CALL = "call";

export default function GoLive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [mode, setMode] = useState(MODE_LIVE); // "live" | "call"

  const [form, setForm] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    availableTime: "",
    duration: mode === MODE_LIVE ? 60 : 15,
    price: mode === MODE_LIVE ? 1 : 150,
    isPaid: false,
    // Archive settings
    saveArchive: false,
    archiveIsPaid: false,
    archivePrice: 1,
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

  const handleStart = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    // Archive consent check
    if (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed) {
      toast.error("アーカイブを有料公開する場合、通話相手の同意確認が必要です。");
      return;
    }

    setCreating(true);

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

    const stream = await base44.entities.LiveStream.create({
      title: form.title,
      description: form.description,
      channel_id: channel.id,
      channel_name: channel.name,
      channel_avatar: channel.avatar_url,
      thumbnail_url,
      status: form.scheduled_at ? "scheduled" : "live",
      scheduled_at: form.scheduled_at || null,
      available_time: form.availableTime || "",
      price: form.isPaid ? form.price : 0,
      viewer_count: 0,
    });

    await base44.entities.Channel.update(channel.id, { is_live: true });

    setCreating(false);

    if (mode === MODE_CALL) {
      // Video call mode — navigate to call page
      navigate(`/call/${stream.id}`);
    } else {
      navigate(`/live/${stream.id}`);
    }
  };

  const minPrice = mode === MODE_LIVE ? 1 : (form.duration / 15) * 150;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <Radio className="w-5 h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold">配信・通話を開始</h1>
      </div>

      {/* Mode selector */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <button
          type="button"
          onClick={() => setMode(MODE_LIVE)}
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

      <form onSubmit={handleStart} className="space-y-6">
        {/* Thumbnail */}
        <div className="space-y-2">
          <Label>サムネイル画像</Label>
          <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
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
          <div className="flex items-center justify-between">
            <div>
              <Label>有料にする</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {mode === MODE_LIVE ? "チケット購入が必要になります" : "通話料金を設定します"}
              </p>
            </div>
            <Switch
              checked={form.isPaid}
              onCheckedChange={(v) => setForm({ ...form, isPaid: v })}
            />
          </div>

          {form.isPaid && mode === MODE_LIVE && (
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
                <Label>チケット料金（円）</Label>
                <Input
                  type="number"
                  min={1}
                  max={1000000}
                  step={1}
                  value={form.price}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    setForm({ ...form, price: Math.max(Math.min(val, 1000000), 1) });
                  }}
                  className="bg-secondary border-0"
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  ¥1から自由に設定できます。
                </p>
              </div>
            </div>
          )}

          {form.isPaid && mode === MODE_CALL && (
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
              <div className="flex items-center justify-between">
                <div>
                  <Label>アーカイブを有料公開する</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">¥1〜自由設定で動画として販売できます</p>
                </div>
                <Switch
                  checked={form.archiveIsPaid}
                  onCheckedChange={(v) => setForm({ ...form, archiveIsPaid: v, archiveConsentConfirmed: false })}
                />
              </div>

              {form.archiveIsPaid && (
                <>
                  <div className="space-y-2">
                    <Label>アーカイブ販売価格（円）</Label>
                    <Input
                      type="number"
                      min={1}
                      step={1}
                      value={form.archivePrice}
                      onChange={(e) => setForm({ ...form, archivePrice: parseInt(e.target.value) || 1 })}
                      className="bg-secondary border-0"
                      placeholder="1"
                    />
                    <p className="text-xs text-muted-foreground">¥1〜自由に設定できます</p>
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
          disabled={creating || !form.title || (form.saveArchive && form.archiveIsPaid && !form.archiveConsentConfirmed)}
          className={`w-full h-12 text-white text-base gap-2 ${mode === MODE_LIVE ? "bg-red-500 hover:bg-red-600" : "bg-primary hover:bg-primary/90"}`}
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