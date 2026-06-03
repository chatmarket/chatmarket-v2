# ChatMarket マスター仕様書 v1.0 - PART1: 基盤・エンティティ・プラン・コイン
> 生成日: 2026-06-03 | ソース: コードベース全ファイルから直接生成  
> 用途: ChatGPT/Claude等AIへの完全インプット・開発ルールブック

---

# 1. プラットフォーム概要

**ChatMarket**: 日本語向けライブ配信・VOD販売・1対1通話・クラス配信・占い鑑定のクリエイターエコノミープラットフォーム  
**URL**: https://live-chat-market.com  
**管理者**: unei@chatmarket.info

## サービスカテゴリ（Channel.service_category）
| 値 | 対象 | 専用機能 |
|----|------|---------|
| fortune_telling | 占い師 | チャット鑑定・FortuneReview |
| idol | アイドル | デジタルチェキ・ChekiCallEndBanner |
| business | コンサルタント | - |
| language | 語学講師 | クラス配信 |
| fitness | トレーナー | - |
| education | 教師 | クラス配信 |
| other | その他 | - |

---

# 2. インフラ・技術スタック

## フロントエンド
- React 18 + Vite + Tailwind CSS + shadcn/ui
- @tanstack/react-query（データフェッチ）
- react-router-dom v6
- amazon-chime-sdk-js（クラス配信のみ）

## インフラ（AWS）
| サービス | 用途 | リージョン |
|---------|------|----------|
| AWS IVS | ライブ配信（1対多） | ap-northeast-1 |
| AWS Chime SDK Meetings | クラス配信（1対9）のみ | us-east-1 |
| AWS S3（S3_BUCKET_VOD） | VOD動画ストレージ | AWS_REGION |
| AWS CloudFront | VOD動画配信（署名付きURL・6時間）| グローバル |

## 通話インフラ（1対1）
- **映像・音声**: WebRTC P2P（ブラウザ直接接続）
- **ICE(STUN)**: Google STUN（stun.l.google.com:19302）第一優先
- **ICE(TURN)**: Twilio NTS ← ICEサーバー取得専用・通話インフラではない
- **シグナリング**: Base44 Entities（VideoCall）リアルタイム購読 + 500msポーリング

## 廃止済み（コード内残存・使用禁止）
| サービス | 環境変数（残存） |
|---------|---------------|
| Mux | MUX_TOKEN_ID, MUX_TOKEN_SECRET |
| Agora | AGORA_APP_ID |
| Twilio（通話） | ← ICE取得のみ残存 |

## 環境変数完全一覧
```
STRIPE_SECRET_KEY             Stripe APIキー
STRIPE_WEBHOOK_SECRET         Stripe一般Webhook署名検証
STRIPE_FANCLUB_WEBHOOK_SECRET ファンクラブStripe Webhook署名検証
STRIPE_FANCLUB_PRICE_STANDARD ファンクラブStripe Price ID（スタンダード）
STRIPE_FANCLUB_PRICE_PREMIUM  ファンクラブStripe Price ID（プレミアム）
STRIPE_FANCLUB_PRICE_DIAMOND  ファンクラブStripe Price ID（ダイヤモンド）
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY  AWS認証
AWS_REGION                    AWSリージョン
S3_BUCKET_VOD                 VOD用S3バケット名
CLOUDFRONT_DOMAIN             CloudFrontドメイン（例: dxxx.cloudfront.net）
CLOUDFRONT_KEY_PAIR_ID        CloudFront署名キーペアID
CLOUDFRONT_PRIVATE_KEY        CloudFront署名秘密鍵（PEM形式）
IVS_WEBHOOK_SECRET            IVSセッションWebhook検証
IVS_STAGES_ARN                IVS Stages ARN
TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN  Twilio NTS ICEサーバー取得用
LINE_CHANNEL_ID / LINE_CHANNEL_SECRET  LINE通知
SUPER_ADMIN_EMAILS            スーパー管理者メール（カンマ区切り）
ENVIRONMENT                   環境識別（production等）
```

---

# 3. エンティティ（データベース）完全定義

## User（built-in）
```
id, email, full_name, role（admin|user）created_date（built-in）
追加フィールド:
  free_call_reset_date: string  ← 無料通話枠リセット日（YYYY-MM-DD）
```

## YellCoinWallet（エールコインウォレット）
```
user_email: string        ← 一意
balance: number           ← 現在残高（コイン枚数）
total_charged: number     ← 累計入金コイン（★ボーナス含まない）
total_sent: number        ← 累計送付コイン
first_terms_agreed_at, last_terms_agreed_at, terms_version（規約同意）

RLS: create=admin / read・update=自分orAdmin / delete=admin
```

## YellCoinTransaction（コイン入出金履歴）
```
user_email, type（charge|send|receive|refund）
amount: number          ← 付与合計コイン（chargeは購入+ボーナス）
yen_amount: number      ← 定価円（charge時）
service_type: string    ← charge|direct_chat|live_viewing|fortune_chat
service_id, target_name, target_id, channel_id, channel_owner_email, message
coins_purchased: number ← ★charge時: 入金対応コイン（ボーナス除く・必ず分離記録）
bonus_coins: number     ← ★charge時: ボーナスコイン（必ず分離記録）
charge_amount_jpy: number ← 実請求額（Stripe手数料込み）
stripe_session_id, terms_agreed_at, terms_version
```

## PlanSubscription（サブスクリプション）
```
user_email, plan_id（basic|vod|ppv|call-anser|sanctum_{channel_id}）
plan_name, status（active|cancelled）, start_date, end_date, description
```

## Channel（クリエイターチャンネル）
```
name, description（最大1000文字）, avatar_url, banner_url, owner_email（必須）

IVSライブ配信:
  is_live, ivs_channel_arn, ivs_stream_key（生涯有効）
  ivs_ingest_endpoint, ivs_playback_url, ivs_provisioned_at

1対1通話設定:
  call_enabled（default:false）
  call_price_{15|30|45|60|75|90|105|120}min
  default_call_duration_minutes（default:0）
  incoming_call_mode（MANUAL|AUTO_ACCEPT・default:MANUAL）
  call_theme, call_available_dates（最大1000文字）, call_schedule

ファンクラブ:
  fanclub_enabled（default:false）, fanclub_monthly_price（default:500）
  fanclub_description
  fanclub_tiers: [{ tier_id, name, price, description, perks[], emoji, stripe_price_id }]

プログレッシブ還元率:
  monthly_revenue_coins（default:0）← 当月累計消費コイン
  progressive_rate（default:0.85）  ← 現在適用中の還元率（0.85〜0.95）
  rate_applied_month               ← "YYYY-MM"形式

カテゴリ:
  service_category（fortune_telling|idol|business|language|fitness|education|other）
  stream_category（all|fortune|chat|other・default:chat）

占い師専用:
  fortune_arts, fortune_experience, fortune_genres
  fortune_chat_price（default:500）← チャット鑑定チケット価格

語学:
  native_language, learning_languages[], resident_country, learning_status（最大140文字）

レビュー:
  avg_rating（default:0）← FortuneReviewから自動集計
  review_count（default:0）

その他:
  ng_words[], pinned_comment_id, pinned_comment_text, pinned_comment_user
  campaign_allowed（default:false）, campaign_note
  lp_accent_color（#6366f1）, lp_bg_color（#0f1729）, lp_font（gothic|mincho|maru|modern）
  username ← /@username形式URL用（一意）
  bank_account_name, bank_name, bank_branch, bank_account_number, bank_account_type
  category_id, tags[]（最大10個）
  social_links: { x, instagram, tiktok, youtube, line, facebook, website }
  badges[]
```

## Video（VOD動画）
```
title（必須）, description, video_url（CloudFront URL・必ず経由）
thumbnail_url, channel_id（必須）, channel_name, channel_avatar
price（コイン・default:0）, is_free（default:false）
view_count（default:0）, duration（秒）
category（エンタメ|音楽|ゲーム|教育|スポーツ|テクノロジー|ニュース|その他）
is_featured（default:false）
moderation_status（pending|approved|rejected・default:pending）
moderation_note
```

## VideoCall（1対1ビデオ通話）
```
caller_email（必須）, caller_name
callee_email（必須）, callee_name, callee_channel_id
call_mode（video|audio_only・default:video）

ステータス:
  status（pending|accepted|calling|active|ended|declined|cancelled）

ミュート（DB同期）:
  caller_muted（default:false）, callee_muted（default:false）

無料通話:
  is_free_call（default:false）, is_paid（default:false）

課金:
  coin_price_per_15min（default:500）
  coins_consumed（default:0）← 消費済み合計
  billing_started_at, next_billing_at, billing_interval_count（default:0）
  auto_disconnected（default:false）← 残高不足自動切断フラグ

収益:
  platform_revenue_coins, creator_revenue_coins, platform_profit_yen（全default:0）
  duration_minutes（default:30）, actual_duration_minutes（default:0）
  comm_cost_yen（default:0）

録画:
  recording_option（default:false）← trueで終了時+100コイン
  recording_option_price, recording_status（pending|processing|completed|failed）
  recording_url, recording_s3_key, recording_duration_seconds（default:0）
  recording_infra_cost_yen（default:0）

その他:
  yell_coin_amount（default:0）← 通話中エール合計
  coins_held（default:0）

延長システム:
  extension_request_minutes, extension_request_coins
  extension_request_status（pending|accepted|confirmed|rejected）
  extension_requested_at, extension_accepted_at, extension_confirmed_at
  loss_time_buffer_until ← 延長決済待機バッファ期限

WebRTCシグナリング:
  webrtc_offer: string  ← JSON.stringify(RTCSessionDescription)
  webrtc_answer: string ← JSON.stringify(RTCSessionDescription)
  webrtc_ice_candidates_broadcaster, webrtc_ice_candidates_viewer
  webrtc_callee_ready（default:false）← Callee準備完了フラグ

接続（現在1対1では未使用・Chimeはクラス配信専用）:
  chime_meeting_id, chime_attendee_caller, chime_attendee_callee
  message, thread_id

RLS: create=自分 / read・update=caller or callee or admin / delete=admin
```

## LiveStream（ライブ配信セッション）
```
title, channel_id, channel_name
status（scheduled|live|ended）
viewer_count（default:0）, price（コイン/15分）
stream_type（"ivs"）, ivs_stream_id, playback_url
scheduled_at, started_at, ended_at
ticket_purchases: [{ user_email, price_yen, purchased_at }]
ticket_total_revenue_yen
```

## ClassRoom（クラス配信ルーム・1対9）
```
room_name（必須）, host_user_id（必須）, host_email（必須）, host_name（必須）
channel_id
status（waiting|active|ended・default:waiting）
max_participants（default:10・★絶対変更禁止）
current_participants_count（default:0）

参加者管理:
  participants: [{
    email, name, role（host|guest）,
    chime_attendee_id,  ← Chime Attendee ID（kickに使用）
    external_user_id, joined_at, last_seen_at, left_at, exit_reason
  }]

ミュート・ブロック:
  is_muted_all（default:false）← 講師対象外
  muted_participant_emails[]
  blocked_participant_emails[]  ← kick後・再入室禁止リスト

招待:
  invite_code ← 6桁英数字（必須）

Chime:
  chime_meeting_id

スケジュール:
  scheduled_at, started_at, ended_at, description

将来拡張:
  recording_enabled（default:false）
  recording_status（none|scheduled|recording|completed|failed）
  recording_s3_url, archive_product_id
```

## SchoolTicket（クラス受講チケット）
```
student_email（必須）, student_name
teacher_email（必須）
channel_id, channel_name
session_id（必須）← ClassRoom.id
session_title, scheduled_at, duration_minutes
price（円）
status（pending_payment|active|used|cancelled|expired・default:pending_payment）
used_at, cancelled_at, expired_at
description（最大1000文字）
```

## FortuneChatThread（チャット鑑定スレッド）
```
channel_id（必須）, channel_name, channel_owner_email（必須）
user_email（必須）, user_name
status（trial|active|closed・default:trial）
message_count（default:0）← 4通でclosed
ticket_price_coins（default:500）
ticket_purchased（default:false）, ticket_purchased_at
```

## FortuneChatMessage（鑑定メッセージ）
```
thread_id（必須）, from_email（必須）, from_name
role（user|fortune_teller・必須）
content（必須）
is_trial_reply（default:false）← 試し返信フラグ（マスク対象）
is_masked（default:false）    ← true=●●●●●表示
preview_chars（default:60）   ← プレビュー文字数
```

## FortuneReview（鑑定レビュー）
```
channel_id（必須）, channel_owner_email（必須）
reviewer_email（必須）, reviewer_name
session_type（fortune_chat|video_call・default:fortune_chat）
session_id（必須）, rating（1〜5・必須）
comment（最大300文字）, tags[]
```

## Purchase（コイン消費購入記録）
```
item_type（video|live_ticket|yell_coin|school_ticket）
item_id, amount（コイン or 円）, buyer_email
status（pending|completed|refunded）, stripe_session_id
```

## Product（グッズ・デジタル商品）
```
channel_id（必須）, channel_name, owner_email（必須）
title（必須）, description（最大500文字）, price（円・必須）
image_url, stock（default:-1・-1=無制限）, sold_count（default:0）
is_active（default:true）, is_digital（default:false）
delivery_mode（instant|custom_order・default:instant）
  instant: 事前ファイルアップ→購入即時DL
  custom_order: 購入後に販売者が個別納品
file_url（S3 private URI）, file_name
file_type（pdf|mp3|zip|jpg|png|mp4|other）
custom_order_description（最大300文字）
delivery_days_estimate（default:7）
stripe_price_id, category（goods|digital|ticket|other・default:goods）
```

## ProductOrder（商品注文）
```
product_id, channel_id, owner_email, buyer_email（全必須）
buyer_name, product_title, price_yen（必須）
is_digital（default:false）, delivery_mode（instant|custom_order）
file_url, file_name, download_count（default:0）
download_expires_at（購入から1年）
delivery_status（pending_delivery|delivered|not_applicable・default:not_applicable）
delivered_file_url, delivered_file_name, delivered_at
delivery_message（最大500文字）, buyer_note（最大300文字）
status（pending|completed|refunded）, stripe_session_id
shipping_name, shipping_postal, shipping_address, shipping_phone
shipping_status（waiting|preparing|shipped|delivered）, tracking_number
```

## DigitalCheki（デジタルチェキ商品・アイドル向け）
```
channel_id, owner_email, title（全必須）
description（最大300文字）, price（円・500円単位・最大10000円）
image_url, stock（default:-1）, sold_count（default:0）
is_active（default:true）, stripe_price_id
```

## DigitalChekiPurchase（チェキ購入記録）
```
cheki_id, channel_id, owner_email, buyer_email, price_yen（全必須）
channel_name, buyer_name, cheki_title, cheki_image_url
status（pending|completed|refunded）, stripe_session_id
message_from_buyer（最大200文字）, message_from_owner（最大200文字）
delivered_image_url（個別メッセージ入り納品画像）
```

## DigitalTicket（イベントチケット・転売防止QR付き）
```
owner_email, event_name（全必須）
owner_name, original_buyer_email
event_id, event_date, event_location
ticket_type（general|vip|fanclub・default:general）, tier_name, tier_serial
channel_id, channel_name, price（default:0・円）
status（valid|used|cancelled|transferred・default:valid）
used_at, used_by_email, ticket_number（例: VIP-001）, seat_info
thumbnail_url, description（最大1000文字）
```

## TicketEvent（イベント管理）
```
channel_id, event_name, event_date, sale_type（全必須）
channel_name, channel_owner_email, description, location
thumbnail_url
sale_type（public|fanclub|ppv・default:public）
livestream_id（PPV紐付け）
ticket_types: [{ type, name, price, capacity, sold }]
status（draft|on_sale|sold_out|ended・default:draft）
```

## CrowdfundingProject（クラウドファンディング）
```
title, organization_name, organization_type, representative_name,
contact_name, contact_phone, address（全必須）
description（最大10000文字）, channel_id, owner_email
organization_type（public|npo|individual|company）
corporate_number, address_postal, address_building, hp_url, certificate_url
image_url_1, image_url_2, image_url_3
status（pending|reviewing|approved|rejected|active・default:pending）
admin_note, goal_amount（default:0・0=目標なし）
total_raised（default:0）, supporter_count（default:0）
stripe_connect_account_id
stripe_connect_status（not_started|pending_onboarding|active|restricted）
```

## CrowdfundingDonation（支援記録）
```
project_id, donor_email, amount（全必須）
project_title, owner_email, donor_name
stripe_fee_yen, platform_fee_yen, progressive_rate（default:0.85）
payout_yen, message
status（pending|completed|refunded）, is_anonymous（default:false）
stripe_session_id
```

## CampaignLiveGrantee（キャンペーン対象者・期間限定全機能開放）
```
email, reason, granted_at, expires_at（全必須）
reason（early_adopter|special_promotion|influencer_campaign）
notes
```

## その他エンティティ
```
ChannelFollow, WatchHistory, Favorite, DirectChat, Message, SuperChat
BlogPost, CommunityPost, CommunityComment, FortuneKarte
CreatorEarning, ProgressiveRateMaster, NgWordLog, BlockReport
ChannelSuspension, AppTranslation, Referral, Appointment
CallSlot, CallReservation, Withdrawal, Notification
IvsChannelRegistry, InstantCallBypass, YellCoinTransaction
```

---

# 4. プランシステム（完全版）

## プラン一覧

| plan_id | 月額 | 収益率 | 15分単価 | 備考 |
|---------|------|-------|---------|------|
| free | ¥0 | 70% | 200コイン | - |
| call-anser | ¥0 | 85% | 150コイン | ★全ユーザーに自動付与 |
| basic | ¥3,300 | 85%〜95% | 150コイン | - |
| vod | ¥9,900 | 85% | - | - |
| ppv | ¥9,900 | 85%〜95% | - | - |

## プラン判定ロジック（resolveUserPlan）

```
優先順位1: user.role === "admin"
  → ALL_FEATURES（全機能）, revenueRate:0.85, coinPer15min:150

優先順位2: CampaignLiveGrantee に有効なレコードが存在
  filter({ email: user.email })
  expires_at > now のレコードあり
  → ALL_FEATURES, isCampaign:true, revenueRate:0.85, coinPer15min:150

優先順位3: PlanSubscription（status:active）が存在
  filter({ user_email, status:"active" }) で全プラン取得
  複数プランの features を Set で合算（重複排除）
  basic or call-anser が含まれる → revenueRate:0.85, coinPer15min:150
  それ以外                       → revenueRate:0.70, coinPer15min:200

優先順位4: free
  revenueRate:0.70, coinPer15min:200
```

## プラン別機能定義

```javascript
PLAN_FEATURES = {
  free: [
    'video_call',     // 有料1対1通話（70%・200コイン/15分）
    'yell_coin',      // エールコイン受取
    'channel',        // チャンネルページ
    'community',      // コミュニティ閲覧のみ（投稿不可）
  ],
  'call-anser': [     // ★全ユーザーが登録時に自動付与
    'video_call',
    'free_call_daily', // 1日60分の無料通話枠（10分×6スロット）
    'yell_coin', 'channel', 'community',
    'community_post',  // コミュニティ投稿
    'fan_community',   // ファンコミュニティ
    'progressive_rate',// プログレッシブ還元率（85%〜95%）
  ],
  basic: [
    'video_call',      // 有料1対1通話（85%・150コイン/15分）
    'yell_coin', 'channel', 'community', 'community_post',
    'fan_community', 'progressive_rate',
  ],
  vod: [
    'vod_upload',      // 動画アップロード販売（最低100コイン）
    'vod_archive', 'recording', 'yell_coin', 'channel',
    'community', 'community_post', 'fan_community',
  ],
  ppv: [
    'live_ppv',        // 有料ライブ配信（画質連動）
    'yell_coin', 'channel', 'community', 'community_post',
    'fan_community', 'progressive_rate',
  ],
}

ALL_FEATURES（admin・キャンペーン用）:
  ['video_call','free_call_daily','yell_coin','channel','community',
   'community_post','fan_community','progressive_rate','vod_upload',
   'vod_archive','recording','live_ppv']
```

## CALL&ANSER 無料通話枠

```
1日60分（10分×6スロット）

フロントの使用量判定:
  VideoCall.filter({ caller_email: user.email })
  → created_date >= todayStart かつ is_free_call:true のレコードを集計
  → 合計60分超 → 有料通話に切り替え

resetDailyFreeCallQuota（毎日JST 0:00に実行）:
  PlanSubscription.filter({ plan_id:"call-anser", status:"active" }) で全ユーザー取得
  各ユーザーの User.free_call_reset_date = today（YYYY-MM-DD）に更新
  ★ フロントは created_date >= today でカウントするため自動的にリセット扱い
```

---

# 5. エールコインシステム（完全版）

## 基本規則
```
1 エールコイン = 1 円（確定・変更禁止）
Stripe手数料: 視聴者負担・外乗せ方式
  chargeYen = ceil(coinAmount / (1 - 0.036))
  例: 1000コイン → ceil(1000 / 0.964) = 1038円請求
```

## コイン購入プラン（変更禁止）

```javascript
const COIN_PLANS = {
  plan_1000:  { base_price:1000,  coins:1000,  bonus_coins:0,   charge_amount:1038 },
  plan_5000:  { base_price:5000,  coins:5000,  bonus_coins:400, charge_amount:5187 },
  plan_10000: { base_price:10000, coins:10000, bonus_coins:800, charge_amount:10374 },
}
// ボーナス率最大8%（これを超えると逆ざや → 絶対禁止）
```

## コイン購入フロー

```
フロント /coin-charge でプラン選択
→ base44.functions.invoke("createCoinCheckoutSession", { planId, successUrl, cancelUrl })

バックエンド createCoinCheckoutSession:
  plan = COIN_PLANS[planId]（無効 → 400）
  Stripe Checkout Session作成:
    mode: "payment", amount: plan.charge_amount（例: 1038円）
    metadata = {
      type:            "yell_coin_purchase",
      userEmail:       user.email,
      planId,
      base_price:      String(plan.base_price),
      charge_amount:   String(plan.charge_amount),
      coins_purchased: String(plan.coins),       ← 入金対応コイン（ボーナス除く）
      bonus_coins:     String(plan.bonus_coins), ← ボーナスコイン
      total_coins:     String(totalCoins),       ← 付与合計
    }
  → { checkoutUrl, sessionId }

stripeWebhook → checkout.session.completed:
  meta.type === "yell_coin_purchase":
    coinsPurchased = parseInt(meta.coins_purchased)
    bonusCoins     = parseInt(meta.bonus_coins)
    totalCoins     = coinsPurchased + bonusCoins

    YellCoinWallet なければ作成
    YellCoinWallet.update({
      balance:       wallet.balance + totalCoins,          ← 付与合計を加算
      total_charged: wallet.total_charged + coinsPurchased, ← ★ボーナス含めない
    })
    YellCoinTransaction.create({
      type: "charge", amount: totalCoins,
      coins_purchased: coinsPurchased,  ← ★必ず分離記録
      bonus_coins: bonusCoins,          ← ★必ず分離記録
      charge_amount_jpy: chargeAmount,
      terms_version: "2026-04",
    })
```

## コイン分配ルール

| 用途 | 送付コイン | ライバー還元 | 運営 |
|------|----------|------------|------|
| 1対1通話（free） | 200/15分 | **140（70%）** | 60（30%）|
| 1対1通話（basic/call-anser）| 150/15分 | **127（85%）** | 23（15%）|
| エール送信 | 任意 | **85%** | 15% |
| VOD購入 | 動画価格 | **85%** | 15% |
| チャット鑑定 | 500/2往復 | **85%** | 15% |
| ライブ配信 | 設定値/15分 | **85%〜95%** | 15%〜5% |

---

# 6. ユーザー登録フロー

## トリガー
Base44 Automation: User エンティティ create イベント → `onUserRegistered` 関数

## 全処理（順番通り）

```
payload.data.email を取得（なければ skipped を返す）

Step1: PlanSubscription 作成（重複チェック付き）
  filter({ user_email:email, plan_id:"call-anser" })
  → 既存なし: create({ plan_id:"call-anser", plan_name:"CALL&ANSERプラン", status:"active" })
  → 既存あり: スキップ
  ★ 全ユーザーは登録時点から call-anser プランを保有

Step2: YellCoinWallet 作成（重複チェック付き）
  filter({ user_email:email })
  → 既存なし: create({ balance:500, total_charged:500, total_sent:0 })
  → 既存あり: スキップ
  ★ 初回ボーナス 500コイン

Step3: Admin向けアプリ内通知
  User.filter({ role:"admin" }) → 全Admin
  各Admin: Notification.create({
    type:"new_video", title:"🎉 新規ユーザー登録",
    message:"{full_name}さんが新規登録しました",
    link:"/admin/dashboard?tab=users",
  })

Step4: Admin向けメール通知（失敗しても登録を止めない）
  SendEmail to: unei@chatmarket.info
  件名: 【新規登録】{full_name}さんが登録しました

Step5: IVSチャンネル自動プロビジョニング（エラー握り潰し）
  Channel.filter({ owner_email:email }) → チャンネル存在 かつ ivs_stream_key 未設定
  → functions.invoke("provisionChannelStreamKey", { channel_id })
```

---

# 7. プログレッシブ還元率ロジック

## 還元率テーブル（DEFAULT_TIERS・変更禁止）

| 月間売上（円）| 還元率 |
|-------------|-------|
| 0〜999,999 | **85%** |
| 1,000,000〜2,999,999 | 86% |
| 3,000,000〜5,999,999 | 87% |
| 6,000,000〜8,999,999 | 88% |
| 9,000,000〜11,999,999 | 89% |
| 12,000,000〜14,999,999 | 90% |
| 15,000,000〜16,499,999 | 91% |
| 16,500,000〜17,999,999 | 92% |
| 18,000,000〜19,499,999 | 93% |
| 19,500,000〜19,999,999 | 94% |
| 20,000,000以上 | **95%** |

## updateProgressiveRates（毎月1日 JST 0:00 実行）

```
認証: user.role !== "admin" → 403（スケジューラは認証不要）

lastMonthStart = new Date(year, month-1, 1)
lastMonthEnd   = new Date(year, month, 1)

ProgressiveRateMaster.filter({ is_active:true }) → マスタティア
  → なければ DEFAULT_TIERS を使用

Channel.list() → 全チャンネルをループ:
  CreatorEarning.filter({ channel_id }) → 先月分でフィルタ（日付範囲）
  totalYen = Σ(yen_equivalent || coin_amount × 1.1)

  getRateForRevenue(tiers, totalYen):
    tiers を threshold_yen 降順でソート
    totalYen > threshold_yen の最初のtier → rate_percent を返す

  Channel.update({
    progressive_rate: newRate / 100,  // 0.85〜0.95
    monthly_revenue_coins: floor(totalYen / 1.1),
    rate_applied_month: "YYYY-MM",
  })
```

---

# 8. スケジュール実行（Automation）完全版

| 関数名 | スケジュール | 処理内容 |
|--------|------------|---------|
| updateProgressiveRates | 毎月1日 0:00 JST | 全チャンネルの還元率を前月実績で更新 |
| calcMonthlyRevenueRate | 毎月1日 | 月間収益率計算 |
| resetDailyFreeCallQuota | 毎日 0:00 JST | call-anserユーザーのfree_call_reset_date更新 |
| cleanupTimedOutParticipants | 定期 | Chimeクラス90秒無応答参加者を退出処理 |
| cleanupStaleIvsChannels | 定期 | IVSゾンビチャンネル削除 |
| zombieStreamKiller | 定期 | 終了されていないLiveStreamを強制ended |
| expireYellCoins | 定期 | 期限切れエールコイン処理 |
| campaignAutoGrant | 定期 | CampaignLiveGrantee自動付与 |
| appointmentReminder | 定期 | 予約リマインダー送信 |
| sendEventReminder | 定期 | イベントリマインダー送信 |
| detectIvsStreamStart | 定期 | IVSストリーム状態ポーリング（Webhook補完）|
| liveStreamCostTracker | 定期 | ライブ配信コスト集計 |

---

# 9. 日次制限（checkUsageLimit）

```
DAILY_LIMIT_SECONDS = 7200（2時間 = 120分）

計算:
  本日のアップロード: Video.filter({ created_by:user.email }) → duration合計（秒）
  本日のライブ:      Channel → LiveStream → duration×60（秒）
  本日の通話:        VideoCall.filter({ caller_email }) → duration_minutes×60（秒）

  totalUsed = Σ全カテゴリ
  remaining = max(0, 7200 - totalUsed)
  requested > remaining → allowed:false（"残り{remaining/60}分"）
```

---

# 10. 絶対不変ルール（Red Lines）

```
収益モデル:
❌ 1対1通話ライバー還元率を85%未満にするコード（basic/call-anserプラン）
❌ freeプランライバー還元率を70%未満にするコード
❌ FREEプランの通話を完全禁止にするコード（FREEでも通話可能が大原則）
❌ Stripe手数料をプラットフォーム側が負担するコード
❌ ボーナスコイン率を8%超に設定するコード（逆ざやリスク）
❌ 1コイン≠1円 にする換算ロジック
❌ COIN_PLANS テーブルの金額・コイン数を変更するコード

コイン管理:
❌ YellCoinWallet.total_charged に bonus_coins を含めて加算するコード
❌ YellCoinTransaction に coins_purchased / bonus_coins を分離せず記録するコード
❌ コイン残高がマイナスになるロジック

機能制限:
❌ recording_option=false の通話で録画を起動するコード
❌ VOD価格を100コイン未満で設定できるコード
❌ ミリオネア期間（2026-04-01〜2026-06-30）に15分以外の通話時間を許可するコード
❌ ClassRoomの最大参加者を10名超に変更するコード
❌ SchoolTicketのチェックを省略してクラスに入室させるコード

インフラ:
❌ Agora SDK を VideoCallPage で使用するコード（廃止済み）
❌ Mux を VOD配信・アップロードに使用するコード（廃止済み）
❌ S3直URL（CloudFront経由でない）でVODを配信するコード
❌ AWS認証情報をフロントエンドに公開するコード
❌ Chime Meeting の全レスポンスをクライアントに返すコード
❌ WebRTC P2PをChimeに切り替えるコード（1対1通話はWebRTCのまま）

凍結済みコンポーネント（変更禁止）:
❌ components/live/LivePreviewLockout（30秒プレビューゲート）
❌ public/overlay.html（Prism Web Overlay）
❌ pages/PrismWebOverlay
❌ hooks/usePreview30SecLock.js
```

---
*PART2に続く → MASTER_SPEC_PART2.md*