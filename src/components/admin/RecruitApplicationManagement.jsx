import React, { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, User, Mail, Users, Link as LinkIcon, MessageCircle, Zap } from "lucide-react";
import { toast } from "sonner";

export default function RecruitApplicationManagement() {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);

  const { data: applications = [] } = useQuery({
    queryKey: ["admin-recruit-applications"],
    queryFn: () =>
      base44.entities.BlogPost.filter(
        { channel_id: "recruit_application", status: "draft" },
        "-created_date"
      ),
    refetchInterval: 15000,
  });

  // 新しい申し込みの通知
  useEffect(() => {
    if (applications.length > prevCountRef.current) {
      const newCount = applications.length - prevCountRef.current;
      toast.success(`🔔 新しいライバー申込 ${newCount}件`, {
        duration: 5000,
        description: "管理画面で確認してください",
      });
    }
    prevCountRef.current = applications.length;
  }, [applications.length]);

  const handleApprove = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // 申請者にメール送信
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "【ChatMarket】ライバー申込 - 承認のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただき、承認させていただきました。\n\n全プランの無料期間が自動的に適用されております。\nお気軽にChatMarketをお始めください。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      });

      // BlogPostを削除（承認済み）
      await base44.entities.BlogPost.delete(app.id);
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を承認しました`);
    } catch (err) {
      toast.error("承認処理に失敗しました: " + err.message);
    }
  };

  const handleReject = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // 申請者にメール送信
      await base44.integrations.Core.SendEmail({
        to: data.email,
        subject: "【ChatMarket】ライバー申込 - 審査結果のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただきましたが、現在のところご参加をお断りさせていただいております。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      });

      // BlogPostを削除（却下済み）
      await base44.entities.BlogPost.delete(app.id);
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を却下しました`);
    } catch (err) {
      toast.error("却下処理に失敗しました: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* 件数バッジ */}
      <div className="flex items-center gap-3">
        <h3 className="text-lg font-bold">ライバー申込状況</h3>
        {applications.length > 0 && (
          <Badge className="bg-red-500 text-white text-base px-3 py-1">
            {applications.length}件
          </Badge>
        )}
      </div>

      {/* 申込一覧 */}
      {applications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>申込はまだありません</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => {
            const data = JSON.parse(app.content);
            const isTierPro = (data.followers || 0) >= 10000;

            return (
              <div
                key={app.id}
                className="bg-card rounded-xl border border-border/50 p-5 space-y-4 hover:border-primary/30 transition-all"
              >
                {/* ヘッダー */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-base font-bold text-foreground">
                        {data.name}
                      </h4>
                      {isTierPro && (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40">
                          Pro申し込み
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">
                      {data.email}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(app.created_date).toLocaleString("ja-JP")}
                  </p>
                </div>

                {/* フォロワー数 */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">フォロワー:</span>
                  <span className="font-bold">
                    {(data.followers || 0).toLocaleString()}人
                  </span>
                  {isTierPro && (
                    <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                      1万人以上 → 3ヶ月無料
                    </span>
                  )}
                </div>

                {/* SNS */}
                {data.sns_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <LinkIcon className="w-4 h-4 text-blue-400" />
                    <a
                      href={data.sns_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:underline truncate"
                    >
                      {data.sns_url}
                    </a>
                  </div>
                )}

                {/* PR */}
                {data.pr && (
                  <div className="bg-secondary rounded-lg p-3 text-sm">
                    <p className="text-xs text-muted-foreground mb-1 font-semibold">
                      自己PR:
                    </p>
                    <p className="text-foreground line-clamp-3">{data.pr}</p>
                  </div>
                )}

                {/* アクション */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleApprove(app)}
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    承認
                  </Button>
                  <Button
                    onClick={() => handleReject(app)}
                    variant="outline"
                    className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    却下
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 説明 */}
      <div className="bg-secondary rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p>• 承認: 申請者に確認メールを送信 → プロフィール設定に進める</p>
        <p>• 却下: 申請者に却下メールを送信 → 再度申し込み可能</p>
        <p className="pt-2 border-t border-border/50">
          Pro申し込み（フォロワー1万人以上）は3ヶ月無料、通常申し込みは初月無料
        </p>
      </div>
    </div>
  );
}