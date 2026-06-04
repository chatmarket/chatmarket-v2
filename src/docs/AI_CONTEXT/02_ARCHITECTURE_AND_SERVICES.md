# 02_ARCHITECTURE_AND_SERVICES.md
> **Document Name**: Architecture and External Services  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: vite.config.js, api/base44Client.js, functions/*, docs/MASTER_SPEC_PART1.md  

---

## 1. フロントエンド

```
フレームワーク: React 18 + Vite
スタイリング:   Tailwind CSS + shadcn/ui（@radix-ui ベース）
状態管理:       @tanstack/react-query（サーバー状態）+ React useState（ローカル）
ルーティング:   react-router-dom v6
主要ライブラリ: framer-motion, recharts, react-leaflet, @hello-pangea/dnd
フォント:       Noto Serif JP（見出し）/ Noto Sans JP（本文）
ホスティング:   Base44 Platform（自動デプロイ）
```

---

## 2. Base44 BaaS

```
役割: バックエンドアズアサービス基盤
提供機能:
  - Entityデータベース（MongoDB相当）
  - 認証・セッション管理
  - リアルタイム購読（subscribe）
  - ファイルアップロード（public）
  - Deno Deploy バックエンド関数ホスティング
  - Automation（スケジュール・エンティティイベント）
  - 統合パッケージ（InvokeLLM, SendEmail, UploadFile等）

SDK: @base44/sdk@0.8.25（バックエンド）/ @base44/sdk@0.8.31（フロントエンド）
呼び出し方法: base44.functions.invoke('functionName', payload)
サービスロール: base44.asServiceRole（管理者権限でDB操作）
```

---

## 3. Deno Deploy（バックエンド関数）

```
ランタイム: Deno（サーバーレス・コールドスタートあり）
記法: Deno.serve(async (req) => { ... })
パッケージ: npm: プレフィックス使用（例: npm:stripe@14.21.0）
ファイル: functions/ ディレクトリ
制約: ローカルインポート不可（独立デプロイ）、/tmp のみ書き込み可
最小バージョン: npm:@base44/sdk@0.8.25
```

---

## 4. AWS IVS（ライブ配信）

```
用途: 1対多ライブ配信
リージョン: ap-northeast-1（東京）
プロトコル: RTMPS（OBS等） / WebRTC（ブラウザ配信）
主要API:
  CreateChannel / ListStreamKeys / GetStreamKey
  GetStream（ステータス確認）
  DeleteChannel / EnableAutoRecording
Webhook: ivsSessionWebhook（stream_start / stream_end）
再生: amazon-ivs-player / amazon-ivs-web-broadcast
環境変数: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
```

---

## 5. Amazon Chime SDK Meetings（クラス配信）

```
用途: 1対9クラス配信（ClassRoom機能）のみ
★ 1対1ビデオ通話（VideoCall）には使用しない
リージョン: us-east-1
実装: amazon-chime-sdk-js ^3.30.0
API:
  CreateMeetingCommand / GetMeetingCommand / DeleteMeetingCommand
  CreateAttendeeCommand / DeleteAttendeeCommand
最大参加者: 10名（9生徒 + 1講師・変更禁止）
ハートビート: 30秒毎・90秒無応答で自動退出
環境変数: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY（us-east-1 固定）
```

---

## 6. 1対1ビデオ通話（WebRTC P2P）

```
インフラ: ブラウザ直接P2P接続（Chime不使用）
★ 変更禁止: WebRTC P2P のまま

ICE(STUN): Google STUN（stun.l.google.com:19302）
ICE(TURN): Twilio NTS（getTwilioIceServers → TTL 86400秒）
シグナリング: Base44 Entities（VideoCall）リアルタイム購読 + 500msポーリング
実装: hooks/useWebRtcCall.js
環境変数: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN（ICEサーバー取得のみ使用）
```

---

## 7. AWS S3 + CloudFront（VOD）

```
S3:
  用途: VOD動画ファイルの永続ストレージ
  アップロード: Presigned PUT URL（有効期限15分）
  パス: channels/{channelId}/{timestamp}-{fileName}
  環境変数: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, S3_BUCKET_VOD, AWS_REGION

CloudFront:
  用途: VOD動画配信（署名付きURL・6時間有効）
  方式: Signed URL（RSASSA-PKCS1-v1_5 / SHA-1）
  環境変数: CLOUDFRONT_DOMAIN, CLOUDFRONT_KEY_PAIR_ID, CLOUDFRONT_PRIVATE_KEY

★ S3直URLでの配信禁止（CloudFront経由のみ）
```

---

## 8. Stripe

```
用途: 全決済（コイン購入・プランサブスク・グッズ・ファンクラブ・CF等）
Checkout Session: mode:"payment" or mode:"subscription"
Webhook: STRIPE_WEBHOOK_SECRET / STRIPE_FANCLUB_WEBHOOK_SECRET
Connect: クラウドファンディング向け（createConnectAccount）
Customer Portal: createCustomerPortalSession（サブスク管理）
環境変数: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_FANCLUB_WEBHOOK_SECRET
         STRIPE_FANCLUB_PRICE_STANDARD/PREMIUM/DIAMOND
```

---

## 9. LINE

```
用途: 管理者へのセールス通知（グッズ・チェキ購入時）
実装: notifyLineAdminSale 関数
環境変数: LINE_CHANNEL_ID, LINE_CHANNEL_SECRET
```

---

## 10. Twilio

```
用途: WebRTC TURN サーバー取得のみ
★ 通話インフラとしては使用しない（ICEサーバー取得専用）
API: POST /2010-04-01/Accounts/{SID}/Tokens.json
返却: ice_servers から turn: で始まるサーバーのみ抽出
環境変数: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
監視: checkTwilioCostAlert（毎日実行）
```

---

## 11. Google（認証・STUN）

```
Google OAuth: Base44 Platform経由（google_oauth_client_secret）
Google STUN: stun.l.google.com:19302（WebRTC ICEサーバー・無料）
Google AI: InvokeLLM経由（Base44 統合パッケージ）
```

---

## 12. 廃止済みサービス

| サービス | 用途（旧） | 残存状況 | 対応 |
|---------|---------|---------|------|
| Mux | VOD配信 | 環境変数・一部コード残存 | 使用禁止・段階的削除 |
| Agora | 1対1通話 | agora-rtc-sdk-ng パッケージ残存 | 使用禁止・削除推奨 |
| Chime（1対1） | 1対1通話（旧） | hooks/useIvsStagesCall.js 等に痕跡 | 使用禁止 |

---

## 13. サービス間データフロー

```
[ユーザー]
  ↓ HTTPS
[Vite React フロントエンド]
  ↓ base44.functions.invoke()
[Deno Deploy バックエンド関数]
  ↓ 認証・DB操作
[Base44 BaaS / Entities]
  ↓ 外部API呼び出し
[Stripe API] ← 決済
[AWS IVS API] ← ライブ配信
[AWS Chime API] ← クラス配信
[AWS S3 API] ← VODアップロード
[Twilio NTS API] ← TURN取得
[LINE API] ← 通知

[Stripe Webhook] → [stripeWebhook / fanclubWebhook / productWebhook 等]
[IVS Webhook] → [ivsSessionWebhook]
``