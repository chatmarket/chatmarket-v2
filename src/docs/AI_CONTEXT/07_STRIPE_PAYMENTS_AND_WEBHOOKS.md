# 07_STRIPE_PAYMENTS_AND_WEBHOOKS.md
> **Document Name**: Stripe Payments and Webhooks  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: functions/stripeWebhook, functions/createCoinCheckoutSession, functions/planSubscriptionWebhook, functions/fanclubWebhook, docs/MASTER_SPEC_PART2.md  
> **セキュリティ注意**: 実際のキー・ID・シークレット値は出力しない

---

## 1. 決済種別マトリクス

| 用途 | 関数 | Webhook関数 | Webhook Secret |
|------|------|------------|----------------|
| エールコイン購入 | createCoinCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| VOD動画購入 | createCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| ライブチケット | createLiveTicketCheckout | liveTicketWebhook | STRIPE_WEBHOOK_SECRET |
| イベントチケット | createEventTicketCheckout | eventTicketWebhook | STRIPE_WEBHOOK_SECRET |
| プランサブスク | createPlanCheckoutSession | planSubscriptionWebhook | 未確認 |
| ファンクラブ定期 | createFanclubCheckout | fanclubWebhook | STRIPE_FANCLUB_WEBHOOK_SECRET |
| グッズ・デジタル商品 | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| デジタルチェキ | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| クラウドファンディング | createCrowdfundingCheckoutV2 | crowdfundingDonationWebhook | STRIPE_WEBHOOK_SECRET |
| KYC手数料 | createKycFeeCheckout | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| スクールチケット | createSchoolTicketCheckout | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| テスト決済 | createTestPaymentSession | — | — |

---

## 2. Stripe Webhook 署名検証（2種類）

### 方式1: WebCrypto 手動検証（stripeWebhook）

```javascript
// Deno の WebCrypto は非同期 → crypto.subtle を使用
const parts = signature.split(',')
const timestampPart = parts[0].split('=')[1]
const signaturePart = parts[1].split('=')[1]
const signedData = `${timestampPart}.${body}`
const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
const sigBytes = new Uint8Array(signaturePart.match(/.{1,2}/g).map(b => parseInt(b, 16)))
const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signedData))
// isValid === false → 401
```

### 方式2: Stripe SDK（fanclubWebhook, productWebhook, liveTicketWebhook）

```javascript
import Stripe from 'npm:stripe@14.21.0'
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'))
// ★ Deno では constructEventAsync（非同期版）を使用（constructEvent は動作しない）
const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
```

---

## 3. エールコイン購入（最重要）

```
Checkout Session mode: "payment"
請求額: viewer_total_yen（coin_base_amount_yen + 5%手数料）

metadata:
  type:                   "yell_coin_purchase"
  userEmail:              購入者メール
  planId:                 "plan_1000" | "plan_3000" | "plan_5000" | "plan_10000"
  coin_base_amount_yen:   1000 / 3000 / 5000 / 10000
  coin_purchase_fee_rate: "0.05"
  coin_purchase_fee_yen:  50 / 150 / 250 / 500
  viewer_total_yen:       1050 / 3150 / 5250 / 10500
  granted_coins:          1000 / 3000 / 5000 / 10000
  （後方互換: base_price, charge_amount, coins_purchased, bonus_coins="0", total_coins）

Webhook処理（stripeWebhook）:
  冪等性チェック: YellCoinTransaction.filter({ stripe_session_id }) → 既存あり → スキップ
  granted_coins = parseInt(meta.granted_coins || meta.coins_purchased || 0)
  YellCoinWallet.balance += granted_coins
  YellCoinWallet.total_charged += granted_coins
  YellCoinTransaction.create({ coins_purchased: granted_coins, bonus_coins: 0 })
```

---

## 4. プランサブスクリプション

```
Checkout Session mode: "subscription"
Price ID: 環境変数から取得（値は非公開）
Webhook（planSubscriptionWebhook）:
  customer.subscription.created → PlanSubscription.create
  customer.subscription.updated → PlanSubscription.update
  customer.subscription.deleted → PlanSubscription.update({ status:'cancelled' })
  invoice.payment.succeeded → PlanSubscription.update({ last_payment_status:'succeeded' })
  invoice.payment.failed → PlanSubscription.update({ last_payment_status:'failed' })

★ キャンペーン対象者へのSubscription作成は禁止
  createPlanCheckoutSession は CampaignLiveGrantee 確認 → activeGrant あり → 400エラー
```

---

## 5. ファンクラブ Subscription

```
Webhook Secret: STRIPE_FANCLUB_WEBHOOK_SECRET（通常Webhookと分離）
Price ID:
  STRIPE_FANCLUB_PRICE_STANDARD
  STRIPE_FANCLUB_PRICE_PREMIUM
  STRIPE_FANCLUB_PRICE_DIAMOND

metadata に base44_user_email / channel_id / tier が必要
PlanSubscription に plan_id:'sanctum_{channel_id}' として記録
Customer Portal: createFanclubPortal でサブスク管理URLを生成
```

---

## 6. Stripe Connect（クラウドファンディング）

```
createConnectAccount: Stripe Connect Express アカウント作成
  → CrowdfundingProject.stripe_connect_account_id に記録
stripeConnectWebhook: Connect Webhook処理
  → account.updated イベントでオンボーディング完了を検知

Application Fee: 未確認（10%がプラットフォーム取り分）
```

---

## 7. 冪等性・二重処理防止

```
エールコイン購入: stripe_session_id で YellCoinTransaction を検索 → 既存あり → スキップ
SchoolTicket購入: status='pending_payment' チェック → 処理済み → スキップ
プランSubscription: plan_id + user_email で既存確認 → create or update
ProductOrder: order_id を metadata に含め ProductOrder で管理

Stripe の自動リトライ: 署名付き同一イベントが複数回届く可能性あり
→ 各Webhookで上記の冪等性チェックが必要
```

---

## 8. キャンペーン対象者の Stripe 除外

```
確認済み実装:
  - createPlanCheckoutSession: CampaignLiveGrantee を確認して 400 返却
  - PlanConfirm ページ: キャンペーン対象者に購入ボタンを表示しない
  - PlanSelect ページ: キャンペーン対象者に「キャンペーン適用中」表示

未確認事項:
  - 全ての支払いエントリーポイントでキャンペーンチェックが実施されているか
```

---

## 9. 成功・キャンセルURL

```
エールコイン購入: successUrl?session_id={CHECKOUT_SESSION_ID}&plan={planId}
その他: 各関数の呼び出し元が指定

Webhook受信後の整合性確認:
  Stripe Dashboard でイベント履歴を確認可能
  本番 Webhook URL: 未公開（Stripe Dashboard で確認）
```

---

## 10. 手動確認が必要な Stripe Dashboard 設定

```
【確認推奨項目】
- Webhook エンドポイント URL・イベント種別設定
- Price ID と環境変数の対応確認
- Connect アカウントの Webhook 設定
- テストモード vs 本番モードの切り替え状態
- Dispute / Chargeback の設定

【変更禁止】
- 本番 Webhook エンドポイントを確認なしに変更しないこと
- Price ID を変更した場合は createPlanCheckoutSession 等も更新が必要
``