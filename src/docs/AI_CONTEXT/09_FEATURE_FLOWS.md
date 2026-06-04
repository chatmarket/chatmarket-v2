# 09_FEATURE_FLOWS.md
> **Document Name**: Feature Flows  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: docs/MASTER_SPEC_PART2.md（詳細フローはPART2に完全版あり）  
> **Note**: 詳細な実装レベルのフローはdocs/MASTER_SPEC_PART2.mdを参照

---

## 1. ユーザー登録フロー

```
トリガー: User エンティティ create イベント → onUserRegistered
1. PlanSubscription(call-anser) 作成（重複チェック付き）⚠️ 有料プランを無料付与
2. YellCoinWallet 作成（初回ボーナス500コイン付与）
3. Admin向けアプリ内通知作成
4. 管理者へメール通知
5. IVSチャンネルが存在する場合はプロビジョニング

既知の問題: call-anser（¥3,300/月有料プラン）が自動付与される
```

---

## 2. ライブ配信フロー

```
配信者: /go-live → createLiveStream → LiveStream.create(status:'scheduled')
OBS/ブラウザ → rtmps://{endpoint}:443/app/{streamKey} で配信開始
IVS Webhook (stream_start) → LiveStream.status='live', Channel.is_live=true
視聴者: /live/:streamId → getIvsPlaybackUrl → amazon-ivs-player で再生
有料PPV: createLiveTicketCheckout → Stripe → liveTicketWebhook → Purchase記録
配信終了: IVS Webhook (stream_end) → status='ended', is_live=false
zombieStreamKiller: 長時間放置されたLiveStreamを強制終了

変更禁止: LivePreviewLockout（30秒無料プレビュー）
```

---

## 3. VOD販売フロー

```
アップロード:
  /upload → checkUsageLimit（2時間/日制限）
  → uploadVideoToS3 → Presigned URL取得
  → フロントが直接S3にPUT
  → Video.create(moderation_status:'pending')
  → 管理者審査（/admin/video-moderation）
  → approved になると公開

購入・視聴:
  /watch/:videoId → 無料: getSignedVideoUrl
  → 有料未購入: 30秒プレビュー → PaywallModal
  → 有料購入: createCheckoutSession → Stripe → stripeWebhook → Purchase.create
  → 購入済み確認: Purchase.filter({item_type:'video', buyer_email}) → getSignedVideoUrl
```

---

## 4. 1対1ビデオ通話フロー

詳細は docs/MASTER_SPEC_PART2.md の「1対1ビデオ通話フロー（完全版）」を参照

```
要約:
Phase1: /call-request/:channelId → VideoCall.create(status:'pending')
Phase2: ライバーが承諾 → status:'accepted' → 発信者が status:'active' に更新
Phase3: useWebRtcCall でWebRTC P2P接続
  - Caller: ICE収集 → Offer送信 → Answer待機（最大30秒）
  - Callee: ready フラグ → Offer受信 → Answer送信
  - 失敗時: 最大3回リトライ
Phase4: 通話中（videoCallBilling tick毎分呼出・15分単位課金）
Phase5: 終了 → videoCallBilling(action:'end') → 収益分配確定

インフラ: WebRTC P2P（★Chime不使用）
課金: Freeプラン200コイン/15分・Basicプラン150コイン/15分
```

---

## 5. クラスルームフロー

詳細は docs/MASTER_SPEC_PART2.md の「クラス配信フロー（1対9・完全版）」を参照

```
要約:
講師: /classroom/create → ClassRoom.create → invite_code生成
    → createChimeMeeting(action:'create') → Chime Meeting作成
生徒: /classroom/:roomId?code={invite_code}
    → 入室チェック: invite_code確認 → SchoolTicket確認
    → createChimeMeeting(action:'join') → 7ステップ競合対策 → 入室
    → Chime SDK でビデオ接続
クラス終了: action:'delete' → SchoolTicket.status='used'に更新

定員: 10名固定（変更禁止）
```

---

## 6. チャット鑑定フロー

```
/fortune-chat/:channelId → FortuneChatThread.find or create
Step1: ユーザーが最初のメッセージ（無料）
Step2: 占い師が試し返信（is_trial_reply:true, is_masked:true）
Step3: ユーザーがチケット購入（500コイン）
  → YellCoinWallet.balance -= 500
  → FortuneChatThread.ticket_purchased=true, status='active'
  → is_masked=false に変更 → 全文表示
Step4: 残り1往復（計4通）→ message_count=4 → status='closed'
Step5: 終了後レビュー（任意）→ FortuneReview.create
```

---

## 7. エールコイン購入フロー

```
/coin-charge または /settings → プラン選択
→ createCoinCheckoutSession({planId, successUrl, cancelUrl})
→ Stripe Checkout（viewer_total_yen を請求）
→ 決済完了 → successUrl にリダイレクト
→ stripeWebhook が非同期で処理
  冪等性チェック → YellCoinWallet.balance += granted_coins
  → YellCoinTransaction.create

プラン: plan_1000/3000/5000/10000（30,000は未提供）
手数料: 5%外乗せ（購入手数料分のコインは付与しない）
ボーナス: 廃止済み
```

---

## 8. ファンクラブフロー

```
/fanclub/:channelId → Channel.fanclub_enabled 確認
購読: createFanclubCheckout({channelId, tierId})
  → Stripe Subscription（mode:'subscription'）
  → fanclubWebhook → PlanSubscription.create(plan_id:'sanctum_{channelId}')
解約: createFanclubPortal → Stripe Customer Portal
管理: /fanclub-manage → 限定コンテンツ・会員限定機能
```

---

## 9. キャンペーン付与フロー

```
正規経路1（公開キャンペーン）:
  /recruit → 申し込みフォーム → campaignAutoGrant
  → Campaign.approved_participants_count < max_participants
  → CampaignLiveGrantee.create(grant_source:'campaign_link', benefit_months:12)

正規経路2（管理者指定）:
  campaignAutoGrant(admin_grant:true) → 12か月

正規経路3（特別スカウト・非公開）:
  campaignAutoGrant(admin_grant:true, is_influencer:true) → 24か月

利用権限確認: resolveUserPlan が CampaignLiveGrantee.expires_at > now を確認
Stripe Subscriptionは作成しない・期限後の自動課金なし
```

---

## 10. 出金フロー

```
/withdrawal-request → Withdrawal.create（出金申請）
管理者が確認・手動振込（自動振込は未確認）
Channel.bank_account_* にクリエイターの口座情報を保存

未確認:
  - 自動振込の実装有無
  - Withdrawal の承認・却下フロー
  - CreatorEarning との連携タイミング
``