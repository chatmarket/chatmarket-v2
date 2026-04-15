import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function Privacy() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">プライバシーポリシー</h1>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-8">
        <p className="text-xs text-muted-foreground">制定日：2026年4月15日　運営：ChatMarket</p>

        <Section title="第1条（収集する情報）">
          <p>本サービスは以下の情報を収集します。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>登録情報：</strong>メールアドレス、氏名（本名）、住所、電話番号</li>
            <li><strong>本人確認書類：</strong>運転免許証・パスポート・マイナンバーカード等の画像</li>
            <li><strong>決済情報：</strong>コイン購入履歴・Stripe決済ID（カード番号は当社サーバーに保存しません）</li>
            <li><strong>通話・配信データ：</strong>通話時間・録画ファイル（録画オプション選択時のみ）・チャットログ</li>
            <li><strong>利用ログ：</strong>IPアドレス・デバイス情報・閲覧履歴</li>
          </ul>
        </Section>

        <Section title="第2条（情報の利用目的）">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>サービスの提供・運営・改善</li>
            <li>本人確認および不正利用防止</li>
            <li>コイン購入・払い出し処理（資金決済法対応）</li>
            <li>クリエイターへの報酬計算・振込処理</li>
            <li>サポート対応・サービスに関するお知らせ</li>
            <li>法令に基づく開示対応</li>
          </ul>
        </Section>

        <Section title="第3条（第三者への提供）">
          <p>当社は以下の場合を除き、個人情報を第三者に提供しません。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>ユーザーの同意がある場合</li>
            <li>法令に基づく開示要請がある場合</li>
            <li>生命・身体・財産の保護のために必要な場合</li>
            <li>業務委託先（Stripe、AWS等）への必要最小限の提供（委託先は同等の保護義務を負います）</li>
          </ul>
        </Section>

        <Section title="第4条（録画データの取り扱い）">
          <p>録画オプションを選択して行われた通話の録画データについて、以下の取り扱いを行います。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>録画データはAWS S3（東京リージョン）に暗号化して保存されます。</li>
            <li>アクセスはAWS CloudFront署名付きURL経由に限定され、第三者が直接アクセスすることはできません。</li>
            <li>クリエイターがアーカイブ公開を設定した場合、録画データは指定範囲のユーザーに公開されます。公開前に映り込んだ全員の同意確認はクリエイターの責任で行うものとします。</li>
            <li>アカウント削除時に録画データの削除をリクエストできます。</li>
          </ul>
        </Section>

        <Section title="第5条（決済情報の取り扱い）">
          <p>コイン購入はStripe（Stripe, Inc.）の決済システムを通じて処理されます。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>クレジットカード番号等の決済情報は当社サーバーに保存されません。</li>
            <li>購入履歴（金額・日時・プランID・入金コイン数・ボーナスコイン数）は当社データベースに記録されます。</li>
            <li>資金決済法に基づき、最初のコイン購入時の規約同意日時を永久保存します。</li>
          </ul>
        </Section>

        <Section title="第6条（本人確認書類の取り扱い）">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>本人確認書類はKYC（顧客確認）目的のみに使用します。</li>
            <li>審査完了後は最小限のデータのみ保持し、不要なコピーは削除します。</li>
            <li>第三者への提供は法令に基づく場合のみ行います。</li>
          </ul>
        </Section>

        <Section title="第7条（Cookieおよびトラッキング）">
          <p>本サービスはセッション管理・サービス改善のためCookieを使用します。ブラウザ設定でCookieを無効化できますが、一部機能が利用できなくなる場合があります。</p>
        </Section>

        <Section title="第8条（情報の保管期間）">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>アカウント情報：退会後5年間保存（法令対応）</li>
            <li>決済・コイン履歴：10年間保存（資金決済法対応）</li>
            <li>本人確認書類：審査完了後1年間、以降は最小情報のみ保持</li>
            <li>通話ログ・チャット：退会後1年間</li>
            <li>録画データ：クリエイターが削除するまで、または退会から90日後</li>
          </ul>
        </Section>

        <Section title="第9条（開示・訂正・削除の請求）">
          <p>ユーザーは当社に対して保有する個人情報の開示・訂正・削除を請求できます。請求はサポートページまたはメール（support@chatmarket.info）にてお問い合わせください。本人確認の上、法令に定める期間内に対応します。</p>
        </Section>

        <Section title="第10条（安全管理措置）">
          <p>当社は個人情報の漏洩・滅失・毀損を防ぐため、アクセス制御・暗号化・定期的なセキュリティ監査等の安全管理措置を講じます。</p>
        </Section>

        <Section title="第11条（お問い合わせ）">
          <p>個人情報の取り扱いに関するお問い合わせ：<br />
          ChatMarket 個人情報保護担当<br />
          Email: support@chatmarket.info</p>
        </Section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground text-right">
          <p>ChatMarket 運営事務局</p>
          <p>最終更新：2026年4月15日</p>
        </div>

        <div className="flex gap-4 pt-2">
          <Link to="/terms" className="text-xs text-primary hover:underline">利用規約 →</Link>
        </div>
      </div>
    </div>
  );
}