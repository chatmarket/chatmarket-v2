import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, ExternalLink, Pencil, PhoneCall, CalendarDays, FileText, Image, Coins } from "lucide-react";
import { Link } from "react-router-dom";
import CallScheduleEditor from "@/components/call/CallScheduleEditor";

const PRICE_OPTIONS = [15, 30, 45, 60, 75, 90, 105, 120];

export default function ChannelProfileEdit() {
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();

  // フォームstate
  const [form, setForm] = useState({
    name: "",
    description: "",
    call_theme: "",
    call_available_dates: "",
    call_enabled: false,
    incoming_call_mode: "MANUAL",
    avatar_url: "",
    banner_url: "",
    call_schedule: [],
    call_price_15min: 0,
    call_price_30min: 0,
    call_price_45min: 0,
    call_price_60min: 0,
    call_price_75min: 0,
    call_price_90min: 0,
    call_price_105min: 0,
    call_price_120min: 0,
    tags: [],
  });
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (isAuth) base44.auth.me().then(setUser).catch(() => {});
      else base44.auth.redirectToLogin();
    });
  }, []);

  const { data: channel, isLoading } = useQuery({
    queryKey: ["channel-profile-edit", user?.email],
    queryFn: () => base44.entities.Channel.filter({ owner_email: user.email }).then(r => r[0] || null),
    enabled: !!user?.email,
  });

  useEffect(() => {
    if (!channel) return;
    setForm({
      name: channel.name || "",
      description: channel.description || "",
      call_theme: channel.call_theme || "",
      call_available_dates: channel.call_available_dates || "",
      call_enabled: channel.call_enabled || false,
      incoming_call_mode: channel.incoming_call_mode || "MANUAL",
      avatar_url: channel.avatar_url || "",
      banner_url: channel.banner_url || "",
      call_schedule: channel.call_schedule || [],
      call_price_15min: channel.call_price_15min || 0,
      call_price_30min: channel.call_price_30min || 0,
      call_price_45min: channel.call_price_45min || 0,
      call_price_60min: channel.call_price_60min || 0,
      call_price_75min: channel.call_price_75min || 0,
      call_price_90min: channel.call_price_90min || 0,
      call_price_105min: channel.call_price_105min || 0,
      call_price_120min: channel.call_price_120min || 0,
      tags: channel.tags || [],
    });
  }, [channel]);

  const handleSave = async () => {
    if (!channel) return;
    setSaving(true);
    try {
      await base44.entities.Channel.update(channel.id, form);
      queryClient.invalidateQueries({ queryKey: ["channel-profile-edit"] });
      queryClient.invalidateQueries({ queryKey: ["layout-my-channel"] });
      toast.success("プロフィールを保存しました");
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file, field) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, [field]: file_url }));
    } catch {
      toast.error("画像のアップロードに失敗しました");
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.length >= 10 || form.tags.includes(t)) return;
    setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput("");
  };
  const removeTag = (tag) => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== tag) }));

  if (!user || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary/40 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <p className="text-muted-foreground mb-4">チャンネルがありません。まずチャンネルを作成してください。</p>
        <Link to="/my-channel"><Button className="bg-primary">マイチャンネルへ</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Pencil className="w-5 h-5 text-primary" /> チャンネルLP編集
          </h1>
          <p className="text-xs text-muted-foreground mt-1">通話プロフィールページに表示される情報を編集します</p>
        </div>
        <Link to={`/call-profile/${channel.id}`} target="_blank">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ExternalLink className="w-3.5 h-3.5" /> LP確認
          </Button>
        </Link>
      </div>

      {/* ── 基本情報 ── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2 text-primary">
          <FileText className="w-4 h-4" /> 基本情報
        </h2>

        {/* アバター */}
        <div className="space-y-2">
          <Label className="text-xs">アバター画像</Label>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden bg-secondary border border-border shrink-0">
              {form.avatar_url
                ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-2xl font-black text-primary">{form.name?.[0]}</div>
              }
            </div>
            <label className="cursor-pointer">
              <input type="file" accept="image/*" className="hidden"
                onChange={e => handleImageUpload(e.target.files[0], "avatar_url")} />
              <Button variant="outline" size="sm" disabled={uploading} asChild>
                <span><Image className="w-3.5 h-3.5 mr-1.5" />{uploading ? "アップ中..." : "変更"}</span>
              </Button>
            </label>
          </div>
        </div>

        {/* バナー */}
        <div className="space-y-2">
          <Label className="text-xs">バナー画像（カバー）</Label>
          {form.banner_url && (
            <img src={form.banner_url} alt="" className="w-full h-24 object-cover rounded-xl" />
          )}
          <label className="cursor-pointer">
            <input type="file" accept="image/*" className="hidden"
              onChange={e => handleImageUpload(e.target.files[0], "banner_url")} />
            <Button variant="outline" size="sm" disabled={uploading} asChild>
              <span><Image className="w-3.5 h-3.5 mr-1.5" />{form.banner_url ? "変更" : "バナーをアップロード"}</span>
            </Button>
          </label>
        </div>

        {/* チャンネル名 */}
        <div className="space-y-1.5">
          <Label className="text-xs">チャンネル名</Label>
          <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="bg-secondary border-0" placeholder="チャンネル名" />
        </div>

        {/* タグ */}
        <div className="space-y-2">
          <Label className="text-xs">タグ（最大10個）</Label>
          <div className="flex flex-wrap gap-1.5 mb-1.5">
            {form.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full text-xs font-semibold">
                {tag}
                <button onClick={() => removeTag(tag)} className="hover:text-red-400 transition-colors">×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addTag()}
              className="bg-secondary border-0 text-sm" placeholder="タグを追加してEnter" />
            <Button onClick={addTag} size="sm" variant="outline">追加</Button>
          </div>
        </div>

        {/* プロフィール説明 */}
        <div className="space-y-1.5">
          <Label className="text-xs">プロフィール説明（最大1000文字）</Label>
          <Textarea value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value.slice(0, 1000) }))}
            className="bg-secondary border-0 resize-none" rows={8}
            placeholder="経歴・得意分野・実績など詳しく書いてください" />
          <p className="text-[10px] text-muted-foreground text-right">{form.description.length}/1000</p>
        </div>
      </section>

      {/* ── 通話設定 ── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2 text-primary">
          <PhoneCall className="w-4 h-4" /> 通話・LP設定
        </h2>

        {/* 通話受付ON/OFF */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
          <div>
            <p className="text-sm font-semibold">通話受付</p>
            <p className="text-xs text-muted-foreground">{form.call_enabled ? "受付中" : "受付停止中"}</p>
          </div>
          <Switch checked={form.call_enabled} onCheckedChange={v => setForm(f => ({ ...f, call_enabled: v }))} />
        </div>

        {/* 自動応答 */}
        <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-xl">
          <div>
            <p className="text-sm font-semibold">自動承認</p>
            <p className="text-xs text-muted-foreground">ONにすると着信を自動で承諾します</p>
          </div>
          <Switch
            checked={form.incoming_call_mode === "AUTO_ACCEPT"}
            onCheckedChange={v => setForm(f => ({ ...f, incoming_call_mode: v ? "AUTO_ACCEPT" : "MANUAL" }))}
          />
        </div>

        {/* キャッチコピー */}
        <div className="space-y-1.5">
          <Label className="text-xs">待機メッセージ（キャッチコピー）最大100文字</Label>
          <Input value={form.call_theme}
            onChange={e => setForm(f => ({ ...f, call_theme: e.target.value.slice(0, 100) }))}
            className="bg-secondary border-0" placeholder="例: あなたのビジネスの悩みを解決します！" />
          <p className="text-[10px] text-muted-foreground text-right">{form.call_theme.length}/100</p>
        </div>

        {/* 対応内容メモ */}
        <div className="space-y-1.5">
          <Label className="text-xs">対応内容・備考（最大1000文字）</Label>
          <Textarea value={form.call_available_dates}
            onChange={e => setForm(f => ({ ...f, call_available_dates: e.target.value.slice(0, 1000) }))}
            className="bg-secondary border-0 resize-none" rows={5}
            placeholder="対応可能な内容・時間帯・注意事項などを自由に記入" />
          <p className="text-[10px] text-muted-foreground text-right">{form.call_available_dates.length}/1000</p>
        </div>

        {/* 料金設定 */}
        <div className="space-y-2">
          <Label className="text-xs flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-yellow-400" /> 通話料金設定（円）0=非表示</Label>
          <div className="grid grid-cols-2 gap-2">
            {PRICE_OPTIONS.map(min => (
              <div key={min} className="flex items-center gap-2 bg-secondary/60 rounded-lg px-3 py-2">
                <span className="text-xs text-muted-foreground w-12 shrink-0">{min}分</span>
                <Input
                  type="number" min={0} step={100}
                  value={form[`call_price_${min}min`]}
                  onChange={e => setForm(f => ({ ...f, [`call_price_${min}min`]: Number(e.target.value) }))}
                  className="bg-transparent border-0 p-0 h-6 text-sm font-bold focus:ring-0"
                  placeholder="0"
                />
                <span className="text-xs text-muted-foreground">円</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── スケジュールカレンダー ── */}
      <section className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="font-bold text-sm flex items-center gap-2 text-primary">
          <CalendarDays className="w-4 h-4" /> 待機スケジュール
        </h2>
        <CallScheduleEditor
          schedule={form.call_schedule}
          onChange={s => setForm(f => ({ ...f, call_schedule: s }))}
        />
      </section>

      {/* 保存ボタン */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-black text-base gap-2"
      >
        <Save className="w-5 h-5" /> {saving ? "保存中..." : "すべて保存する"}
      </Button>
    </div>
  );
}