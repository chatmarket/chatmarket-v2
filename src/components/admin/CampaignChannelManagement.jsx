import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tag, CheckCircle2, XCircle, Search } from "lucide-react";
import { toast } from "sonner";

export default function CampaignChannelManagement() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [note, setNote] = useState({});

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ["admin-all-channels-campaign"],
    queryFn: () => base44.entities.Channel.list("-created_date", 200),
  });

  const filtered = channels.filter(
    (c) =>
      !search ||
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_email?.toLowerCase().includes(search.toLowerCase())
  );

  const campaignChannels = filtered.filter((c) => c.campaign_allowed);
  const normalChannels = filtered.filter((c) => !c.campaign_allowed);

  const handleToggle = async (channel, allow) => {
    await base44.entities.Channel.update(channel.id, {
      campaign_allowed: allow,
      campaign_note: allow ? (note[channel.id] || "") : "",
    });
    queryClient.invalidateQueries({ queryKey: ["admin-all-channels-campaign"] });
    toast.success(allow ? `${channel.name} のキャンペーン許可を付与しました` : `${channel.name} のキャンペーン許可を解除しました`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-xs text-yellow-300 space-y-1">
        <p className="font-bold text-sm">⚠️ キャンペーンフラグとは</p>
        <p>このフラグを付与されたライバーは、ライブ配信（最低150コイン/15分）およびVOD（最低100コイン）の<strong className="text-white">最低価格制限が免除</strong>されます。</p>
        <p>「1円配信」「無料配信」などの特例企画に使用してください。許可は慎重に行ってください。</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="チャンネル名・メールで検索"
          className="bg-secondary border-0 pl-9"
        />
      </div>

      {/* キャンペーン許可中 */}
      {campaignChannels.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-bold text-yellow-400 flex items-center gap-2">
            <Tag className="w-4 h-4" /> キャンペーン許可中 ({campaignChannels.length}件)
          </p>
          {campaignChannels.map((ch) => (
            <div key={ch.id} className="bg-yellow-500/5 border border-yellow-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {ch.avatar_url
                  ? <img src={ch.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold">{ch.name?.[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{ch.name}</p>
                <p className="text-xs text-muted-foreground truncate">{ch.owner_email}</p>
                {ch.campaign_note && (
                  <p className="text-xs text-yellow-300/70 mt-0.5">📝 {ch.campaign_note}</p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-500/40 hover:bg-red-500/10 gap-1 shrink-0"
                onClick={() => handleToggle(ch, false)}
              >
                <XCircle className="w-3.5 h-3.5" /> 解除
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* 通常チャンネル一覧 */}
      <div className="space-y-2">
        <p className="text-sm font-bold text-muted-foreground">通常チャンネル ({normalChannels.length}件)</p>
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4 animate-pulse">読み込み中...</p>
        ) : normalChannels.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">該当チャンネルなし</p>
        ) : (
          normalChannels.slice(0, 50).map((ch) => (
            <div key={ch.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-secondary overflow-hidden flex items-center justify-center shrink-0">
                {ch.avatar_url
                  ? <img src={ch.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm font-bold">{ch.name?.[0]}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{ch.name}</p>
                <p className="text-xs text-muted-foreground truncate">{ch.owner_email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Input
                  value={note[ch.id] || ""}
                  onChange={(e) => setNote((n) => ({ ...n, [ch.id]: e.target.value }))}
                  placeholder="許可メモ（任意）"
                  className="bg-secondary border-0 h-8 text-xs w-36"
                />
                <Button
                  size="sm"
                  className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 hover:bg-yellow-500/30 gap-1"
                  onClick={() => handleToggle(ch, true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> 許可
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}