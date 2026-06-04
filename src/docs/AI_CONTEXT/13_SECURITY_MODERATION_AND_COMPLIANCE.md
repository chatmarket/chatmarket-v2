# 13_SECURITY_MODERATION_AND_COMPLIANCE.md
> **Document Name**: Security, Moderation, and Compliance  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative（コード確認済み）+ provisional（法務事項）  

---

## 1. 認証

```
方式: Base44 Platform 組み込み認証
  - Email + パスワード
  - Google OAuth（google_oauth_client_secret）
  - セッションはBase44が管理
  - base44.auth.me() でユーザー情報取得
  - base44.auth.isAuthenticated() でログイン確認

フロントエンド:
  - AuthContext.jsx で認証状態管理
  - ProtectedRoute コンポーネントで保護
  - 未認証時: base44.auth.redirectToLogin(nextUrl)

バックエンド:
  - createClientFromRequest(req) で認証コンテキスト取得
  - base44.auth.me() → null の場合 → 401 Unauthorized
```

---

## 2. ロールと権限

```
ロール: user / admin
  - User.role フィールドで管理
  - 管理者操作: user.role !== 'admin' → 403 Forbidden

管理者機能:
  - /admin/* ページ（AdminDashboard, AdminAnalytics 等）
  - adminGetAllUsers, setAdminRole, grantAdminAccess 等の関数
  - SUPER_ADMIN_EMAILS 環境変数で初期管理者を設定

サービスロール（asServiceRole）:
  - バックエンド関数内でのみ使用
  - 全エンティティへの管理者権限でのアクセス
  - 使用例: onUserRegistered, videoCallBilling, stripeWebhook 等
  - ★ フロントエンドからは使用不可
```

---

## 3. Row Level Security（RLS）

確認済みエンティティのRLS設定:

```
YellCoinWallet:
  create: admin のみ
  read:   本人 or admin
  update: 本人 or admin
  delete: admin のみ

VideoCall:
  create: created_by（自分）
  read:   caller or callee or admin
  update: caller or callee or admin
  delete: admin のみ

Video（VOD）:
  RLS設定あり（内容は未確認）

その他エンティティ:
  多くは RLS 未設定 → 認証済みユーザー全員がアクセス可能
  → 権限チェックはバックエンド関数で実施
```

---

## 4. Webhook セキュリティ

```
Stripe Webhook:
  - STRIPE_WEBHOOK_SECRET で HMAC-SHA256 署名検証
  - STRIPE_FANCLUB_WEBHOOK_SECRET（ファンクラブ専用）
  - 検証失敗 → 401 Unauthorized

IVS Webhook:
  - IVS_WEBHOOK_SECRET で検証
  - ivsSessionWebhook で処理

未確認:
  - crowdfundingDonationWebhook の署名検証方式
  - eventTicketWebhook の署名検証方式
  - planSubscriptionWebhook の署名検証方式
```

---

## 5. NGワード・コンテンツモデレーション

```
NGワード:
  - Channel.ng_words[] でチャンネル別NGワード設定
  - filterCommentNgWord 関数でリアルタイムフィルタ
  - NgWordLog エンティティで記録
  - 管理画面: /admin/ng-word-analytics

コンテンツ審査（VOD）:
  - Video.moderation_status: pending → approved / rejected
  - 管理画面: /admin/video-moderation
  - moderateContent 関数でAI審査（詳細未確認）

通報:
  - ChannelReport, ForumReport エンティティで管理
  - BlockReport エンティティ（ブロック）
  - 管理画面: /admin/dashboard

ChannelSuspension: アカウント停止記録
```

---

## 6. 未成年保護

```
minorSafetyAlert 関数: 未成年ユーザーの安全アラート
lib/minorProtectionLogic.js: 未成年保護ロジック
lib/tutorCategoryLogic.js: 講師カテゴリ別保護ロジック
未確認: 年齢確認の実装状況・保護者同意フロー
```

---

## 7. 資金決済法・規約

```
確認済み:
  - エールコイン購入時に規約同意タイムスタンプを永久保存
    YellCoinWallet.first_terms_agreed_at / last_terms_agreed_at / terms_version
  - 購入後の返金は規約上禁止
  - /terms、/privacy、/legal/commercial ページが存在
  - 特定商取引法対応ページあり（LegalCommercial）

未確認・要法務確認:
  - エールコインの資金決済法上の分類
  - 消費税の課税区分
  - 180日失効の法的根拠
  - 出金時の源泉徴収要否
  - 海外ユーザーへの決済・税務対応
```

---

## 8. 情報セキュリティ

```
AWS認証情報:
  - 環境変数のみで管理（AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY）
  - フロントエンドへの露出禁止
  - CloudFront Private Key も環境変数（CLOUDFRONT_PRIVATE_KEY）

Stripe:
  - STRIPE_SECRET_KEY は環境変数のみ
  - フロントエンドへの露出禁止

Chime:
  - CreateMeeting / CreateAttendee のレスポンスから AWS認証情報を除外して返却

テストアカウント:
  - ono@onestep-corp.com がハードコードされた特殊アカウント
  - 本番コードに固有アカウント判定が存在 → セキュリティリスク
```

---

## 9. 既知のセキュリティ課題

```
課題1: テストアカウント（ono@onestep-corp.com）がライブ視聴課金をスキップ
  → 悪用リスクは低いが、環境変数化を推奨

課題2: SchoolTicket最低価格チェックがフロントのみの箇所がある可能性
  → バックエンドバリデーション追加必要

課題3: 一部Webhook関数の署名検証実装が未確認
  → crowdfundingDonationWebhook / eventTicketWebhook 等を確認推奨

課題4: RLS未設定エンティティが多い
  → 認証済みユーザーが他ユーザーのデータを読み取れる可能性
  → 機密性の高いエンティティ（Withdrawal, CreatorEarning等）は要確認
``