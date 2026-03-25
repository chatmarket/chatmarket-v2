import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Video, Radio, DollarSign, Users, Edit, Save, Image, Loader2, Info, Coins, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import YellCoinWalletPanel from "../components/yell/YellCoinWalletPanel";

export default function MyChannel() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channelForm, setChannelForm] = useState({});
  const queryClient = useQueryClient();

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

  const { data: superChats = [] } = useQuery({
    queryKey: ["my-superchats"],
    queryFn: async () => {
      const allStreams = streams.map((s) => s.id);
      if (allStreams.length === 0) return [];
      const all = [];
      for (const sid of allStreams) {
        const scs = await base44.entities.SuperChat.filter({ livestream_id: sid });
        all.push(...scs);
      }
      return all;
    },
    enabled: streams.length > 0,
  });

  // ビデオ通話収益（着信者として受け取ったエールコイン）
  const { data: videoCalls = [] } = useQuery({
    queryKey: ["my-video-calls", user?.email],
    queryFn: () => base44.entities.VideoCall.filter({ callee_email: user.email, status: "ended" }),
    enabled: !!user,
  });

  // プログレッシブインセンティブ率を計算
  const getProgressiveRate = (monthlyRevenue) => {
    if (monthlyRevenue > 20000000) return 0.95;
    if (monthlyRevenue > 19500000) return 0.94;
    if (monthlyRevenue > 18000000) return 0.93;
    if (monthlyRevenue > 16500000) return 0.92;
    if (monthlyRevenue > 15000000) return 0.91;
    if (monthlyRevenue > 12000000) return 0.90;
    if (monthlyRevenue > 9000000) return 0.89;
    if (monthlyRevenue > 6000000) return 0.88;
    if (monthlyRevenue > 3000000) return 0.87;
    if (monthlyRevenue > 2000000) return 0.86;
    return 0.85;
  };

  // エールコイン：プラットフォーム手数料10%
  const totalSuperChatRevenue = superChats.reduce((sum, sc) => sum + (sc.amount || 0), 0);
  const yellCoinFee = Math.floor(totalSuperChatRevenue * 0.10);
  const yellCoinNet = totalSuperChatRevenue - yellCoinFee;

  // ビデオ購入・ライブチケット：プラットフォーム手数料15%
  const videoPurchaseGross = videos.reduce((sum, v) => sum + (v.price || 0) * (v.view_count || 0), 0);
  const videoFee = Math.floor(videoPurchaseGross * 0.15);
  const videoPurchaseNet = videoPurchaseGross - videoFee;

  const liveStreamGross = streams.reduce((sum, s) => sum + (s.price || 0) * (s.viewer_count || 0), 0);
  const liveStreamFee = Math.floor(liveStreamGross * 0.15);
  const liveStreamNet = liveStreamGross - liveStreamFee;

  // ビデオ通話収益
  const videoCallGross = videoCalls.reduce((sum, c) => sum + (c.yell_coin_amount || 0), 0);
  const videoCallFee = Math.floor(videoCallGross * 0.10);
  const videoCallNet = videoCallGross - videoCallFee;

  // 月間総売上（手数料控除後）
  const monthlyGrossRevenue = yellCoinNet + videoPurchaseNet + liveStreamNet + videoCallNet;
  const currentRate = getProgressiveRate(monthlyGrossRevenue);
  const netAfterRate = Math.floor(monthlyGrossRevenue * currentRate);
  
  const totalRevenue = netAfterRate;

  useEffect(() => {
    if (channel) {
      setChannelForm({
        name: channel.name || "",
        description: channel.description || "",
      });
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

  // Create channel if none exists
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
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-6 items-start">
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
          <div className="bg-secondary rounded-xl p-3 text-center col-span-3 sm:col-span-1">
            <DollarSign className="w-5 h-5 mx-auto text-yellow-400 mb-1" />
            <p className="text-lg font-bold">¥{totalRevenue.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">純収益（手数料控除後）</p>
          </div>
        </div>

        {/* Progressive Incentive Info */}
        <div className="mt-4 bg-secondary/50 rounded-xl p-4 border border-border/50 space-y-2 text-xs">
          <p className="font-semibold text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-primary" /> プログレッシブインセンティブ（自動適用）
          </p>
          <div className="space-y-1 pb-2 border-b border-border/50">
            <div className="flex justify-between text-muted-foreground">
              <span>エールコイン</span>
              <span>¥{yellCoinNet.toLocaleString()} (手数料: ¥{yellCoinFee.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ビデオ販売</span>
              <span>¥{videoPurchaseNet.toLocaleString()} (手数料: ¥{videoFee.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ライブチケット</span>
              <span>¥{liveStreamNet.toLocaleString()} (手数料: ¥{liveStreamFee.toLocaleString()})</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>ビデオ通話エールコイン</span>
              <span>{videoCallNet.toLocaleString()} コイン (手数料: {videoCallFee.toLocaleString()})</span>
            </div>
          </div>
          <div className="flex justify-between text-muted-foreground font-semibold">
            <span>月間総売上（手数料控除後）</span>
            <span className="text-foreground">¥{monthlyGrossRevenue.toLocaleString()}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>適用還元率</span>
            <span className="text-primary font-semibold">{(currentRate * 100).toFixed(0)}%</span>
          </div>
          <div className="bg-secondary rounded-lg p-2.5 space-y-1 mt-2 border border-border/50">
            <p className="text-muted-foreground font-medium">次のレベル達成条件:</p>
            {currentRate < 0.95 && (
              <>
                {currentRate === 0.85 && <p>200万円超 → 86% | 300万円超 → 87% | 600万円超 → 88%</p>}
                {currentRate === 0.86 && <p>300万円超 → 87% | 600万円超 → 88% | 900万円超 → 89%</p>}
                {currentRate >= 0.87 && <p>次レベルまで: ¥{(Math.ceil(monthlyGrossRevenue / 300000) * 300000 - monthlyGrossRevenue).toLocaleString()}</p>}
              </>
            )}
            {currentRate === 0.95 && <p className="text-primary">最高レベル達成！</p>}
          </div>
          <div className="flex justify-between font-bold border-t border-border pt-2">
            <span>振込予定額</span>
            <span className="text-primary">¥{totalRevenue.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="videos">
        <TabsList className="bg-secondary mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="videos">動画</TabsTrigger>
          <TabsTrigger value="streams">配信履歴</TabsTrigger>
          <TabsTrigger value="calls" className="flex items-center gap-1">
            <Phone className="w-3.5 h-3.5" /> 通話収益
          </TabsTrigger>
          <TabsTrigger value="wallet" className="flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-yellow-400" /> エールコイン
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
                <Link key={s.id} to={`/live/${s.id}`}>
                  <div className="bg-card rounded-xl p-4 border border-border/50 flex items-center gap-4 hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                      <Radio className={`w-5 h-5 ${s.status === "live" ? "text-red-400 animate-pulse" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{s.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {s.status === "live" ? "🔴 配信中" : s.status === "ended" ? "終了" : "予定"}
                        {s.price > 0 && ` • ¥${s.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                </Link>
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

        {/* ビデオ通話収益 */}
        <TabsContent value="calls">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-yellow-400">{videoCalls.length}</p>
                <p className="text-xs text-muted-foreground mt-1">通話回数</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-yellow-400">{videoCallGross.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">受取コイン（合計）</p>
              </div>
              <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-primary">{videoCallNet.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">手数料控除後</p>
              </div>
            </div>

            {videoCalls.length > 0 ? (
              <div className="space-y-2">
                {videoCalls.map((call) => (
                  <div key={call.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{call.caller_name || call.caller_email}</p>
                      <p className="text-xs text-muted-foreground">{new Date(call.created_date).toLocaleDateString("ja-JP")}</p>
                    </div>
                    <p className="text-yellow-400 font-bold text-sm shrink-0">
                      +{(call.yell_coin_amount || 0).toLocaleString()} コイン
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <p className="text-muted-foreground">まだビデオ通話の収益はありません</p>
              </div>
            )}
          </div>
        </TabsContent>

        {/* エールコインウォレット */}
        <TabsContent value="wallet">
          <YellCoinWalletPanel user={user} />
        </TabsContent>
      </Tabs>
    </div>
  );
}