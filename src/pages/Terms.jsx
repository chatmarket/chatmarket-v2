import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText } from "lucide-react";

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-base font-bold text-foreground border-b border-border pb-2">{title}</h2>
    <div className="text-sm text-muted-foreground leading-relaxed space-y-2">{children}</div>
  </section>
);

export default function Terms() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold">利用規約</h1>
        </div>
      </div>

      {/* PWA案内バナー */}
      <div className="mb-6 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 flex items-start gap-3">
        <span className="text-2xl shrink-0">📲</span>
        <div>
          <p className="text-sm font-bold text-primary">アプリストアを通さない直営だから高還元</p>
          <p className="text-xs text-muted-foreground mt-0.5">Apple・Googleのストア手数料（最大30%）がゼロ。その分をそのままクリエイターへ。ブラウザの「ホーム画面に追加」からアプリのようにご利用いただけます。</p>
        </div>
      </div>

      <div className="bg-card border border-border/50 rounded-2xl p-6 space-y-8">
        <p className="text-xs text-muted-foreground">制定日：2026年4月15日　運営：ChatMarket（以下「当社」）</p>

        <Section title="第1条（適用）">
          <p>本規約は、当社が運営するサービス「ChatMarket」（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本規約に同意した上で本サービスを利用するものとします。</p>
        </Section>

        <Section title="第2条（利用登録）">
          <p>利用登録申請者が本規約に同意した場合、当社所定の方法により登録が完了します。登録申請時に利用規約への同意チェックが必須です。未成年者は保護者の同意を得た上でご利用ください。</p>
        </Section>

        <Section title="第3条（エールコインの購入・利用）">
          <p>本サービスでは、サービス内通貨（エールコイン）を以下の条件で販売します。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>コイン購入時、定価に対してシステム利用料（3.6%）を上乗せした金額をご請求します。</li>
            <li>¥5,000・¥10,000プランには購入額の8%分のボーナスコインが付与されます。ボーナスコインは購入コインと同等に使用できますが、換金・払い戻しの対象外です。</li>
            <li>コインの有効期限は購入日から180日です。有効期限を過ぎたコインは失効し、返還されません。</li>
            <li>コインの払い戻しは原則として行いません。ただし法令に基づく場合はこの限りではありません。</li>

            <li>コインは本サービス内でのみ使用できます。現金・他サービスへの交換はできません。</li>
          </ul>
        </Section>

        <Section title="第4条（クリエイターへの収益還元）">
          <p>本サービスはApple・Google等のアプリストアを経由しない直営PWAとして提供しています。ストア手数料（最大30%）が発生しないため、クリエイターへの高還元を実現しています。</p>
          <p>クリエイター（配信者・ライバー）への報酬は、ユーザーが消費したエールコインをもとに以下の方式で計算されます。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>FREEプラン：</strong>消費コインの70%がクリエイターに還元されます。</li>
            <li><strong>BASICプラン（月額¥3,300）：</strong>消費コインの<strong className="text-primary">85%</strong>がクリエイターに還元されます。当社の取り分は15%のみです。</li>
            <li><strong>プログレッシブ・インセンティブ：</strong>月間売上に応じて還元率が最大<strong className="text-primary">95%</strong>まで段階的に引き上げられます。</li>
            <li>ボーナスコインを含む消費についても、上記還元率が同様に適用されます。</li>
            <li>録画オプション料金はAWSインフラ実費に充当され、クリエイター還元の対象外です。</li>
          </ul>
        </Section>

        <Section title="第5条（ビデオ通話サービス）">
          <p>1対1ビデオ通話サービスの利用にあたり、以下の条件に同意するものとします。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>通話料金は15分単位で課金されます。通話開始時に最初の15分分のコインが即時引き落とされます。最低料金は<strong>15分 150円〜</strong>（配信者が自由に設定）。</li>
            <li>通話申し込み時に本規約への同意チェックが必須です。</li>
            <li>コイン残高不足により通話が自動切断された場合、補填・返金は行いません。</li>
            <li><strong>CALL&ANSERプラン</strong>加入者は、1日あたり60分（10分×6スロット）の無料通話枠を利用できます。無料枠は毎日JST 0:00にリセットされ、当日未使用分の繰り越しはできません。</li>
            <li>ミリオネア・チャレンジ期間中（2026年4月〜6月）は、全プランの通話時間が15分に固定されます。</li>
          </ul>
        </Section>

        <Section title="第6条（通話録画・アーカイブ販売）">
          <p>通話録画オプションおよびアーカイブ販売に関して、以下の条件が適用されます。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>録画オプション（+¥50/15分）を選択した場合のみ、通話がS3サーバーに録画されます。</li>
            <li>録画オプション料金はAWSインフラ実費への充当であり、クリエイター収益・運営利益の分配対象外です。</li>
            <li>アーカイブを有料公開する場合、映り込む全員から事前に肖像権に関する明示的な同意を得る責任は、コンテンツ投稿者にあります。</li>
            <li>同意を得ていないアーカイブの公開による法的問題について、当社は一切の責任を負いません。</li>
            <li>アーカイブ販売の最低価格は<strong>¥15</strong>です。</li>
            <li>ライブ配信の最低料金（15分あたり）：SD 480p <strong>15円〜</strong> / HD 720p <strong>55円〜</strong> / FHD 1080p <strong>150円〜</strong>（画質は設定料金に連動して自動決定されます）</li>
          </ul>
        </Section>

        <Section title="第7条（視聴時間制限）">
          <p>本サービスでは、サーバーコスト・公平な利用環境の維持を目的として、プランごとに1日の動画・アーカイブ視聴時間に上限を設けています。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li><strong>FREEプラン：</strong>1日の合計視聴時間は最大60分までです。</li>
            <li><strong>有料プラン（BASIC等）：</strong>1日の合計視聴時間は最大120分までです。</li>
            <li>上限に達した場合、JST 0:00（翌日）にリセットされるまで視聴ができなくなります。</li>
            <li><strong>視聴制限は運営の判断で変更・廃止・強化される場合があります。</strong>変更は本サービス内での告知をもって効力を発します。</li>
            <li>ライブ配信（リアルタイム視聴）は本制限の対象外です。</li>
          </ul>
        </Section>

        <Section title="第8条（コンテンツの著作権）">
          <p>本サービス上で配信者（ライバー）が作成・投稿した配信・動画・画像等のコンテンツ（以下「クリエイターコンテンツ」）の著作権は、作成したクリエイターに帰属します。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>クリエイターは、本サービスにコンテンツを投稿することにより、当社に対して以下の権利を無償・非独占的にライセンスしたものとみなします：
              <ul className="list-disc list-inside space-y-1 pl-4 mt-1">
                <li>本サービスの運営・提供に必要な範囲での複製・表示・送信</li>
                <li>本サービス・ChatMarket の宣伝・広告・マーケティング目的でのサムネイル・切り抜き・プロモーション動画等への使用</li>
                <li>プレスリリース・SNS・App Store等の掲載物への引用・使用</li>
              </ul>
            </li>
            <li>当社がクリエイターコンテンツを宣伝目的で使用する際は、可能な範囲でクリエイター名・チャンネル名をクレジット表記します。</li>
            <li>クリエイターは、自身のコンテンツが第三者の著作権・肖像権・プライバシー権を侵害しないことを保証するものとします。</li>
            <li>本サービスのロゴ・UI・システム・ブランド等に関する知的財産権はすべて当社に帰属します。</li>
          </ul>
        </Section>

        <Section title="第9条（VODプランおよび動画販売）">
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>VODプラン加入者は動画のアップロードおよび有料販売が可能です。</li>
            <li>動画の販売価格は<strong>最低¥15</strong>です。¥15未満の価格設定はシステムにより拒否されます。</li>
            <li>ライブ配信の最低料金（15分あたり）：<strong>SD 480p 15円〜 / HD 720p 55円〜 / FHD 1080p 150円〜</strong>。設定価格により配信画質が自動決定されます。</li>
            <li>販売動画の長さは最大1時間（60分）までです。</li>
            <li>アップロードされた動画は当社の審査を経て公開されます。審査に通過しない場合、理由を通知した上で非公開とします。</li>
            <li>著作権・肖像権を侵害するコンテンツは厳禁です。違反した場合、アカウントを停止します。</li>
          </ul>
        </Section>

        <Section title="第10条（禁止事項）">
          <p>以下の行為を禁止します。</p>
          <ul className="list-disc list-inside space-y-1 pl-2">
            <li>本人確認書類の偽造・不正登録</li>
            <li>他ユーザーへのハラスメント・脅迫・差別的言動</li>
            <li>わいせつ・暴力的コンテンツの投稿・配信</li>
            <li>コインを不正に取得・換金しようとする行為</li>
            <li>システムへの不正アクセス・リバースエンジニアリング</li>
            <li>当社の事前承諾なく商業目的でサービスを利用すること</li>
          </ul>
        </Section>

        <Section title="第11条（アカウントの停止・解約）">
          <p>当社は、本規約違反が認められた場合、事前通知なくアカウントを停止・削除できます。停止時点でのコイン残高は原則として没収されます（法令に基づく場合を除く）。</p>
        </Section>

        <Section title="第12条（免責事項）">
          <p>当社は、通信環境の問題・システム障害・天災等によるサービス中断について責任を負いません。ユーザー間のトラブルについては当事者間で解決するものとし、当社は仲介義務を負いません。</p>
        </Section>

        <Section title="第13条（規約の変更）">
          <p>当社は本規約を予告なく変更できます。変更後も継続してサービスを利用した場合、変更後の規約に同意したものとみなします。重要な変更はサービス内通知またはメールでお知らせします。</p>
        </Section>

        <Section title="第14条（準拠法・管轄）">
          <p>本規約は日本法に準拠します。紛争については東京地方裁判所を第一審の専属的合意管轄裁判所とします。</p>
        </Section>

        <div className="border-t border-border pt-4 text-xs text-muted-foreground text-right">
          <p>ChatMarket 運営事務局</p>
          <p>最終更新：2026年4月16日</p>
        </div>

        <div className="flex gap-4 pt-2 flex-wrap">
          <Link to="/legal" className="text-xs text-primary hover:underline">特定商取引法に基づく表記 →</Link>
          <Link to="/privacy" className="text-xs text-primary hover:underline">プライバシーポリシー →</Link>
        </div>
      </div>
    </div>
  );
}