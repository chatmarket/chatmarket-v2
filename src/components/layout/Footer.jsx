import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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

販売業者：株式会社 ONE STEP
代表者：代表取締役 小野貴志
所在地：〒101-0024 東京都千代田区神田和泉町1番地6−16-405
電話番号：03-6821-6715
メールアドレス：support@chatmarket.jp
販売URL：https://chatmarket.jp

販売価格：各商品ページに表示
支払方法：クレジットカード、その他電子決済
支払時期：購入手続き完了時
商品引渡し時期：決済完了後即時
返品・キャンセル：デジタルコンテンツの性質上、購入後の返品・キャンセルはお受けできません
動作環境：最新版の主要Webブラウザ（Chrome、Safari、Firefox等）`;

const COMPANY_CONTENT = `企業情報

会社名：株式会社 ONE STEP
所在地：〒101-0024 東京都千代田区神田和泉町1番地6−16-405
代表取締役：小野貴志
電話番号：03-6821-6715
設立：2025年4月
資本金：990万円
主要取引銀行：武蔵野銀行 南浦和支店
主な業務：ITプラットフォーム開発・運営、写真撮影`;

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
            © 2025 {COMPANY.name}. All rights reserved.
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