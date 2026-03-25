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
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoError, setVideoError] = useState("");
  const [copyrightConfirmed, setCopyrightConfirmed] = useState(false);
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

  // Check today's upload duration for VOD plan
  const { data: todayVideos = [] } = useQuery({
    queryKey: ["today-videos", user?.email],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      const all = await base44.entities.Video.filter({ });
      return all.filter(
        (v) => v.created_by === user.email && v.created_date >= todayStart
      );
    },
    enabled: !!user,
  });

  const todayUploadDuration = todayVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
  const remainingDuration = 7200 - todayUploadDuration; // 120分 = 7200秒
  const freeVideoBlocked = form.is_free && recentFreeVideos.length >= 1;
  const uploadDurationExceeded = videoDuration > remainingDuration * 1000; // Convert to ms

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
      channel_avatar: channel.avatar_url || "",
      price: form.is_free ? 0 : form.price,
    });

    setUploading(false);
    navigate("/my-channel");
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">動画アップロード</h1>

      {/* Terms of Use */}
      <div className="bg-secondary/60 border border-border/60 rounded-xl p-5 mb-8 space-y-4 text-sm">
        <p className="font-bold text-base flex items-center gap-2">📋 動画投稿における利用規約</p>
        <p className="text-muted-foreground text-xs">動画をアップロードする前に、以下の利用規約をよくお読みください。アップロードを行うことで、本規約に同意したものとみなします。</p>

        <div className="space-y-3">
          <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
            <p className="font-semibold text-destructive text-xs mb-1">⚠️ 著作権について</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>投稿する動画は、ご自身が著作権を有するオリジナルコンテンツに限ります。</li>
              <li>第三者が著作権を有する音楽・映像・画像・テキスト等を無断で使用することは禁止します。</li>
              <li>他のウェブサイト・サービスからダウンロードした動画の再アップロードは一切禁止です。</li>
              <li>著作権侵害が確認された場合、予告なく動画の削除およびアカウントの停止を行います。</li>
              <li>著作権侵害による第三者からの申立てや損害について、当社は一切の責任を負いません。</li>
            </ul>
          </div>

          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <p className="font-semibold text-orange-400 text-xs mb-1">👤 肖像権について</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>動画に第三者が映り込む場合は、必ず本人の同意を得てください。</li>
              <li>無断で他人の顔・姿を撮影・公開する行為は肖像権の侵害となります。</li>
              <li>公共の場での撮影であっても、特定個人が識別できる場合は同意が必要です。</li>
              <li>未成年者が映り込む場合は、保護者の同意が必要です。</li>
              <li>肖像権侵害に関して、当社は一切の責任を負いません。投稿者が全責任を負うものとします。</li>
            </ul>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="font-semibold text-xs mb-1">🚫 禁止コンテンツ</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>わいせつ・暴力・差別的表現を含むコンテンツ</li>
              <li>個人情報（住所・電話番号・金融情報等）を含むコンテンツ</li>
              <li>詐欺・フィッシング・スパム行為を目的としたコンテンツ</li>
              <li>法令に違反するコンテンツ全般</li>
            </ul>
          </div>

          <div className="bg-secondary rounded-lg p-3">
            <p className="font-semibold text-xs mb-1">📌 その他の注意事項</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>無料動画の投稿は１週間に１本までです。</li>
              <li>当社は、規約違反コンテンツを予告なく削除する権利を有します。</li>
              <li>投稿コンテンツに関するトラブルは投稿者の責任において解決するものとします。</li>
            </ul>
          </div>
        </div>
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
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  const video = document.createElement("video");
                  video.onloadedmetadata = () => {
                    const durationSeconds = Math.ceil(video.duration);
                    if (durationSeconds > remainingDuration) {
                      setVideoError(`この動画は${Math.ceil(durationSeconds / 60)}分です。本日のアップロード可能時間は残り${Math.ceil(remainingDuration / 60)}分です。`);
                      setVideoFile(null);
                      setVideoDuration(0);
                    } else {
                      setVideoDuration(durationSeconds);
                      setVideoError("");
                      setVideoFile(file);
                    }
                  };
                  video.src = URL.createObjectURL(file);
                }
              }}
            />
            {videoFile ? (
              <div className="flex flex-col items-center gap-2 text-primary">
                <Film className="w-5 h-5" />
                <span className="text-sm font-medium">{videoFile.name}</span>
                <span className="text-xs text-muted-foreground">{Math.ceil(videoDuration / 60)}分</span>
              </div>
            ) : (
              <div className="text-center">
                <UploadIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">クリックして動画を選択</p>
                <p className="text-xs text-muted-foreground mt-1">本日の使用可能時間: {Math.ceil(remainingDuration / 60)}分 / 120分</p>
              </div>
            )}
          </label>
          {videoError && (
            <p className="text-destructive text-xs font-semibold">⚠️ {videoError}</p>
          )}
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
              <p className="text-xs text-yellow-400/80 mt-1">※ 無料動画投稿は１週間に１回となります</p>
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

        {/* Copyright confirmation */}
        <label className="flex items-start gap-3 cursor-pointer bg-destructive/10 border border-destructive/30 rounded-xl p-4">
          <input
            type="checkbox"
            checked={copyrightConfirmed}
            onChange={(e) => setCopyrightConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-primary shrink-0"
          />
          <span className="text-xs text-foreground/80 leading-relaxed">
            <span className="font-bold text-destructive block mb-1">⚠️ 著作権に関する確認</span>
            この動画はオリジナルコンテンツであり、第三者の著作権・肖像権を侵害していないことを確認しました。他者が権利を有する音楽・映像・画像等を無断で使用していません。
          </span>
        </label>

        <Button
          type="submit"
          disabled={uploading || !form.title || freeVideoBlocked || uploadDurationExceeded || !videoFile || !copyrightConfirmed}
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