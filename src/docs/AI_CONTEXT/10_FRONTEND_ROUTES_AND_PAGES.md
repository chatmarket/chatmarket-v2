# 10_FRONTEND_ROUTES_AND_PAGES.md
> **Document Name**: Frontend Routes and Pages  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative（App.jsx から直接抽出）  

---

## 主要ルート一覧（App.jsx から抽出）

### 公開ページ

| URL | コンポーネント | 目的 |
|-----|------------|------|
| / | Home | トップページ・ライブ一覧 |
| /search | Search | 動画・チャンネル検索 |
| /channel/:channelId | ChannelPage | クリエイターチャンネル |
| /live/:streamId | LiveView | ライブ視聴 |
| /watch/:videoId | WatchVideo | VOD視聴 |
| /terms | Terms | 利用規約 |
| /privacy | Privacy | プライバシーポリシー（日本語） |
| /privacy/en | PrivacyEn | プライバシーポリシー（英語） |
| /privacy/ko | PrivacyKo | プライバシーポリシー（韓国語） |
| /legal/commercial | LegalCommercial | 特定商取引法表示 |
| /company | CompanyInfo | 会社情報 |
| /crowdfunding | CrowdfundingList | CF一覧 |
| /crowdfunding/:projectId | CrowdfundingDetail | CF詳細 |
| /crowdfunding/lp | CrowdfundingLP | CF LP |
| /forum | Forum | フォーラム |
| /@:username | ProfileLP | クリエイタープロフィールLP |
| /fortune-lp | FortuneLP | 占い師向けLP |
| /idol-lp | IdolLP | アイドル向けLP |
| /lp/tutor | TutorLP | 講師向けLP |
| /lp/expert | ExpertLP | エキスパート向けLP |
| /lp/fitness | FitnessLP | フィットネスLP |
| /lp/career | CareerLP | キャリアLP |
| /lp/english | EnglishLP | 英語LP |
| /lp/coach | CoachLP | コーチLP |
| /musician | MusicianLP | ミュージシャンLP |
| /classroom-lp | ClassRoomLP | クラスルームLP |

---

### ログイン必須ページ

| URL | コンポーネント | 目的 |
|-----|------------|------|
| /settings | Settings | ユーザー設定・コイン購入 |
| /my-channel | MyChannel | 自チャンネル管理 |
| /go-live | GoLive | ライブ配信開始 |
| /upload | Upload | VODアップロード |
| /coin-charge | CoinCharge | エールコイン購入 |
| /plan-select | PlanSelect | プラン選択 |
| /plan-confirm | PlanConfirm | プラン購入確認 |
| /plan-detail/:planId | PlanDetail | プラン詳細 |
| /creator-dashboard | CreatorDashboard | クリエイターダッシュボード |
| /revenue | RevenueManagement | 収益管理 |
| /revenue-dashboard | CreatorRevenueDashboard | 収益ダッシュボード詳細 |
| /content-analytics | ContentAnalytics | コンテンツ分析 |
| /vod-management | VodManagement | VOD管理 |
| /vod-analytics | VodAnalytics | VOD分析 |
| /video-call/:callId | VideoCallPage | 1対1ビデオ通話 |
| /call-request/:channelId | VideoCallRequest | 通話申し込み |
| /call-history | CallHistory | 通話履歴 |
| /call-waiting | CallWaitingRoom | 通話待機 |
| /call-profile/:channelId | CallProfilePage | 通話プロフィール |
| /call-calendar/:channelId | CallCalendar | 通話カレンダー |
| /creator-chat | CreatorChat | クリエイターチャット |
| /chat/:channelId | DirectChat | ダイレクトチャット |
| /fanclub/:channelId | FanClub | ファンクラブ |
| /fanclub | FanClub | ファンクラブ（汎用） |
| /fanclub-manage | FanClubManage | ファンクラブ管理 |
| /notifications | NotificationCenter | 通知一覧 |
| /withdrawal-request | WithdrawalRequest | 出金申請 |
| /my-reservations | MyReservations | 予約一覧 |
| /channel-schedule/:channelId | ChannelSchedule | チャンネルスケジュール |
| /creator-schedule | CreatorSchedule | クリエイタースケジュール |
| /school | MiniSchool | スクール |
| /school-tickets | SchoolTickets | SchoolTicket管理 |
| /tickets | TicketShop | チケットショップ |
| /verify-ticket | TicketVerify | チケット検証 |
| /my-tickets | MyTickets | マイチケット |
| /my-library | MyLibrary | マイライブラリ |
| /my-purchases | MyPurchases | 購入履歴 |
| /classroom/create | ClassRoomCreate | クラスルーム作成 |
| /classroom/:roomId | ClassRoomPage | クラスルーム |
| /fortune-chat/:channelId | FortuneChat | チャット鑑定 |
| /fortune-chat-dashboard | FortuneChatDashboard | 鑑定ダッシュボード |
| /fortune-calendar | FortuneCalendar | 占いカレンダー |
| /cheki-editor | ChekiCaptureEditor | チェキ編集 |
| /community | Community | コミュニティ |
| /blog | Blog | ブログ |
| /blog/:postId | BlogDetail | ブログ詳細 |
| /blog/edit/:postId | BlogEdit | ブログ編集 |
| /recruit | Recruit | クリエイター募集・キャンペーン申込 |
| /influencer-campaign | InfluencerCampaign | インフルエンサーキャンペーン |
| /millionaire | MillionaireChallenge | ミリオネアチャレンジ |
| /channel-profile-edit | ChannelProfileEdit | チャンネルプロフィール編集 |
| /obs-guide | ObsGuide | OBSガイド |
| /donor-dashboard | DonorDashboard | 支援者ダッシュボード |
| /crowdfunding/apply | CrowdfundingApply | CF申請 |
| /crowdfunding/manage | CrowdfundingManage | CF管理 |
| /crowdfunding/new | CrowdfundingNew | CF新規作成 |
| /dashboard | Dashboard | 汎用ダッシュボード |
| /enterprise | EnterpriseDashboard | エンタープライズ |

---

### 管理者専用ページ

| URL | コンポーネント |
|-----|------------|
| /admin/dashboard | AdminDashboard |
| /admin/analytics | AdminAnalytics |
| /admin/video-moderation | VideoModeration |
| /admin/ng-word-analytics | NgWordAnalytics |
| /admin/affiliate | AffiliateAnalytics |
| /admin/metrics | AdminDashboardMetrics |
| /admin/reminder-logs | ReminderLogs |

---

### 特殊ページ（AppLayout外）

| URL | コンポーネント | 備考 |
|-----|------------|------|
| /prism-overlay/:streamId | PrismWebOverlay | ★凍結・AppLayout外・認証不要 |
| /prism-test | PrismOverlayTest | テスト用 |

---

### リダイレクト

```
/equipment → /obs-guide
/streaming-manual → /obs-guide
/live-streams → /
```

---

## 注意事項

```
- /prism-overlay/:streamId は AppLayout（ヘッダー・ナビ）を完全排除
- /@:username は動的プロフィールLPページ（username が Channel.username に一致）
- 全ページが AppLayout (Outlet) でラップされる（/prism-overlay 除く）
- App.jsx が唯一のルーター設定（設定変更時は App.jsx を更新）
``