import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload as UploadIcon, Film, Image, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function Upload() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: 0,
    is_free: false,
    category: "その他",
  });

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channels = [] } = useQuery({
    queryKey: ["my-channels", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }),
    enabled: !!user,
  });

  // Check free videos uploaded in the last 7 days
  const { data: recentFreeVideos = [] } = useQuery({
    queryKey: ["recent-free-videos", user?.email],
    queryFn: async () => {
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const all = await base44.entities.Video.filter({ is_free: true });
      return all.filter(
        (v) => v.created_by === user.email && v.created_date >= oneWeekAgo
      );
    },
    enabled: !!user,
  });

  const freeVideoBlocked = form.is_free && recentFreeVideos.length >= 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title) return;

    setUploading(true);

    let channel = channels[0];
    if (!channel) {
      channel = await base44.entities.Channel.create({
        name: user.full_name + "のチャンネル",
        owner_email: user.email,
      });
    }

    let video_url = "";
    let thumbnail_url = "";

    if (videoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: videoFile });
      video_url = res.file_url;
    }
    if (thumbnailFile) {
      const res = await base44.integrations.Core.UploadFile({ file: thumbnailFile });
      thumbnail_url = res.file_url;
    }

    await base44.entities.Video.create({
      ...form,
      video_url,
      thumbnail_url,
      channel_id: channel.id,
      channel_name: channel.name,
      price: form.is_free ? 0 : form.price,
    });

    setUploading(false);
    navigate("/my-channel");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">動画アップロード</h1>

      {/* Warning notice */}
      <div className="bg-destructive/10 border border-destructive/50 rounded-xl p-4 mb-8">
        <p className="text-destructive text-sm font-semibold leading-relaxed">
          ⚠️ 注意事項<br />
          他のWEBサイトにアップロードされた動画は掲載できません。著作権・肖像権侵害などに関して弊社は一切の責任を負いません。
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Video File */}
        <div className="space-y-2">
          <Label>動画ファイル</Label>
          <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-border rounded-xl cursor-pointer hover:border-primary/50 transition-colors bg-secondary/50">
            <input
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => setVideoFile(e.target.files[0])}
            />
            {videoFile ? (
              <div className="flex items-center gap-2 text-primary">
                <Film className="w-5 h-5" />
                <span className="text-sm font-medium">{videoFile.name}</span>
              </div>
            ) : (
              <div className="text-center">
                <UploadIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">クリックして動画を選択</p>
              </div>
            )}
          </label>
        </div>

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

        {/* Title */}
        <div className="space-y-2">
          <Label>タイトル</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="動画タイトルを入力"
            className="bg-secondary border-0"
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>説明</Label>
          <Textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="動画の説明を入力"
            className="bg-secondary border-0 resize-none"
            rows={4}
          />
        </div>

        {/* Category */}
        <div className="space-y-2">
          <Label>カテゴリー</Label>
          <Select
            value={form.category}
            onValueChange={(v) => setForm({ ...form, category: v })}
          >
            <SelectTrigger className="bg-secondary border-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["エンタメ", "音楽", "ゲーム", "教育", "スポーツ", "テクノロジー", "ニュース", "その他"].map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pricing */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <Label>無料で公開</Label>
              <p className="text-xs text-muted-foreground mt-0.5">オフにすると有料動画になります</p>
            </div>
            <Switch
              checked={form.is_free}
              onCheckedChange={(v) => setForm({ ...form, is_free: v })}
            />
          </div>

          {form.is_free && recentFreeVideos.length >= 1 && (
            <p className="text-destructive text-xs font-semibold mt-2">
              ⚠️ 無料動画は1週間に1本までです。次の無料投稿可能日までお待ちください。
            </p>
          )}

          {!form.is_free && (
            <div className="space-y-2">
              <Label>価格（円）</Label>
              <Input
                type="number"
                min={1}
                step={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-0"
                placeholder="500"
              />
              <p className="text-xs text-muted-foreground">
                ※ 有料動画は最初の30秒が無料プレビューされます
              </p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={uploading || !form.title || freeVideoBlocked}
          className="w-full h-12 bg-primary hover:bg-primary/90 text-base gap-2"
        >
          {uploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              アップロード中...
            </>
          ) : (
            <>
              <UploadIcon className="w-5 h-5" />
              アップロード
            </>
          )}
        </Button>
      </form>
    </div>
  );
}