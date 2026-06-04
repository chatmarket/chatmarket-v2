# 15_TEST_MATRIX.md
> **Document Name**: Test Matrix  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: provisional  
> **注記**: テスト実施状況は未記録。全テストは「未実施」として扱うこと。  

---

## エールコイン購入テスト（最重要）

| # | テスト名 | 操作 | 期待結果 | 関連ファイル | 状態 |
|---|---------|------|---------|------------|------|
| EC1 | plan_1000購入 | createCoinCheckoutSession({planId:"plan_1000"}) | breakdown: fee=50, total=1050, granted=1000 | createCoinCheckoutSession | ✅ テスト済み（2026-06-04） |
| EC2 | plan_3000購入 | createCoinCheckoutSession({planId:"plan_3000"}) | breakdown: fee=150, total=3150, granted=3000 | createCoinCheckoutSession | ✅ テスト済み（2026-06-04） |
| EC3 | plan_5000購入 | createCoinCheckoutSession({planId:"plan_5000"}) | breakdown: fee=250, total=5250, granted=5000 | createCoinCheckoutSession | ✅ テスト済み（2026-06-04） |
| EC4 | plan_10000購入 | createCoinCheckoutSession({planId:"plan_10000"}) | breakdown: fee=500, total=10500, granted=10000 | createCoinCheckoutSession | ✅ テスト済み（2026-06-04） |
| EC5 | plan_30000拒否 | createCoinCheckoutSession({planId:"plan_30000"}) | 400エラー | createCoinCheckoutSession | ✅ テスト済み（2026-06-04）|
| EC6 | Webhook冪等性 | 同一session_idでWebhookを2回送信 | 2回目はスキップ | stripeWebhook | 未実施 |
| EC7 | ボーナス表示なし | /coin-charge を表示 | ボーナスコイン表示なし | CoinCharge | 未実施 |
| EC8 | 3.6%表示なし | 全コイン購入UI確認 | 3.6%表示なし | CoinPurchasePanel, YellCoinWalletPanel | 未実施 |
| EC9 | 30,000コイン表示なし | /coin-charge, /settings を表示 | 30,000コイン選択肢なし | CoinCharge, YellCoinWalletPanel | 未実施 |

---

## プラン・キャンペーンテスト

| # | テスト名 | 前提条件 | 操作 | 期待結果 | 状態 |
|---|---------|---------|------|---------|------|
| P1 | Freeプラン確認 | PlanSubscription なし、CampaignLiveGrantee なし | /plan-select を表示 | Free機能のみ |未実施 |
| P2 | キャンペーン対象者のStripe除外 | CampaignLiveGrantee 有効 | /plan-confirm でpaid plan選択 | Stripe誘導されない | 未実施 |
| P3 | キャンペーン期限切れ | CampaignLiveGrantee.expires_at < now | resolveUserPlan実行 | freeプランに降格 | 未実施 |
| P4 | 複数プラン機能合算 | basic + vod の PlanSubscription | resolveUserPlan実行 | 両方の機能を持つ | 未実施 |

---

## 1対1通話テスト

| # | テスト名 | 前提条件 | 期待結果 | 状態 |
|---|---------|---------|---------|------|
| V1 | Freeプラン課金 | caller に PlanSubscription なし | 200コイン/15分 引落 | 未実施 |
| V2 | Basicプラン課金 | caller に basic PlanSubscription | 150コイン/15分 引落 | 未実施 |
| V3 | 残高不足自動切断 | wallet.balance < min_coins | auto_disconnected=true, status=ended | 未実施 |
| V4 | WebRTC接続確立 | 両者のブラウザ | 映像・音声が双方に届く | 未実施 |

---

## クラスルームテスト

| # | テスト名 | 前提条件 | 期待結果 | 状態 |
|---|---------|---------|---------|------|
| CR1 | 最大定員（10名）制限 | 9名入室済み | 11人目は409 room_full | 未実施 |
| CR2 | 招待コードなし拒否 | invite_codeなしでアクセス | 403 invite_invalid | 未実施 |
| CR3 | SchoolTicketなし拒否 | SchoolTicket なしで入室試行 | 403 ticket_required | 未実施 |
| CR4 | kickされたユーザー再入室拒否 | kick済みユーザーが再入室 | 403 blocked | 未実施 |
| CR5 | クラス終了時のチケット消費 | action:"delete"実行 | SchoolTicket.status="used" | 未実施 |

---

## Stripe決済テスト

| # | テスト名 | 期待結果 | 状態 |
|---|---------|---------|------|
| S1 | VOD購入フロー | Purchase.create, 署名URL取得 | 未実施 |
| S2 | ファンクラブ定期課金 | PlanSubscription.create(sanctum) | 未実施 |
| S3 | SchoolTicket Stripe決済 | Webhook後にstatus=active | 未実施 |
| S4 | Webhook署名検証失敗 | 不正署名で401 | 未実施 |

---

## セキュリティテスト

| # | テスト名 | 期待結果 | 状態 |
|---|---------|---------|------|
| SEC1 | 他ユーザーのVideoCallに不正アクセス | 403 Forbidden | 未実施 |
| SEC2 | admin関数を一般ユーザーが呼び出し | 403 Forbidden | 未実施 |
| SEC3 | CloudFront署名URL有効期限確認 | 6時間後にアクセス不可 | 未実施 |
| SEC4 | AWS認証情報がフロントに露出しないか | ネットワークレスポンス確認 | 未実施 |

---

## 表示テスト（UI）

| # | テスト名 | 確認箇所 | 期待結果 | 状態 |
|---|---------|---------|---------|------|
| UI1 | CoinCharge と CoinPurchasePanel の価格一致 | 両画面 | 同一価格表示 | 未実施 |
| UI2 | 30秒プレビューゲート | /watch/{有料動画} | 30秒後にPaywall表示 | 未実施 |
| UI3 | レスポンシブ（スマホ） | 主要ページ | モバイルで表示崩れなし | 未実施 |