# 03_ENTITIES_AND_RELATIONS.md
> **Document Name**: Entities and Relations  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative（スキーマはentities/*.jsonから直接確認）  
> **Note**: 詳細スキーマはEMITY_SCHEMAS.jsonを参照。本ファイルは関係性と重要事項のみ記載。

---

## エンティティ関係図

```
User (built-in)
  ↓ 1:1
Channel (owner_email = User.email)
  ↓ 1:N
LiveStream / Video / Product / DigitalCheki / TicketEvent / ClassRoom / CrowdfundingProject
FortuneChatThread / SchoolSession

User
  ↓ 1:1
YellCoinWallet (user_email = User.email)
  ↓ 1:N
YellCoinTransaction

User
  ↓ 1:N
PlanSubscription (user_email)
CampaignLiveGrantee (email)
VideoCall (caller_email or callee_email)

VideoCall ─── ClassRoom ─── SchoolTicket (session_id = ClassRoom.id)
SchoolTicket (student_email) ← User
SchoolTicket (teacher_email) ← Channel.owner_email

FortuneChatThread ─── FortuneChatMessage (thread_id)
FortuneChatThread → FortuneReview

CrowdfundingProject ─── CrowdfundingDonation (project_id)
Product ─── ProductOrder (product_id)
DigitalCheki ─── DigitalChekiPurchase (cheki_id)
TicketEvent ─── DigitalTicket (event_id)

Channel ─── ChannelFollow (channel_id)
Channel ─── CommunityPost ─── CommunityComment
Channel ─── BlogPost
Campaign ─── CampaignLiveGrantee (campaign_id)
```

---

## 主要エンティティの重要事項

### User（built-in）

```
built-in フィールド（変更不可）: id, email, full_name, role, created_date
追加フィールド: free_call_reset_date（CALL&ANSER無料通話枠管理）
ロール: 'user' | 'admin'
注意: User.create はBase44 platform が行う（APIから直接作成不可）
```

### YellCoinWallet

```
RLS: create=admin / read・update=本人orAdmin / delete=admin
重要: balance は直接更新可能（バックエンド関数経由のみ推奨）
total_charged: 購入コインのみ累計（ボーナスコイン・手数料分は含めない）
total_sent: 消費コインの累計
ユーザー1人につき1レコード（user_email で一意）
```

### YellCoinTransaction

```
type: 'charge' | 'send' | 'receive' | 'refund'
service_type: 'charge' | 'direct_chat' | 'live_viewing' | 'fortune_chat'
stripe_session_id: 冪等性チェックキー（コイン購入時）
coins_purchased: 購入コイン数（chargeタイプのみ）
bonus_coins: 常に0（廃止済み）
```

### PlanSubscription

```
plan_id の種類:
  'free' | 'call-anser' | 'basic' | 'vod' | 'ppv'（標準プラン）
  'sanctum_{channel_id}'（ファンクラブ）
status: 'active' | 'cancelled' | 'past_due' | 'incomplete'
stripe_session_id: 初回購入時のセッションID
```

### CampaignLiveGrantee

```
grant_source: 'campaign_link' | 'admin_designated' | 'special_scout'
benefit_months: 12 or 24
expires_at: 権限有効期限（resolveUserPlan で確認）
campaign_id: Campaign.id（campaign_link の場合のみ）
```

### VideoCall

```
RLS: read・update = caller or callee or admin
シグナリングフィールド: webrtc_offer, webrtc_answer, webrtc_ice_candidates_*
課金フィールド: coins_consumed, billing_interval_count, billing_started_at
分配フィールド: creator_revenue_coins, platform_revenue_coins
```

### ClassRoom

```
max_participants: 10（変更禁止）
SchoolTicket の session_id は ClassRoom.id を参照（SchoolSession.id ではない）
invite_code: 6桁英数字（生徒入室に必須）
participants: [{email, name, role, chime_attendee_id, joined_at, left_at}] 配列
blocked_participant_emails: kick済みユーザーリスト
```

### SchoolTicket

```
session_id = ClassRoom.id（SchoolSession.id ではない）★重要
status: 'pending_payment' → 'active' → 'used' or 'cancelled' or 'expired'
payment_method: 'yell_coin' | 'stripe'
revenue_rate_at_purchase: 購入時点の還元率（後から変更不可）
teacher_plan_at_purchase: 購入時点の講師プラン
最低価格: Math.ceil(duration_minutes/15) × 150円
```

### Channel

```
service_category で専用機能が有効化される
fortune_telling → チャット鑑定機能
idol → デジタルチェキ機能
ivs_stream_key: ライブ配信キー（生涯有効）
fanclub_tiers: [{tier_id, name, price, stripe_price_id}]
monthly_revenue_coins: 当月累計（プログレッシブ還元率計算用）
username: /@username URL用（一意）
```

### Video

```
moderation_status: 'pending' | 'approved' | 'rejected'
approved のみ公開（検索・視聴可能）
video_url: CloudFront URL（S3直URLは禁止）
```

---

## 全エンティティ一覧

```
コアビジネス:
  User, Channel, Video, LiveStream, VideoCall
  ClassRoom, SchoolSession, SchoolTicket
  FortuneChatThread, FortuneChatMessage, FortuneReview, FortuneKarte
  
コイン・収益:
  YellCoinWallet, YellCoinTransaction
  CreatorEarning, ProgressiveRateMaster
  Withdrawal
  
プラン・キャンペーン:
  PlanSubscription, Campaign, CampaignLiveGrantee
  CampaignLiveGrantee, Referral
  
Stripe決済:
  Purchase, ProductOrder, Product
  DigitalCheki, DigitalChekiPurchase
  DigitalTicket, TicketEvent
  CrowdfundingProject, CrowdfundingDonation
  
コミュニティ・メッセージ:
  CommunityPost, CommunityComment
  DirectChat, Message, SuperChat, Comment
  ChannelFollow, Favorite, WatchHistory
  ForumReport, ChannelReport, ChannelSuspension, BlockReport
  
通知・システム:
  Notification, NgWordLog, AppTranslation
  Appointment, CallSlot, CallReservation
  BlogPost, InstantCallBypass
  IvsChannelRegistry, MuxVideo（廃止済み）
  EnterpriseChannel, IdolApplication
  CancellationReason, CopyrightTransaction
  VideoRating, VideoReaction, CrowdfundingActivityReport, CrowdfundingComment
``