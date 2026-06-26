# ChatMarket — 全体ロジック・フロー完全版
> **作成日**: 2026-06-26  
> **用途**: CODEX等の外部AIによるコードレビュー・ロジック確認用  
> **対象**: 本番稼働中 https://live-chat-market.com

---

## 目次

1. [プラットフォーム概要](#1-プラットフォーム概要)
2. [技術スタック・アーキテクチャ](#2-技術スタックアーキテクチャ)
3. [認証・ロール・権限](#3-認証ロール権限)
4. [エンティティ構造・関係図](#4-エンティティ構造関係図)
5. [コイン（エールコイン）システム](#5-コインエールコインシステム)
6. [プラン・サブスクリプションシステム](#6-プランサブスクリプションシステム)
7. [ライブ配信フロー（AWS IVS）](#7-ライブ配信フローaws-ivs)
8. [VOD（動画販売）フロー](#8-vod動画販売フロー)
9. [1対1ビデオ通話フロー（WebRTC）](#9-1対1ビデオ通話フローwebrtc)
10. [クラスルーム（1対9）フロー（Chime）](#10-クラスルーム1対9フローchime)
11. [チャット鑑定フロー（占い師）](#11-チャット鑑定フロー占い師)
12. [グッズ・デジタル商品販売フロー](#12-グッズデジタル商品販売フロー)
13. [デジタルチェキフロー（アイドル）](#13-デジタルチェキフローアイドル)
14. [ファンクラブ（Stripe Subscription）](#14-ファンクラブstripe-subscription)
15. [クラウドファンディングフロー](#15-クラウドファンディングフロー)
16. [キャンペーン付与フロー](#16-キャンペーン付与フロー)
17. [Stripe 決済・Webhook 全体マトリクス](#17-stripe-決済webhook-全体マトリクス)
18. [収益分配ロジック（プログレッシブ還元）](#18-収益分配ロジックプログレッシブ還元)
19. [自動化（Automation）スケジュール一覧](#19-自動化automationスケジュール一覧)
20. [セキュリティ・モデレーション](#20-セキュリティモデレーション)
21. [既知の問題・注意事項](#21-既知の問題注意事項)

---

## 1. プラットフォーム概要

日本語特化クリエイターエコノミープラットフォーム。配信者（ライバー・占い師・講師・アイドル等）が視聴者・ファンから直接収益を得る。

### 対象ユーザー
- **クリエイター**: ライバー、占い師、講師、アイドル、コンサルタント等
- **視聴者/ファン**: 配信を視聴し、エール（投げ銭）・通話・授業受講で関与

### 主要機能マトリクス

| 機能 | 必要プラン | 課金方式 | 還元率 |
|------|---------|---------|-------|
| ライブ配信（無料） | FREE以上 | 視聴者コイン消費 | 70〜95% |
| 有料ライブ配信（PPV） | PPVプラン | コイン/15分 | 85〜95% |
| VOD販売 | VODプラン | Stripe一括 | 85〜95% |
| 1対1ビデオ通話 | FREE以上 | コイン/15分 | 70〜95% |
| クラス配信（1対9） | ミニスクール | チケット制 | 85% |
| チャット鑑定 | fortune_telling自動付与 | コイン500/チケット | 85% |
| グッズ販売 | FREE以上 | Stripe一括 | 85〜95% |
| デジタルチェキ | idol対象 | Stripe一括 | 85〜95% |
| ファンクラブ | FREE以上 | Stripe月額 | 70% |
| クラウドファンディング | 審査制 | Stripe Connect | 85〜95% |

---

## 2. 技術スタック・アーキテクチャ

```
[ブラウザ/PWA]
  React 18 + Vite + Tailwind CSS + shadcn/ui
  react-router-dom v6（SPA）
  @tanstack/react-query（サーバー状態管理）
      ↓ HTTPS
[Base44 BaaS]
  - MongoDB相当のEntity DB（RLS付き）
  - JWT/セッション認証
  - Deno Deploy バックエンド関数ホスティング
  - リアルタイム Subscribe（WebSocket）
  - Automation（スケジュール・エンティティイベント）
      ↓ 外部API
[外部サービス]
  Stripe          → 決済・サブスクリプション・Connect
  AWS IVS         → ライブ配信（RTMPS/HLS）
  AWS Chime SDK   → クラスルーム（1対9）のみ
  AWS S3          → VOD動画ストレージ
  AWS CloudFront  → VOD配信（署名付きURL）
  Twilio NTS      → WebRTC TURN ICEサーバー取得のみ
  LINE            → 管理者へのセールス通知
```

### バックエンド関数の実装規約

```javascript
// 全関数の標準パターン
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    // ... ロジック
    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
```

---

## 3. 認証・ロール・権限

### 認証フロー

```
1. メール+パスワード or Google OAuth（google_oauth_client_secret）
2. base44.auth.me() → { id, email, full_name, role, ...追加フィールド }
3. AuthContext.jsx でアプリ全体に認証状態を配布
4. 未認証 → base44.auth.redirectToLogin(nextUrl) でリダイレクト
```

### ロール定義

| ロール | 付与方法 | 権限 |
|-------|---------|------|
| user | 登録時デフォルト | 一般機能のみ |
| admin | setAdminRole関数 / SUPER_ADMIN_EMAILS環境変数 | 全機能 + 管理者機能 |

### クリエイター/視聴者の判定方法

```javascript
// 配信者判定
const isOwner = channel.owner_email === user.email;

// クラス講師判定
const isHost = room.host_email === user.email || room.host_user_id === user.id;

// 生徒判定（SchoolTicket確認）
const ticket = await base44.entities.SchoolTicket.filter({
  session_id: room.id,      // ★ ClassRoom.id（SchoolSession.idではない）
  student_email: user.email,
  status: 'active'
});

// 管理者判定
const isAdmin = user.role === 'admin';
```

### バックエンド関数の権限パターン

```javascript
// 一般ユーザー必須
const user = await base44.auth.me();
if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

// 管理者必須（追加チェック）
if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

// Webhook（Stripe署名検証・ユーザー認証不要）
const isValid = await verifyStripeSignature(body, signature, secret);
if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 401 });

// スケジューラー（認証不要・自動実行）
const base44 = createClientFromRequest(req);
// user不要 / asServiceRole でDB操作
```

### ページアクセス権限

| ページ | アクセス権 |
|--------|---------|
| /, /search, /channel/:id, /live/:id | 公開 |
| /watch/:videoId | 公開（有料はコイン必要） |
| /go-live, /settings, /my-channel | ログイン必須 |
| /video-call/:callId | ログイン + caller/callee本人のみ |
| /classroom/:roomId | ログイン + SchoolTicketまたは講師 |
| /admin/* | ログイン + role=admin |
| /@:username | 公開（ProfileLP） |
| /prism-overlay/:streamId | 公開・認証なし（OBSブラウザソース用） |

---

## 4. エンティティ構造・関係図

```
User (built-in)
  ├── Channel (owner_email)           ─── チャンネル（配信者の拠点）
  │     ├── LiveStream                ─── ライブ配信セッション
  │     ├── Video                     ─── VOD動画
  │     ├── Product                   ─── グッズ・デジタル商品
  │     ├── DigitalCheki              ─── デジタルチェキ商品
  │     ├── TicketEvent               ─── イベント
  │     ├── ClassRoom                 ─── クラス配信ルーム
  │     ├── ChatReadingMenu           ─── チャット鑑定メニュー
  │     ├── CrowdfundingProject       ─── クラウドファンディング
  │     ├── FortuneChatThread         ─── チャット鑑定スレッド
  │     └── BlogPost                  ─── ブログ投稿
  │
  ├── YellCoinWallet (user_email)     ─── コインウォレット
  │     └── YellCoinTransaction       ─── コイン取引ログ
  │
  ├── PlanSubscription (user_email)   ─── プラン購読
  ├── CampaignLiveGrantee (email)     ─── キャンペーン権限
  ├── VideoCall (caller/callee_email) ─── 通話セッション
  │
  └── Purchase (buyer_email)          ─── VOD購入記録
        └── CreatorEarning            ─── クリエイター収益記録

ClassRoom ────────── SchoolTicket (session_id = ClassRoom.id)
                       ★ SchoolSession.idではない

FortuneChatThread ── FortuneChatMessage (thread_id)
                  └─ FortuneReview

Product ──────────── ProductOrder (product_id)
DigitalCheki ──────── DigitalChekiPurchase (cheki_id)
TicketEvent ─────────DigitalTicket (event_id)
CrowdfundingProject ─ CrowdfundingDonation (project_id)
Campaign ────────── CampaignLiveGrantee (campaign_id)
```

### 重要エンティティの仕様

**YellCoinWallet**
- RLS: create=admin, read/update=本人orAdmin, delete=admin
- `balance`: 現在残高（バックエンド関数経由のみ更新推奨）
- `total_charged`: 購入コインのみ累計（ボーナス・手数料分は含めない）
- `first_terms_agreed_at / last_terms_agreed_at / terms_version`: 資金決済法対応

**PlanSubscription**
- `plan_id`: `'free'|'call-anser'|'basic'|'vod'|'ppv'|'mini-school'|'sanctum_{channel_id}'`
- `status`: `'active'|'cancelled'|'past_due'|'incomplete'`
- ファンクラブは `sanctum_{channelId}` として記録

**Channel**
- `service_category`: `fortune_telling|idol|business|language|fitness|education|other`
- `service_category='fortune_telling'` → チャット鑑定機能が有効
- `service_category='idol'` → デジタルチェキ機能が有効
- `monthly_revenue_coins`: 当月累計コイン（プログレッシブ還元率計算用、毎月1日リセット）
- `progressive_rate`: 現在適用中の還元率（0.70〜0.95）
- `username`: /@username URL用（一意）

**SchoolTicket**
- `session_id = ClassRoom.id`（★SchoolSession.idではない）
- `status`: `pending_payment → active → used/cancelled/expired`
- `revenue_rate_at_purchase`: 購入時点の還元率（後から変更不可）
- 最低価格: `Math.ceil(duration_minutes / 15) × 150` 円

---

## 5. コイン（エールコイン）システム

### コイン仕様
- 1コイン = 1円（購入額 = コイン数）
- 購入手数料 5%外乗せ（1000コイン = 1050円請求）
- 有効期限 180日（購入日から）
- ボーナスコイン: 廃止済み

### コイン購入フロー

```
[フロント] /coin-charge
  → createCoinCheckoutSession({ planId: 'plan_1000'|'plan_3000'|'plan_5000'|'plan_10000' })

[createCoinCheckoutSession]
  → Stripe Checkout Session（mode: "payment"）作成
  → metadata:
      type: "yell_coin_purchase"
      userEmail: 購入者メール
      planId: "plan_1000"
      coin_base_amount_yen: 1000
      coin_purchase_fee_rate: "0.05"
      coin_purchase_fee_yen: 50
      viewer_total_yen: 1050
      granted_coins: 1000
  → Stripe Checkout ページへリダイレクト

[stripeWebhook] checkout.session.completed 受信
  冪等性チェック: YellCoinTransaction.filter({ stripe_session_id }) → 既存あり → スキップ
  granted_coins = parseInt(meta.granted_coins || meta.coins_purchased)
  YellCoinWallet.balance += granted_coins
  YellCoinWallet.total_charged += granted_coins
  YellCoinTransaction.create({ type:'charge', coins_purchased: granted_coins, bonus_coins: 0 })
```

### コイン消費フロー

```
ライブ視聴: consumeCoinsForViewing
  → YellCoinWallet.balance -= amount
  → YellCoinTransaction.create({ type:'send', service_type:'live_viewing' })
  → CreatorEarning.create

エール（投げ銭）: SuperChat 経由
  → YellCoinWallet.balance -= coin_amount
  → YellCoinTransaction.create
  → CreatorEarning.create

通話課金: videoCallBilling（毎分tick / 15分単位課金）
  → YellCoinWallet.balance -= coin_cost
  → VideoCall.coins_consumed += coin_cost
  → CreatorEarning.create（通話終了時に確定）

チャット鑑定: FortuneChatThread チケット購入
  → YellCoinWallet.balance -= 500
  → FortuneChatThread.ticket_purchased = true
```

### コイン失効処理（expireYellCoins）

```
実行: 定期スケジュール
処理: YellCoinTransaction（type:'charge', expires_at < now）を検索
  → status='expired' に更新
  → YellCoinTransaction.create({ type:'expire' }) でログ記録
  → YellCoinWallet.balance を再計算して更新
```

---

## 6. プラン・サブスクリプションシステム

### プラン一覧

| plan_id | 月額 | 主な機能 | 還元率 |
|---------|-----|---------|-------|
| free | ¥0 | 1対1通話（70%還元）、エール受取 | 70% |
| basic | ¥3,300 | 1対1通話（85%還元） | 85〜95% |
| call-anser | ¥3,300 | 相手に支払って発信（60分/日無料枠） | 85〜95% |
| vod | ¥3,300 | 動画販売 | 85〜95% |
| ppv | ¥3,300 | 有料ライブ配信 | 85〜95% |
| mini-school | ¥3,300 | クラス配信（1対9） | 85% |

### プラン権限判定（lib/userPlan.js の resolveUserPlan）

```javascript
// 優先順位: admin > campaign > paid_subscription > free
async function resolveUserPlan(user) {
  // 1. 管理者
  if (user.role === 'admin') return { isAdmin: true, plans: ['all'], revenueRate: 0.95 };

  // 2. キャンペーン対象者（CampaignLiveGrantee.expires_at > now）
  const grants = await CampaignLiveGrantee.filter({ email: user.email });
  const activeGrant = grants.find(g => new Date(g.expires_at) > new Date());
  if (activeGrant) return { isCampaign: true, plans: ['basic','vod','ppv','call-anser','mini-school'], ... };

  // 3. 有料サブスク（PlanSubscription.status='active'）
  const subs = await PlanSubscription.filter({ user_email: user.email, status: 'active' });
  // plan_id リストを構築して返す

  // 4. デフォルト（FREEプラン）
  return { plans: ['free'], revenueRate: 0.70 };
}
```

### プラン購入フロー（有料）

```
[フロント] /plan-select → プラン選択 → 申し込みボタン
  → createPlanCheckoutSession({ planId, months: 12 })

[createPlanCheckoutSession]
  1. CampaignLiveGrantee 確認 → activeGrant あり → 400エラー（課金させない）
  2. Stripe Checkout Session（mode: "subscription"）作成
  3. Stripe Checkout へリダイレクト

[planSubscriptionWebhook]
  customer.subscription.created → PlanSubscription.create(status:'active')
  customer.subscription.updated → PlanSubscription.update
  customer.subscription.deleted → PlanSubscription.update(status:'cancelled')
  invoice.payment.succeeded → last_payment_status:'succeeded'
  invoice.payment.failed → last_payment_status:'failed'
```

### CALL&ANSER 無料通話枠リセット

```
毎日0時 JST: resetDailyFreeCallQuota
  → PlanSubscription.filter({ plan_id: 'call-anser', status: 'active' }) で対象取得
  → User.free_call_reset_date = today に更新
  → フロントはcreated_date >= today で当日使用量カウント（自動リセット扱い）

無料枠: 60分/日（10分単位チケット）
超過後: エールコイン従量課金に自動移行
```

---

## 7. ライブ配信フロー（AWS IVS）

### 配信開始フロー

```
[配信者] /go-live
  1. createLiveStream({ title, price, min_coins_per_15min })
     → LiveStream.create({ status: 'scheduled', channel_id })
     → IVSストリームキー確認（なければ provisionChannelStreamKey）
  
  2. OBS設定: rtmps://{endpoint}:443/app/{ivs_stream_key}
     または ブラウザ配信: amazon-ivs-web-broadcast

  3. OBS/ブラウザが配信開始
     → IVS Webhook → ivsSessionWebhook（stream_start）
       → LiveStream.status = 'live'
       → Channel.is_live = true
       → notifyFollowers（フォロワー全員に通知）Automation経由

[視聴者] /live/:streamId
  1. getIvsPlaybackUrl({ streamId }) → CloudFront HLS URL取得
  2. amazon-ivs-player で再生
  3. PPV（有料）:
     → createLiveTicketCheckout → Stripe → liveTicketWebhook
     → Purchase.create → 視聴可能に
  4. コイン視聴（コイン設定あり）:
     → consumeCoinsForViewing（15分毎）
     → YellCoinWallet.balance -= coins
     → CreatorEarning.create
```

### 配信終了フロー

```
OBSが配信停止
  → IVS Webhook → ivsSessionWebhook（stream_end）
    → LiveStream.status = 'ended'
    → Channel.is_live = false
    → enableIvsAutoArchive（アーカイブ有効化）
```

### IVS チャンネルプロビジョニング

```
Channel作成時 or 必要時:
  provisionChannelStreamKey
    → AWS IVS CreateChannel
    → Channel.ivs_channel_arn, ivs_stream_key, ivs_ingest_endpoint, ivs_playback_url を保存
    → IvsChannelRegistry にも記録
```

### ゾンビ配信検知（zombieStreamKiller）

```
実行: 毎日03:00 JST（Automation）
処理:
  LiveStream.filter({ status: 'live' }) → 0件 → early return
  各ストリームのelapsed_time, viewer_count確認
  条件: (視聴者0 かつ 60分以上) or (120分以上)
    → LiveStream.status = 'ended'
    → Channel.is_live = false
```

---

## 8. VOD（動画販売）フロー

### アップロードフロー

```
[配信者] /upload
  1. checkUsageLimit → 日次2時間制限チェック
  2. checkUploadEligibility → アップロード資格確認
  3. uploadVideoToS3 → S3 Presigned PUT URL（有効15分）取得
  4. フロントが直接S3にPUT（バックエンド経由なし）
  5. Video.create({
       video_url: CloudFront URL,  ← ★ S3直URLは禁止
       moderation_status: 'pending'
     })
  6. 管理者審査（/admin/video-moderation）
     → approved → 公開
     → rejected → 非公開（moderation_note に理由）
```

### 視聴フロー

```
[視聴者] /watch/:videoId
  1. Video.get(videoId) → is_free 確認
  
  2. 無料動画:
     → getSignedVideoUrl → CloudFront 署名URL（6時間有効）→ 再生
  
  3. 有料動画（未購入）:
     → 30秒プレビュー（LivePreviewLockout）
     → PaywallModal 表示
     → createCheckoutSession → Stripe → stripeWebhook
       → Purchase.create({ item_type:'video', buyer_email, item_id: videoId })
     → 購入確認: Purchase.filter({ buyer_email, item_id: videoId }) → 存在
     → getSignedVideoUrl → 再生
  
  4. 有料動画（購入済み）:
     → Purchase.filter で確認 → getSignedVideoUrl → 再生
```

---

## 9. 1対1ビデオ通話フロー（WebRTC）

**インフラ**: WebRTC P2P（★Chimeは使わない）  
**シグナリング**: Base44 Entities（VideoCall）のリアルタイム購読 + 500msポーリング  
**ICE STUN**: Google（stun.l.google.com:19302）  
**ICE TURN**: Twilio NTS（getTwilioIceServers、TTL 86400秒）

### フェーズ1: 通話申し込み

```
[視聴者] /call-request/:channelId
  → call_price, duration_minutes 確認
  → コイン残高確認（不足 → /coin-charge へ）
  → VideoCall.create({
      caller_email, callee_email,
      status: 'pending',
      duration_minutes,
      coin_price_per_15min,
      coins_held: 事前ホールド量
    })
  → callee（ライバー）への通知
  → /call-waiting?callId=xxx へ遷移
```

### フェーズ2: ライバーの承諾

```
[ライバー] 着信通知（GlobalCallNotifier）
  → IncomingCallScreen 表示
  → 承諾: VideoCall.update({ status: 'accepted' })
  → 拒否: VideoCall.update({ status: 'declined' })
  
  AUTO_ACCEPT モード: Channel.incoming_call_mode = 'AUTO_ACCEPT'
    → autoAcceptCall 関数が自動承諾
```

### フェーズ3: WebRTC P2P接続（useWebRtcCall.js）

```
Caller（視聴者）側:
  1. getTwilioIceServers → TURN情報取得
  2. RTCPeerConnection 作成
  3. ICE候補収集
  4. Offer SDP 作成
  5. VideoCall.update({
       webrtc_offer: offer,
       webrtc_ice_candidates_broadcaster: candidates,
       webrtc_callee_ready: false
     })
  6. callee_ready を500msポーリングで監視

Callee（ライバー）側:
  1. getTwilioIceServers → TURN情報取得
  2. RTCPeerConnection 作成（VideoCall購読）
  3. Offer受信 → Answer作成
  4. VideoCall.update({
       webrtc_answer: answer,
       webrtc_ice_candidates_viewer: candidates,
       webrtc_callee_ready: true,
       status: 'active'
     })

接続確立:
  → Caller が answer + ice_candidates を受信
  → addIceCandidate → P2P接続完了
  → 失敗時: 最大3回リトライ（ICEリスタート）
```

### フェーズ4: 通話中課金（videoCallBilling）

```
実行: フロントから毎分 tick アクション呼び出し

[videoCallBilling（tick）]
  1. VideoCall.get(callId)
  2. callerのPlanSubscription確認 → プラン判定
     - basic or call-anser → min_coins: 150, creator_rate: 0.85
     - free → min_coins: 200, creator_rate: 0.70
  3. 経過時間から消費コイン計算（15分単位）
  4. YellCoinWallet.balance -= coin_cost
  5. VideoCall.coins_consumed += coin_cost
  6. VideoCall.billing_interval_count++
  7. VideoCall.next_billing_at 更新
  8. コイン残高不足 → auto_disconnected = true → 強制終了

延長機能:
  requestCallExtension → VideoCall.extension_request_* 更新
  acceptCallExtension → 視聴者がコイン消費 + 延長確定
  confirmCallExtension → ライバーが確定
```

### フェーズ5: 通話終了（videoCallBilling/end）

```
[videoCallBilling（end）]
  1. 最終コイン精算
  2. VideoCall.actual_duration_minutes 確定
  3. CreatorEarning.create（通話分 + エール分）
  4. VideoCall.status = 'ended'
  5. VideoCall.creator_revenue_coins, platform_revenue_coins 確定
```

---

## 10. クラスルーム（1対9）フロー（Chime）

**インフラ**: Amazon Chime SDK Meetings（us-east-1固定）  
**最大参加者**: 10名（9生徒 + 1講師）★変更禁止

### 講師フロー

```
[講師] /classroom/create
  1. ClassRoom.create({
       host_email, host_user_id, host_name,
       invite_code: 6桁英数字ランダム生成,
       status: 'waiting',
       max_participants: 10
     })
  2. createChimeMeeting({ action: 'create', roomId })
     → AWS CreateMeetingCommand
     → ClassRoom.chime_meeting_id 保存
  3. createChimeMeeting({ action: 'join', roomId, role:'host' })
     → AWS CreateAttendeeCommand
     → ClassRoom.participants に追加
  4. /classroom/:roomId へ遷移
  5. amazon-chime-sdk-js でビデオ配信
```

### 生徒フロー（7ステップ競合対策）

```
[生徒] /classroom/:roomId?code={invite_code}
  1. invite_code 確認（不一致 → 入室拒否）
  2. SchoolTicket.filter({ session_id: room.id, student_email, status:'active' }) 確認
     （チケットなし → 購入ページへ）
  3. blocked_participant_emails 確認（kick済みは拒否）
  4. createChimeMeeting({ action: 'join', roomId, role:'student' })

[createChimeMeeting - join の7ステップ競合対策]
  Step1: 現在の参加者数確認（10名上限チェック）
  Step2: AWS CreateAttendeeCommand
  Step3: DB再取得（並行入室の影響確認）
  Step4: 定員確認（並行で10名になっていたらロールバック）
  Step5: DB更新（participants 配列に追加）
  Step6: DB再確認（書き込み競合確認）
  Step7: 不整合ならロールバック

ハートビート: 30秒毎 / 90秒無応答 → 自動退出
```

### クラス終了

```
[講師] 終了ボタン
  → createChimeMeeting({ action: 'delete', roomId })
    → AWS DeleteMeetingCommand
    → ClassRoom.status = 'ended'
    → SchoolTicket.status = 'used'（全参加生徒分）
    → CreatorEarning.create
```

### SchoolTicket 購入

```
コイン払い: purchaseSchoolTicketWithYellCoin
  → YellCoinWallet.balance -= price_in_coins
  → SchoolTicket.create({ status:'active', payment_method:'yell_coin' })

Stripe払い: createSchoolTicketCheckout
  → SchoolTicket.create({ status:'pending_payment' })
  → Stripe Checkout → stripeWebhook
    → SchoolTicket.update({ status:'active', payment_status:'completed' })
```

---

## 11. チャット鑑定フロー（占い師）

**対象**: Channel.service_category = 'fortune_telling'  
**Automation**: 占いカテゴリ選択時 → grantBasicPlanForFortune（Basicプラン自動付与）

### 鑑定フロー（4通で完結）

```
[視聴者] /fortune-chat/:channelId
  Step1: FortuneChatThread.find({ channel_id, user_email }) or create
         → 最初のメッセージ（無料・開示済み）

[占い師] 返信
  Step2: FortuneChatMessage.create({
           is_trial_reply: true,
           is_masked: true    ← ★ 視聴者には一部しか見えない（試し読みマスク）
         })

[視聴者] チケット購入
  Step3: YellCoinWallet.balance -= 500
         FortuneChatThread.ticket_purchased = true
         FortuneChatThread.status = 'active'
         → is_masked = false → 全文表示

  Step4: 残り1往復（計4通）
         buyer_message_count が4に達したら FortuneChatThread.status = 'closed'

[任意] 終了後レビュー
  → FortuneReview.create
  → Channel.avg_rating, review_count を自動更新
```

---

## 12. グッズ・デジタル商品販売フロー

### 商品タイプ

| delivery_mode | is_digital | 説明 |
|--------------|-----------|------|
| instant | true | 事前ファイルアップ → 購入即時DL |
| custom_order | true | 注文後に販売者が個別納品 |
| — | false | 物理グッズ（配送あり） |

### 購入フロー

```
[視聴者] チャンネルページ → 商品カード → 購入ボタン
  → createProductCheckout({ productId, buyerNote?, shippingInfo? })
    → ProductOrder.create({ status:'pending' })  ← pending で先作成
    → Stripe Checkout Session 作成
    → Stripe Checkout へリダイレクト

[productWebhook] checkout.session.completed
  1. 冪等性チェック（ProductOrder.stripe_session_id）
  2. ProductOrder.update({ status:'completed' })
  3. Product.sold_count++
  4. Product.stock-- （stock !== -1 の場合）
  5. instant digital:
     → ProductOrder.file_url = Product.file_url（S3 private URI）
     → ProductOrder.download_expires_at = now + 7days
     → 購入者にメール（DL案内）
  6. custom_order:
     → ProductOrder.delivery_status = 'pending_delivery'
     → 販売者に通知
  7. physical:
     → ProductOrder.shipping_status = 'waiting'
     → 販売者に通知
  8. CreatorEarning.create
  9. notifyLineAdminSale（LINE通知）

[DL処理] getProductDownloadUrl
  → ProductOrder の file_url から S3 Presigned GET URL（6時間有効）生成
  → download_count++ / 期限チェック
```

---

## 13. デジタルチェキフロー（アイドル）

```
[視聴者] チャンネルページ → チェキ購入
  → createProductCheckout（DigitalCheki用）
  → Stripe → productWebhook
    → DigitalChekiPurchase.create({ status:'completed' })
    → DigitalCheki.sold_count++
    → ChekiCallEndBanner にてアイドルへ通知
    → アイドルが個別メッセージ入り画像を delivered_image_url にアップして納品
```

---

## 14. ファンクラブ（Stripe Subscription）

### ティア制設定

```
Channel.fanclub_tiers: [
  { tier_id, name, price, description, perks[], stripe_price_id }
]

定義済みStripe Price ID:
  STRIPE_FANCLUB_PRICE_STANDARD
  STRIPE_FANCLUB_PRICE_PREMIUM
  STRIPE_FANCLUB_PRICE_DIAMOND
```

### 購読フロー

```
[視聴者] /fanclub/:channelId → ティア選択
  → createFanclubCheckout({ channelId, tierId })
    → Stripe Subscription（mode:'subscription'）作成
    → metadata: { base44_user_email, channel_id, tier }
    → Stripe Checkout へリダイレクト

[fanclubWebhook]（STRIPE_FANCLUB_WEBHOOK_SECRET で署名検証）
  customer.subscription.created
    → PlanSubscription.create({ plan_id: 'sanctum_{channel_id}', status:'active' })
  customer.subscription.deleted
    → PlanSubscription.update({ status:'cancelled' })

解約:
  createFanclubPortal → Stripe Customer Portal URL → 視聴者が自分で解約
```

---

## 15. クラウドファンディングフロー

```
[プロジェクト申請]
  → CrowdfundingProject.create({ status:'pending' })
  → 管理者審査（組織証明書・電話確認）
  → approved → Stripe Connect Express アカウント作成
    createConnectAccount → CrowdfundingProject.stripe_connect_account_id

[支援者] /crowdfunding/:projectId → 支援ボタン
  → createCrowdfundingCheckoutV2({ projectId, amount })
    → Stripe Checkout（Stripe Connect application fee適用）
    → CrowdfundingDonation.create({ status:'pending' })

[crowdfundingDonationWebhook]
  → CrowdfundingDonation.update({ status:'completed' })
  → CrowdfundingProject.total_raised += amount
  → CrowdfundingProject.supporter_count++
  → 資金はStripe Connect経由でプロジェクトオーナーへ
```

---

## 16. キャンペーン付与フロー

### 3つのモード（campaignAutoGrant関数）

```
mode: "campaign_link"（公開キャンペーン経由）
  → Campaign.filter({ campaign_code }) → status:'active' 確認
  → 期間チェック（starts_at〜ends_at）
  → 既存アクティブGranteeチェック（重複防止・枠消費しない）
  → 上限チェック: Campaign.approved_participants_count < max_participants（300名）
  → CampaignLiveGrantee.create({
       grant_source: 'campaign_link',
       benefit_months: 12,
       expires_at: now + 12months
     })
  → Campaign.approved_participants_count++
  → PlanSubscription.create × 4プラン（basic/vod/ppv/call-anser）
  → ★ Stripe課金は一切行わない

mode: "admin_designated"（管理者個別指定・12か月・枠外）
  → user.role === 'admin' 確認
  → 上記と同様（Campaign枠カウント対象外）

mode: "special_scout"（特別スカウト・24か月・枠外）
  → user.role === 'admin' 確認
  → benefit_months: 24 で付与

権限確認フロー（resolveUserPlan）:
  → CampaignLiveGrantee.filter({ email: user.email })
  → expires_at > now → isCampaign: true → 全機能無料
  → expires_at <= now → FREEプランに自動降格（自動課金なし）
```

---

## 17. Stripe 決済・Webhook 全体マトリクス

| 用途 | Checkout関数 | Webhook関数 | Webhook Secret | 署名検証方式 |
|------|------------|------------|----------------|------------|
| エールコイン購入 | createCoinCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET | WebCrypto手動 |
| VOD動画購入 | createCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET | WebCrypto手動 |
| ライブチケット | createLiveTicketCheckout | liveTicketWebhook | STRIPE_WEBHOOK_SECRET | Stripe SDK |
| イベントチケット | createEventTicketCheckout | eventTicketWebhook | STRIPE_WEBHOOK_SECRET | 未確認 |
| プランサブスク | createPlanCheckoutSession | planSubscriptionWebhook | 未確認 | 未確認 |
| ファンクラブ定期 | createFanclubCheckout | fanclubWebhook | STRIPE_FANCLUB_WEBHOOK_SECRET | Stripe SDK |
| グッズ・デジタル商品 | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET | Stripe SDK |
| デジタルチェキ | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET | Stripe SDK |
| クラウドファンディング | createCrowdfundingCheckoutV2 | crowdfundingDonationWebhook | STRIPE_WEBHOOK_SECRET | 未確認 |
| スクールチケット | createSchoolTicketCheckout | stripeWebhook | STRIPE_WEBHOOK_SECRET | WebCrypto手動 |

### Webhook 署名検証コード（2パターン）

```javascript
// パターン1: WebCrypto手動（stripeWebhook等）
const parts = signature.split(',');
const timestamp = parts[0].split('=')[1];
const sig = parts[1].split('=')[1];
const signedData = `${timestamp}.${body}`;
const key = await crypto.subtle.importKey('raw', encoder.encode(webhookSecret),
  { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
const sigBytes = new Uint8Array(sig.match(/.{1,2}/g).map(b => parseInt(b, 16)));
const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(signedData));

// パターン2: Stripe SDK（fanclubWebhook等）
// ★ Deno では constructEventAsync（非同期版）を使用（constructEvent は動作しない）
const event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
```

### 冪等性チェック

```javascript
// エールコイン: stripe_session_id で YellCoinTransaction を検索
const exists = await YellCoinTransaction.filter({ stripe_session_id: session.id });
if (exists.length > 0) return Response.json({ skipped: true });

// ProductOrder: 先にpendingで作成 → completedに更新（二重作成防止）
const orders = await ProductOrder.filter({ stripe_session_id: session.id });
if (orders[0]?.status === 'completed') return Response.json({ skipped: true });
```

---

## 18. 収益分配ロジック（プログレッシブ還元）

### プログレッシブ還元率テーブル

| 月間売上（コイン） | 還元率 |
|----------------|-------|
| 0〜9,999 | 85%（basic/vod/ppv） / 70%（free） |
| 10,000〜 | 87% |
| 30,000〜 | 90% |
| 50,000〜 | 92% |
| 100,000〜 | 95% |

### 月次更新（updateProgressiveRates）

```
実行: 毎月1日 JST（Automation）
処理:
  1. 全チャンネルの monthly_revenue_coins 確認
  2. ProgressiveRateMaster テーブルから対応率を取得
  3. Channel.progressive_rate 更新
  4. Channel.monthly_revenue_coins = 0（月次リセット）
  5. Channel.rate_applied_month = YYYY-MM 更新
```

### CreatorEarning の計算

```javascript
// 通話収益例（basic プラン・85%還元）
const yen_equivalent = coins_consumed * 1.0;  // 1コイン=1円
const creator_rate = 0.85;
const creator_amount_yen = Math.floor(yen_equivalent * creator_rate);
const platform_amount_yen = yen_equivalent - creator_amount_yen;

// Stripe直接決済（VOD/グッズ等）
const gross_amount_yen = price_yen;
const creator_amount_yen = Math.floor(gross_amount_yen * creator_rate);
```

---

## 19. 自動化（Automation）スケジュール一覧

### 稼働中 Scheduled Automations

| 名前 | 間隔 | 関数 | 備考 |
|-----|-----|------|-----|
| ClassRoomタイムアウト参加者クリーンアップ | 5分毎 | cleanupTimedOutParticipants | 稼働中 |
| Twilio Cost Monitor | 毎日0:00 JST | checkTwilioCostAlert | 稼働中 |
| 予約15分前リマインダー | 毎日03:00 JST | appointmentReminder | 最適化済み |
| ゾンビ配信自動終了 | 毎日03:00 JST | zombieStreamKiller | 最適化済み |
| ライブ配信コスト計算 | 毎日03:00 JST | liveStreamCostTracker | 最適化済み |
| ジャイアント・キリング検知 | 毎日03:00 JST | detectGiantKilling | 最適化済み |
| 動的サイトマップ生成 | 毎日04:00 JST | generateSitemapDynamic | 新規作成 |
| IVSチャンネルクリーンアップ | 毎週月曜03:00 JST | cleanupStaleIvsChannels | 新規作成 |

### 稼働中 Entity Automations

| トリガー | エンティティ/イベント | 条件 | 関数 |
|--------|-----------------|-----|------|
| 新規ユーザー登録 | User create | — | onUserRegistered |
| コインウォレット作成 | YellCoinWallet create | — | notifyAdminNewUser |
| 占いカテゴリ → Basicプラン | Channel create/update | stream_category="fortune" | grantBasicPlanForFortune |
| ライブ開始 → フォロワー通知 | LiveStream update | status="live" | notifyFollowers |
| 占い師ライブ → リピーター通知 | LiveStream update | status="live" | notifyFortuneRepeatListeners |

### 停止中 Automations

| 名前 | 状態 | 問題 |
|-----|-----|------|
| イベント開始リマインダー | 停止（全失敗） | sendEventReminder が全件失敗 |

---

## 20. セキュリティ・モデレーション

### Row Level Security（RLS）設定済みエンティティ

```
YellCoinWallet:   create=admin / read・update=本人orAdmin / delete=admin
VideoCall:        create=本人 / read・update=caller or callee or admin / delete=admin
ChatReadingOrder: read=buyer or (creator + payment_status='paid') or admin
ChatReadingMessage: read=sender or admin
```

### NGワード・コンテンツモデレーション

```
チャンネル別NGワード: Channel.ng_words[]
チャットフィルタ: filterCommentNgWord → NgWordLog.create
VOD審査: Video.moderation_status（pending → approved/rejected）
         管理画面: /admin/video-moderation
通報: ChannelReport, ForumReport, BlockReport エンティティ
アカウント停止: ChannelSuspension エンティティ
```

### 情報セキュリティ

```
AWS認証情報: 環境変数のみ（フロントエンドへの露出禁止）
Stripe Secret Key: 環境変数のみ
CloudFront Private Key: 環境変数のみ
S3: 直URLでの配信禁止（CloudFront経由のみ）
Chime: CreateMeeting レスポンスから AWS認証情報を除外して返却
```

---

## 21. 既知の問題・注意事項

### ⚠️ 重大な問題

```
【問題1】onUserRegistered が全ユーザーに call-anser（¥3,300/月有料プラン）を自動付与
  → 本来はキャンペーン対象者のみに付与すべき
  → MASTER_SPECでは廃止とされているが実装が残存
  → 変更前に経営側の確認必須

【問題2】一部Webhook関数の署名検証が未確認
  → crowdfundingDonationWebhook / eventTicketWebhook / planSubscriptionWebhook
  → 署名なし呼び出し可能なリスク
```

### ⚠️ セキュリティ課題

```
【課題1】テストアカウント（ono@onestep-corp.com）がライブ視聴課金をスキップ
  → ハードコードされた特殊アカウント判定が本番コードに存在
  → 環境変数化を推奨

【課題2】RLS未設定エンティティが多い
  → 認証済みユーザーが他ユーザーのデータを読み取れる可能性
  → Withdrawal, CreatorEarning 等の機密エンティティは要確認

【課題3】SchoolTicket最低価格チェックがフロントのみの可能性
  → バックエンドバリデーション追加必要
```

### 廃止済みサービス（コードに残存）

```
Mux（VOD配信）: 環境変数・MuxVideo エンティティが残存 → 使用禁止
Agora（通話）: agora-rtc-sdk-ng パッケージが残存 → 使用禁止
Chime（1対1通話）: useIvsStagesCall.js 等に痕跡 → 使用禁止
```

### 未確認事項

```
- Withdrawal（出金）の自動振込実装有無
- 海外ユーザーの決済・税務対応
- /admin/* ページの noindex 設定
- エールコインの資金決済法上の分類
- 出金時の源泉徴収要否
```

### 変更禁止事項

```
★ LivePreviewLockout（30秒無料プレビュー）のロジック
★ ClassRoom.max_participants = 10（変更禁止）
★ WebRTC P2P のまま維持（Chime/Agoraに戻さない）
★ S3直URL配信（CloudFront経由のみ）
★ Deno では stripe.webhooks.constructEventAsync（非同期版）を使用
```

---

## 付録：バックエンド関数カタログ（簡易版）

### ユーザー認証必須

| 関数 | 用途 |
|------|------|
| videoCallBilling | 通話課金（tick/end/check_next） |
| createCoinCheckoutSession | コイン購入Checkout作成 |
| createCheckoutSession | VOD購入Checkout |
| createFanclubCheckout | ファンクラブCheckout |
| createProductCheckout | 商品購入Checkout |
| createChimeMeeting | Chime Meeting管理（create/join/heartbeat/kick/delete） |
| uploadVideoToS3 | S3 Presigned PUT URL生成 |
| getSignedVideoUrl | CloudFront署名URL（VOD再生） |
| checkUsageLimit | 日次2時間制限チェック |
| consumeCoinsForViewing | ライブ視聴コイン消費 |
| getTwilioIceServers | Twilio TURN ICEサーバー取得 |
| autoAcceptCall | 通話自動承諾 |
| requestCallExtension | 通話延長申請 |
| acceptCallExtension | 通話延長承諾 |
| confirmCallExtension | 通話延長確定 |
| createLiveStream | ライブ配信セッション作成 |
| checkIvsStreamStatus | IVSストリーム状態確認 |
| provisionChannelStreamKey | IVSチャンネル・ストリームキー発行 |
| verifyTicket | チケットQRコード検証 |
| filterCommentNgWord | チャットNGワードフィルタ |
| purchaseSchoolTicketWithYellCoin | エールコインでチケット購入 |
| createSchoolTicketCheckout | SchoolTicket Stripe Checkout |

### 管理者限定

| 関数 | 用途 |
|------|------|
| addCoinsToUser | コイン手動付与 |
| adminGetAllUsers | 全ユーザー一覧 |
| grantAdminAccess | 管理者権限付与 |
| setAdminRole | ロール変更 |
| updateProgressiveRates | プログレッシブ還元率更新 |
| grantBasicPlanForFortune | 占い師向けBasicプラン付与 |
| getStripeBalance | Stripe残高確認 |

### Webhook（認証なし・署名検証）

| 関数 | トリガー |
|------|---------|
| stripeWebhook | Stripe（コイン購入・VOD・スクールチケット） |
| fanclubWebhook | Stripe（ファンクラブSubscription） |
| productWebhook | Stripe（グッズ・チェキ） |
| liveTicketWebhook | Stripe（ライブチケット） |
| planSubscriptionWebhook | Stripe（プランサブスク） |
| ivsSessionWebhook | AWS IVS（配信開始・終了） |
| crowdfundingDonationWebhook | Stripe（クラウドファンディング） |
| stripeConnectWebhook | Stripe Connect |

---

*以上が Chat Market の全体ロジック・フローです。*
*CODEXによるコードレビューの際はこのドキュメントを参照してください。*