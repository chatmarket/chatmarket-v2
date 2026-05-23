import React, { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Users, MessageCircle, Download, ExternalLink, Mail, Calendar, Instagram, Twitter, Youtube, Globe } from "lucide-react";
import { toast } from "sonner";

export default function RecruitApplicationManagement({ applications: propsApplications = [] }) {
  const queryClient = useQueryClient();
  const prevCountRef = useRef(0);
  const [selectedApp, setSelectedApp] = useState(null);

  // AdminDashboardからpropsで受け取ったapplicationsを使用（採用済みは除外）
  const applications = (propsApplications || []).filter(app => app.recruit_status !== "採用");

  // 重複メールを検出（同一メールで複数申込）
  const emailCountMap = applications.reduce((acc, app) => {
    try {
      const d = JSON.parse(app.content);
      if (d.email) acc[d.email] = (acc[d.email] || 0) + 1;
    } catch {}
    return acc;
  }, {});
  const isDuplicate = (app) => {
    try {
      const d = JSON.parse(app.content);
      return d.email && emailCountMap[d.email] > 1;
    } catch { return false; }
  };

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

  const handleDuplicateNotify = async (app) => {
    try {
      const data = JSON.parse(app.content);
      await base44.functions.invoke("notifyAdminNewUser", {
        type: "recruit_rejected",
        to_email: data.email,
        to_name: data.name,
        subject: "【ChatMarket】ライバー申込 - 重複申込のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご確認したところ、同一のメールアドレスで既にお申込みいただいている記録がございます。\n\n重複申込となりますので、本申込はお断りさせていただきます。\n既にご登録済みの方は、そのままサービスをご利用いただけます。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      }).catch(() => {});
      await base44.entities.BlogPost.update(app.id, { recruit_status: "不採用" });
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}に重複申込メールを送信しました`);
    } catch (err) {
      toast.error("処理に失敗しました: " + err.message);
    }
  };

  const handleApprove = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // バックエンド関数経由でメール送信（アプリ外ユーザーにも送信可能）
      await base44.functions.invoke("notifyAdminNewUser", {
        type: "recruit_approved",
        to_email: data.email,
        to_name: data.name,
        subject: "【ChatMarket】ライバー申込 - 承認のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただき、承認させていただきました。\n\nお気軽にChatMarketをお始めください。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      }).catch(() => {}); // メール失敗しても処理継続

      // ステータスを採用に更新
      await base44.entities.BlogPost.update(app.id, { recruit_status: "採用" });
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を承認しました`);
    } catch (err) {
      toast.error("承認処理に失敗しました: " + err.message);
    }
  };

  const handleReject = async (app) => {
    try {
      const data = JSON.parse(app.content);
      // バックエンド関数経由でメール送信
      await base44.functions.invoke("notifyAdminNewUser", {
        type: "recruit_rejected",
        to_email: data.email,
        to_name: data.name,
        subject: "【ChatMarket】ライバー申込 - 審査結果のお知らせ",
        body: `${data.name}様\n\nいつもお世話になっております。\n\nこの度はChatMarketのライバー申込をいただきありがとうございました。\n\nご申込内容を確認させていただきましたが、現在のところご参加をお断りさせていただいております。\n\nご不明な点がございましたら、お気軽にお問い合わせください。\n\n---\nChatMarket 運営チーム`,
      }).catch(() => {}); // メール失敗しても処理継続

      // ステータスを不採用に更新
      await base44.entities.BlogPost.update(app.id, { recruit_status: "不採用" });
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`${data.name}の申込を却下しました`);
    } catch (err) {
      toast.error("却下処理に失敗しました: " + err.message);
    }
  };

  const handleStatusChange = async (app, newStatus) => {
    try {
      await base44.entities.BlogPost.update(app.id, {
        recruit_status: newStatus,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-recruit-applications"] });
      toast.success(`ステータスを「${newStatus}」に更新しました`);
    } catch (err) {
      toast.error("ステータス更新に失敗しました: " + err.message);
    }
  };

  const handleExportCSV = () => {
    const headers = ["申し込み日時", "申し込み者", "メール", "フォロワー数", "SNS", "自己PR", "ステータス"];
    const rows = applications.map((app) => {
      const data = JSON.parse(app.content);
      return [
        new Date(app.created_date).toLocaleString("ja-JP"),
        data.name || "",
        data.email || "",
        data.followers || "0",
        data.sns_url || "",
        data.pr ? data.pr.replace(/\n/g, " ").substring(0, 100) : "",
        app.recruit_status || "未対応",
      ];
    });

    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `recruit-applications-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success("CSVファイルをダウンロードしました");
  };

  return (
    <div className="space-y-6">
      {/* 件数バッジとCSVエクスポート */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold">ライバー申込状況</h3>
          {applications.length > 0 && (
            <Badge className="bg-red-500 text-white text-base px-3 py-1">
              {applications.length}件
            </Badge>
          )}
        </div>
        {applications.length > 0 && (
          <Button
            onClick={handleExportCSV}
            variant="outline"
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Download className="w-4 h-4" /> CSV出力
          </Button>
        )}
      </div>

      {/* 申込一覧テーブル */}
      {applications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border/50 p-8 text-center text-muted-foreground">
          <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>申込はまだありません</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/50 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/50">
                <th className="text-left py-3 px-4 font-bold">申し込み者</th>
                <th className="text-left py-3 px-4 font-bold">メール</th>
                <th className="text-left py-3 px-4 font-bold">フォロワー</th>
                <th className="text-center py-3 px-4 font-bold">ステータス</th>
                <th className="text-left py-3 px-4 font-bold">申し込み日時</th>
                <th className="text-center py-3 px-4 font-bold">アクション</th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => {
                const data = JSON.parse(app.content);
                const isTierPro = (data.followers || 0) >= 10000;
                const dup = isDuplicate(app);

                return (
                  <tr key={app.id} className={`border-b border-border/30 hover:bg-secondary/50 transition-colors cursor-pointer ${dup ? "bg-orange-500/5" : ""}`} onClick={() => setSelectedApp(app)}>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-bold flex items-center gap-2 flex-wrap">
                          {data.name}
                          {isTierPro && (
                            <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs">
                              Pro
                            </Badge>
                          )}
                          {dup && (
                            <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs">
                              重複申込
                            </Badge>
                          )}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{data.email}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-primary" />
                        <span className="font-bold">{(data.followers || 0).toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Select
                        value={app.recruit_status || "未対応"}
                        onValueChange={(status) => handleStatusChange(app, status)}
                      >
                        <SelectTrigger className="w-24 h-8 text-xs bg-secondary border-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="未対応">未対応</SelectItem>
                          <SelectItem value="審査中">審査中</SelectItem>
                          <SelectItem value="採用">採用</SelectItem>
                          <SelectItem value="不採用">不採用</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(app.created_date).toLocaleString("ja-JP")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {dup ? (
                          <Button
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); handleDuplicateNotify(app); }}
                            className="h-7 px-2 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40"
                            variant="outline"
                          >
                            重複通知
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleApprove(app); }}
                              className="h-7 px-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40"
                              variant="outline"
                            >
                              承認
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleReject(app); }}
                              className="h-7 px-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
                              variant="outline"
                            >
                              却下
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 詳細モーダル */}
      {selectedApp && (() => {
        const d = JSON.parse(selectedApp.content);
        const isTierPro = (d.followers || 0) >= 10000;
        const dup = isDuplicate(selectedApp);
        return (
          <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
            <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 flex-wrap">
                  申込詳細
                  {isTierPro && <Badge className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 text-xs">Pro</Badge>}
                  {dup && <Badge className="bg-orange-500/20 text-orange-400 border border-orange-500/40 text-xs">重複申込</Badge>}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                {/* 基本情報 */}
                <div className="bg-secondary rounded-xl p-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-bold mb-2">📋 基本情報</p>
                  <div className="flex justify-between"><span className="text-muted-foreground">名前</span><span className="font-bold">{d.name || "—"}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">メール</span><span className="font-mono text-xs flex items-center gap-1"><Mail className="w-3 h-3" />{d.email || "—"}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">フォロワー数</span><span className="font-bold flex items-center gap-1"><Users className="w-3.5 h-3.5 text-primary" />{(d.followers || 0).toLocaleString()}人</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">申込日時</span><span className="text-xs flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(selectedApp.created_date).toLocaleString("ja-JP")}</span></div>
                  <div className="flex justify-between items-center"><span className="text-muted-foreground">ステータス</span>
                    <Select value={selectedApp.recruit_status || "未対応"} onValueChange={(s) => { handleStatusChange(selectedApp, s); setSelectedApp({...selectedApp, recruit_status: s}); }}>
                      <SelectTrigger className="w-24 h-7 text-xs bg-background border-border"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未対応">未対応</SelectItem>
                        <SelectItem value="審査中">審査中</SelectItem>
                        <SelectItem value="採用">採用</SelectItem>
                        <SelectItem value="不採用">不採用</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* SNS・URL */}
                {d.sns_url && (
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-bold mb-2">🔗 SNS / URL</p>
                    <a href={d.sns_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 hover:underline break-all">
                      <Globe className="w-3 h-3 shrink-0" />{d.sns_url}
                    </a>
                  </div>
                )}

                {/* 自己PR */}
                {d.pr && (
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-bold mb-2">💬 自己PR</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{d.pr}</p>
                  </div>
                )}

                {/* その他フィールド */}
                {Object.entries(d).filter(([k]) => !["name","email","followers","sns_url","pr"].includes(k)).length > 0 && (
                  <div className="bg-secondary rounded-xl p-4">
                    <p className="text-xs text-muted-foreground font-bold mb-2">📄 その他情報</p>
                    <div className="space-y-1.5">
                      {Object.entries(d).filter(([k]) => !["name","email","followers","sns_url","pr"].includes(k)).map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-2">
                          <span className="text-muted-foreground text-xs">{k}</span>
                          <span className="text-xs text-right break-all">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 重複警告 */}
                {dup && (
                  <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-xs text-orange-300">
                    ⚠️ 同一メールアドレスで複数の申込があります。「重複通知を送信」ボタンで申請者にすでに登録済みである旨をメールで自動通知できます。
                  </div>
                )}

                {/* アクション */}
                <div className="flex gap-2 pt-2">
                  {dup ? (
                    <Button size="sm" onClick={() => { handleDuplicateNotify(selectedApp); setSelectedApp(null); }} className="flex-1 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40" variant="outline">重複通知を送信</Button>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => { handleApprove(selectedApp); setSelectedApp(null); }} className="flex-1 bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/40" variant="outline">承認してメール送信</Button>
                      <Button size="sm" onClick={() => { handleReject(selectedApp); setSelectedApp(null); }} className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10" variant="outline">却下してメール送信</Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* 説明 */}
      <div className="bg-secondary rounded-xl p-4 text-xs text-muted-foreground space-y-1">
        <p>• 承認: 申請者に確認メールを送信 → プロフィール設定に進める</p>
        <p>• 却下: 申請者に却下メールを送信 → 再度申し込み可能</p>
        <p>• <span className="text-orange-400">重複申込</span>（同一メールで複数申込）: 「重複通知を送信」で既に登録済みである旨を自動メール送信</p>
        <p className="pt-2 border-t border-border/50">
          Pro申し込み（フォロワー1万人以上）は3ヶ月無料、通常申し込みは初月無料
        </p>
      </div>
    </div>
  );
}