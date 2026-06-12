import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import VideoCard from "../components/cards/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QRCode from "qrcode.react";
import { Video, Radio, Edit, Save, Upload, Settings, CreditCard, CheckCircle, XCircle, Clock, DollarSign, PhoneCall, Share2, Copy, QrCode, Archive, ToggleLeft, ToggleRight, Coins, Camera } from "lucide-react";
import ChekiSettingsPanel from "@/components/cheki/ChekiSettingsPanel";
import SocialLinks from "@/components/channel/SocialLinks";
import { GlobalProfileEditor, LanguageBadges, LocalTimeClock, LearningStatusBadge } from "@/components/channel/GlobalProfilePanel";
import { Switch } from "@/components/ui/switch";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ArchivePriceModal from "../components/stream/ArchivePriceModal";
import VideoEditPanel from "../components/channel/VideoEditPanel";
import AcceptedCallsList from "../components/dashboard/AcceptedCallsList";
import ChatReadingMenuPanel from "@/components/fortune/ChatReadingMenuPanel";
import FortuneSetupChecklist from "@/components/fortune/FortuneSetupChecklist.jsx";
import ProductManagePanel from "@/components/shop/ProductManagePanel";
import { Music } from "lucide-react";

export default function MyChannel() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [channelForm, setChannelForm] = useState({});
  const [archiveModalStream, setArchiveModalStream] = useState(null);
  const [editingVideo, setEditingVideo] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

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
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }, "-updated_date", 10),
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

  const isFortuneTeller = channel && (channel.service_category === "fortune_telling" || channel.stream_category === "fortune");
  const isEducation = channel && (channel.service_category === "language" || channel.service_category === "education" || channel.category_id === "education");
  // ミュージシャン判定：明確なミュージシャン条件のみ。タグ・hobby・entertainment・idol は使用しない
  const isMusicianChannel = !!(channel && (
    user?.role === "musician" ||
    channel.service_category === "musician" ||
    channel.category_id === "music"
  ));

  // デジタルコンテンツタブのラベルをカテゴリで分ける
  const digitalTabLabel = isFortuneTeller ? "鑑定書・デジタル" : isEducation ? "教材・資料" : isMusicianChannel ? "音源販売" : "デジタル販売";
  const digitalTabDesc = isFortuneTeller
    ? "PDF鑑定書・開運レポート・音声メッセージなどをデジタル商品として販売できます。"
    : isEducation
    ? "教材PDF・レッスン資料・学習コンテンツをデジタル商品として販売できます。"
    : isMusicianChannel
    ? "自作曲・BGM・音源ファイルをデジタル商品として販売できます。購入者は決済後、マイページから音源ファイルをダウンロードできます。"
    : "デジタルコンテンツをデジタル商品として販売できます。";

  const { data: chatMenus = [] } = useQuery({
    queryKey: ["chat-reading-menus-checklist", channel?.id],
    queryFn: () => base44.entities.ChatReadingMenu.filter({ channel_id: channel.id }),
    enabled: !!channel?.id && isFortuneTeller,
  });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ["my-subscriptions", user?.email],
    queryFn: () => base44.entities.PlanSubscription.filter({ user_email: user.email }, "-created_date"),
    enabled: !!user,
  });

  useEffect(() => {
    if (channel) {
      setChannelForm({
        name: channel.name || "",
        description: channel.description || "",
        native_language: channel.native_language || "",
        learning_languages: channel.learning_languages || [],
        resident_country: channel.resident_country || "",
        learning_status: channel.learning_status || "",
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

  const handleToggleCallEnabled = async (newValue) => {
    if (!channel) return;
    await base44.entities.Channel.update(channel.id, { call_enabled: newValue });
    queryClient.invalidateQueries({ queryKey: ["my-channels"] });
    // ★ Home の待機チャンネル一覧をリアルタイムで更新
    queryClient.invalidateQueries({ queryKey: ["call-enabled-channels"] });
  };

  if (!user) return null;

  if (channels.length === 0) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="text-xl font-bold mb-4">チャンネルを作成しましょう</h2>
        <Button
          onClick={async () => {
            const displayName = user.full_name || user.email?.split("@")[0] || "マイ";
            await base44.entities.Channel.create({
              name: displayName + "のチャンネル",
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
      {/* 承認済み通話の入室ボタン（大きく表示） */}
      <AcceptedCallsList userEmail={user?.email} />

      {archiveModalStream && (
        <ArchivePriceModal
          stream={archiveModalStream}
          onClose={() => setArchiveModalStream(null)}
          onSaved={() => queryClient.invalidateQueries({ queryKey: ["my-streams", channel?.id] })}
        />
      )}
      {editingVideo && (
        <VideoEditPanel
          video={editingVideo}
          onClose={() => setEditingVideo(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["my-videos"] })}
        />
      )}
      
      {/* チャンネルシェアモーダル */}
      {showShareModal && channel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-card border border-border/50 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-black flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                チャンネルを共有
              </h2>
              <p className="text-xs text-muted-foreground">チャンネルURLとQRコードを使って新規ユーザーに紹介してください</p>
            </div>

            {/* チャンネルURL */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">チャンネルURL</Label>
              <div className="flex gap-2 items-center">
                <Input
                  readOnly
                  value={`${window.location.origin}/channel/${channel.id}`}
                  className="bg-secondary border-0 text-xs font-mono flex-1"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/channel/${channel.id}`);
                    toast.success("URLをコピーしました");
                  }}
                  className="gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

            {/* QRコード */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">QRコード</Label>
              <div className="bg-white rounded-xl p-4 flex items-center justify-center">
                <QRCode
                  value={`${window.location.origin}/channel/${channel.id}`}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">スマートフォンで読み込んでチャンネルにアクセス</p>
            </div>

            {/* SNS共有 */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground">SNSで共有</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const text = encodeURIComponent(`${channel.name}のチャンネル: ${window.location.origin}/channel/${channel.id}`);
                    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
                  }}
                  className="text-xs"
                >
                  𝕏
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const url = encodeURIComponent(`${window.location.origin}/channel/${channel.id}`);
                    const text = encodeURIComponent(channel.name);
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, "_blank");
                  }}
                  className="text-xs"
                >
                  Facebook
                </Button>
              </div>
            </div>

            <button
              onClick={() => setShowShareModal(false)}
              className="w-full py-2 rounded-lg border border-border hover:bg-secondary transition-colors text-sm font-semibold"
            >
              閉じる
            </button>
          </div>
        </div>
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
                {/* Local Time */}
                {channel.resident_country && (
                  <div className="mt-2">
                    <LocalTimeClock countryCode={channel.resident_country} />
                  </div>
                )}
                {/* 言語バッジ */}
                {(channel.native_language || (channel.learning_languages || []).length > 0) && (
                  <div className="mt-2">
                    <LanguageBadges nativeLang={channel.native_language} learningLangs={channel.learning_languages} />
                  </div>
                )}
                {/* 学習ステータス */}
                {channel.learning_status && (
                  <div className="mt-2">
                    <LearningStatusBadge text={channel.learning_status} />
                  </div>
                )}
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
            <Button size="sm" variant="outline" className="gap-2 w-full" onClick={() => setShowShareModal(true)}>
              <Share2 className="w-4 h-4" /> チャンネル共有
            </Button>
          </div>
        </div>

        {/* グローバルプロフィール編集（editing時のみ） */}
        {editing && (
          <div className="mt-5">
            <GlobalProfileEditor form={channelForm} onChange={setChannelForm} />
          </div>
        )}

        {/* SNSリンク表示 */}
        {channel.social_links && Object.values(channel.social_links).some(v => v?.trim()) && (
          <div className="mt-5 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-2 font-semibold">SNS</p>
            <SocialLinks socialLinks={channel.social_links} channelId={channel.id} />
          </div>
        )}

        {/* 通話受付スイッチ */}
        <div className="mt-6 bg-secondary/50 rounded-xl border border-border/30 p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-primary" /> 1対1ビデオ通話
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {channel.call_enabled ? "受付中" : "受付停止中"}
            </p>
          </div>
          <Switch checked={channel.call_enabled || false} onCheckedChange={handleToggleCallEnabled} />
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
          <TabsTrigger value="archives" className="flex items-center gap-1">
            <Archive className="w-3.5 h-3.5" /> アーカイブ販売
          </TabsTrigger>
          {(channel?.service_category === "fortune_telling" || channel?.stream_category === "fortune") && (
            <TabsTrigger value="chat-reading" className="flex items-center gap-1">
              <span>🔮</span> チャット鑑定
            </TabsTrigger>
          )}
          {isMusicianChannel && (
            <TabsTrigger value="music-sales" className="flex items-center gap-1">
              <Music className="w-3.5 h-3.5" /> 音源販売
            </TabsTrigger>
          )}
          {/* Digital Cheki feature is frozen / hidden for now. Cheki tab suppressed. */}
          <TabsTrigger value="plans" className="flex items-center gap-1">
            <CreditCard className="w-3.5 h-3.5" /> 契約プラン
            {subscriptions.filter(s => s.status === "active").length > 0 && (
              <span className="ml-1 text-[9px] bg-green-500 text-white px-1.5 py-0.5 rounded-full font-black">
                {subscriptions.filter(s => s.status === "active").length}件
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos">
          {videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {videos.map((v) => (
                <div key={v.id} className="relative group">
                  <VideoCard video={v} />
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute bottom-2 right-2 gap-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setEditingVideo(v)}
                  >
                    <DollarSign className="w-3.5 h-3.5" /> 値付け
                  </Button>
                </div>
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

        <TabsContent value="archives">
          {(() => {
            const endedStreams = streams.filter(s => s.status === "ended");
            if (endedStreams.length === 0) {
              return (
                <div className="text-center py-16 text-muted-foreground text-sm">
                  配信終了後にアーカイブが表示されます
                </div>
              );
            }
            return (
              <div className="space-y-3">
                {endedStreams.map((s) => {
                  const broadcastDate = s.live_started_at || s.created_date;
                  const dateLabel = broadcastDate
                    ? new Date(broadcastDate).toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
                    : "日時不明";
                  const isSelling = s.archive_vod_enabled;

                  const handleToggleVod = async (e) => {
                    e.stopPropagation();
                    await base44.entities.LiveStream.update(s.id, {
                      archive_vod_enabled: !isSelling,
                      archive_vod_price: !isSelling ? (s.price || 0) : 0,
                    });
                    queryClient.invalidateQueries({ queryKey: ["my-streams", channel?.id] });
                    toast.success(!isSelling ? "アーカイブ販売を開始しました" : "アーカイブ販売を停止しました");
                  };

                  return (
                    <div key={s.id} className={`bg-card rounded-xl p-4 border transition-colors ${isSelling ? "border-primary/40 bg-primary/5" : "border-border/50"}`}>
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0 overflow-hidden relative">
                          {s.thumbnail_url
                            ? <img src={s.thumbnail_url} alt="" className="w-full h-full object-cover" />
                            : <Archive className="w-5 h-5 text-muted-foreground" />
                          }
                          {isSelling && (
                            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 flex items-center justify-center text-[10px] text-white font-bold">✓</div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate text-sm">{s.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            📅 {dateLabel}放送分
                          </p>
                          <p className="text-xs mt-0.5 flex items-center gap-1">
                            {isSelling
                              ? <><Coins className="w-3 h-3 text-yellow-400" /><span className="text-yellow-400 font-bold">{s.archive_vod_price || s.price || 0}コイン</span></>
                              : <span className="text-muted-foreground">販売予定なし</span>
                            }
                          </p>
                        </div>
                        <button
                          onClick={handleToggleVod}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                            isSelling
                              ? "bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20"
                              : "bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20"
                          }`}
                        >
                          {isSelling ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                          {isSelling ? "販売停止" : "販売開始"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </TabsContent>

        {/* Digital Cheki feature is frozen / hidden for now. ChekiSettingsPanel suppressed. */}

        <TabsContent value="music-sales">
          {channel && (
            <div className="space-y-4">
              <div className="bg-secondary/50 border border-border/50 rounded-xl p-4 space-y-1">
                <p className="text-sm font-black flex items-center gap-2"><Music className="w-4 h-4 text-primary" /> {digitalTabLabel}</p>
                <p className="text-xs text-muted-foreground">{digitalTabDesc}</p>
                {isMusicianChannel && <p className="text-xs text-muted-foreground">対応形式：MP3、ZIP（音源セット）など。完全オリジナル音源のみ販売可能です。</p>}
              </div>
              <ProductManagePanel channel={channel} isMusician={isMusicianChannel} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat-reading">
          {channel && user && (
            <div className="space-y-6">
              <FortuneSetupChecklist channel={channel} menus={chatMenus} />
              <ChatReadingMenuPanel channel={channel} user={user} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="plans">
          <div className="space-y-4">
            {/* 現在契約中（更新日時表示） */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">現在契約中</h3>
                <span className="text-[10px] text-muted-foreground">自動更新</span>
              </div>
              {subscriptions.filter((s) => s.status === "active").length === 0 ? (
                <div className="bg-card rounded-xl border border-border/50 p-6 text-center text-muted-foreground text-sm">
                  現在契約中のプランはありません
                  <div className="mt-3">
                    <Link to="/plan-select">
                      <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2">
                        <CreditCard className="w-4 h-4" /> プランを選ぶ
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {subscriptions.filter((s) => s.status === "active").map((sub) => {
                    const planDetails = {
                      "basic": "Basic — 基本機能",
                      "vod": "VOD — 動画販売",
                      "ppv": "PPV — ライブ配信（1対多）",
                      "call-anser": "CALL&ANSER — 1対1ビデオ通話"
                    };
                    return (
                      <div key={sub.id} className="bg-gradient-to-r from-green-900/20 to-green-800/10 rounded-xl border border-green-500/40 p-4 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-white">{planDetails[sub.plan_id] || sub.plan_name}</p>
                          <p className="text-xs text-green-300/70 mt-0.5">
                            ✓ 加入済み — 次回更新: {sub.start_date ? new Date(new Date(sub.start_date).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("ja-JP") : "—"}
                          </p>
                        </div>
                        <span className="text-xs font-bold bg-green-500/30 text-green-300 px-2 py-0.5 rounded-full shrink-0">有効</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 過去の契約 */}
            {subscriptions.filter((s) => s.status === "cancelled").length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">過去の契約</h3>
                <div className="space-y-2">
                  {subscriptions.filter((s) => s.status === "cancelled").map((sub) => (
                    <div key={sub.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-3 opacity-60">
                      <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{sub.plan_name}</p>
                        <p className="text-xs text-muted-foreground">
                          加入: {sub.start_date ? new Date(sub.start_date).toLocaleDateString("ja-JP") : new Date(sub.created_date).toLocaleDateString("ja-JP")}
                          {sub.end_date && ` → 解約: ${new Date(sub.end_date).toLocaleDateString("ja-JP")}`}
                        </p>
                      </div>
                      <span className="text-xs font-bold bg-secondary text-muted-foreground px-2 py-0.5 rounded-full">解約済み</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}