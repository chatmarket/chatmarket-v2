import React from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Download, Smartphone, Zap } from "lucide-react";

export default function PwaInstallGuideSection() {
  return (
    <section className="max-w-7xl mx-auto px-4 py-10 mb-8">
      <div className="bg-secondary/30 border border-border/50 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Download className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold">Chat Market をホーム画面に追加</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">アプリのように快適に使える！ブラウザごとの追加方法を選択してください。</p>

        <Accordion type="single" collapsible className="space-y-2">
          {/* iPhone Safari */}
          <AccordionItem value="iphone-safari" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="text-lg">📱</span>
                iPhone / iPad（Safari）
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold">手順：</p>
                <ol className="list-decimal ml-5 space-y-1.5 text-foreground/80">
                  <li>Safari のメニュー（下部の上矢印）をタップ</li>
                  <li>「ホーム画面に追加」を選択</li>
                  <li>名前を確認して「追加」をタップ</li>
                  <li>ホーム画面にアプリアイコンが表示されます</li>
                </ol>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">💡 図解</p>
                <div className="space-y-1.5 text-xs text-foreground/70">
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-1 rounded">Safari</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">下矢印アイコン</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">ホーム画面に追加</span>
                    <span>→</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold">完了</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Android Chrome */}
          <AccordionItem value="android-chrome" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                Android（Chrome）
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold">手順：</p>
                <ol className="list-decimal ml-5 space-y-1.5 text-foreground/80">
                  <li>Chrome のメニュー（右上の縦 3 点）をタップ</li>
                  <li>「アプリをインストール」または「ホーム画面に追加」を選択</li>
                  <li>確認画面で「インストール」をタップ</li>
                  <li>ホーム画面にアプリアイコンが表示されます</li>
                </ol>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">💡 図解</p>
                <div className="space-y-1.5 text-xs text-foreground/70">
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-1 rounded">Chrome</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">⋯ メニュー</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">インストール</span>
                    <span>→</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold">完了</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Windows / macOS Chrome */}
          <AccordionItem value="desktop-chrome" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="text-lg">💻</span>
                Windows / macOS（Chrome）
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold">手順：</p>
                <ol className="list-decimal ml-5 space-y-1.5 text-foreground/80">
                  <li>Chrome のアドレスバーの右側にあるインストールアイコン（↓マーク）をクリック</li>
                  <li>「Chat Market をインストールしますか？」で「インストール」をクリック</li>
                  <li>デスクトップにアプリアイコンが作成されます</li>
                  <li>スタートメニューやアプリケーションフォルダからも起動できます</li>
                </ol>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">💡 図解</p>
                <div className="space-y-1.5 text-xs text-foreground/70">
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-1 rounded">アドレスバー</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">↓ アイコン</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">インストール</span>
                    <span>→</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold">完了</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Firefox */}
          <AccordionItem value="firefox" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="text-lg">🔥</span>
                Firefox
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold">手順：</p>
                <ol className="list-decimal ml-5 space-y-1.5 text-foreground/80">
                  <li>Firefox のメニュー（右上のハンバーガーメニュー）をクリック</li>
                  <li>「ショートカットを作成」を選択</li>
                  <li>保存場所を選択して「作成」をクリック</li>
                  <li>デスクトップやスタートメニューにショートカットが作成されます</li>
                </ol>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">💡 図解</p>
                <div className="space-y-1.5 text-xs text-foreground/70">
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-1 rounded">Firefox</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">☰ メニュー</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">ショートカット作成</span>
                    <span>→</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold">完了</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Edge */}
          <AccordionItem value="edge" className="border border-border/50 rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline text-sm font-semibold">
              <span className="flex items-center gap-2">
                <span className="text-lg">⚪</span>
                Edge（Windows / macOS）
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-sm space-y-3 pt-2">
              <div className="space-y-2">
                <p className="font-semibold">手順：</p>
                <ol className="list-decimal ml-5 space-y-1.5 text-foreground/80">
                  <li>Edge のアドレスバーの右側にあるインストールアイコンをクリック</li>
                  <li>「Chat Market をインストールしますか？」で「インストール」をクリック</li>
                  <li>スタートメニューやタスクバーに追加できます</li>
                </ol>
              </div>
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3 space-y-2">
                <p className="text-xs font-semibold text-primary">💡 図解</p>
                <div className="space-y-1.5 text-xs text-foreground/70">
                  <div className="flex items-center gap-2">
                    <span className="bg-secondary px-2 py-1 rounded">Edge</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">📥 アイコン</span>
                    <span>→</span>
                    <span className="bg-secondary px-2 py-1 rounded">インストール</span>
                    <span>→</span>
                    <span className="bg-primary text-primary-foreground px-2 py-1 rounded text-[10px] font-bold">完了</span>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* メリット */}
        <div className="mt-6 bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">📱 アプリのメリット</p>
              <ul className="text-xs text-foreground/70 mt-2 space-y-1 ml-4 list-disc">
                <li>ワンタップで素早く起動</li>
                <li>オフライン時でも基本機能が使える</li>
                <li>プッシュ通知で新しい配信を通知</li>
                <li>ブラウザのアドレスバーや履歴が非表示になり、より快適</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}