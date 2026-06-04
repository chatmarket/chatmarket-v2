# 04_AUTH_ROLES_AND_PERMISSIONS.md
> **Document Name**: Auth, Roles, and Permissions  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: lib/userPlan.js, lib/AuthContext.jsx, components/ProtectedRoute.jsx, App.jsx  

---

## 1. 認証フロー

```
Base44 Platform 組み込み認証（JWT/セッション）
  1. メール+パスワード or Google OAuth
  2. base44.auth.me() でユーザーオブジェクト取得
     → { id, email, full_name, role, ...追加フィールド }
  3. AuthContext.jsx でアプリ全体に認証状態を提供
  4. 未認証ユーザー → base44.auth.redirectToLogin(nextUrl)
  5. ログアウト → base44.auth.logout(redirectUrl)
```

---

## 2. ロール

| ロール | 付与方法 | 権限 |
|-------|---------|------|
| user | 登録時デフォルト | 一般機能のみ |
| admin | setAdminRole / SUPER_ADMIN_EMAILS | 全機能 + 管理者機能 |

---

## 3. ページアクセス権

| ページ | アクセス権 | 備考 |
|--------|---------|------|
| / (Home) | 公開 | |
| /search | 公開 | |
| /channel/:channelId | 公開 | |
| /live/:streamId | 公開（有料視聴はコイン必要） | |
| /watch/:videoId | 公開（有料動画はコイン必要） | |
| /coin-charge | ログイン必須 | |
| /settings | ログイン必須 | |
| /my-channel | ログイン必須 | |
| /go-live | ログイン必須 + チャンネル必要 | |
| /video-call/:callId | ログイン必須 + caller/callee のみ | |
| /classroom/:roomId | ログイン必須 + SchoolTicket必要（生徒） | |
| /admin/* | ログイン必須 + role=admin | AdminDashboard等 |
| /@:username | 公開 | ProfileLP |
| /prism-overlay/:streamId | 公開 + 認証なし | PrismWebOverlay |

---

## 4. バックエンド関数の認証要件

```
全関数共通:
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

管理者必須の関数は追加チェック:
  if (user?.role !== 'admin') 
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });

Webhook関数（署名検証）:
  Stripe-Signature ヘッダーで検証 → 失敗 → 401
  ユーザー認証は不要（Stripeからのリクエストのため）

スケジューラー関数:
  ユーザー認証なし（定期実行のため）
  但し updateProgressiveRates は一般ユーザーが呼び出すと admin チェックで 403 を返す実装
```

---

## 5. asServiceRole の使用箇所

```
asServiceRole: バックエンド関数内でのみ使用（管理者権限でDB操作）
主な使用箇所:
  - stripeWebhook: コイン付与・ウォレット更新
  - onUserRegistered: 初期化処理
  - videoCallBilling: PlanSubscription確認
  - createChimeMeeting: SchoolTicket確認（生徒認可）
  - campaignAutoGrant: CampaignLiveGrantee作成
  - adminGetAllUsers: 全ユーザー取得

フロントエンドでは使用不可・使用禁止
```

---

## 6. 配信者・視聴者・講師・生徒の判定

```
配信者（ライバー）: Channel.owner_email === user.email
講師（クラスルーム）: ClassRoom.host_email === user.email
管理者: user.role === 'admin'
生徒: SchoolTicket.student_email === user.email かつ status='active'
視聴者（PPV）: Purchase.buyer_email === user.email

createChimeMeeting での判定:
  isHost = room.host_user_id === user.id || room.host_email === user.email
  isAdmin = user.role === 'admin'
  それ以外 = 生徒（SchoolTicket確認必須）
```

---

## 7. SEO・robots・noindex

```
robots.txt: /public/robots.txt（静的ファイル）
sitemap.xml: /public/sitemap.xml（静的）
            generateSitemap / generateSitemapDynamic（動的生成）
MetaHelmet コンポーネント: ページ別 title/description/OGP/hreflang/canonical

noindex 設定:
  各ページで noindex prop を MetaHelmet に渡す
  管理者ページ（/admin/*）は noindex 推奨だが実装確認未実施
  未確認: /prism-overlay, /prism-test 等の技術的ページのnoindex設定
``