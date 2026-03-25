import React from "react";
import { X, Mail, User, Calendar, Shield, MapPin, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UserDetailModal({ user, onClose }) {
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
            <span
              className={`text-sm px-2 py-0.5 rounded-full inline-block ${
                user.role === "admin" ? "bg-red-500/20 text-red-300" : "bg-primary/20 text-primary"
              }`}
            >
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

        <Button onClick={onClose} className="w-full bg-primary hover:bg-primary/90">
          閉じる
        </Button>
      </div>
    </div>
  );
}