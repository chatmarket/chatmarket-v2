# ChatMarket 完全仕様書 v2.0
> 最終更新: 2026-06-03  
> 目的: ChatGPT等AIツールへのインプット用・社内共有用  
> このドキュメントはコードベースから直接生成された現行の正確な仕様書です

---

## 目次
1. [プラットフォーム概要](#1-プラットフォーム概要)
2. [技術スタック](#2-技術スタック)
3. [エンティティ設計](#3-エンティティ設計)
4. [ユーザー登録フロー](#4-ユーザー登録フロー)
5. [プランシステム](#5-プランシステム)
6. [エールコインシステム](#6-エールコインシステム)
7. [1対1ビデオ通話フロー](#7-1対1ビデオ通話フロー)
8. [ライブ配信フロー](#8-ライブ配信フロー)
9. [VOD動画販売フロー](#9-vod動画販売フロー)
10. [クラス配信フロー（1対9）](#10-クラス配信フロー1対9)
11. [ファンクラブフロー](#11-ファンクラブフロー)
12. [チャット鑑定フロー](#12-チャット鑑定フロー)
13. [グッズ・デジタルコンテンツ販売フロー](#13-グッズデジタルコンテンツ販売フロー)
14. [クラウドファンディングフロー](#14-クラウドファンディングフロー)
15. [収益計算・報酬フロー](#15-収益計算報酬フロー)
16. [決済フロー（Stripe）](#16-決済フローstripe)
17. [管理者機能](#17-管理者機能)
18. [絶対不変ルール（Red Lines）](#18-絶対不変ルールred-lines)

---

## 1. プラットフォーム概要

ChatMarket（チャットマーケット）は、クリエイター（ライバー・占い師・講師・アイドル等）と視聴者・ファンを繋ぐ日本語向けライブ配信・動画販売・1対1通話プラットフォームです。

### サービスカテゴリ
| カテゴリ | 対象クリエイター | 主な機能 |
|---------|----------------|---------|
| 占い（fortune_telling）| 占い師 | チャット鑑定・ビデオ通話鑑定 |
| アイドル（idol） | アイドル・タレント | デジタルチェキ・ライブ配信 |
| 言語（language） | 語学講師 | クラス配信（1対9） |
| フィットネス（fitness） | トレーナー | ライブ配信 |
| ビジネス（business） | コンサルタント | 1対1通話 |
| 教育（education） | 教師 | クラス配信 |
| その他（other） | 全般 | 全機能 |

### ドメイン
- 本番: https://live-chat-market.com
- 運営メール: unei@chatmarket.info

---

## 2. 技術スタック

### フロントエンド
- React 18 + Vite
- TypeScript / JavaScript
- Tailwind CSS + shadcn/ui
- @tanstack/react-query（データフェッチ・キャッシュ）
- react-router-dom v6（ルーティング）
- framer-motion（アニメーション）

### バックエンド
- Base44 Entities（データベース）
- Base44 Functions（Deno Deploy ベースのサーバーレス関数）
- Base44 Integrations（Core: LLM, Email, UploadFile等）

### インフラ（AWS）
| サービス | 用途 |
|---------|------|
| AWS IVS（Interactive Video Service）| ライブ配信（1対多） |
| AWS Chime SDK Meetings | 1対1ビデオ通話 / クラス配信（1対9） |
| AWS S3（S3_BUCKET_VOD） | VOD動画ストレージ |
| AWS CloudFront | VOD配信（署名付きURL） |

### 決済
- Stripe（JPY建て）
- Stripe Connect Express（クラウドファンディング出金）
- エールコイン（プラットフォーム内仮想通貨、1コイン=1円）

### 廃止済みサービス
- ~~Mux（VOD）~~ → AWS S3+CloudFront に完全移行（2026-06-03）
- ~~Agora（通話）~~ → AWS Chime SDK に完全移行
- ~~Twilio~~ → AWS Chime SDK に完全移行

---

## 3. エンティティ設計

### ユーザー関連
```
User（built-in）
  id, email, full_name, role（admin|user）

YellCoinWallet          ← ユーザーのコインウォレット
  user_email, balance, total_charged, total_sent
  first_terms_agreed_at, last_terms_agreed_at, terms_version

YellCoinTransaction     ← コイン入出金履歴
  user_email, type（charge|send|receive|refund）
  amount, yen_amount, service_type, service_id
  coins_purchased, bonus_coins, charge_amount_jpy
  target_name, target_id, channel_id, channel_owner_email

PlanSubscription        ← サブスクリプション管理
  user_email, plan_id（basic|vod|ppv|call-anser）
  plan_name, status（active|cancelled）
  start_date, end_date
```

### チャンネル・コンテンツ
```
Channel                 ← クリエイターのチャンネル（1人1チャンネル）
  name, description, owner_email
  avatar_url, banner_url, subscriber_count
  is_live, ivs_channel_arn, ivs_stream_key, ivs_ingest_endpoint, ivs_playback_url
  call_enabled           ← 通話受付中フラグ
  call_price_{15|30|45|60|75|90|105|120}min
  default_call_duration_minutes
  incoming_call_mode（MANUAL|AUTO_ACCEPT）
  service_category       ← fortune_telling|idol|business|language|fitness|education|other
  stream_category        ← all|fortune|chat|other
  fanclub_enabled, fanclub_monthly_price, fanclub_tiers
  monthly_revenue_coins  ← 当月累計消費コイン（プログレッシブ計算用）
  progressive_rate       ← 現在適用中の還元率（0.85〜0.95）
  campaign_allowed       ← Adminが許可したキャンペーンフラグ
  username               ← /@username形式のプロフィールURL用

Video                   ← VOD動画
  title, description, video_url（CloudFront URL）
  thumbnail_url, channel_id, channel_name, channel_avatar
  price（コイン）, is_free, view_count, duration（秒）
  category, is_featured
  moderation_status（pending|approved|rejected）, moderation_note

LiveStream              ← ライブ配信セッション
  title, channel_id, channel_name, status（scheduled|live|ended）
  viewer_count, price（コイン/15分）, stream_type（ivs）
  ivs_stream_id, playback_url
  scheduled_at, started_at, ended_at

WatchHistory            ← 視聴履歴
  user_email, video_id, video_title, video_thumbnail
  channel_id, channel_name, is_free, price

Favorite                ← お気に入り動画
  user_email, video_id, video_title, video_thumbnail
  channel_id, channel_name, is_free, price
```

### 通話関連
```
VideoCall               ← 1対1ビデオ通話セッション
  caller_email, caller_name
  callee_email, callee_name, callee_channel_id
  call_mode（video|audio_only）
  status（pending|accepted|calling|active|ended|declined|cancelled）
  duration_minutes, actual_duration_minutes
  coin_price_per_15min, coins_consumed, coins_held
  billing_started_at, next_billing_at, billing_interval_count
  is_free_call, is_paid
  chime_meeting_id, chime_attendee_caller, chime_attendee_callee
  recording_option, recording_option_price, recording_status
  recording_url, recording_s3_key
  auto_disconnected
  platform_revenue_coins, creator_revenue_coins, platform_profit_yen
  extension_request_minutes, extension_request_coins, extension_request_status

CallReservation         ← 通話予約
CallSlot                ← 通話可能スロット
```

### クラス配信関連
```
ClassRoom               ← クラス配信ルーム（1対9）
  room_name, host_user_id, host_email, host_name
  channel_id, status（waiting|active|ended）
  max_participants（固定10: 講師1+生徒9）
  current_participants_count
  is_muted_all, muted_participant_emails, blocked_participant_emails
  participants[]         ← [{email, name, role, chime_attendee_id, joined_at, left_at}]
  invite_code（6桁）
  chime_meeting_id
  scheduled_at, started_at, ended_at
  description

SchoolTicket            ← クラス受講チケット
  student_email, student_name, teacher_email
  channel_id, channel_name, session_id（ClassRoom.id）
  session_title, scheduled_at, duration_minutes, price
  status（pending_payment|active|used|cancelled|expired）
  used_at, cancelled_at, expired_at
```

### 購入・販売関連
```
Purchase                ← コイン消費による購入記録
  item_type（video|live_ticket|yell_coin|school_ticket）
  item_id, amount（コイン）, buyer_email, status（pending|completed|refunded）
  stripe_session_id

Product                 ← グッズ・デジタル商品
  channel_id, owner_email, title, description, price（円）
  image_url, stock, sold_count, is_active, is_digital
  delivery_mode（instant|custom_order）
  file_url, file_name, file_type
  stripe_price_id, category（goods|digital|ticket|other）

ProductOrder            ← 商品注文
  product_id, channel_id, owner_email, buyer_email, buyer_name
  product_title, price_yen, is_digital, delivery_mode
  file_url, file_name, download_count, download_expires_at
  delivery_status（pending_delivery|delivered|not_applicable）
  delivered_file_url, delivery_message, buyer_note
  status（pending|completed|refunded）, stripe_session_id
  shipping_name, shipping_postal, shipping_address, shipping_status

DigitalCheki            ← デジタルチェキ商品（アイドル向け）
  channel_id, owner_email, title, description, price（円）
  image_url, stock, sold_count, is_active, stripe_price_id

DigitalChekiPurchase    ← チェキ購入記録
  cheki_id, channel_id, owner_email, buyer_email, buyer_name
  cheki_title, cheki_image_url, price_yen
  status（pending|completed|refunded）, stripe_session_id
  message_from_buyer, message_from_owner, delivered_image_url

DigitalTicket           ← イベントチケット（転売防止QR付き）
  owner_email, event_id, event_name, event_date, event_location
  ticket_type（general|vip|fanclub）, tier_name, tier_serial
  status（valid|used|cancelled|transferred）
  ticket_number, seat_info, price（円）
  channel_id, thumbnail_url

TicketEvent             ← イベント管理
  channel_id, event_name, description, event_date, location
  sale_type（public|fanclub|ppv）
  ticket_types[]         ← [{type, name, price, capacity, sold}]
  status（draft|on_sale|sold_out|ended）
```

### 占い・チャット鑑定
```
FortuneChatThread       ← チャット鑑定スレッド（2往復4通で自動クローズ）
  channel_id, channel_owner_email, user_email, user_name
  status（trial|active|closed）, message_count
  ticket_price_coins（500コイン）, ticket_purchased

FortuneChatMessage      ← 鑑定メッセージ
  thread_id, from_email, from_name, role（user|fortune_teller）
  content, is_trial_reply, is_masked, preview_chars

FortuneKarte            ← 鑑定カルテ
FortuneReview           ← 鑑定レビュー（1〜5星）
  channel_id, channel_owner_email, reviewer_email, reviewer_name
  session_type（fortune_chat|video_call）, session_id, rating, comment, tags
```

### ファンクラブ・コミュニティ
```
ChannelFollow           ← チャンネルフォロー
Notification            ← 通知
CommunityPost           ← コミュニティ投稿
CommunityComment        ← コミュニティコメント
DirectChat              ← DM
Message                 ← メッセージ
SuperChat               ← スーパーチャット
BlogPost                ← ブログ記事
```

### クラウドファンディング
```
CrowdfundingProject     ← プロジェクト
  title, description, channel_id, owner_email
  organization_type（public|npo|individual|company）
  organization_name, representative_name
  status（pending|reviewing|approved|rejected|active）
  goal_amount, total_raised, supporter_count
  stripe_connect_account_id, stripe_connect_status

CrowdfundingDonation    ← 支援記録
  project_id, donor_email, donor_name, amount（円）
  stripe_fee_yen, platform_fee_yen, progressive_rate, payout_yen
  message, status（pending|completed|refunded）, is_anonymous
```

### 管理・システム
```
CreatorEarning          ← クリエイター収益記録
ProgressiveRateMaster   ← プログレッシブ還元率マスター
CampaignLiveGrantee     ← キャンペーン対象者（期間限定全機能開放）
  email, reason, granted_at, expires_at

NgWordLog               ← NGワード違反ログ
BlockReport             ← ブロック・報告
ChannelSuspension       ← チャンネル停止
AppTranslation          ← 多言語翻訳テーブル
Referral                ← 紹介プログラム
Appointment             ← 予約
```

---

## 4. ユーザー登録フロー

```
新規ユーザー登録（Base44 Auth）
  ↓
onUserRegistered（Entity Automation: User.create）
  ├→ YellCoinWallet 作成: balance=500（初回ボーナス500コイン）
  │    ※ call-anser は有料プラン（¥3,300/月）のため自動付与なし
  ├→ YellCoinWallet 作成: balance=500（初回ボーナス500コイン）
  ├→ Admin向け通知（Notification エンティティ + メール）
  └→ IVSチャンネルが存在する場合は自動プロビジョニング
```

**重要:** `call-anser` プランは月額¥3,300の有料プランです。登録時の自動付与は廃止されています。

---

## 5. プランシステム

### プラン一覧

| プランID | 名称 | 月額 | 主な機能 | 収益率 |
|---------|------|------|---------|-------|
| free | FREEプラン | ¥0 | 1対1通話（有料）、コイン受取 | 70% |
| call-anser | CALL&ANSERプラン | ¥3,300/月 | 1対1通話、無料通話枠60分/日 | 85% |
| basic | BASICプラン | ¥3,300/月 | ライブ配信、アーカイブ販売 | 85%〜 |
| vod | VODプラン | ¥3,300/月 | 動画アップロード販売、録画 | 85% |
| ppv | PPVプラン | ¥3,300/月 | 有料ライブ配信 | 85% |

### プラン判定ロジック（`lib/userPlan.js`）

```javascript
// 優先順位
1. user.role === 'admin'         → 全機能（収益率85%）
2. CampaignLiveGrantee（期間内） → 全機能（収益率85%）
3. PlanSubscription（active）    → 該当プランの機能（複数可）
4. その他                        → free（収益率70%）
```

### プラン別機能マトリクス

| 機能 | free | call-anser | basic | vod | ppv |
|------|------|------------|-------|-----|-----|
| video_call（有料通話）| ✅ | ✅ | ✅ | ✅ | ✅ |
| free_call_daily（無料60分枠）| ❌ | ✅ | ❌ | ❌ | ❌ |
| yell_coin（コイン受取）| ✅ | ✅ | ✅ | ✅ | ✅ |
| community_post（投稿）| ❌ | ✅ | ✅ | ✅ | ✅ |
| fan_community | ❌ | ✅ | ✅ | ✅ | ✅ |
| progressive_rate（プログレッシブ還元）| ❌ | ✅ | ✅ | ❌ | ✅ |
| vod_upload（動画販売）| ❌ | ❌ | ❌ | ✅ | ❌ |
| recording（録画）| ❌ | ❌ | ❌ | ✅ | ❌ |
| live_ppv（有料ライブ）| ❌ | ❌ | ❌ | ❌ | ✅ |

### CALL&ANSER 無料通話枠ルール
- 1日 **60分**（10分×6スロット）
- 毎日 JST 0:00 に `resetDailyFreeCallQuota` 関数で自動リセット
- 使用時は `VideoCall.is_free_call: true` フラグを付与

---

## 6. エールコインシステム

### 基本仕様
```
1 エールコイン = 1 円（JPY等価）
エールコイン購入手数料: 5%（税込・外乗せ方式・2026-06-04確定）
  coin_purchase_fee_yen = Math.ceil(coins × 0.05)
  viewer_total_yen      = coins + coin_purchase_fee_yen
  granted_coins         = coins（手数料分のコインは付与しない）

  例: 1,000コイン → 手数料50円 → 支払1,050円 → 付与1,000コイン

Stripe実手数料（3.6%）はエールコイン購入手数料とは別物のコストとして管理する。
ボーナスコイン: 廃止（2026-06-04より）
```

### コイン購入プラン（2026-06-04確定）

| plan_id | 付与コイン | 本体価格 | 購入手数料5%（税込） | Stripe請求額 |
|---------|-------:|------:|-------------:|--------:|
| plan_1000 | 1,000コイン | ¥1,000 | ¥50 | **¥1,050** |
| plan_3000 | 3,000コイン | ¥3,000 | ¥150 | **¥3,150** |
| plan_5000 | 5,000コイン | ¥5,000 | ¥250 | **¥5,250** |
| plan_10000 | 10,000コイン | ¥10,000 | ¥500 | **¥10,500** |

**ボーナスコイン廃止。granted_coins = 購入コイン数のみ。**
**5%はエールコイン購入時のみ適用。他サービスの直接Stripe決済には適用しない。**
**30,000コインプランは未提供（バックエンド未定義）。**

### コイン購入フロー
```
1. 視聴者が /coin-charge または 設定 → コイン購入 でプラン選択
2. createCoinCheckoutSession → Stripe Checkout Session 作成
   metadata: {
     type: "yell_coin_purchase", userEmail, planId,
     coin_base_amount_yen, coin_purchase_fee_rate, coin_purchase_fee_yen,
     viewer_total_yen, granted_coins
   }
3. Stripe決済完了（Stripe請求額 = viewer_total_yen）
4. stripeWebhook → checkout.session.completed
   ├→ 冪等性チェック: stripe_session_idで重複スキップ
   ├→ YellCoinWallet.balance += granted_coins
   ├→ YellCoinWallet.total_charged += granted_coins
   └→ YellCoinTransaction 作成（coins_purchased=granted_coins, bonus_coins=0）
```

### コイン利用フロー
```
通話課金: videoCallBilling（tick/end）
ライブ配信視聴: consumeCoinsForViewing
エール送信: ライブチャット/動画ページから直接
チャット鑑定: FortuneChatThread 購入時
動画購入: Purchase エンティティ（createCheckoutSession経由）
```

### ウォレット記録ルール（厳守）
```javascript
YellCoinWallet.balance        += granted_coins   // 購入コイン数のみ
YellCoinWallet.total_charged  += granted_coins   // 購入コイン数のみ（ボーナス廃止）
YellCoinTransaction.amount         = granted_coins    // 付与コイン（= 購入コイン）
YellCoinTransaction.coins_purchased = granted_coins   // 購入コイン数
YellCoinTransaction.bonus_coins     = 0               // ボーナス廃止
YellCoinTransaction.charge_amount_jpy = viewer_total_yen // 視聴者支払総額
YellCoinTransaction.stripe_session_id = session.id   // 冪等性キー
```

### 初回ボーナス
- 新規登録時に自動で **500コイン**付与（`onUserRegistered`）

---

## 7. 1対1ビデオ通話フロー

### インフラ
- **AWS Chime SDK Meetings**（Agora/Twilio は廃止済み）
- リージョン: us-east-1
- コスト: $0.0017/分/参加者 × 2人 ≒ ¥0.53/分 ≒ **¥8/15分**（確定値）

### 通話申し込みフロー
```
1. 視聴者が /call-request/:channelId にアクセス
   ├→ チャンネルの call_enabled 確認
   └→ 通話時間・金額確認（15〜120分）

2. 申し込み
   └→ VideoCall レコード作成: status="pending"
      caller_email, callee_email, duration_minutes, coin_price_per_15min
      recording_option（任意）

3. ライバー承諾（MANUAL モード）
   ├→ CallWaitingRoom / CreatorChat でライバーが「承諾」
   └→ status: pending → accepted

   自動承諾（AUTO_ACCEPT モード）
   └→ autoAcceptCall 関数が自動的に accepted へ

4. Chime Meeting 作成（発信者側）
   └→ createChimeMeeting（action:"create"）
      ├→ AWS Chime Meeting 作成
      ├→ Attendee 作成（caller）
      └→ VideoCall.chime_meeting_id 保存

5. 着信者が参加
   └→ createChimeMeeting（action:"join"）
      └→ Attendee 作成（callee）

6. 通話開始: status: active
```

### 通話課金フロー（videoCallBilling）

```
action: "tick"（フロントから毎分呼び出し）
  ├→ 初回tick（billing_started_at なし）
  │    ├→ 発信者のプランを確認（free/basic/call-anser）
  │    ├→ ウォレット残高チェック
  │    │    不足 → auto_disconnected: true, status: "ended"
  │    ├→ 第1ユニット課金（150 or 200コイン）
  │    └→ next_billing_at = now + 15分
  │
  └→ 次回tick（billing_started_at あり）
       ├→ next_billing_at 未到達 → billed: false 返却
       └→ 15分経過 → 次ユニット課金
            ├→ 残高不足 → auto_disconnected: true
            └→ 課金成功 → next_billing_at += 15分

action: "end"（通話終了時）
  ├→ 録画オプション追加課金（recording_option=true の場合: +100コイン）
  ├→ 精算確定（actual_duration_minutes, coins_consumed）
  └→ 収益分配計算:
       creatorRevenueCoins  = consumedCoins × creator_rate
       platformRevenueCoins = consumedCoins - creatorRevenueCoins
       commCostYen          = 実際の分数 × AWS実費
       platformProfitYen    = platformRevenueCoins - commCostYen

action: "check_next"（課金前の残高確認）
  └→ 残高・次ユニットコスト・has_enough を返す
```

### プラン別課金単価

| プラン | 15分単価 | ライバー還元率 | 運営収益率 |
|-------|---------|-------------|---------|
| free | 200コイン | 70% | 30% |
| basic / call-anser | 150コイン | 85% | 15% |

**プランはtick毎に動的チェック（アップグレード後即時反映）**

### 録画オプション
- `recording_option: true` の通話のみ録画起動
- 追加料金: **100コイン**（固定）、通話終了時に発信者から徴収
- 録画インフラ: AWS S3 + CloudFront
- アーカイブ再生: `generateSignedCloudFrontUrl`（通話参加者のみ）

### 通話延長フロー
```
1. ライバーが延長リクエスト（requestCallExtension）
   └→ VideoCall.extension_request_status = "pending"

2. 視聴者が確認（acceptCallExtension）
   └→ コイン追加ホールド確認

3. ライバーが確定（confirmCallExtension）
   └→ duration_minutes += extension_request_minutes
```

---

## 8. ライブ配信フロー

### インフラ
- **AWS IVS（Interactive Video Service）**
- ライブチャット: Base44 Entities リアルタイム購読

### チャンネル開設フロー
```
1. クリエイターが /my-channel でチャンネル作成
2. provisionChannelStreamKey
   ├→ IVSチャンネル作成（AWS API）
   ├→ ストリームキー・取り込みエンドポイント取得
   └→ Channel エンティティに保存
      ivs_channel_arn, ivs_stream_key, ivs_ingest_endpoint, ivs_playback_url
```

### 配信開始フロー
```
1. クリエイターが /go-live
   ├→ OBSまたはブラウザ配信（RTMPS）
   └→ createLiveStream → LiveStream エンティティ作成

2. ivsSessionWebhook（IVSからのWebhook）
   ├→ stream_start → LiveStream.status = "live", Channel.is_live = true
   └→ stream_end → LiveStream.status = "ended", Channel.is_live = false

3. detectIvsStreamStart（定期チェック）
   └→ IVS APIでストリーム状態を確認し同期
```

### ライブ配信料金体系

#### 視聴料金（コイン/15分）連動画質
| 価格帯 | 画質 | 備考 |
|--------|-----|------|
| 15〜54コイン | 480p（SD） | 最低価格 |
| 55〜149コイン | 720p（HD） | |
| 150コイン以上 | 1080p（FHD）| 従来の基準価格 |

#### トップライバー特例
- 累計売上1,000万円超 → 最低価格200コイン/15分（1080p強制）

### 視聴者の支払いフロー（PPV配信）
```
1. 視聴者が有料ライブに入室
2. 30秒プレビュー → LivePreviewLockout
3. チケット購入（createLiveTicketCheckout → Stripe）
4. liveTicketWebhook → Purchase エンティティ作成
5. consumeCoinsForViewing → 15分毎にコイン消費
```

### プログレッシブ・インセンティブ（ライバー収益率）

| 月間コイン収益 | 還元率 |
|--------------|-------|
| 〜999,999 | 85% |
| 1,000,000〜2,999,999 | 86% |
| 3,000,000〜5,999,999 | 87% |
| 6,000,000〜8,999,999 | 88% |
| 9,000,000〜11,999,999 | 89% |
| 12,000,000〜14,999,999 | 90% |
| 15,000,000〜16,499,999 | 91% |
| 16,500,000〜17,999,999 | 92% |
| 18,000,000〜19,499,999 | 93% |
| 19,500,000〜20,000,000 | 94% |
| 20,000,000以上 | 95% |

**毎月1日に `calcMonthlyRevenueRate` でリセット・再計算**

---

## 9. VOD動画販売フロー

### インフラ
- アップロード: S3 Presigned PUT URL
- 配信: AWS CloudFront（署名付きURL、6時間有効）
- **Mux は完全廃止済み（2026-06-03）**

### アップロードフロー
```
クリエイター: /upload
  1. checkUsageLimit（日次2時間上限チェック）
     ├→ 本日のアップロード・ライブ・通話の合計秒数を集計
     └→ 2時間（7200秒）超過でアップロード不可

  2. uploadVideoToS3（S3 Presigned PUT URL 生成）
     ├→ S3キー: channels/{channel_id}/{timestamp}-{filename}
     ├→ 有効期限: 15分
     └→ 返却: presigned_url, s3_key, playback_url（CloudFront URL）

  3. フロントが S3 に直接 PUT アップロード

  4. Video エンティティ作成
     ├→ video_url = CloudFront URL（https://{CLOUDFRONT_DOMAIN}/{s3_key}）
     ├→ moderation_status = "pending"
     └→ サムネイル: Base44 Core.UploadFile

  5. 審査: 管理者が /admin/video-moderation で
         pending → approved / rejected
```

### 再生フロー
```
視聴者: /watch/:videoId
  1. Video エンティティ取得

  2. 無料動画（is_free=true または price=0）
     └→ getSignedVideoUrl → CloudFront 署名付きURL（6時間）

  3. 有料動画（未購入）
     ├→ 30秒プレビュー（クライアント側でタイムアウトロック）
     ├→ "SAMPLE" ウォーターマーク
     └→ Preview30SecPaywallModal → エールコイン購入

  4. 有料動画（購入済み）
     ├→ Purchase エンティティ確認
         {item_type:"video", item_id:videoId, buyer_email, status:"completed"}
     └→ getSignedVideoUrl → CloudFront 署名付きURL（6時間）で再生
```

### VOD料金ルール
- 最低販売価格: **100コイン（100円相当）**
- ライバー還元: 85% / プラットフォーム: 15%
- 30秒プレビュー: 全有料動画に適用

---

## 10. クラス配信フロー（1対9）

### 概要
- 講師1人 + 生徒最大9人 = 最大10名
- **AWS Chime SDK Meetings**使用
- 生徒はSchoolTicket（事前購入）必須
- ルート: `/classroom/:roomId`

### クラス作成フロー（講師）
```
1. /classroom/create にアクセス
   ├→ ClassRoom エンティティ作成
   │    status="waiting", max_participants=10
   │    invite_code=ランダム6桁
   └→ 招待リンク生成: /classroom/{id}?code={invite_code}

2. 講師がルームに入室
   └→ createChimeMeeting（action:"create"）
        ├→ AWS Chime Meeting 作成
        ├→ host Attendee 作成
        ├→ ClassRoom.chime_meeting_id 保存
        ├→ ClassRoom.status = "active"
        └→ ClassRoom.participants に講師を追加
```

### 生徒入室フロー
```
1. 生徒が招待リンクにアクセス
2. 認証チェック（未ログインはリダイレクト）

3. フロントの事前チェック
   ├→ ClassRoom.status === "ended" → room_not_active エラー
   ├→ invite_code 検証
   ├→ blocked_participant_emails チェック
   └→ SchoolTicket 存在確認（session_id=roomId, status="active"）
       なし → ticketRequired 画面表示

4. createChimeMeeting（action:"join"）バックエンドでの検証
   ├→ invite_code 再検証（バックエンドでも必ず実施）
   ├→ blocked_participant_emails チェック
   ├→ SchoolTicket 認可（asServiceRole）
   ├→ 定員チェック（現在のactive参加者 < 10）
   ├→ Chime Attendee 作成
   └→ 7ステップ競合対策:
        Step1: 最新roomを再取得・タイムアウト退出者をクリーン
        Step2: active人数再計算
        Step3: Attendee作成前の定員チェック
        Step4: DB更新直前に再取得
        Step5: Attendee作成後・DB更新前の定員チェック
        Step6: DB更新（participants に chime_attendee_id を保存）
        Step7: DB更新後の最終確認（超過時はrollback）
```

### ハートビート（参加者生存確認）
```
フロントから30秒毎に createChimeMeeting（action:"heartbeat"）
  → participants[].last_seen_at 更新
  → 90秒無応答の参加者を自動退出（left_at記録）
  → cleanupTimedOutParticipants（スケジュール実行）
```

### クラス終了フロー（講師）
```
createChimeMeeting（action:"delete"）
  ├→ AWS Chime Meeting 削除
  ├→ 全参加者を left 扱い
  ├→ ClassRoom.status = "ended"
  └→ 対象 SchoolTicket を status="used" に更新
```

### 講師操作
- `action:"kick"` — 生徒を強制退出 + blocked_participant_emails に追加
- ミュート: 全員ミュート（is_muted_all）/ 個別ミュート（muted_participant_emails）

---

## 11. ファンクラブフロー

### ファンクラブ設定（チャンネルオーナー）
```
Channel.fanclub_enabled = true
Channel.fanclub_tiers = [
  { tier_id, name, price, description, perks[], emoji, stripe_price_id }
]
```

### ファンクラブ加入フロー
```
1. 視聴者が /fanclub/:channelId にアクセス
2. ティアを選択
3. createFanclubCheckout → Stripe Checkout
4. fanclubWebhook → PlanSubscription 作成または更新
```

### ファンクラブ解約
```
createFanclubPortal → Stripe Billing Portal
  → 自動でキャンセル処理
```

---

## 12. チャット鑑定フロー（占い師向け）

### 仕様
- 2往復4通で自動クローズ（スレッドモデル）
- 最初の1往復（試し）は無料
- 2往復目以降は **500コイン**のチケット購入が必要

### フロー
```
1. ユーザーが占い師チャンネルの /fortune-chat/:channelId にアクセス

2. 初回メッセージ（試しメッセージ）
   └→ FortuneChatThread 作成: status="trial"
   └→ FortuneChatMessage 作成: is_trial_reply=false

3. 占い師が返信（試し返信）
   └→ FortuneChatMessage: is_trial_reply=true
      （未購入ユーザーにはマスク表示: is_masked=true）

4. ユーザーが続きを読むためにチケット購入
   └→ YellCoinWallet から 500コイン消費
   └→ FortuneChatThread.ticket_purchased = true, status="active"
   └→ マスク解除 → 試し返信の本文が表示される

5. 残り1往復（2メッセージ）
   └→ message_count が4通に達したら status="closed"

6. 終了後レビュー（任意）
   └→ FortuneReview 作成（1〜5星）
   └→ Channel.avg_rating / review_count を更新
```

### チャット価格
- `Channel.fortune_chat_price`（デフォルト500コイン）でチャンネル毎に設定

---

## 13. グッズ・デジタルコンテンツ販売フロー

### 通常商品（Product）
```
クリエイターが商品登録
  ├→ delivery_mode: "instant"（即時DL）
  │    └→ S3 private URI に事前ファイルをアップロード
  └→ delivery_mode: "custom_order"（個別納品）
       └→ 購入後にクリエイターが手動でファイルをアップロード

購入フロー
  1. createProductCheckout → Stripe Checkout
  2. productWebhook → ProductOrder 作成, status="completed"
  3. instant: getProductDownloadUrl → 署名付きDLリンク（24時間有効）
     custom_order: クリエイターがダッシュボードから納品ファイルをアップロード
```

### デジタルチェキ（DigitalCheki・アイドル向け）
```
1. createProductCheckout（type=cheki）→ Stripe
2. DigitalChekiPurchase 作成
3. クリエイターが delivered_image_url に個別メッセージ入り画像を納品
```

### イベントチケット（DigitalTicket）
```
1. TicketEvent 作成（ticket_types で席種・価格・枚数設定）
2. createEventTicketCheckout → Stripe
3. eventTicketWebhook → DigitalTicket 作成（QRコード用）
4. 当日: /verify-ticket でQRスキャン → verifyTicket 関数
   DigitalTicket.status: valid → used
```

---

## 14. クラウドファンディングフロー

### 申請フロー
```
1. クリエイターが /crowdfunding/apply で申請
   CrowdfundingProject: status="pending"
2. 管理者が審査
   status: pending → reviewing → approved / rejected
3. 承認後: status="active"
4. Stripe Connect Express アカウント作成
   createConnectAccount → stripe_connect_account_id
```

### 支援フロー
```
1. 支援者が /crowdfunding/:projectId にアクセス
2. createCrowdfundingCheckoutV2 → Stripe Checkout（直接決済）
3. crowdfundingDonationWebhook
   ├→ CrowdfundingDonation 作成
   ├→ CrowdfundingProject.total_raised 更新
   └→ CrowdfundingProject.supporter_count 更新
```

### プログレッシブ手数料
| 月間累計支援額 | プラットフォーム手数料 |
|-------------|----------------|
| 〜999,999円 | 10% |
| 1,000,000〜以上 | 段階的に低下（最大5%）|

---

## 15. 収益計算・報酬フロー

### エールコイン → 円換算
```
1コイン = 1円（確定）
```

### プラン別還元率まとめ

| 用途 | free | basic/call-anser/vod/ppv |
|------|------|------------------------|
| 1対1通話 | 70% | 85% |
| ライブ配信エール | 85% | 85%〜95%（プログレッシブ） |
| VOD販売 | 85% | 85% |
| チャット鑑定 | 85% | 85% |

### AWS インフラ実費

| サービス | 単価 | 備考 |
|---------|------|------|
| IVS 入力 | 30円/時間 | 配信者側 |
| IVS 出力 | 5円/視聴者/時間 | 視聴者側 |
| Chime 通話 | 約¥8/15分（2人） | $0.0017/分/人 × 155円/$ |
| 録画 | 2円/分 | Media Pipeline |
| S3 + CloudFront | 従量 | VOD配信 |

### 出金（Withdrawal）フロー
```
クリエイターが /withdrawal-request で申請
  ├→ 最低出金額: 1,000コイン（1,000円）
  ├→ 振込手数料: 差し引き
  └→ 管理者が手動で振込処理
     Withdrawal エンティティ: status: pending → processing → completed
```

---

## 16. 決済フロー（Stripe）

### Stripe Checkout セッションの種別

| type / 用途 | 関数 | Webhook |
|------------|------|---------|
| yell_coin_purchase | createCoinCheckoutSession | stripeWebhook |
| 動画購入 | createCheckoutSession | stripeWebhook |
| ライブチケット | createLiveTicketCheckout | liveTicketWebhook |
| イベントチケット | createEventTicketCheckout | eventTicketWebhook |
| ファンクラブ | createFanclubCheckout | fanclubWebhook |
| グッズ・デジタル商品 | createProductCheckout | productWebhook |
| デジタルチェキ | createProductCheckout | productWebhook |
| クラウドファンディング | createCrowdfundingCheckoutV2 | crowdfundingDonationWebhook |
| KYC手数料 | createKycFeeCheckout | stripeWebhook |

### Stripe Webhook 署名検証
全Webhookで HMAC-SHA256 によるリクエスト署名検証を実施（`STRIPE_WEBHOOK_SECRET`）

---

## 17. 管理者機能

### 管理者判定
```javascript
user.role === 'admin'
// または
SUPER_ADMIN_EMAILS 環境変数に含まれるメールアドレス
```

### 主な管理画面

| ページ | 機能 |
|--------|------|
| /admin/dashboard | 全体ダッシュボード |
| /admin/analytics | 収益・ユーザー分析 |
| /admin/video-moderation | 動画審査（pending→approved/rejected）|
| /admin/ng-word-analytics | NGワード分析 |
| /admin/affiliate | アフィリエイト分析 |
| /admin/metrics | KPIメトリクス |
| /admin/reminder-logs | リマインダーログ |

### 管理者専用バックエンド関数
- `adminGetAllUsers` — 全ユーザー一覧
- `addCoinsToUser` — コイン付与（管理者のみ）
- `grantAdminAccess` — 管理者権限付与
- `setAdminRole` — ロール変更

---

## 18. 絶対不変ルール（Red Lines）

以下のルールはいかなる理由があっても変更禁止です。

### 料金方針（2026-06-04確定・最優先）
```
❌ Free以外の有料プランを月額¥3,300以外として表示・請求するコード
❌ CALL&ANSERを月額¥0として扱うコード
❌ VOD・PPVを月額¥9,900として扱うコード
❌ 古い仕様書の価格（call-anser=¥0, vod=¥9,900, ppv=¥9,900）を正として使用するコード
```

### キャンペーン無料利用（2026-06-04確定）
```
公開キャンペーン（LAUNCH2026）対象者:
  - 承認日から12か月間、CALL&ANSER / Basic / VOD / PPVを全プラン無料
  - 複数プランを組み合わせても追加料金なし
  - 権限管理: CampaignLiveGranteeエンティティ
  - Stripe Checkout・Subscription・カード登録不要
  - 期間終了後も自動課金しない
  - 内部上限300名（非公開）
  - 管理者指定12か月・特別スカウト24か月は別枠

❌ キャンペーン対象者へStripe Checkout Sessionを作成するコード
❌ キャンペーン対象者へStripe Subscriptionを作成するコード
❌ キャンペーン期間終了後に自動課金するコード
❌ 公開画面に300名上限・残り枠・先着を表示するコード
```

### 収益モデル
```
❌ 150円/15分通話の運営利益（約¥14）を削るコード
❌ ライバー還元率を85%未満にするコード（BASICプラン以上）
❌ FREEプランの有料通話を完全禁止にするコード（FREEでも通話可能が大原則）
❌ Stripe手数料をプラットフォーム側が負担するコード
❌ ボーナスコイン率を8%超に設定するコード（逆ざやリスク）
```

### コイン管理
```
❌ YellCoinTransactionに coins_purchased / bonus_coins を分離せず記録するコード
❌ ウォレットの total_charged にボーナスコインを含めて累計するコード
```

### 機能制限
```
❌ recording_option なしで録画を起動するコード
❌ VOD価格を¥100未満で設定できるコード
❌ ミリオネア期間中（2026-04-01〜2026-06-30）に15分以外の通話時間を許可するコード
```

### インフラ
```
❌ Agora SDK を VideoCallPage で使用するコード（廃止済み）
❌ Mux（mux.com）を VOD配信・アップロードに使用するコード（廃止済み）
❌ S3直URL（CloudFront経由でない）でVODを配信するコード
```

### 凍結済みコンポーネント（変更禁止）
```
❌ components/live/LivePreviewLockout（30秒ゲート）
❌ public/overlay.html（Prism Web Overlay）
❌ pages/PrismWebOverlay（React版オーバーレイ）
❌ エールコイン関連の表示ロジック
```

---

## 付録: バックエンド関数一覧

| 関数名 | 用途 |
|--------|------|
| onUserRegistered | 新規登録時の初期化 |
| videoCallBilling | 通話課金（tick/end/check_next）|
| createChimeMeeting | Chime Meeting管理（通話・クラス）|
| cleanupTimedOutParticipants | ハートビートタイムアウト退出処理 |
| uploadVideoToS3 | S3 Presigned URL生成 |
| getSignedVideoUrl | CloudFront署名付きURL（VOD）|
| generateSignedCloudFrontUrl | CloudFront署名付きURL（録画）|
| generateCloudFrontUrl | CloudFront署名付きURL（汎用）|
| checkUsageLimit | 日次利用制限チェック |
| checkUploadEligibility | アップロード資格チェック |
| addCoinsToUser | コイン付与（Admin専用）|
| stripeWebhook | Stripeイベント処理 |
| createCoinCheckoutSession | コイン購入Stripe Checkout |
| createCheckoutSession | 動画購入Stripe Checkout |
| createFanclubCheckout | ファンクラブStripe Checkout |
| fanclubWebhook | ファンクラブWebhook |
| createProductCheckout | 商品購入Stripe Checkout |
| productWebhook | 商品購入Webhook |
| createEventTicketCheckout | イベントチケットStripe Checkout |
| eventTicketWebhook | イベントチケットWebhook |
| createLiveTicketCheckout | ライブチケットStripe Checkout |
| liveTicketWebhook | ライブチケットWebhook |
| createCrowdfundingCheckoutV2 | クラウドファンディング決済 |
| crowdfundingDonationWebhook | クラウドファンディングWebhook |
| createConnectAccount | Stripe Connect口座作成 |
| stripeConnectWebhook | Stripe ConnectWebhook |
| verifyTicket | チケットQR検証 |
| getProductDownloadUrl | デジタル商品DLリンク生成 |
| provisionChannelStreamKey | IVSチャンネル作成・ストリームキー発行 |
| ivsSessionWebhook | IVSセッションWebhook（配信開始/終了）|
| detectIvsStreamStart | IVSストリーム状態ポーリング |
| checkIvsStreamStatus | IVSストリーム状態確認 |
| healthCheckIvsChannel | IVSチャンネルヘルスチェック |
| createLiveStream | ライブ配信セッション作成 |
| consumeCoinsForViewing | 視聴コイン消費 |
| processPurchase | 購入処理 |
| updateProgressiveRates | プログレッシブ還元率更新 |
| calcMonthlyRevenueRate | 月次収益率計算 |
| resetDailyFreeCallQuota | 無料通話枠日次リセット |
| autoAcceptCall | 通話自動承諾 |
| requestCallExtension | 通話延長申請 |
| acceptCallExtension | 通話延長承諾 |
| confirmCallExtension | 通話延長確定 |
| filterCommentNgWord | NGワードフィルタ |
| moderateContent | コンテンツモデレーション |
| notifyFollowers | フォロワー通知 |
| notifyAdminNewUser | 管理者通知（新規登録）|
| notifyLineAdminSale | LINE管理者通知（販売）|
| appointmentReminder | 予約リマインダー |
| sendEventReminder | イベントリマインダー |
| campaignAutoGrant | キャンペーン自動付与 |
| expireYellCoins | コイン期限切れ処理 |
| detectGiantKilling | ジャイアントキリング検知 |
| grantBasicPlanForFortune | 占い師向けBasicプラン付与 |
| forumPost | フォーラム投稿 |
| adminGetAllUsers | 全ユーザー取得（Admin）|
| grantAdminAccess | 管理者権限付与 |
| setAdminRole | ロール変更 |
| trackLogs | ログ記録 |
| generateSitemap | サイトマップ生成 |
| generateSitemapDynamic | 動的サイトマップ |

---

*このドキュメントはコードベースから直接生成されています。*  
*コードに変更があった場合は本ドキュメントも更新してください。*