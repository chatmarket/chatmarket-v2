import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Radio, Loader2, Image } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

export default function GoLive() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [creating, setCreating] = useState(false);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    duration: 15,
    price: 0,
    isPaid: false,
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

  const handleGoLive = async (e) => {
    e.preventDefault();
    if (!form.title) return;

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
      status: "live",
      price: form.isPaid ? form.price : 0,
      viewer_count: 0,
    });

    // Mark channel as live
    await base44.entities.Channel.update(channel.id, { is_live: true });

    setCreating(false);
    navigate(`/live/${stream.id}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
          <Radio className="w-5 h-5 text-red-400 animate-pulse" />
        </div>
        <h1 className="text-2xl font-bold">有料ライブ配信を開始</h1>
      </div>

      <form onSubmit={handleGoLive} className="space-y-6">
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
          <Label>配信タイトル</Label>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="配信タイトルを入力"
            className="bg-secondary border-0"
          />
        </div>

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

        {/* Pricing */}
        <div className="space-y-4 bg-card rounded-xl p-5 border border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <Label>有料配信にする</Label>
              <p className="text-xs text-muted-foreground mt-0.5">チケット購入が必要になります</p>
            </div>
            <Switch
              checked={form.isPaid}
              onCheckedChange={(v) => setForm({ ...form, isPaid: v })}
            />
          </div>

          {form.isPaid && (
            <div className="space-y-2">
              <Label>チケット価格（円）</Label>
              <Input
                type="number"
                min={150}
                step={1}
                value={form.price}
                onChange={(e) => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-0"
                placeholder="150"
              />
              <p className="text-xs text-muted-foreground">最低価格: 15分 ¥150 以上で自由設定</p>
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={creating || !form.title}
          className="w-full h-12 bg-red-500 hover:bg-red-600 text-white text-base gap-2"
        >
          {creating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              準備中...
            </>
          ) : (
            <>
              <Radio className="w-5 h-5" />
              配信スタート
            </>
          )}
        </Button>
      </form>
    </div>
  );
}