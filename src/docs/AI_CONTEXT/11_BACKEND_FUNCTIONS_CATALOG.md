# 11_BACKEND_FUNCTIONS_CATALOG.md
> **Document Name**: Backend Functions Catalog  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: functions/* ディレクトリ全関数, docs/MASTER_SPEC_PART2.md  

---

## 関数一覧（認証要件・用途別）

### ユーザー認証必須（base44.auth.me()）

| 関数名 | 用途 | 更新エンティティ | 外部サービス |
|--------|------|--------------|------------|
| videoCallBilling | 通話課金 tick/end/check_next | VideoCall, YellCoinWallet, YellCoinTransaction | — |
| createCoinCheckoutSession | コイン購入Checkout作成 | — | Stripe |
| createCheckoutSession | 動画購入Checkout | — | Stripe |
| createFanclubCheckout | ファンクラブCheckout | — | Stripe |
| createFanclubPortal | StripeカスタマーポータルURL | — | Stripe |
| createProductCheckout | 商品購入Checkout | ProductOrder（pending作成） | Stripe |
| createEventTicketCheckout | イベントチケットCheckout | — | Stripe |
| createLiveTicketCheckout | ライブチケットCheckout | — | Stripe |
| createCrowdfundingCheckoutV2 | クラウドファンディング決済 | — | Stripe |
| createKycFeeCheckout | KYC手数料Checkout | — | Stripe |
| createPlanCheckoutSession | プランサブスクCheckout | — | Stripe |
| createChimeMeeting | Chime Meeting管理（create/join/heartbeat/kick/delete） | ClassRoom, SchoolTicket | AWS Chime |
| uploadVideoToS3 | S3 Presigned PUT URL生成 | — | AWS S3 |
| getSignedVideoUrl | CloudFront署名URL（VOD再生） | — | CloudFront |
| generateSignedCloudFrontUrl | CloudFront署名URL（録画）| — | CloudFront |
| generateCloudFrontUrl | CloudFront署名URL（汎用） | — | CloudFront |
| checkUsageLimit | 日次2時間利用制限チェック | — | — |
| checkUploadEligibility | アップロード資格チェック | — | — |
| consumeCoinsForViewing | ライブ視聴コイン消費 | YellCoinWallet, YellCoinTransaction | — |
| getProductDownloadUrl | デジタル商品DLリンク生成 | — | AWS S3 |
| getTwilioIceServers | Twilio TURN ICEサーバー取得 | — | Twilio |
| autoAcceptCall | 通話自動承諾 | VideoCall | — |
| requestCallExtension | 通話延長申請 | VideoCall | — |
| acceptCallExtension | 通話延長承諾 | VideoCall, YellCoinWallet | — |
| confirmCallExtension | 通話延長確定 | VideoCall | — |
| createLiveStream | ライブ配信セッション作成 | LiveStream | — |
| checkIvsStreamStatus | IVSストリーム状態確認 | — | AWS IVS |
| getIvsPlaybackUrl | IVS再生URL取得 | — | AWS IVS |
| provisionChannelStreamKey | IVSチャンネル・ストリームキー発行 | Channel | AWS IVS |
| processPurchase | 購入処理 | Purchase, CreatorEarning | — |
| verifyTicket | チケットQRコード検証 | DigitalTicket | — |
| filterCommentNgWord | チャットNGワードフィルタ | NgWordLog | — |
| forumPost | フォーラム投稿処理 | CommunityPost | — |
| purchaseSchoolTicketWithYellCoin | エールコインでSchoolTicket購入 | SchoolTicket, YellCoinWallet | — |
| createSchoolTicketCheckout | SchoolTicketのStripe Checkout | SchoolTicket（pending作成）| Stripe |
| getChannelInfo | チャンネル情報取得 | — | — |
| createConnectAccount | Stripe Connect口座作成 | CrowdfundingProject | Stripe |
| setupGeminiLiveWaiting | Gemini Live待機セットアップ | — | — |

---

### 管理者限定（user.role === 'admin' チェック必須）

| 関数名 | 用途 |
|--------|------|
| addCoinsToUser | コイン手動付与 |
| adminGetAllUsers | 全ユーザー一覧取得 |
| grantAdminAccess | 管理者権限付与 |
| setAdminRole | ユーザーロール変更 |
| forceReprovisionIvsChannel | IVSチャンネル強制再作成 |
| refreshIvsStreamKey | IVSストリームキー更新 |
| enableIvsAutoArchive | IVS自動アーカイブ有効化 |
| updateProgressiveRates | プログレッシブ還元率更新 |
| loadTestBot | 負荷テストBot |
| createTestPaymentSession | テスト決済セッション |
| getStripeBalance | Stripe残高確認 |
| grantBasicPlanForFortune | 占い師向けBasicプラン付与 |
| createCustomerPortalSession | Stripe Customer Portal |

---

### Webhook（Stripe署名・IVS署名）

| 関数名 | 認証方式 | 署名検証 |
|--------|---------|---------|
| stripeWebhook | Stripe署名 | WebCrypto手動検証 |
| planSubscriptionWebhook | Stripe署名 | 未確認 |
| fanclubWebhook | Stripe署名（SDK） | constructEventAsync |
| productWebhook | Stripe署名（SDK） | constructEventAsync |
| liveTicketWebhook | Stripe署名（SDK） | constructEventAsync |
| eventTicketWebhook | Stripe署名 | 未確認 |
| crowdfundingDonationWebhook | Stripe署名 | 未確認 |
| stripeConnectWebhook | Stripe署名 | 未確認 |
| ivsSessionWebhook | IVS署名（HMAC） | IVS_WEBHOOK_SECRET |

---

### スケジューラー（Automation実行・認証不要）

| 関数名 | 実行間隔 | 用途 |
|--------|---------|------|
| cleanupTimedOutParticipants | 5分毎 | クラス参加者タイムアウト退出 |
| appointmentReminder | 5分毎 | 予約15分前リマインダー |
| updateProgressiveRates | 毎月1日 | 還元率月次更新 |
| calcMonthlyRevenueRate | 毎月1日 | 月間収益率計算 |
| resetDailyFreeCallQuota | 毎日0:00 JST | 無料通話枠リセット |
| zombieStreamKiller | 定期 | ゾンビLiveStream強制終了 |
| cleanupStaleIvsChannels | 定期 | 古いIVSチャンネル削除 |
| detectIvsStreamStart | 定期 | IVSストリーム状態ポーリング |
| liveStreamCostTracker | 定期 | ライブ配信コスト集計 |
| healthCheckIvsChannel | 定期 | IVSチャンネルヘルスチェック |
| expireYellCoins | 定期 | 期限切れエールコイン処理 |
| campaignAutoGrant | 定期 | キャンペーン自動付与 |
| detectGiantKilling | 定期 | ミリオネア上位ライバー検知 |
| generateSitemap | 定期 | サイトマップ生成 |
| generateSitemapDynamic | 定期 | 動的サイトマップ生成 |
| checkTwilioCostAlert | 毎日0:00 | Twilioコストアラート |
| sendEventReminder | 停止中（失敗） | イベントリマインダー |

---

### システム（Automation Entity・通知）

| 関数名 | トリガー | 用途 |
|--------|---------|------|
| onUserRegistered | User create | 新規登録時初期化 |
| notifyAdminNewUser | YellCoinWallet create | 管理者通知 |
| notifyFollowers | LiveStream.status→'live' | フォロワー通知 |
| notifyFortuneRepeatListeners | LiveStream.status→'live' | 占い師リピーター通知 |
| moderateContent | — | AIコンテンツモデレーション |
| minorSafetyAlert | — | 未成年安全アラート |
| notifyLineAdminSale | — | LINE販売通知 |
| trackLogs | — | ログ記録 |

---

## 重要な実装メモ

### videoCallBilling のプラン判定

```javascript
// tick毎に動的判定（アップグレード即時反映）
async function getCallerPlanConfig(base44, callerEmail) {
  const subs = await base44.asServiceRole.entities.PlanSubscription.filter({
    user_email: callerEmail, status: 'active',
  });
  const activeSub = subs[0];
  if (activeSub && (activeSub.plan_id === 'basic' || activeSub.plan_id === 'call-anser')) {
    return { plan: 'basic', min_coins: 150, creator_rate: 0.85, platform_rate: 0.15 };
  }
  return { plan: 'free', min_coins: 200, creator_rate: 0.70, platform_rate: 0.30 };
}
```

### createChimeMeeting の7ステップ競合対策

```
定員チェック → Attendee作成 → DB再取得（並行入室対策）→ DB更新 → DB再確認（rollback）
最大参加者10名を厳守するための多重チェック
```

### onUserRegistered の既知問題

```
⚠️ 全ユーザーに call-anser（有料プラン¥3,300/月）を自動付与
MASTER_SPECでは廃止とされているが実装が残存
変更前に経営側の確認必須
``