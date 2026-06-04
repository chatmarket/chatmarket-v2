import React from "react";
import MetaHelmet from "@/components/layout/MetaHelmet";
import { Link } from "react-router-dom";
import { ArrowLeft, ShoppingBag } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

const Row = ({ label, children }) => (
  <tr className="border-b border-border/40">
    <th className="text-left py-3 pr-4 w-36 text-xs font-bold text-foreground align-top whitespace-nowrap">
      {label}
    </th>
    <td className="py-3 text-xs text-muted-foreground leading-relaxed">{children}</td>
  </tr>
);

export default function LegalCommercial() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <MetaHelmet page="legal" />
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">特定商取引法に基づく表記</h1>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-8">
        <p className="text-xs text-muted-foreground">最終更新：2026年4月16日</p>

        {/* 基本情報テーブル */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody>
              <Row label="販売事業者">
                株式会社 ONE STEP
              </Row>
              <Row label="運営責任者">
                小野 貴志
              </Row>
              <Row label="所在地">
                〒101-0024 東京都千代田区神田和泉町1番地6-16<br />
                ヤマトビル405
              </Row>
              <Row label="お問い合わせ">
                Email: <a href="mailto:unei@chatmarket.info" className="text-primary underline">info@live-chat-market.com</a><br />
                受付時間：平日10:00〜18:00（JST）
              </Row>
              <Row label="販売URL">
                https://live-chat-market.com
              </Row>
            </tbody>
          </table>
        </div>

        {/* 販売価格 */}
        <Section title="販売価格">
          <p>本サービスで提供するデジタルコンテンツ・機能の価格は以下の通りです。</p>
          <div className="space-y-3 mt-2">
            <div>
              <p className="font-bold text-foreground text-xs mb-1.5">▼ エールコイン（サービス内通貨）</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>1コイン ＝ 約1.1円相当（運営が随時改定）</li>
                <li>購入プランにより異なります。詳細はコイン購入ページをご参照ください。</li>
                <li>コイン購入時、表示価格に加えて事務手数料（3.6%）が上乗せされます。</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-foreground text-xs mb-1.5">▼ 月額サブスクリプション</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>BASICプラン：¥3,300/月（税込）</li>
                <li>CALL&ANSERプラン：¥6,600/月（税込）</li>
                <li>VODプラン：¥9,900/月（税込）</li>
                <li>PPVプラン：¥9,900/月（税込）</li>
                <li>各プランの詳細は<Link to="/plan-select" className="text-primary underline">プラン選択ページ</Link>をご確認ください。</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-foreground text-xs mb-1.5">▼ クリエイターが販売するコンテンツ</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>各コンテンツのページに販売価格を表示しています（最低¥15）。</li>
                <li>1対1ビデオ通話：各クリエイターが設定する料金（<strong>最低 15分 150円〜</strong>、エールコインで表示）</li>
                <li>有料ライブ配信（PPV）：各配信の詳細ページに表示する価格<br />
                  　— SD 480p：<strong>15分 15円〜</strong>　/ HD 720p：<strong>15分 55円〜</strong>　/ FHD 1080p：<strong>15分 150円〜</strong><br />
                  　（設定料金により配信画質が自動決定されます）</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 代金の支払い時期・方法 */}
        <Section title="代金の支払い時期・方法">
          <div className="space-y-3">
            <div>
              <p className="font-bold text-foreground text-xs mb-1.5">▼ 支払い方法</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li><strong>クレジットカード・デビットカード：</strong>Stripe（Stripe, Inc.）を通じて処理されます。Visa・Mastercard・American Express・JCB等に対応。</li>
                <li><strong>エールコイン（前払い方式）：</strong>コンテンツ利用前にコインを購入し、消費する仕組みです。</li>
              </ul>
            </div>
            <div>
              <p className="font-bold text-foreground text-xs mb-1.5">▼ 支払い時期</p>
              <ul className="list-disc list-inside pl-2 space-y-1">
                <li>月額サブスクリプション：申し込み日に初回課金が発生し、以降毎月同日に自動更新されます。</li>
                <li>コイン購入：購入手続き完了時に即時引き落とし。</li>
                <li>ビデオ通話・ライブ配信視聴：コイン消費はサービス利用時（通話開始・配信入室時）に即時処理されます。</li>
              </ul>
            </div>
          </div>
        </Section>

        {/* 返品・返金について */}
        <Section title="返品・返金について">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-2">
            <p className="font-bold text-destructive text-xs">⚠️ デジタルコンテンツの性質上、原則として返品・返金はお受けできません。</p>
          </div>
          <p>本サービスで提供するコンテンツはすべてデジタル形式であり、消費者契約法第15条の2および特定商取引法の規定に基づき、以下の理由により返金・返品には応じられません。</p>
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li><strong>エールコイン：</strong>購入後のコインはサービス内通貨（エールコイン）として即時発行されるデジタル財です。購入完了後の返金はお受けできません（コインの有効期限は購入日から180日）。</li>
            <li><strong>月額サブスクリプション：</strong>サービスへのアクセス権が付与された時点でデジタル役務の提供が開始されるため、契約後の返金はできません。月中に解約した場合も、当月分の返金はありません。</li>
            <li><strong>ビデオ通話・有料配信・動画購入：</strong>視聴・通話開始をもってデジタルコンテンツの提供が完了するため、利用後の返金はお受けできません。</li>
            <li><strong>通話途中での切断（コイン残高不足等）：</strong>未使用分の返金はありません。</li>
          </ul>
          <div className="bg-secondary rounded-xl p-3 text-xs">
            <p className="font-bold text-foreground mb-1">例外的に返金に応じる場合</p>
            <p>当社の重大な過失によりサービスが利用できなかった場合、または法令に基づく場合は、個別にご対応いたします。お問い合わせは <a href="mailto:unei@chatmarket.info" className="text-primary underline">unei@chatmarket.info</a> までご連絡ください。</p>
          </div>
        </Section>

        {/* サービス提供時期 */}
        <Section title="サービスの提供時期">
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>エールコイン：購入手続き完了後、即時アカウントに付与されます。</li>
            <li>月額サブスクリプション：決済確認後、即時にプラン機能が有効になります。</li>
            <li>動画・ライブ配信・ビデオ通話：コンテンツ購入後または通話申し込みが受諾された後、即時に利用可能となります。</li>
          </ul>
        </Section>

        {/* 動作環境 */}
        <Section title="動作環境">
          <ul className="list-disc list-inside pl-2 space-y-1">
            <li>対応ブラウザ：Chrome / Safari / Firefox / Edge（各最新版推奨）</li>
            <li>ビデオ通話・ライブ配信はカメラ・マイクの使用許可が必要です。</li>
            <li>安定したインターネット接続（有線または Wi-Fi 推奨）が必要です。</li>
            <li>本サービスはベータ版で提供中のため、一部機能が利用できない場合があります。</li>
          </ul>
        </Section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground text-right">
          <p>ChatMarket 運営事務局</p>
          <p>最終更新：2026年4月16日</p>
        </div>

        <div className="flex gap-4 pt-2 flex-wrap">
          <Link to="/terms" className="text-xs text-primary hover:underline">利用規約 →</Link>
          <Link to="/privacy" className="text-xs text-primary hover:underline">プライバシーポリシー →</Link>
        </div>
      </div>
    </div>
  );
}