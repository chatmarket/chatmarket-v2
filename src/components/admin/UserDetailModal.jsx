import React, { useEffect, useState } from "react";
import { X, Mail, User, Calendar, Shield, MapPin, Phone, FileText, Radio, Trash2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function UserDetailModal({ user, onClose }) {
  const [channels, setChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  useEffect(() => {
    base44.entities.Channel.filter({ owner_email: user.email })
      .then(setChannels)
      .finally(() => setLoadingChannels(false));
  }, [user.email]);

  const handleDeleteChannel = async (channelId) => {
    setDeletingId(channelId);
    await base44.entities.Channel.delete(channelId);
    setChannels(prev => prev.filter(c => c.id !== channelId));
    setDeletingId(null);
    setConfirmId(null);
    toast.success("チャンネルを削除しました");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-2xl border border-border/50 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">ユーザー詳細情報</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* メール */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              <span className="text-xs font-semibold">メールアドレス</span>
            </div>
            <p className="font-mono text-sm break-all">{user.email}</p>
          </div>

          {/* ロール */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold">ロール</span>
            </div>
            <span className={`text-sm px-2 py-0.5 rounded-full inline-block ${
              user.role === "admin" ? "bg-red-500/20 text-red-300" : "bg-primary/20 text-primary"
            }`}>
              {user.role === "admin" ? "管理者" : "ユーザー"}
            </span>
          </div>

          {/* 氏名 */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-xs font-semibold">氏名</span>
            </div>
            <p className="text-sm">{user.full_name || "未設定"}</p>
          </div>

          {/* 登録日 */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-semibold">登録日</span>
            </div>
            <p className="text-sm">{new Date(user.created_date).toLocaleString("ja-JP")}</p>
          </div>

          {/* 住所 */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-semibold">住所</span>
            </div>
            <p className="text-sm">{user.address || "未設定"}</p>
          </div>

          {/* 電話番号 */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span className="text-xs font-semibold">電話番号</span>
            </div>
            <p className="text-sm">{user.phone || "未設定"}</p>
          </div>

          {/* ニックネーム */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span className="text-xs font-semibold">ニックネーム</span>
            </div>
            <p className="text-sm">{user.nickname || "未設定"}</p>
          </div>

          {/* 地域 */}
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-semibold">地域</span>
            </div>
            <p className="text-sm">{user.region || "未設定"}</p>
          </div>
        </div>

        {/* バイオ */}
        {user.bio && (
          <div className="bg-secondary rounded-lg p-4 space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-semibold">プロフィール</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{user.bio}</p>
          </div>
        )}

        {/* プロフィール画像 */}
        {user.avatar_url && (
          <div className="bg-secondary rounded-lg p-4 space-y-2">
            <span className="text-xs font-semibold text-muted-foreground">プロフィール画像</span>
            <img src={user.avatar_url} alt={user.full_name} className="w-20 h-20 rounded-lg object-cover" />
          </div>
        )}

        {/* ── 登録チャンネル ── */}
        <div className="border border-border/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-primary" />
            <span className="text-sm font-bold">登録チャンネル</span>
            {!loadingChannels && (
              <span className="text-xs text-muted-foreground">（{channels.length}件）</span>
            )}
          </div>

          {loadingChannels ? (
            <p className="text-xs text-muted-foreground">読み込み中...</p>
          ) : channels.length === 0 ? (
            <p className="text-xs text-muted-foreground">チャンネルなし</p>
          ) : (
            <div className="space-y-2">
              {channels.map(ch => (
                <div key={ch.id} className="flex items-center justify-between bg-secondary rounded-lg px-3 py-2 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    {ch.avatar_url && (
                      <img src={ch.avatar_url} alt={ch.name} className="w-7 h-7 rounded-full object-cover shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{ch.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{ch.id}</p>
                    </div>
                  </div>

                  {confirmId === ch.id ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5 text-destructive" />
                      <span className="text-xs text-destructive font-bold">本当に削除？</span>
                      <button
                        onClick={() => handleDeleteChannel(ch.id)}
                        disabled={deletingId === ch.id}
                        className="ml-1 px-2 py-0.5 text-xs font-bold bg-destructive text-white rounded-md hover:bg-destructive/80 transition-colors disabled:opacity-50"
                      >
                        {deletingId === ch.id ? "削除中..." : "削除"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        className="px-2 py-0.5 text-xs bg-secondary border border-border rounded-md hover:bg-muted transition-colors"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(ch.id)}
                      className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90">
          閉じる
        </Button>
      </div>
    </div>
  );
}