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
            <AccordionContent className="text-sm space-y-4 pt-2">
              {/* ステップバイステップ */}
              <div className="space-y-3">
                <p className="font-semibold">手順（Safari のみ対応）：</p>
                <div className="space-y-2">
                  {[
                    {
                      step: "1",
                      icon: "📲",
                      title: "このページを Safari で開く",
                      desc: "ChatMarket（live-chat-market.com）を Safari ブラウザで開いてください。Chrome や LINE のブラウザでは操作できません。",
                    },
                    {
                      step: "2",
                      icon: "⬆️",
                      title: "画面下部の「共有」ボタンをタップ",
                      desc: (
                        <>
                          画面の一番下にある <span className="font-bold text-primary">四角から上矢印が出たアイコン（共有ボタン）</span> をタップします。<br />
                          ※ iPhone の場合は画面下部中央、iPad は画面上部右側にあります。
                        </>
                      ),
                    },
                    {
                      step: "3",
                      icon: "➕",
                      title: "「ホーム画面に追加」を選択",
                      desc: (
                        <>
                          共有メニューが開いたら、下にスクロールして <span className="font-bold text-primary">「ホーム画面に追加」</span>（＋マークのアイコン）をタップします。
                        </>
                      ),
                    },
                    {
                      step: "4",
                      icon: "✏️",
                      title: "名前を確認して「追加」をタップ",
                      desc: "アプリ名が「Chat Market」になっていることを確認し、右上の「追加」をタップします。",
                    },
                    {
                      step: "5",
                      icon: "🎉",
                      title: "ホーム画面に追加完了！",
                      desc: "ホーム画面に Chat Market のアイコンが表示されます。次回からはアイコンをタップするだけでアプリのように起動できます。",
                    },
                  ].map(({ step, icon, title, desc }) => (
                    <div key={step} className="flex gap-3 bg-secondary/40 rounded-xl p-3">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                        {step}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm flex items-center gap-1.5">
                          <span>{icon}</span> {title}
                        </p>
                        <p className="text-xs text-foreground/65 mt-1 leading-relaxed">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* フロー図 */}
              <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                <p className="text-xs font-semibold text-primary mb-2">💡 操作の流れ</p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-foreground/70">
                  <span className="bg-secondary px-2 py-1 rounded">Safari で開く</span>
                  <span>→</span>
                  <span className="bg-secondary px-2 py-1 rounded">⬆️ 共有ボタン</span>
                  <span>→</span>
                  <span className="bg-secondary px-2 py-1 rounded">➕ ホーム画面に追加</span>
                  <span>→</span>
                  <span className="bg-secondary px-2 py-1 rounded">「追加」をタップ</span>
                  <span>→</span>
                  <span className="bg-primary text-primary-foreground px-2 py-1 rounded font-bold">完了！</span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-200/80">
                ⚠️ <span className="font-bold">ご注意：</span> この操作は <span className="font-bold">Safari ブラウザ専用</span> です。Chrome・Firefox・LINE のブラウザからは「ホーム画面に追加」の項目が表示されない場合があります。
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