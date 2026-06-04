# 17_CHANGELOG_AND_DECISIONS.md
> **Document Name**: Changelog and Key Decisions  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative（コードから確認済み）+ provisional（経緯の詳細は未確認）  
> **Primary Source Files**: docs/MASTER_SPEC_PART1.md, docs/MASTER_SPEC_PART2.md, docs/CHATMARKET_FULL_SPEC.md, lib/pricing.js  

---

## 2026-06-04

### エールコイン購入手数料の正式確定・ボーナス廃止
- **変更前**: plan_1000=¥1,038（3.6%外乗せ）/ plan_5000=¥5,187+400ボーナスコイン / plan_10000=¥10,374+800ボーナスコイン / plan_30000（存在）
- **変更後**: plan_1000=¥1,050 / plan_3000=¥3,150（新規追加） / plan_5000=¥5,250 / plan_10000=¥10,500 / plan_30000（削除）/ ボーナスコイン廃止
- **理由**: 手数料構造の透明化・統一。逆ざやリスク排除。
- **影響範囲**: createCoinCheckoutSession / stripeWebhook / CoinPurchasePanel / YellCoinWalletPanel / CoinCharge / lib/pricing.js / 仕様書全般
- **仕様書更新**: MASTER_SPEC_PART1.md / CHATMARKET_FULL_SPEC.md 更新済み

### plan_3000の追加
- **変更前**: plan_1000 / plan_5000 / plan_10000 の3プラン
- **変更後**: plan_1000 / plan_3000 / plan_5000 / plan_10000 の4プラン
- **理由**: 3,000円ユーザーの購入需要への対応

### VOD・PPV月額料金修正（¥9,900→¥3,300）
- **変更前**: lib/pricing.js に VOD: monthlyFee: 9900 / PPV: monthlyFee: 9900
- **変更後**: VOD: monthlyFee: 3300 / PPV: monthlyFee: 3300
- **理由**: 全有料プランを¥3,300に統一する方針に合わせた修正
- **影響範囲**: lib/pricing.js PLANS オブジェクト

---

## 2026-06-03（仕様書初版生成）

### MASTER_SPEC_PART1.md / MASTER_SPEC_PART2.md 生成
- コードベースから直接生成した包括的な仕様書
- 1対1通話フローの詳細文書化（WebRTC P2P確定）
- クラスルーム7ステップ競合対策の文書化

---

## 2026-05（推定・コードから確認）

### 全有料プランを月額¥3,300へ統一
- **変更前**: VOD=¥9,900 / PPV=¥9,900（古い仕様書に記載）
- **変更後**: 全有料プラン（call-anser / basic / vod / ppv）= ¥3,300
- **理由**: 価格統一によるシンプルな料金体系
- **関連ファイル**: PlanSelect.jsx / PlanConfirm.jsx / lib/pricing.js

### クラスルーム（1対9）Amazon Chime SDK 実装
- **決定内容**: 1対9グループビデオはAmazon Chime SDK Meetings（us-east-1）で実装
- **理由**: WebRTC P2P は1対1通話専用
- **最大参加者**: 10名固定（講師1+生徒9）

---

## 時期不明（コードから推定）

### 1対1通話インフラ: Agora/Chime → WebRTC P2P
- **変更前**: Agora SDK / Amazon Chime（1対1通話での使用）
- **変更後**: WebRTC P2P（ブラウザ直接接続）+ Google STUN + Twilio TURN
- **理由**: コスト削減・遅延改善・外部依存削減
- **廃止済み**: agora-rtc-sdk-ng パッケージは残存するが使用禁止

### VOD: Mux → S3 + CloudFront
- **変更前**: Mux（外部動画ホスティング）
- **変更後**: AWS S3（ストレージ）+ CloudFront（署名付きURL配信）
- **理由**: コスト削減・自社管理
- **廃止済み**: MUX_TOKEN_ID / MUX_TOKEN_SECRET は環境変数に残存するが使用禁止

### キャンペーン: Stripe試用期間方式 → CampaignLiveGrantee
- **変更前**: Stripe trial subscription
- **変更後**: CampaignLiveGrantee エンティティで完全管理
- **理由**: 12か月後の自動課金リスク排除・DB完全管理
- **禁止**: キャンペーン対象者へのStripe Subscription作成

### エールコイン購入手数料: 旧Stripe手数料内包方式 → 5%外乗せ
- **変更前**: ceil(coins / (1 - 0.036)) 方式（Stripe手数料内包）
- **変更後**: coins + Math.ceil(coins × 0.05) 方式（5%外乗せ）
- **理由**: 透明性向上・統一化