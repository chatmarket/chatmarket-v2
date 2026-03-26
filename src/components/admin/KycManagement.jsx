import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Shield, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function KycManagement() {
  const [processing, setProcessing] = useState(null);

  const { data: allUsers = [], refetch } = useQuery({
    queryKey: ["admin-kyc-users"],
    queryFn: () => base44.entities.User.list(),
  });

  // 身分証がアップロードされていて審査待ちのユーザー
  const pendingUsers = allUsers.filter(
    (u) => u.identity_document_url && u.identity_document_status === "pending"
  );

  const handleApprove = async (user) => {
    setProcessing(user.id + "approve");
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        identity_document_status: "approved",
      });
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: "ChatMarket",
        subject: "【本人確認完了】身分証の確認が完了しました",
        body: `${user.full_name || user.email} 様\n\n身分証の確認が完了しました。\nご登録いただいた情報をもとに本人確認が正常に完了しています。\n\nChatMarket サポートチーム`,
      });
      toast.success("KYCを承認しました");
      refetch();
    } catch (err) {
      toast.error("処理に失敗しました");
    }
    setProcessing(null);
  };

  const handleReject = async (user) => {
    setProcessing(user.id + "reject");
    try {
      await base44.asServiceRole.entities.User.update(user.id, {
        identity_document_status: "rejected",
      });
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: "ChatMarket",
        subject: "【本人確認】書類の再提出をお願いします",
        body: `${user.full_name || user.email} 様\n\n提出いただいた身分証の確認ができませんでした。\n以下の点をご確認の上、再度書類をアップロードしてください。\n\n・有効期限内の公的身分証明書をご使用ください\n・画像が鮮明で全体が写っていることをご確認ください\n\nChatMarket サポートチーム`,
      });
      toast.success("却下しました");
      refetch();
    } catch (err) {
      toast.error("処理に失敗しました");
    }
    setProcessing(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-5 h-5 text-blue-400" />
        <h3 className="font-bold text-lg">KYC審査管理</h3>
        <span className="text-xs bg-blue-500/20 text-blue-300 rounded-full px-2 py-0.5">
          審査待ち: {pendingUsers.length}件
        </span>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-muted-foreground">審査待ちのKYC申請はありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="bg-card border border-blue-500/30 rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="font-semibold">{user.full_name || "氏名未設定"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">住所: {user.address || "未設定"}</p>
                  <p className="text-xs text-muted-foreground">電話: {user.phone || "未設定"}</p>
                  <p className="text-xs text-muted-foreground">
                    申請日: {new Date(user.updated_date || user.created_date).toLocaleString("ja-JP")}
                  </p>
                </div>
                {user.identity_document_url && (
                  <a href={user.identity_document_url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="outline" className="gap-1 shrink-0">
                      <ExternalLink className="w-3 h-3" /> 書類確認
                    </Button>
                  </a>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove(user)}
                  disabled={!!processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {processing === user.id + "approve" ? "処理中..." : "承認"}
                </Button>
                <Button
                  onClick={() => handleReject(user)}
                  disabled={!!processing}
                  variant="destructive"
                  className="flex-1 gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  {processing === user.id + "reject" ? "処理中..." : "却下"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 全審査済みユーザー一覧 */}
      <div className="bg-card rounded-xl border border-border/50 p-5 space-y-3">
        <h4 className="font-semibold text-sm">審査済みユーザー</h4>
        <div className="space-y-2">
          {allUsers
            .filter((u) => u.identity_document_url && u.identity_document_status !== "pending")
            .map((user) => (
              <div key={user.id} className="flex items-center justify-between text-sm py-2 border-b border-border/30">
                <div>
                  <p className="font-medium">{user.full_name || user.email}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  user.identity_document_status === "approved"
                    ? "bg-green-500/20 text-green-300"
                    : "bg-red-500/20 text-red-300"
                }`}>
                  {user.identity_document_status === "approved" ? "✓ 承認済み" : "✗ 却下"}
                </span>
              </div>
            ))}
          {allUsers.filter((u) => u.identity_document_url && u.identity_document_status !== "pending").length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">審査済みユーザーはいません</p>
          )}
        </div>
      </div>
    </div>
  );
}