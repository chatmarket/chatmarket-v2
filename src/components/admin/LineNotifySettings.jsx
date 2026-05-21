import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { MessageCircle, CheckCircle2, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";

export default function LineNotifySettings() {
  const [token, setToken] = useState("");
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!token) { toast.error("トークンを入力してください"); return; }
    setTesting(true);
    try {
      const res = await fetch("https://notify-api.line.me/api/notify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          message: "\n✅ ChatMarket 運営通知テスト\nLINE Notify連携が正常に動作しています！",
        }),
      });
      if (res.ok) {
        toast.success("テスト通知を送信しました！LINEを確認してください");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(`送信失敗: ${data.message || res.status}`);
      }
    } catch (e) {
      toast.error(`エラー: ${e.message}`);
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6 max-w-xl">
      {/* 説明 */}
      <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 font-bold text-green-300">
          <MessageCircle className="w-5 h-5" />
          LINE Notify 売上通知設定
        </div>
        <p className="text-xs text-green-400/80">
          チケット購入・グッズ購入が発生した際にリアルタイムでLINEに通知が届きます。
        </p>
      </div>

      {/* セットアップ手順 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold">📋 設定手順</p>
        <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
          <li>
            <a
              href="https://notify-bot.line.me/my/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              LINE Notify マイページ <ExternalLink className="w-3 h-3" />
            </a>
            を開く
          </li>
          <li>「トークンを発行する」をクリック</li>
          <li>トークン名に「ChatMarket運営」などを入力</li>
          <li>通知先のLINEグループまたは「1:1でLINE Notifyから通知を受け取る」を選択</li>
          <li>発行されたトークンをコピーして下の欄に貼り付ける</li>
          <li>ダッシュボード設定 → 環境変数に <code className="bg-secondary px-1 rounded">LINE_NOTIFY_TOKEN</code> として保存する</li>
        </ol>
      </div>

      {/* トークン入力 & テスト送信 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
        <p className="text-sm font-bold">🔑 トークンのテスト送信</p>
        <p className="text-xs text-muted-foreground">
          トークンを入力してテスト通知を送信できます。問題なければ、ダッシュボード設定の環境変数に
          <code className="bg-secondary px-1 mx-1 rounded">LINE_NOTIFY_TOKEN</code>
          として登録してください。
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="LINE Notify トークンを貼り付け..."
            className="bg-secondary border-0 flex-1"
          />
          <Button onClick={handleTest} disabled={testing} className="gap-2 shrink-0">
            <Send className="w-4 h-4" />
            {testing ? "送信中..." : "テスト送信"}
          </Button>
        </div>
      </div>

      {/* 通知内容の説明 */}
      <div className="bg-card border border-border/50 rounded-xl p-5 space-y-3">
        <p className="text-sm font-bold">📣 通知される内容</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">🎟️ チケット購入</p>
              <p>イベント名・席種・枚数・金額・購入者名</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold text-foreground">🛍️ グッズ購入</p>
              <p>商品名・金額・購入者・納品方式（手動対応が必要な場合も通知）</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}