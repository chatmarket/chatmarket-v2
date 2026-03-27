import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrendingUp } from "lucide-react";

const COMPANY = {
  name: "株式会社 ONE STEP",
  zip: "〒101-0024",
  address: "東京都千代田区神田和泉町1番地6−16-405",
  ceo: "代表取締役 小野貴志",
  tel: "03-6821-6715",
  founded: "2025年4月",
  capital: "990万円",
  bank: "武蔵野銀行 南浦和支店",
  business: "ITプラットフォーム開発・運営、写真撮影",
};

const TERMS_CONTENT = `利用規約

第1条（適用）
本規約は、株式会社 ONE STEP（以下「当社」）が提供するChatMarket（以下「本サービス」）の利用に関して適用されます。

第2条（利用登録）
本サービスの利用を希望する方は、本規約に同意のうえ、当社が定める方法により利用登録を行うものとします。

第3条（禁止事項）
ユーザーは以下の行為を行ってはなりません。
・法令または公序良俗に違反する行為
・犯罪行為に関連する行為
・当社または第三者の知的財産権、肖像権、プライバシー等を侵害する行為
・当社または第三者を誹謗中傷する行為
・本サービスの運営を妨害する行為

第4条（コンテンツの取り扱い）
ユーザーが本サービスに投稿・販売するコンテンツに関する著作権はユーザーに帰属します。ただし、当社はサービス提供に必要な範囲でコンテンツを利用できるものとします。

第5条（手数料）
・動画・ライブ配信売上：プラットフォーム手数料15%
・エールコイン受取：手数料10%

第6条（免責事項）
当社は本サービスに関して生じた損害について、当社の故意または重大な過失がない限り責任を負いません。

第7条（規約の変更）
当社は必要と判断した場合、ユーザーへの事前通知なく本規約を変更できます。

第8条（準拠法・管轄裁判所）
本規約の解釈は日本法に準拠し、紛争は東京地方裁判所を第一審の専属的合意管轄裁判所とします。`;

const PRIVACY_CONTENT = `プライバシーポリシー

株式会社 ONE STEP（以下「当社」）は、個人情報の保護を重要と考え、以下の方針に基づき取り扱います。

1. 収集する情報
・メールアドレス、氏名等の登録情報
・コンテンツの閲覧・購入履歴
・IPアドレス等のアクセス情報

2. 利用目的
・本サービスの提供・運営
・カスタマーサポート対応
・サービス改善のための分析
・利用規約違反の調査

3. 第三者提供
法令に基づく場合を除き、本人の同意なく第三者に個人情報を提供しません。

4. 安全管理
個人情報の漏洩・紛失・毀損を防ぐため、適切な安全管理措置を講じます。

5. 開示・訂正・削除
個人情報の開示・訂正・削除をご希望の場合は、下記お問い合わせ先までご連絡ください。

6. お問い合わせ
株式会社 ONE STEP
TEL: 03-6821-6715
〒101-0024 東京都千代田区神田和泉町1番地6−16-405`;

const TOKUSHO_CONTENT = `特定商取引法に基づく表示

事業者名
株式会社 ONE STEP（ワンステップ）
ONE STEP Co., Ltd.

代表者（運営責任者）
小野貴志

所在地
〒101-0024
東京都千代田区神田和泉町1-6-16 大和ビル405
Yamato Bldg. 405, 1-6-16 Kanda Izumicho, Chiyoda-ku, Tokyo 101-0024, Japan

電話番号
TEL: 03-6821-6715（固定電話）
サポート窓口と同じ番号です。

メールアドレス
o@onestepinc.jp

【対応時間】平日 10:00〜16:00（土日祝除く）

申込の有効期限
購入手続き画面で表示される期限内にお支払いが完了しない場合、当該お申し込みは自動的に無効となる場合があります。
コンビニ決済の支払期限は、決済画面および案内メールに表示される日時に従います。

販売数量・販売条件
デジタルコンテンツ・役務のため在庫の概念はありませんが、システム保守、法令遵守、または不正利用防止のため、購入回数・購入上限・提供対象を制限する場合があります。
最新の提供条件は各購入画面に表示します。

決済の取扱い（Stripe）
・購入・チャージ・プラン決済は Stripe を通じて処理されます。
・クレジットカード番号等の機微な決済情報は Stripe 側で取り扱われ、当社サーバーに保存されません。
・取引内容は、Stripe の決済ステータスおよび当社の取引通知に従ってアカウントへ反映されます。

販売価格
各オプションプラン・エールコインチャージ・ライブチケット等の購入画面に表示されている価格（税込）が販売価格です。

商品代金以外の必要料金
・インターネット接続に必要な通信料金は、お客様のご負担となります。
・決済手数料: クレジットカード・デビットカードは購入画面の表示に従います。コンビニ決済を利用する場合は、決済代行手数料等が別途かかる場合があります（購入画面に表示）。
・出金時の銀行手数料等が発生する場合があります。

支払方法
Stripe 経由のクレジットカード・デビットカード、およびコンビニ決済（ファミリーマート、ローソン、ミニストップ、セイコーマート等、提供時）。各決済方法の詳細は購入画面でご確認ください。

支払時期
・エールコインチャージ、オプションプランの購入、ライブチケット等: お申し込み・購入手続きの確定時に決済されます。
・本サービスでは、主に Stripe の都度決済（PaymentIntent 等）により、所定の利用期間（例: 月額プランは原則30日間、年額プランは原則365日間）を付与する方式です。毎月同一日の自動継続課金（Stripe Subscription）を利用しない場合、次期以降のご利用は有効期限前に再度お手続きいただく必要があります。

自動更新オプション
・月額プランなどの自動継続課金を選択いただいた場合、事前の通知なく、利用期間満了日を経過したときは自動的に更新され、登録されたクレジットカードから所定の料金が決済されます。
・自動更新の解約をご希望の場合は、アカウント設定メニュー（/settings）の「サブスク管理」から解約手続きをしていただくか、サポート窓口までお問い合わせください。
・解約手続き後、既に決済済みの期間については付与済みの有効期限満了まで利用可能です。
・自動継続課金の実行前に、契約内容について改めてご確認いただけます。

サービスの提供時期
・エールコインのチャージ: 決済完了後、速やかにアカウントへ反映します。
・コンビニ払い: 店舗でのお支払い完了後、入金確認まで数営業日を要する場合があります。
・プラン・オプション購入（Stripe カード決済）: 決済完了後、速やかに利用可能となります。
・その他（ビデオ通話・ライブ配信等）: 各サービス画面の案内に従います。

返品・交換・返金
・デジタルコンテンツ・役務の性質上、お客様都合による購入後の返品・交換・返金は原則お受けしておりません。
・不良、誤課金（重複課金を含む）、または当社に帰責事由がある場合は、お問い合わせ窓口までご連絡ください。内容確認のうえ、返金その他の適切な対応を行います。
・当社都合による返金が確定した場合、原則として返金確定日から7営業日以内に返金処理を行います（カード会社・決済事業者の処理状況により実際の着金日は前後する場合があります）。

中途解約
・プラン・オプションの停止や更新管理は、ログイン後のプラン管理画面（/plan-management）等から行えます。
・本サービスは主に都度決済のため、「次回自動課金の停止」ではなく、次回以降の更新を行わない／所定の停止操作を行うことで次期以降の課金を避けられます。
・既に決済済みの期間については、付与済みの有効期限満了まで利用可能です。

違法行為等に伴う収益の取り扱いについて
ユーザーの行為が関連法令に抵触する、またはその疑いがあると当社が合理的根拠に基づき判断した場合、適用法令および利用規約の範囲で、当該ユーザーに対する収益の支払いを留保または停止することがあります。
当社に損害が発生し、かつ法令上認められる範囲では、当該収益を損害の填補に充当する場合があります。`;

const COMPANY_CONTENT = `企業情報

会社名：株式会社 ONE STEP
所在地：〒101-0024 東京都千代田区神田和泉町1番地6−16-405
代表取締役：小野貴志
電話番号：03-6821-6715
設立：2025年4月
資本金：990万円
主要取引銀行：武蔵野銀行 南浦和支店
主な業務：ITプラットフォーム開発・運営、写真撮影
公式サイト：https://onestepinc.jp/`;

const modals = {
  terms: { title: "利用規約", content: TERMS_CONTENT },
  privacy: { title: "プライバシーポリシー", content: PRIVACY_CONTENT },
  tokusho: { title: "特定商取引法に基づく表示", content: TOKUSHO_CONTENT },
  company: { title: "企業情報", content: COMPANY_CONTENT },
};

export default function Footer() {
  const [openModal, setOpenModal] = useState(null);

  return (
    <>
      <footer className="border-t border-border/50 bg-card mt-16">
        <div className="max-w-7xl mx-auto px-4 py-10">
          {/* Progressive Incentive Accordion */}
          <div className="mb-8 bg-primary/5 border border-primary/20 rounded-xl p-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="progressive-incentive" className="border-0">
                <AccordionTrigger className="hover:no-underline flex items-center gap-2 text-base font-semibold text-foreground">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  プログレッシブ・インセンティブって何？
                </AccordionTrigger>
                <AccordionContent className="text-sm text-foreground space-y-4 pt-2">
                  <div>
                    <p className="font-bold text-base mb-2">📈 プログレッシブ・インセンティブとは</p>
                    <p className="text-sm leading-relaxed">月間の売上が増えると、手数料が下がる仕組みです。つまり、稼げば稼ぐほど取り分が増える制度です。</p>
                  </div>
                  <div>
                    <p className="font-bold text-base mb-3">💰 階層別 収益率（翌月適用）</p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">100万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/20 to-primary/40 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">86%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">300万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/25 to-primary/45 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">87%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">600万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/30 to-primary/50 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">88%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">900万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/35 to-primary/55 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">89%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">1,200万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/40 to-primary/60 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">90%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">1,500万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/45 to-primary/65 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">91%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">1,650万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/50 to-primary/70 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">92%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">1,800万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/55 to-primary/75 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">93%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary/5 rounded-lg p-2.5 border border-primary/20">
                        <span className="text-xs font-semibold text-muted-foreground min-w-32">1,950万円超</span>
                        <div className="flex-1 h-8 bg-gradient-to-r from-primary/60 to-primary/80 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary">94%</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 bg-primary rounded-lg p-2.5 border border-primary/40">
                        <span className="text-xs font-semibold text-primary-foreground min-w-32">2,000万円以上</span>
                        <div className="flex-1 h-8 bg-primary/30 rounded flex items-center justify-end pr-3">
                          <span className="font-bold text-sm text-primary-foreground">95%（最大）</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-secondary rounded-lg p-3 border border-border/50">
                    <p className="font-bold text-base mb-2">🎯 メリット</p>
                    <p className="text-sm leading-relaxed">毎月の売上に応じて自動的に計算されるため、手続き不要。売上が増えれば増えるほど、あなたの取り分が増えていきます。</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Company brief */}
          <div className="mb-8">
            <p className="font-bold text-lg mb-1">Chat<span className="text-primary">Market</span></p>
            <p className="text-xs text-muted-foreground">{COMPANY.name}　{COMPANY.zip} {COMPANY.address}</p>
            <p className="text-xs text-muted-foreground">TEL {COMPANY.tel}</p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-6">
            <button onClick={() => setOpenModal("terms")} className="hover:text-foreground transition-colors">
              利用規約
            </button>
            <button onClick={() => setOpenModal("privacy")} className="hover:text-foreground transition-colors">
              プライバシーポリシー
            </button>
            <button onClick={() => setOpenModal("tokusho")} className="hover:text-foreground transition-colors">
              特定商取引法に基づく表示
            </button>
            <button onClick={() => setOpenModal("company")} className="hover:text-foreground transition-colors">
              企業情報
            </button>
          </div>

          <p className="text-xs text-muted-foreground">
            © 2026 ONE STEP Co., Ltd. All Rights Reserved.（※Chat Marketのロゴマークは商標/著作権申請中です）
          </p>
        </div>
      </footer>

      {openModal && (
        <Dialog open onOpenChange={() => setOpenModal(null)}>
          <DialogContent className="bg-card border-border max-w-2xl">
            <DialogHeader>
              <DialogTitle>{modals[openModal].title}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[60vh] pr-2">
              <pre className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed font-sans">
                {modals[openModal].content}
              </pre>
            </ScrollArea>
            <Button variant="secondary" onClick={() => setOpenModal(null)} className="mt-2">閉じる</Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}