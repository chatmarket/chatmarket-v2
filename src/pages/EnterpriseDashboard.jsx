import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Building2, Users, Plus, Settings, ArrowLeft, CheckCircle2,
  Clock, XCircle, Copy, RefreshCw, Trash2, Eye, EyeOff
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MAX_SUB_CHANNELS = 100;

const STATUS_CONFIG = {
  active:          { label: "有効", color: "bg-green-500/10 text-green-400 border-green-500/30", icon: CheckCircle2 },
  inactive:        { label: "無効", color: "bg-secondary text-muted-foreground border-border", icon: XCircle },
  pending_invite:  { label: "招待待ち", color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/30", icon: Clock },
};

function generateLoginId(parentName, slot) {
  const base = (parentName || "channel").toLowerCase().replace(/\s+/g, "").slice(0, 12);
  return `${base}-sub${String(slot).padStart(3, "0")}@chatmarket.info`;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#";
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function EnterpriseDashboard() {
  const [user, setUser] = useState(null);
  const [channel, setChannel] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(null);
  const [newSlotName, setNewSlotName] = useState("");
  const [newSlotEmail, setNewSlotEmail] = useState("");
  const [newSlotNotes, setNewSlotNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [showPassId, setShowPassId] = useState({});
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.isAuthenticated().then((isAuth) => {
      if (!isAuth) { base44.auth.redirectToLogin(); return; }
      base44.auth.me().then((u) => {
        setUser(u);
        base44.entities.Channel.filter({ owner_email: u.email }).then((ch) => {
          if (ch[0]) setChannel(ch[0]);
        });
      });
    });
  }, []);

  const { data: subChannels = [] } = useQuery({
    queryKey: ["enterprise-sub-channels", channel?.id],
    queryFn: () => base44.entities.EnterpriseChannel.filter({ parent_channel_id: channel.id }, "slot_number", 100),
    enabled: !!channel?.id,
  });

  const usedSlots = subChannels.map((s) => s.slot_number);
  const nextSlot = Array.from({ length: MAX_SUB_CHANNELS }, (_, i) => i + 1).find((n) => !usedSlots.includes(n));

  const handleAdd = async () => {
    if (!channel || !nextSlot) return;
    setAdding(true);
    const loginId = newSlotEmail || generateLoginId(channel.name, nextSlot);
    const password = generatePassword();

    await base44.entities.EnterpriseChannel.create({
      owner_email: user.email,
      parent_channel_id: channel.id,
      parent_channel_name: channel.name,
      sub_channel_name: newSlotName || `サブチャンネル ${nextSlot}`,
      sub_channel_login_id: loginId,
      sub_channel_password_hash: password,
      slot_number: nextSlot,
      status: "pending_invite",
      notes: newSlotNotes,
      invited_at: new Date().toISOString(),
    });

    // 招待メール送信
    await base44.integrations.Core.SendEmail({
      to: loginId,
      subject: `【ChatMarket】${channel.name} のサブチャンネルに招待されました`,
      body: `${channel.name} のエンタープライズプランのサブチャンネルとして招待されました。\n\nログインID: ${loginId}\n初期パスワード: ${password}\n\nログイン後、パスワードを変更してください。\nhttps://chatmarket.info`,
    }).catch(() => {});

    queryClient.invalidateQueries({ queryKey: ["enterprise-sub-channels", channel.id] });
    setAdding(false);
    setShowAddModal(false);
    setNewSlotName("");
    setNewSlotEmail("");
    setNewSlotNotes("");
    toast.success("サブチャンネルを追加しました");
  };

  const handleStatusToggle = async (sub) => {
    const newStatus = sub.status === "active" ? "inactive" : "active";
    const updates = { status: newStatus };
    if (newStatus === "active" && !sub.activated_at) {
      updates.activated_at = new Date().toISOString();
    }
    await base44.entities.EnterpriseChannel.update(sub.id, updates);
    queryClient.invalidateQueries({ queryKey: ["enterprise-sub-channels", channel.id] });
    toast.success(`ステータスを ${STATUS_CONFIG[newStatus].label} に変更しました`);
  };

  const handleDelete = async (sub) => {
    if (!confirm(`スロット${sub.slot_number}「${sub.sub_channel_name}」を削除しますか？`)) return;
    await base44.entities.EnterpriseChannel.delete(sub.id);
    queryClient.invalidateQueries({ queryKey: ["enterprise-sub-channels", channel.id] });
    toast.success("削除しました");
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("コピーしました");
  };

  const activeCount = subChannels.filter((s) => s.status === "active").length;

  if (!user || !channel) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/creator-dashboard">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-black flex items-center gap-2">
            <Building2 className="w-6 h-6 text-primary" /> エンタープライズ管理
          </h1>
          <p className="text-sm text-muted-foreground">親チャンネル：{channel.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold bg-violet-500/20 text-violet-300 border border-violet-500/30 px-3 py-1 rounded-full">
            エンタープライズプラン
          </span>
          <span className="text-xs text-muted-foreground">¥59,800/月</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-primary">{subChannels.length}</p>
          <p className="text-xs text-muted-foreground">サブチャンネル数</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-green-400">{activeCount}</p>
          <p className="text-xs text-muted-foreground">有効</p>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
          <p className="text-2xl font-black text-muted-foreground">{MAX_SUB_CHANNELS - subChannels.length}</p>
          <p className="text-xs text-muted-foreground">残り枠</p>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="bg-card border border-border/50 rounded-xl p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" /> サブチャンネル使用状況
          </span>
          <span className="text-muted-foreground">{subChannels.length} / {MAX_SUB_CHANNELS}</span>
        </div>
        <div className="w-full h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(subChannels.length / MAX_SUB_CHANNELS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">最大{MAX_SUB_CHANNELS}チャンネルまで管理できます</p>
      </div>

      {/* Add button */}
      <div className="flex justify-between items-center">
        <h2 className="font-bold">サブチャンネル一覧</h2>
        <Button
          onClick={() => setShowAddModal(true)}
          disabled={subChannels.length >= MAX_SUB_CHANNELS}
          className="bg-primary hover:bg-primary/90 gap-2"
          size="sm"
        >
          <Plus className="w-4 h-4" /> サブチャンネルを追加
        </Button>
      </div>

      {/* Sub channel list */}
      {subChannels.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground bg-card border border-border/50 rounded-xl">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">まだサブチャンネルがありません</p>
          <p className="text-xs mt-1">「サブチャンネルを追加」から最大100チャンネルまで作成できます</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subChannels.map((sub) => {
            const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.pending_invite;
            const StatusIcon = cfg.icon;
            const showPass = showPassId[sub.id];
            return (
              <div key={sub.id} className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3 flex-wrap">
                {/* Slot number */}
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-black text-primary">#{sub.slot_number}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-bold text-sm truncate">{sub.sub_channel_name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <span className="font-mono truncate max-w-[180px]">{sub.sub_channel_login_id}</span>
                    <button onClick={() => copyToClipboard(sub.sub_channel_login_id)} className="hover:text-foreground">
                      <Copy className="w-3 h-3" />
                    </button>
                    <span className="text-border">|</span>
                    <span className="font-mono">
                      {showPass ? sub.sub_channel_password_hash : "••••••••••••"}
                    </span>
                    <button onClick={() => setShowPassId((p) => ({ ...p, [sub.id]: !p[sub.id] }))} className="hover:text-foreground">
                      {showPass ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    {showPass && (
                      <button onClick={() => copyToClipboard(sub.sub_channel_password_hash)} className="hover:text-foreground">
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {sub.notes && <p className="text-xs text-muted-foreground/70 truncate">{sub.notes}</p>}
                </div>

                {/* Status badge */}
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 shrink-0 ${cfg.color}`}>
                  <StatusIcon className="w-3 h-3" />
                  {cfg.label}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleStatusToggle(sub)}
                    className="text-xs h-8 px-2"
                  >
                    {sub.status === "active" ? "無効化" : "有効化"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(sub)}
                    className="text-xs h-8 px-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> サブチャンネルを追加
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-secondary rounded-xl p-3 text-xs text-muted-foreground">
              スロット番号 <span className="text-primary font-bold">#{nextSlot}</span> が割り当てられます
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">チャンネル名</label>
              <Input
                value={newSlotName}
                onChange={(e) => setNewSlotName(e.target.value)}
                placeholder={`サブチャンネル ${nextSlot}`}
                className="bg-secondary border-0"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">ログインID（メール）<span className="text-muted-foreground/60">※空白で自動生成</span></label>
              <Input
                value={newSlotEmail}
                onChange={(e) => setNewSlotEmail(e.target.value)}
                placeholder={`${(channel.name || "channel").toLowerCase().slice(0, 8)}-sub${String(nextSlot || 1).padStart(3, "0")}@chatmarket.info`}
                className="bg-secondary border-0 font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">備考（任意）</label>
              <Input
                value={newSlotNotes}
                onChange={(e) => setNewSlotNotes(e.target.value)}
                placeholder="担当者名、用途など"
                className="bg-secondary border-0"
              />
            </div>

            <p className="text-xs text-muted-foreground bg-secondary rounded-lg p-2.5">
              ※ 初期パスワードは自動生成されます。ログイン後に変更を促してください。
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>キャンセル</Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90 gap-2" onClick={handleAdd} disabled={adding}>
                {adding ? "追加中..." : <><Plus className="w-4 h-4" /> 追加</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}