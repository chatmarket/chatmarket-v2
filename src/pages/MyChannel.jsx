import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Radio, Edit, Save, Upload, Settings } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ArchivePriceModal from "../components/stream/ArchivePriceModal";

export default function MyChannel() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channelForm, setChannelForm] = useState({});
  const [archiveModalStream, setArchiveModalStream] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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

  const channel = channels[0];

  const { data: videos = [] } = useQuery({
    queryKey: ["my-videos", channel?.id],
    queryFn: () => base44.entities.Video.filter({ channel_id: channel.id }, "-created_date"),
    enabled: !!channel,
  });

  const { data: streams = [] } = useQuery({
    queryKey: ["my-streams", channel?.id],
    queryFn: () => base44.entities.LiveStream.filter({ channel_id: channel.id }, "-created_date"),
    enabled: !!channel,
  });

  useEffect(() => {
    if (channel) {
      setChannelForm({ name: channel.name || "", description: channel.description || "" });
    }
  }, [channel]);

  const handleSaveChannel = async () => {
    if (!channel) return;
    setSaving(true);
    await base44.entities.Channel.update(channel.id, channelForm);
    queryClient.invalidateQueries({ queryKey: ["my-channels"] });
    setSaving(false);
    setEditing(false);
  };

  const handleAvatarUpload = async (file) => {
    if (!channel || !file) return;
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Channel.update(channel.id, { avatar_url: file_url });
    queryClient.invalidateQueries({ queryKey: ["my-channels"] });
  };

  if (!user) return null;

  if (channels.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold mb-4">チャンネルを作成しましょう</h2>
        <Button
          onClick={async () => {
            await base44.entities.Channel.create({
              name: user.full_name + "のチャンネル",
              owner_email: user.email,
            });
            queryClient.invalidateQueries({ queryKey: ["my-channels"] });
          }}
          className="bg-primary hover:bg-primary/90"
        >
          チャンネル作成
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {archiveModalStream && (
        <ArchivePriceModal
          stream={archiveModalStream}
          onClose={() => setArchiveModalStream(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-streams", channel?.id] })}
        />
      )}
      {/* Channel Header */}
      <div className="bg-card rounded-2xl border border-border/50 p-6 mb-8">
        <div className="flex items-start gap-4">
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleAvatarUpload(e.target.files[0])} />
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
              {channel.avatar_url ? (
                <img src={channel.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-muted-foreground">{channel.name?.[0]}</span>
              )}
            </div>
          </label>

          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="space-y-3">
                <Input
                  value={channelForm.name}
                  onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
                  className="bg-secondary border-0"
                />
                <Textarea
                  value={channelForm.description}
                  onChange={(e) => setChannelForm({ ...channelForm, description: e.target.value })}
                  className="bg-secondary border-0 resize-none"
                  rows={2}
                />
                <Button onClick={handleSaveChannel} size="sm" disabled={saving} className="gap-2">
                  <Save className="w-4 h-4" />
                  {saving ? "保存中..." : "保存"}
                </Button>
              </div>
            ) : (
              <>
                <h1 className="text-xl font-bold truncate">{channel.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{channel.description || "説明なし"}</p>
                <Button onClick={() => setEditing(true)} size="sm" variant="ghost" className="mt-2 gap-2 text-xs">
                  <Edit className="w-3 h-3" /> 編集
                </Button>
              </>
            )}
          </div>

          {/* クイックアクション */}
          <div className="flex flex-col gap-2 shrink-0">
            <Link to="/upload">
              <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 w-full">
                <Upload className="w-4 h-4" /> 動画アップ
              </Button>
            </Link>
            <Link to="/go-live">
              <Button size="sm" variant="outline" className="gap-2 w-full">
                <Radio className="w-4 h-4 text-red-400" /> 配信開始
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="bg-secondary rounded-xl p-3 text-center">
            <Video className="w-5 h-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold">{videos.length}</p>
            <p className="text-xs text-muted-foreground">動画</p>
          </div>
          <div className="bg-secondary rounded-xl p-3 text-center">
            <Radio className="w-5 h-5 mx-auto text-red-400 mb-1" />
            <p className="text-lg font-bold">{streams.length}</p>
            <p className="text-xs text-muted-foreground">配信</p>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="videos">
        <TabsList className="bg-secondary mb-6">
          <TabsTrigger value="videos" className="flex items-center gap-1">
            <Video className="w-3.5 h-3.5" /> 動画一覧
          </TabsTrigger>
          <TabsTrigger value="streams" className="flex items-center gap-1">
            <Radio className="w-3.5 h-3.5" /> 配信履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {videos.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">まだ動画がありません</p>
              <Link to="/upload">
                <Button className="bg-primary hover:bg-primary/90 gap-2">
                  <Video className="w-4 h-4" /> 動画をアップロード
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="streams">
          {streams.length > 0 ? (
            <div className="space-y-3">
              {streams.map((s) => (
                <div key={s.id} className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4 hover:border-primary/30 transition-colors">
                  <Link to={`/live/${s.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Radio className={`w-5 h-5 ${s.status === "live" ? "text-red-400 animate-pulse" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.status === "live" ? "🔴 配信中" : s.status === "ended" ? "終了" : "予定"}
                        {s.price > 0 && ` • ¥${s.price.toLocaleString()}`}
                      </p>
                    </div>
                  </Link>
                  {s.status === "ended" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 gap-1 text-xs"
                      onClick={() => setArchiveModalStream(s)}
                    >
                      <Settings className="w-3.5 h-3.5" /> アーカイブ設定
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">まだ配信履歴がありません</p>
              <Link to="/go-live">
                <Button className="bg-red-500 hover:bg-red-600 text-white gap-2">
                  <Radio className="w-4 h-4" /> 配信を開始
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}