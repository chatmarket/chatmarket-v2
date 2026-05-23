import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Palette, Type, Check, Loader2, Link } from "lucide-react";
import { toast } from "sonner";

const FONTS = [
  { value: "gothic", label: "ゴシック", preview: "Noto Sans JP" },
  { value: "mincho", label: "明朝体", preview: "Noto Serif JP" },
  { value: "maru", label: "丸ゴシック", preview: "rounded" },
  { value: "modern", label: "モダン", preview: "Inter" },
];

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#ef4444",
  "#f59e0b", "#10b981", "#3b82f6", "#06b6d4",
  "#ffffff", "#a855f7",
];

const CATEGORY_DEFAULT_COLORS = {
  fortune_telling: "#8b5cf6",
  idol: "#ec4899",
  business: "#3b82f6",
  language: "#10b981",
  fitness: "#f59e0b",
  education: "#06b6d4",
  other: "#6366f1",
};

export default function ProfileLPEditor({ channel, userEmail }) {
  const queryClient = useQueryClient();
  const defaultAccent = CATEGORY_DEFAULT_COLORS[channel?.service_category] || "#6366f1";

  const [accentColor, setAccentColor] = useState(channel?.lp_accent_color || defaultAccent);
  const [bgColor, setBgColor] = useState(channel?.lp_bg_color || "#0f1729");
  const [font, setFont] = useState(channel?.lp_font || "gothic");
  const [username, setUsername] = useState(channel?.username || "");
  const [saving, setSaving] = useState(false);

  const lpUrl = username
    ? `${window.location.origin}/@${username}`
    : `${window.location.origin}/@${channel?.id}`;

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Channel.update(channel.id, {
      lp_accent_color: accentColor,
      lp_bg_color: bgColor,
      lp_font: font,
      username: username || undefined,
    });
    queryClient.invalidateQueries({ queryKey: ["my-channel-dashboard", userEmail] });
    toast.success("プロフィールLPを更新しました");
    setSaving(false);
  };

  if (!channel) return null;

  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            プロフィールLP デザイン設定
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">あなた専用のリンクページをカスタマイズできます</p>
        </div>
        <a href={lpUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2 text-xs">
            <ExternalLink className="w-3 h-3" /> LPを確認
          </Button>
        </a>
      </div>

      {/* URL / ユーザー名設定 */}
      <div className="space-y-2">
        <label className="text-xs font-bold flex items-center gap-1.5 text-muted-foreground">
          <Link className="w-3 h-3" /> ユーザー名（URL）
        </label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">@</span>
          <Input
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase())}
            placeholder={channel?.id?.slice(0, 12)}
            className="text-sm h-8"
          />
        </div>
        <p className="text-xs text-muted-foreground break-all">{lpUrl}</p>
      </div>

      {/* アクセントカラー */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Palette className="w-3 h-3" /> アクセントカラー
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setAccentColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative"
              style={{ background: c, border: "2px solid rgba(255,255,255,0.1)" }}
            >
              {accentColor === c && (
                <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
            title="カスタムカラーを選択"
          />
        </div>
      </div>

      {/* 背景カラー */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground">背景カラー</label>
        <div className="flex items-center gap-2">
          {["#0f1729", "#0d0a1a", "#0a0f0a", "#0d0a0d", "#0a0a0a", "#1a1008"].map((c) => (
            <button
              key={c}
              onClick={() => setBgColor(c)}
              className="w-7 h-7 rounded-full transition-transform hover:scale-110 relative"
              style={{ background: c, border: bgColor === c ? "2px solid white" : "2px solid rgba(255,255,255,0.15)" }}
            >
              {bgColor === c && <Check className="w-3 h-3 text-white absolute inset-0 m-auto drop-shadow" />}
            </button>
          ))}
          <input
            type="color"
            value={bgColor}
            onChange={(e) => setBgColor(e.target.value)}
            className="w-7 h-7 rounded-full cursor-pointer border-0 bg-transparent"
          />
        </div>
      </div>

      {/* フォント選択 */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
          <Type className="w-3 h-3" /> フォントスタイル
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {FONTS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFont(f.value)}
              className="p-2.5 rounded-lg text-xs transition-all text-center"
              style={{
                border: font === f.value ? `1.5px solid ${accentColor}` : "1.5px solid rgba(255,255,255,0.1)",
                background: font === f.value ? `${accentColor}15` : "transparent",
                color: font === f.value ? accentColor : "rgba(255,255,255,0.6)",
                fontFamily: f.preview === "rounded" ? "sans-serif" : f.preview,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* プレビュー */}
      <div
        className="rounded-xl p-4 text-center space-y-2"
        style={{ background: bgColor, border: `1px solid ${accentColor}30` }}
      >
        {channel.avatar_url ? (
          <img src={channel.avatar_url} alt="" className="w-12 h-12 rounded-full mx-auto object-cover"
            style={{ border: `2px solid ${accentColor}60` }} />
        ) : (
          <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center font-black text-xl"
            style={{ background: `${accentColor}25`, color: accentColor }}>
            {channel.name?.[0]}
          </div>
        )}
        <p className="text-white font-black text-sm" style={{ fontFamily: FONTS.find(f => f.value === font)?.preview }}>
          {channel.name}
        </p>
        <div className="w-full py-2.5 rounded-xl text-xs font-bold"
          style={{ background: `${accentColor}20`, border: `1px solid ${accentColor}40`, color: accentColor }}>
          💬 メッセージを送る
        </div>
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="sm">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {saving ? "保存中..." : "デザインを保存する"}
      </Button>
    </div>
  );
}