# ChatMarket 完全フロー & ロジック詳細仕様書
> バージョン: 3.0（2026-06-03 コードベースから直接生成）  
> 目的: ChatGPT/Claude等AIへの正確なインプット用・開発ルールブック  
> **この文書に書かれたロジックがコードの正式仕様です**

---

## 目次
1. [システム全体構成](#1-システム全体構成)
2. [ユーザー登録・初期化フロー](#2-ユーザー登録初期化フロー)
3. [プラン判定ロジック（完全版）](#3-プラン判定ロジック完全版)
4. [エールコインシステム（完全版）](#4-エールコインシステム完全版)
5. [1対1ビデオ通話フロー（完全版）](#5-1対1ビデオ通話フロー完全版)
6. [ライブ配信フロー（完全版）](#6-ライブ配信フロー完全版)
7. [VOD動画販売フロー（完全版）](#7-vod動画販売フロー完全版)
8. [クラス配信フロー（1対9・完全版）](#8-クラス配信フロー1対9完全版)
9. [チャット鑑定フロー（占い師向け・完全版）](#9-チャット鑑定フロー占い師向け完全版)
10. [プログレッシブ還元率ロジック（完全版）](#10-プログレッシブ還元率ロジック完全版)
11. [Stripe決済フロー（完全版）](#11-stripe決済フロー完全版)
12. [WebRTC P2P接続ロジック（完全版）](#12-webrtc-p2p接続ロジック完全版)
13. [日次制限・使用量管理ロジック](#13-日次制限使用量管理ロジック)
14. [絶対不変ルール（Red Lines）](#14-絶対不変ルールred-lines)

---

## 1. システム全体構成

### インフラ一覧（確定版）

| 用途 | サービス | 備考 |
|------|---------|------|
| 1対1ビデオ通話（映像・音声） | **WebRTC P2P** | ブラウザ直接接続 |
| P2PのICEサーバー（STUN） | Google STUN | 第一優先 |
| P2PのICEサーバー（TURN） | **Twilio NTS** | P2P失敗時フォールバック |
| シグナリング（Offer/Answer/ICE） | Base44 Entities（VideoCall）| リアルタイム購読+ポーリング |
| クラス配信（1対9） | **AWS Chime SDK Meetings** | us-east-1 |
| ライブ配信（1対多） | **AWS IVS** | RTMPS取り込み |
| VOD動画ストレージ | **AWS S3**（S3_BUCKET_VOD）| Presigned PUT |
| VOD動画配信 | **AWS CloudFront** | 署名付きURL、6時間有効 |
| 決済 | **Stripe**（JPY建て） | Checkout Session |
| クラウドファンディング出金 | **Stripe Connect Express** | |
| データベース | Base44 Entities | |
| バックエンド関数 | Base44 Functions（Deno Deploy）| |
| 廃止済み | ~~Mux~~, ~~Agora~~（コード残存注意）| 絶対使用禁止 |

### 環境変数（シークレット）一覧

| 変数名 | 用途 |
|--------|------|
| STRIPE_SECRET_KEY | Stripe API キー |
| STRIPE_WEBHOOK_SECRET | Stripe Webhook 署名検証 |
| STRIPE_FANCLUB_WEBHOOK_SECRET | ファンクラブWebhook署名検証 |
| STRIPE_FANCLUB_PRICE_STANDARD/PREMIUM/DIAMOND | ファンクラブStripe Price ID |
| AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY | AWS認証 |
| AWS_REGION | AWSリージョン |
| S3_BUCKET_VOD | VOD用S3バケット名 |
| CLOUDFRONT_DOMAIN | CloudFrontドメイン |
| CLOUDFRONT_KEY_PAIR_ID | CloudFront署名キーペアID |
| CLOUDFRONT_PRIVATE_KEY | CloudFront署名秘密鍵（PEM形式）|
| IVS_WEBHOOK_SECRET | IVSセッションWebhook検証 |
| IVS_STAGES_ARN | IVS Stages ARN |
| TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN | TwilioICEサーバー取得用 |
| LINE_CHANNEL_ID / LINE_CHANNEL_SECRET | LINE通知 |
| SUPER_ADMIN_EMAILS | スーパー管理者メール（カンマ区切り）|
| AGORA_APP_ID | **廃止済み・使用禁止** |

---

## 2. ユーザー登録・初期化フロー

### トリガー
Base44 の User エンティティに新規レコードが作成されたとき（Automation: Entity→create）

### `onUserRegistered` 関数の全処理（順番通り）

```
Entity Automation: User.create イベント
  ↓ payload.data.email を取得
  
Step 1: PlanSubscription 作成
  filter({ user_email: email, plan_id: "call-anser" })
  → 既存なし: create({ plan_id:"call-anser", plan_name:"CALL&ANSERプラン", status:"active" })
  → 既存あり: スキップ（重複防止）
  ※ 全ユーザーは登録時点から call-anser プランを保有
  
Step 2: YellCoinWallet 作成
  filter({ user_email: email })
  → 既存なし: create({ balance:500, total_charged:500, total_sent:0 })
  → 既存あり: スキップ
  ※ 初回ボーナス 500コイン を付与
  
Step 3: Admin向けアプリ内通知
  User.filter({ role: "admin" }) で全Admin取得
  → 各AdminにNotification.create（タイプ: new_video, link: /admin/dashboard?tab=users）
  
Step 4: Admin向けメール通知
  SendEmail to: unei@chatmarket.info
  件名: 【新規登録】{full_name}さんが登録しました
  ※ メール失敗してもユーザー登録は止めない（try/catch）

Step 5: IVSチャンネル自動プロビジョニング
  Channel.filter({ owner_email: email }) → チャンネルが存在 かつ ivs_stream_key が未設定の場合
  → functions.invoke("provisionChannelStreamKey", { channel_id })
  ※ エラーは握り潰す（スキップ扱い）
```

---

## 3. プラン判定ロジック（完全版）

### 優先順位（上位が優先）

```
優先順位1: user.role === "admin"
  → 全機能開放
  → 収益率: 85%
  → 15分単価: 150コイン

優先順位2: CampaignLiveGrantee（期間付き特別付与）
  → filter({ email: user.email })
  → expires_at > 現在時刻 のレコードが存在する場合
  → 全機能開放（adminと同等）
  → 収益率: 85%
  → 15分単価: 150コイン

優先順位3: PlanSubscription（active）
  → filter({ user_email: user.email, status: "active" }) で全サブスク取得
  → 複数プランの機能を合算（Setで重複排除）
  → basic or call-anser が含まれる → 収益率 85%、15分単価 150コイン
  → それ以外 → 収益率 70%、15分単価 200コイン

優先順位4: フォールバック（free）
  → 収益率: 70%
  → 15分単価: 200コイン
```

### プラン別機能定義

```javascript
const PLAN_FEATURES = {
  free: [
    'video_call',    // 有料1対1通話（収益率70%・最低200コイン/15分）
    'yell_coin',     // エールコイン受取
    'channel',       // チャンネルページ
    'community',     // コミュニティ閲覧のみ
  ],
  basic: [
    'video_call',      // 有料1対1通話（収益率85%・最低150コイン/15分）
    'yell_coin',
    'channel',
    'community',
    'community_post',  // コミュニティ投稿
    'fan_community',   // ファンコミュニティ
    'progressive_rate',// プログレッシブ・インセンティブ適用
  ],
  'call-anser': [      // ※全ユーザーが自動付与される
    'video_call',
    'free_call_daily', // 1日60分の無料通話枠
    'yell_coin',
    'channel',
    'community',
    'community_post',
    'fan_community',
    'progressive_rate',
  ],
  vod: [
    'vod_upload',      // 動画アップロード販売
    'vod_archive',     // アーカイブ販売
    'recording',       // 録画オプション
    'yell_coin', 'channel', 'community', 'community_post', 'fan_community',
  ],
  ppv: [
    'live_ppv',        // 有料ライブ配信
    'yell_coin', 'channel', 'community', 'community_post', 'fan_community',
    'progressive_rate',
  ],
};
```

---

## 4. エールコインシステム（完全版）

### 基本規則
```
1 エールコイン = 1 円（確定・変更禁止）
Stripe手数料: 視聴者負担・外乗せ方式
  chargeYen = ceil(coinAmount / (1 - 0.036))
```

### コイン購入プラン（完全確定・変更禁止）

| planId | 定価 | 請求額 | 入金対応コイン | ボーナスコイン | 付与合計 |
|--------|------|-------|-------------|-------------|--------|
| plan_1000 | ¥1,000 | **¥1,038** | 1,000 | 0 | **1,000** |
| plan_5000 | ¥5,000 | **¥5,187** | 5,000 | +400 | **5,400** |
| plan_10000 | ¥10,000 | **¥10,374** | 10,000 | +800 | **10,800** |

**⚠️ ボーナス率8%超は逆ざやリスクのため絶対禁止**

### コイン購入フロー（完全）

```
Step1: フロント /coin-charge でプラン選択
  → createCoinCheckoutSession({ planId, successUrl, cancelUrl })

Step2: バックエンドでStripe Checkout Session作成
  metadata = {
    type: "yell_coin_purchase",
    userEmail: user.email,
    planId,
    base_price: "1000",        // 定価
    charge_amount: "1038",     // 実請求額
    coins_purchased: "1000",   // 入金対応コイン（ボーナス除く）
    bonus_coins: "0",          // ボーナスコイン
    total_coins: "1000",       // 付与合計
  }
  → { checkoutUrl, sessionId }

Step3: 視聴者がStripeページで決済

Step4: stripeWebhook → checkout.session.completed を受信
  HMAC-SHA256 で署名検証（STRIPE_WEBHOOK_SECRET）
  
  meta.type === "yell_coin_purchase" の場合:
    coinsPurchased = parseInt(meta.coins_purchased)  // 1000
    bonusCoins     = parseInt(meta.bonus_coins)      // 0
    totalCoins     = coinsPurchased + bonusCoins     // 1000

    YellCoinWallet 取得 or 作成
    YellCoinWallet.update({
      balance:       wallet.balance + totalCoins,      // 残高に付与合計を加算
      total_charged: wallet.total_charged + coinsPurchased, // ★ボーナス含めない
    })
    
    YellCoinTransaction.create({
      type: "charge",
      amount: totalCoins,          // 付与合計コイン（表示用）
      yen_amount: base_price,      // 定価
      coins_purchased: 1000,       // 入金対応コイン（必ず分離記録）
      bonus_coins: 0,              // ボーナスコイン（必ず分離記録）
      charge_amount_jpy: 1038,     // 実請求額
      stripe_session_id: session.id,
      terms_version: "2026-04",
    })
```

### コイン分配ルール

| 用途 | 発信者→ | ライバー還元 | 運営収益 |
|------|--------|------------|--------|
| 1対1通話(free) | 200コイン/15分 | **140コイン（70%）** | 60コイン（30%）|
| 1対1通話(basic/call-anser) | 150コイン/15分 | **127コイン（85%）** | 23コイン（15%）|
| エール送信 | 任意 | 85% | 15% |
| VOD購入 | 動画価格 | 85% | 15% |
| チャット鑑定 | 500コイン/2往復 | 85% | 15% |
| ライブ配信 | 設定コイン/15分 | 85%〜95% | 15%〜5% |

---

## 5. 1対1ビデオ通話フロー（完全版）

### インフラ構成
```
映像・音声: WebRTC P2P（ブラウザ直接接続）
シグナリング: Base44 Entities（VideoCall）リアルタイム購読 + 500ms間隔ポーリング
ICE(STUN): Google STUN（stun.l.google.com:19302）
ICE(TURN): Twilio NTS（getTwilioIceServers → TTL 86400秒）
  ICE設定 = [Google STUN x2] + [TwilioのTURNサーバーのみ抽出]
           iceTransportPolicy: "all"（P2P優先、TURN自動フォールバック）
```

### ステータス遷移（VideoCall.status）

```
pending   → 通話申し込み直後（ライバーの承諾待ち）
accepted  → ライバーが承諾（または AUTO_ACCEPT）
active    → WebRTC接続開始・課金開始
ended     → 通話終了（正常・残高不足・時間切れ）
declined  → ライバーが拒否
cancelled → 発信者がキャンセル
```

### Step-by-Step フロー

#### Phase 1: 申し込み
```
発信者が /call-request/:channelId にアクセス
  → Channel.call_enabled 確認（false なら申し込み不可）
  → 通話時間・料金選択
  → VideoCall.create({
       caller_email, caller_name,
       callee_email, callee_name, callee_channel_id,
       call_mode: "video" | "audio_only",
       duration_minutes,        // ミリオネア期間中は強制15分
       coin_price_per_15min,
       recording_option,        // trueなら通話終了時に+100コイン
       status: "pending"
     })
  
時間決定ロジック（getEffectiveDuration）:
  1. ミリオネア・チャレンジ期間（2026-04-01〜2026-06-30）→ 強制15分
  2. channel.default_call_duration_minutes > 0 → ライバー設定値
  3. プラン別デフォルト（free/basic/call-anser いずれも15分）
```

#### Phase 2: 承諾
```
【MANUALモード】
  ライバーが /call-waiting で着信通知を受け取る
  → VideoCall.update({ status: "accepted" })

【AUTO_ACCEPTモード】
  フロントが autoAcceptCall({ call_id }) を呼び出す
  → バックエンドで Channel.incoming_call_mode === "AUTO_ACCEPT" を確認
  → VideoCall.update({ status: "accepted" })
  → フロントが accepted を確認後、即座に active へ更新
```

#### Phase 3: WebRTC接続（useWebRtcCall）

```
【発信者（Caller）側フロー】

A. シグナリングデータのリセット（再試行に備える）
   VideoCall.update({
     webrtc_offer: null, webrtc_answer: null,
     webrtc_ice_candidates_*: null, webrtc_callee_ready: null
   })

B. Callee の ready フラグを待つ（最大15秒）
   並列で3種類監視:
   1. 即時チェック: VideoCall.filter({ id }) でwebrtc_callee_readyを確認
   2. リアルタイム購読: VideoCall.subscribe でwebrtc_callee_readyをリッスン
   3. ポーリング: 500ms間隔でVideoCall.filterを繰り返す
   → いずれかでready確認 or 15秒タイムアウト → 次へ進む

C. ICEサーバー取得（並列で開始済み）
   fetchTwilioIceServers() → getTwilioIceServers 関数呼び出し
   失敗時フォールバック: Google STUN のみ

D. RTCPeerConnection 作成
   new RTCPeerConnection({
     iceServers: [Google STUN x2, ...Twilio TURNのみ],
     iceTransportPolicy: "all",
     bundlePolicy: "max-bundle",
     rtcpMuxPolicy: "require",
     iceCandidatePoolSize: 10,
   })

E. ローカルトラックを追加
   audio_only: getAudioTracks() のみ
   通常: getTracks() 全て

F. Offer 作成
   pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true })
   pc.setLocalDescription(offer)
   ICE収集完了まで待機（最大8秒 = ICE_GATHER_TIMEOUT_MS）
   → SDP内の a=candidate 件数をログ出力（0件なら警告）

G. Offer 送信
   VideoCall.update({ webrtc_offer: JSON.stringify(pc.localDescription) })

H. Answer 待ち（最大30秒）
   リアルタイム購読 + 500ms ポーリング の二重監視
   → webrtc_answer 受信: pc.setRemoteDescription(answer)
   → 30秒タイムアウト: リトライスケジュール

---

【着信者（Callee）側フロー】

A. readyフラグと既存Offerを並列取得
   Promise.all([
     VideoCall.update({ webrtc_callee_ready: true }),
     VideoCall.filter({ id })
   ])

B. 既にOfferが存在する場合 → 即座にHandleOffer実行（待機ゼロ）

C. Offerがない場合 → リアルタイム購読 + 500ms ポーリング で待機（最大30秒）

D. HandleOffer（Offer受信時）
   pc.setRemoteDescription(JSON.parse(offerJson))
   pc.createAnswer()
   pc.setLocalDescription(answer)
   ICE収集完了まで待機（最大8秒）
   VideoCall.update({ webrtc_answer: JSON.stringify(pc.localDescription) })

---

【接続失敗時のリトライ】
   最大3回（MAX_RETRIES = 3）
   遅延: 試行番号 × 2秒（2秒 → 4秒 → 6秒）
   3回失敗 → onReconnectFailed() → ユーザーに終了を促すトースト

【接続状態コールバック】
   connected → onReconnected()
   failed    → scheduleRetry()
   disconnected → onReconnecting()（一時的・回復待ち）
```

#### Phase 4: 音声・映像の再生
```
リモートトラック受信（pc.ontrack）:
   audio トラック: track.enabled = true（強制ON）
   video+audio: event.streams[0] を video.srcObject に直接セット
              → 全audioトラックを enabled=true に設定

playRemoteVideo(videoEl):
   1. muted=false で play() を試みる（PC Chrome等）
   2. 失敗時（iOS Safari autoplayブロック）: muted=true で play()
      → 500ms後に muted=false, volume=1.0

リモート音声ガード（1秒間隔の監視）:
   stream.getAudioTracks().forEach: track.enabled が false なら強制 true に
   video要素が muted なら強制 muted=false, volume=1.0

AudioContext自動復旧:
   ctx.state === "suspended" なら即座に ctx.resume()
   ページ visibilitychange で visible になったとき再resume
```

#### Phase 5: 課金フロー（videoCallBilling）

```
フロントから毎分 action:"tick" を呼び出す

【初回tick（billing_started_at === null）】
  発信者のプランを動的取得（getCallerPlanConfig）
    PlanSubscription.filter({ user_email: callerEmail, status: "active" })
    basic or call-anser → { plan:"basic", min_coins:150, creator_rate:0.85, platform_rate:0.15 }
    その他              → { plan:"free",  min_coins:200, creator_rate:0.70, platform_rate:0.30 }
  
  ウォレット残高チェック: balance >= min_coins
    → 不足: VideoCall.update({ auto_disconnected:true, status:"ended" }) → 切断
    → 充足: 第1ユニット課金（chargeOneUnit）

【chargeOneUnit（共通処理）】
  coinsToCharge = planCfg.min_coins     // 150 or 200
  creatorCoins  = floor(coinsToCharge × creator_rate)  // 127 or 140
  platformCoins = coinsToCharge - creatorCoins          // 23 or 60
  
  YellCoinWallet.update({
    balance:    wallet.balance - coinsToCharge,
    total_sent: wallet.total_sent + coinsToCharge,
  })
  
  YellCoinTransaction.create({
    type: "send", service_type: "direct_chat",
    amount: coinsToCharge,
    message: `1対1ビデオ通話（第N ユニット）ライバー85% / Admin15% [basicプラン]`
  })
  
  Channel.monthly_revenue_coins += coinsToCharge  // ミリオネア集計
  
  nextBillingAt = now + 15分

  VideoCall.update({
    billing_started_at, next_billing_at,
    billing_interval_count: 1,
    coins_consumed: coinsToCharge,
    platform_revenue_coins: platformCoins,
    creator_revenue_coins: creatorCoins,
  })

【次回tick（15分未到達）】
  now < next_billing_at → billed:false, seconds_until_next_billing を返す

【次回tick（15分経過）】
  残高チェック → 不足: auto_disconnected:true → 切断
  充足: 次ユニット課金 → billing_interval_count++, next_billing_at += 15分

【重要: プランはtick毎に動的チェック】
  アップグレード後は次のtickから即座に新レートが適用される

【action:"end"（通話終了）】
  billing_start から actual_duration_minutes を計算

  録画オプション処理（recording_option === true）:
    追加コスト = 100コイン（RECORDING_COST_FLAT・固定）
    残高 >= 100 なら:
      YellCoinWallet.update({ balance -= 100 })
      YellCoinTransaction.create({ amount: 100, message: "録画オプション追加料金" })
    不足: スキップ（警告ログのみ）

  収益分配確定（終了時のcalleePlanで計算）:
    creatorRevenueCoins  = floor(consumedCoins × creator_rate)
    platformRevenueCoins = consumedCoins - creatorRevenueCoins
    commCostYen = ceil(actualMinutes × TURN_COST_PER_MIN × (1 - P2P_SUCCESS_RATE))
                = ceil(actualMinutes × 2 × 0.20)
    platformProfitYen = platformRevenueCoins - commCostYen

  VideoCall.update({ status:"ended", actual_duration_minutes, ... })

【action:"check_next"（課金前確認）】
  ウォレット残高確認（課金なし）
  → { balance, plan, next_unit_cost, has_enough }

【残高不足警告タイミング（フロント）】
  次課金まで180秒前: check_next 実行 → has_enough=false なら警告トースト
  次課金まで60秒前: 警告トースト
  30秒前: 延長バナー表示
```

#### Phase 6: 通話終了

```
発信者(caller)が終了ボタンを押した場合:
  videoCallBilling({ call_id, action:"end" })
  localStream.getTracks().forEach(t => t.stop())
  navigate(-1)

着信者(callee)が終了した場合:
  VideoCall.update({ status:"ended" })
  延長申請が accepted 中なら ReconnectionNotification を表示

時間切れ（remainingSeconds === 0）:
  loss_time_buffer_until チェック
  → バッファ期間内: タイマーを保留（延長決済中の時間猶予）
  → バッファなし or 期限切れ: handleEndCall()

残高不足で自動切断（auto_disconnected === true）:
  showInsufficientModal = true（コインチャージ誘導モーダル）

ICE接続失敗（ivsConnectStatus === "failed"）:
  再接続UIを表示
```

### 通話延長フロー

```
1. ライバー（callee）が延長リクエスト
   requestCallExtension({ call_id, minutes, coins })
   → VideoCall.update({
       extension_request_minutes,
       extension_request_coins,
       extension_request_status: "pending",
       loss_time_buffer_until: now + バッファ時間,
     })

2. 発信者（caller）が承諾モーダルを受け取る
   （extension_request_status === "pending" を検知）
   acceptCallExtension({ call_id })
   → コイン残高チェック + コイン仮押さえ
   → VideoCall.update({ extension_request_status: "accepted" })

3. ライバー（callee）が確定モーダルを受け取る
   （extension_request_status === "accepted" を検知）
   confirmCallExtension({ call_id })
   → VideoCall.update({
       duration_minutes += extension_request_minutes,
       extension_request_status: "confirmed",
     })
   → フロントでタイマーリセット
```

---

## 6. ライブ配信フロー（完全版）

### IVSチャンネルプロビジョニング（provisionChannelStreamKey）
```
Channel作成時 or 初回配信前:
  AWS IVS: CreateChannel → { arn, streamKey, ingestEndpoint, playbackUrl }
  Channel.update({
    ivs_channel_arn, ivs_stream_key, ivs_ingest_endpoint, ivs_playback_url,
    ivs_provisioned_at: now,
  })
  → ライバーが OBSまたはブラウザで RTMPS配信開始
```

### 配信開始フロー
```
1. クリエイターが /go-live
   → createLiveStream({ title, price, stream_type:"ivs" })
   → LiveStream.create({ status:"scheduled" })

2. OBSまたはブラウザで RTMPS配信開始
   → AWS IVSにストリームが届く

3. ivsSessionWebhook（IVS → Base44 Function）
   IVS_WEBHOOK_SECRET でHMAC検証
   → stream_start イベント:
       LiveStream.update({ status:"live", started_at:now })
       Channel.update({ is_live:true })
   → stream_end イベント:
       LiveStream.update({ status:"ended", ended_at:now })
       Channel.update({ is_live:false })
```

### 有料ライブ配信（PPV）の視聴フロー
```
1. 視聴者が有料ライブページに到達
2. 30秒プレビュー開始（LivePreviewLockout コンポーネント）
   ★ このコンポーネントは変更禁止（frozen）
3. プレビュー終了後 → チケット購入モーダル
4. createLiveTicketCheckout → Stripe Checkout
5. liveTicketWebhook → Purchase.create({ status:"completed" })
6. 購入確認後 → getIvsPlaybackUrl → 視聴開始
7. consumeCoinsForViewing（15分毎）:
   残高チェック → コイン消費 → YellCoinTransaction.create
   → 残高不足 → 視聴停止（継続不可）
```

### 配信料金・画質連動ルール
```
コイン/15分  画質      備考
15〜54      480p SD  最低価格
55〜149     720p HD
150〜       1080p FHD  従来の基準価格

トップライバー特例（cumulative_revenue >= 10,000,000円）:
  最低価格 200コイン/15分（1080p強制）
```

---

## 7. VOD動画販売フロー（完全版）

### アップロードフロー（完全）

```
Step1: 使用量チェック（checkUsageLimit）
  本日のアップロード秒数: Video.filter({ created_by:user.email }) で今日分集計
  本日のライブ配信秒数: LiveStream + Channel.duration で集計
  本日の通話秒数: VideoCall.filter({ caller_email }) で集計
  合計 >= 7200秒（2時間）→ アップロード不可

Step2: uploadVideoToS3({ fileName, fileSize, channelId })
  S3キー: channels/{channelId}/{timestamp}-{fileName}
  S3 Presigned PUT URL 生成（有効期限: 15分）
  CloudFront再生URL: https://{CLOUDFRONT_DOMAIN}/{s3_key}
  → { presigned_url, s3_key, playback_url }

Step3: フロントが Presigned URLに直接PUTアップロード
  fetch(presigned_url, { method:"PUT", body:file })

Step4: サムネイルアップロード
  base44.integrations.Core.UploadFile({ file:thumbnail })
  → { file_url }

Step5: Video.create({
  title, description, video_url: playback_url（CloudFront URL）,
  thumbnail_url, channel_id, price, is_free,
  category, duration,
  moderation_status: "pending",  ← 審査待ち
})

Step6: 管理者が /admin/video-moderation で審査
  pending → approved: 公開（視聴可能）
  pending → rejected: 非公開（moderation_note に理由記録）
```

### 再生フロー（完全）

```
視聴者が /watch/:videoId

Step1: Video.filter({ id: videoId }) → 動画メタデータ取得

Step2: 無料動画（is_free===true または price===0）
  → getSignedVideoUrl({ videoKey, expirationHours:6 })
    CloudFront署名付きURL生成:
      policy: { Statement: [{ Resource, Condition: { DateLessThan } }] }
      署名: RSASSA-PKCS1-v1_5 with SHA-1（CLOUDFRONT_PRIVATE_KEY使用）
      URLパラメータ: ?Policy=...&Signature=...&Key-Pair-Id=...
  → 動画を video タグで再生

Step3: 有料動画（未購入）
  30秒プレビュー開始（usePreview30SecLock フック）
  → 30秒経過: video.pause() → PaywallOverlay 表示
  → "SAMPLE"ウォーターマーク常時表示
  → Preview30SecPaywallModal: コイン購入 or エールコイン消費を促す

Step4: 有料動画（購入確認）
  Purchase.filter({ item_type:"video", item_id:videoId, buyer_email:user.email })
  → status === "completed" のレコードが存在 → 購入済み
  → getSignedVideoUrl → CloudFront署名付きURL → 再生

Step5: 動画購入フロー（エールコイン直接支払い）
  （現在はStripe経由が主）
  createCheckoutSession({ videoId, videoTitle, price, successUrl })
    → Stripe Checkout Session作成
    metadata: { videoId, userEmail, videoTitle }
  → Stripe決済後 stripeWebhook → Purchase.create({ status:"completed" })
```

---

## 8. クラス配信フロー（1対9・完全版）

### 設計原則
```
最大参加者: 10名（講師1 + 生徒9）固定
インフラ: AWS Chime SDK Meetings（us-east-1）
認可: SchoolTicket（事前購入）+ invite_code（6桁）
チケット消費: クラス終了時（delete action）に status:"active" → "used"
ハートビート: 30秒毎・90秒無応答で自動退出
```

### クラス作成（講師）
```
/classroom/create にアクセス
→ ClassRoom.create({
     room_name, host_user_id, host_email, host_name, channel_id,
     status: "waiting",
     max_participants: 10,
     invite_code: ランダム6桁（英数字）
   })
→ 招待リンク: /classroom/{id}?code={invite_code}
```

### Meeting作成（講師入室・action:"create"）
```
バックエンド（createChimeMeeting）:
  1. status==="ended" → room_not_active エラー
  2. 既存 chime_meeting_id あり: GetMeetingCommand で生存確認
     → 生存: 既存MeetingにCreateAttendee → 再接続
     → 消滅: 新規Meeting作成へ
  3. CreateMeetingCommand({
       ClientRequestToken: `{roomId}-{Date.now()}`,
       MediaRegion: "us-east-1",
       ExternalMeetingId: roomId,
       MeetingFeatures: { Video:{MaxResolution:"HD"}, Audio:{EchoReduction:"AVAILABLE"} }
     })
  4. CreateAttendeeCommand({ MeetingId, ExternalUserId: user.email })
  5. ClassRoom.update({
       chime_meeting_id: meeting.MeetingId,
       status: "active",
       started_at: now,
       participants: [{ email, name, role:"host", chime_attendee_id, joined_at, last_seen_at }],
       current_participants_count: 1,
     })
  → { meeting, attendee }（AWS認証情報は絶対に含めない）
```

### 生徒入室（action:"join"）- 7ステップ競合対策

```
フロント事前チェック:
  1. status==="ended" → room_not_active 画面
  2. invite_code 検証（フロント補助のみ、バックエンドでも必ず再検証）
  3. blocked_participant_emails に含まれる → blocked 画面
  4. SchoolTicket.filter({ session_id:roomId, student_email, status:"active" })
     → なし → ticketRequired 画面

バックエンド（action:"join"）:
  ★ バックエンドでもすべて再検証（フロントは補助に過ぎない）

  1. status==="ended" → room_not_active
  2. invite_code 必ず再検証
  3. blocked_participant_emails チェック
  4. SchoolTicket 認可（asServiceRole で DB直接参照）
  5. GetMeetingCommand で Meeting 存在確認
     → 存在しない → meeting_not_started or meeting_ended

  【7ステップ競合対策】
  Step1: 最新roomを再取得 → evictTimedOut()（90秒無応答者をleft扱い）
  Step2: active人数再計算（left_at===nullのcount）
  Step3: active人数 >= 10 → room_full エラー ← Attendee作成前チェック
  Step4: CreateAttendeeCommand（認可確認後に実行）
  Step5: DB更新直前に再取得（並行入室対策）
         再度 active人数チェック >= 10 → safeDeleteAttendee + room_full
  Step6: DB更新
         participants に { email, name, role:"guest", chime_attendee_id, joined_at } を追加
         current_participants_count = countActive(participants)
  Step7: DB更新後の最終確認
         countActive(fresh3.participants) > 10 →
           当該ユーザーをrollback（left_at設定） + safeDeleteAttendee + room_full

  → { meeting, attendee }（AWS認証情報は含めない）
```

### ハートビート処理（action:"heartbeat"）
```
フロントが30秒毎に呼び出し

  evictTimedOut(participants):
    last_seen_at（またはjoined_at）から90秒超 → { left_at: now, exit_reason:"timeout" }

  participants[ログインユーザー].last_seen_at = now
  current_participants_count = countActive(updated)
  ClassRoom.update({ participants, current_participants_count })
```

### 強制退出（action:"kick"・講師/Admin専用）
```
  target = participants.find({ email: targetEmail, left_at: null })
  targetAttendeeId = target.chime_attendee_id

  safeDeleteAttendee(chime, meetingId, targetAttendeeId)  // Chime側Attendee削除
  participants[target].left_at = now, exit_reason:"kicked"
  blocked_participant_emails に targetEmail を追加（重複防止）
  ClassRoom.update({ participants, current_participants_count, blocked_participant_emails })
```

### クラス終了（action:"delete"・講師/Admin専用）
```
  DeleteMeetingCommand({ MeetingId: chime_meeting_id })
  全参加者: left_at = now, exit_reason:"meeting_deleted"
  ClassRoom.update({ status:"ended", ended_at:now, chime_meeting_id:null, ... })
  
  SchoolTicket 処理:
    filter({ session_id: roomId, status:"active" }) で対象チケット取得
    全件: update({ status:"used", used_at: now })
```

---

## 9. チャット鑑定フロー（占い師向け・完全版）

### 仕様
```
スレッドモデル: 2往復4通で自動クローズ
試し: 最初の1往復（ユーザー→占い師→）は無料・マスク表示
本番: 2往復目以降は channel.fortune_chat_price コイン（デフォルト500コイン）
```

### フロー
```
Step1: ユーザーが /fortune-chat/:channelId にアクセス
  既存スレッド: FortuneChatThread.filter({ channel_id, user_email })
  → 初回: FortuneChatThread.create({ status:"trial", message_count:0, ticket_price_coins:500 })

Step2: ユーザーが最初のメッセージ送信
  FortuneChatMessage.create({ role:"user", is_trial_reply:false, is_masked:false })
  thread.message_count++ → 1

Step3: 占い師が試し返信
  FortuneChatMessage.create({
    role:"fortune_teller",
    is_trial_reply: true,    ← マスク対象
    is_masked: true,         ← 未購入ユーザーには「●●●●●」表示
    preview_chars: 60,       ← 最初の60文字のみ表示
  })
  thread.message_count++ → 2

Step4: ユーザーが続きを読むためにチケット購入
  YellCoinWallet.balance チェック >= ticket_price_coins（500）
  → 不足: コインチャージ誘導
  → 充足:
    YellCoinWallet.update({ balance -= 500, total_sent += 500 })
    YellCoinTransaction.create({ type:"send", amount:500, service_type:"fortune_chat" })
    FortuneChatThread.update({ ticket_purchased:true, status:"active", ticket_purchased_at:now })
    → is_trial_reply=true のメッセージの is_masked が false に
      （全文表示可能になる）

Step5: 残り1往復（2メッセージ）
  ユーザー返信: message_count → 3
  占い師返信: message_count → 4 → FortuneChatThread.status = "closed"
  4通到達で自動クローズ（それ以上送信不可）

Step6: 終了後レビュー（任意）
  FortuneReview.create({ channel_id, reviewer_email, rating:1〜5, comment, tags })
  Channel.avg_rating / review_count を自動更新
```

---

## 10. プログレッシブ還元率ロジック（完全版）

### 毎月1日 0:00 JST 実行（updateProgressiveRates）

```
対象: basic, vod, ppv, call-anser プラン保有チャンネル
期間: 先月1日〜先月末日

処理:
  1. ProgressiveRateMaster.filter({ is_active:true }) → 還元率テーブル取得
     なければ DEFAULT_TIERS を使用:
     [85%, 86%, 87%, 88%, 89%, 90%, 91%, 92%, 93%, 94%, 95%]
     各閾値: [0, 100万, 300万, 600万, 900万, 1200万, 1500万, 1650万, 1800万, 1950万, 2000万]円

  2. 全チャンネルをループ:
     CreatorEarning.filter({ channel_id }) → 先月分を日付でフィルタ
     totalYen = lastMonthEarnings.reduce(yen_equivalent または coin_amount × 1.1)
     
     getRateForRevenue(tiers, totalYen):
       tiersを閾値降順でソート
       totalYen > threshold_yen の最初の一致 → その率を返す
     
     Channel.update({
       progressive_rate: newRate / 100,  // 0.85〜0.95
       monthly_revenue_coins: floor(totalYen / 1.1),
       rate_applied_month: "YYYY-MM",
     })
```

### 当月の還元率適用（tick毎・動的）

```
videoCallBilling の tick 毎に:
  PlanSubscription.filter({ user_email: callerEmail, status:"active" })
  → basic or call-anser → 85% base rate
  
Channel.progressive_rate が更新されていれば、次月から自動適用
```

---

## 11. Stripe決済フロー（完全版）

### 決済種別マトリクス

| 用途 | 関数 | Webhook関数 | Webhook Secret |
|------|------|------------|----------------|
| コイン購入 | createCoinCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| 動画購入 | createCheckoutSession | stripeWebhook | STRIPE_WEBHOOK_SECRET |
| ライブチケット | createLiveTicketCheckout | liveTicketWebhook | STRIPE_WEBHOOK_SECRET |
| イベントチケット | createEventTicketCheckout | eventTicketWebhook | STRIPE_WEBHOOK_SECRET |
| ファンクラブ | createFanclubCheckout | fanclubWebhook | STRIPE_FANCLUB_WEBHOOK_SECRET |
| グッズ・デジタル商品 | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| デジタルチェキ | createProductCheckout | productWebhook | STRIPE_WEBHOOK_SECRET |
| クラウドファンディング | createCrowdfundingCheckoutV2 | crowdfundingDonationWebhook | STRIPE_WEBHOOK_SECRET |
| KYC手数料 | createKycFeeCheckout | stripeWebhook | STRIPE_WEBHOOK_SECRET |

### Stripe Webhook 署名検証（全Webhookで共通）

```javascript
// HMAC-SHA256 検証（Deno WebCrypto API - 非同期）
const signature = req.headers.get("stripe-signature")
const body = await req.text()
const parts = signature.split(",")
const timestampPart = parts[0].split("=")[1]
const signaturePart = parts[1].split("=")[1]
const signedData = `${timestampPart}.${body}`

const key = await crypto.subtle.importKey("raw", encoder.encode(webhookSecret),
  { name:"HMAC", hash:"SHA-256" }, false, ["verify"])
const sigBytes = new Uint8Array(signaturePart.match(/.{1,2}/g).map(b => parseInt(b,16)))
const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(signedData))

// isValid === false → 401 返却
```

### stripeWebhook の処理分岐

```
event.type === "checkout.session.completed":
  
  meta.type === "yell_coin_purchase":
    → コイン付与（上記 §4 参照）
  
  meta.videoId あり（動画購入）:
    Purchase.create({
      item_type: "video",
      item_id: meta.videoId,
      amount: session.amount_total,
      buyer_email: meta.userEmail,
      status: "completed",
      stripe_session_id: session.id,
    })
```

---

## 12. WebRTC P2P接続ロジック（完全版）

### RTCPeerConnection 設定

```javascript
// ICE設定: Google STUN（第1優先）+ Twilio TURN（フォールバック）
const iceServers = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  ...twilioServers.filter(s => s.urls.toString().startsWith("turn:")), // TURNのみ
]

new RTCPeerConnection({
  iceServers,
  iceTransportPolicy: "all",      // P2P優先・TURN自動フォールバック
  bundlePolicy: "max-bundle",     // 帯域効率化
  rtcpMuxPolicy: "require",       // RTCP多重化必須
  iceCandidatePoolSize: 10,       // ICE候補プリフェッチ
})
```

### タイムアウト設定（すべて確定値）

```
ICE収集タイムアウト:  8000ms（GATHER_TIMEOUT: モバイル回線考慮）
Callee ready 待機:   15000ms（CALLEE_READY_TIMEOUT）
Answer 待機:         30000ms（ANSWER_TIMEOUT）
Offer 待機:          30000ms（OFFER_TIMEOUT）
ポーリング間隔:       500ms（POLL_INTERVAL: 高速すぎず遅すぎず）
最大リトライ回数:     3回（MAX_RETRIES）
リトライ遅延:        試行番号 × 2000ms（2秒/4秒/6秒）
```

### Twilio TURN取得（getTwilioIceServers）

```
POST https://api.twilio.com/2010-04-01/Accounts/{SID}/Tokens.json
  Authorization: Basic base64(SID:AuthToken)
  body: Ttl=86400（24時間有効）

→ { ice_servers: [...] }
失敗時: FALLBACK_ICE_SERVERS（Google STUNのみ）にフォールバック
※ Twilio は ICE取得専用・通話インフラとしては使用しない
```

### 音声品質保証機構

```
1. オーディオトラック強制有効化
   ontrack: if(track.kind==="audio") track.enabled = true
   全audioTrack: stream.getAudioTracks().forEach(t => { if(!t.enabled) t.enabled=true })

2. ビデオ要素のミュート防止
   video.muted が true になったら強制 false + volume=1.0

3. AudioContext 自動復旧
   ctx.state==="suspended" → ctx.resume()
   visibilitychange で visible → ctx.resume()
   ctx.statechange で suspended → ctx.resume()

4. iOS Safari 対応 play()
   Step1: muted=false で play() → 成功: そのまま
   Step2: 失敗 → muted=true で play() → 500ms後に muted=false

5. 無音検知アラート
   AudioContext + AnalyserNode で localStream 監視
   5秒間（約300フレーム）ゼロレベル → showMicAlert=true
   ユーザークリックで AudioContext.resume() 強制実行

6. ミュート状態DB同期（500msデバウンス）
   micOn変化 → 500ms後に VideoCall.update({
     caller_muted: !micOn  // 発信者
     callee_muted: !micOn  // 着信者
   })
   → 相手画面の RemoteMuteIndicator が更新される
```

---

## 13. 日次制限・使用量管理ロジック

### checkUsageLimit

```
DAILY_LIMIT_SECONDS = 7200（2時間 = 120分）
action_type: "upload" | "stream" | "call"
duration_seconds: この操作で消費しようとする秒数

計算:
  本日のアップロード: Video.filter({ created_by: user.email }) → 今日分の duration 合計（秒）
  本日のライブ:      Channel.filter({ owner_email }) → LiveStream で今日分 duration × 60（秒）
  本日の通話:        VideoCall.filter({ caller_email }) → 今日分 duration_minutes × 60（秒）

  totalUsed = uploadedSeconds + streamedSeconds + callSeconds
  remaining = max(0, 7200 - totalUsed)

  requested > remaining → allowed:false（アップロード不可）
  requested <= remaining → allowed:true
```

### CALL&ANSER 無料通話枠

```
1日60分 = 10分 × 6スロット
resetDailyFreeCallQuota（スケジュール: 毎日JST 0:00）
  → VideoCall の is_free_call フラグ管理
  → 当日の is_free_call:true の通話の合計分数をカウント
  → 60分超過 → is_free_call:false で有料課金に切り替え
```

---

## 14. 絶対不変ルール（Red Lines）

### 収益モデル（変更禁止）

```
❌ 通話ライバー還元率を 85%未満 にするコード（basic/call-anser プラン）
❌ FREE プランの通話を完全禁止にするコード（FREEでも通話可能が大原則）
❌ Stripe手数料をプラットフォーム側が負担するコード
❌ ボーナスコイン率を 8%超 に設定するコード（逆ざやリスク）
❌ 1コイン ≠ 1円 にする換算ロジック
```

### コイン管理（変更禁止）

```
❌ YellCoinWallet.total_charged に bonus_coins を含めて加算するコード
❌ YellCoinTransaction に coins_purchased / bonus_coins を分離せず記録するコード
❌ コイン残高がマイナスになるロジック
```

### 機能制限（変更禁止）

```
❌ recording_option なし（false）で録画を起動するコード
❌ VOD価格を 100コイン未満 で設定できるコード
❌ ミリオネア期間中（2026-04-01〜2026-06-30）に15分以外の通話時間を許可するコード
❌ クラス配信で 10名を超える参加者を許可するコード
```

### インフラ（変更禁止）

```
❌ Agora SDK を VideoCallPage で使用するコード（廃止済み・AGORA_APP_ID は残るが使用禁止）
❌ Mux（mux.com）を VOD配信・アップロードに使用するコード（廃止済み）
❌ S3の直URL（CloudFront経由でない）でVODを配信するコード
❌ AWS認証情報（accessKeyId, secretAccessKey）をフロントエンドに公開するコード
❌ Chime Meeting の meeting.Meeting 全体（AWS認証情報含む）を Attendee 外のユーザーに返すコード
```

### 凍結済みコンポーネント（コード変更禁止）

```
❌ components/live/LivePreviewLockout（30秒プレビューゲート）
❌ public/overlay.html（Prism Web Overlay）
❌ pages/PrismWebOverlay（React版オーバーレイ）
❌ components/live/YellButtons（エールボタン）
```

### 価格テーブル（変更禁止）

```
// createCoinCheckoutSession の COIN_PLANS（変更禁止）
plan_1000:  base_price:1000, coins:1000,  bonus_coins:0,   charge_amount:1038
plan_5000:  base_price:5000, coins:5000,  bonus_coins:400, charge_amount:5187
plan_10000: base_price:10000,coins:10000, bonus_coins:800, charge_amount:10374

// videoCallBilling の PLAN_CONFIG（変更禁止）
free:  { min_coins:200, creator_rate:0.70, platform_rate:0.30 }
basic: { min_coins:150, creator_rate:0.85, platform_rate:0.15 }
```

---

## 付録A: エンティティ間の関係図

```
User ──1:1──► YellCoinWallet（残高管理）
User ──1:N──► PlanSubscription（プラン管理）
User ──1:1──► Channel（チャンネル）
Channel ──1:N──► Video（動画）
Channel ──1:N──► LiveStream（配信）
Channel ──1:N──► ClassRoom（クラス）
Channel ──1:N──► FortuneChatThread（鑑定スレッド）

VideoCall ──caller──► User
VideoCall ──callee──► Channel

YellCoinTransaction ──► YellCoinWallet（履歴）
Purchase ──► Video（購入済み動画）
SchoolTicket ──► ClassRoom（受講権）

ProductOrder ──► Product（商品注文）
DigitalChekiPurchase ──► DigitalCheki（チェキ購入）
DigitalTicket ──► TicketEvent（イベントチケット）

CrowdfundingDonation ──► CrowdfundingProject（寄付）
FortuneReview ──► Channel（レビュー集計）
```

## 付録B: スケジュール実行（Automation）

| 関数名 | スケジュール | 処理 |
|--------|------------|------|
| updateProgressiveRates | 毎月1日 0:00 JST | 全チャンネルの還元率更新 |
| calcMonthlyRevenueRate | 毎月1日 | 月間収益率計算 |
| resetDailyFreeCallQuota | 毎日 0:00 JST | 無料通話枠リセット |
| cleanupTimedOutParticipants | 定期実行 | Chimeクラスのタイムアウト参加者退出 |
| cleanupStaleIvsChannels | 定期実行 | IVSゾンビチャンネル削除 |
| zombieStreamKiller | 定期実行 | 終了されていないライブを強制終了 |
| expireYellCoins | 定期実行 | 期限切れコイン処理 |
| campaignAutoGrant | 定期実行 | キャンペーン自動付与 |
| appointmentReminder | 定期実行 | 予約リマインダー送信 |
| sendEventReminder | 定期実行 | イベントリマインダー送信 |
| detectIvsStreamStart | 定期実行 | IVSストリーム状態ポーリング |
| liveStreamCostTracker | 定期実行 | ライブ配信コスト集計 |

---

*このドキュメントはコードベース（2026-06-03時点）から直接生成されたものです。*  
*コードに変更があった場合は必ず本ドキュメントを更新してください。*