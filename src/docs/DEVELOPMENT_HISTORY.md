# 開発履歴・最終決定事項バイブル

> **このファイルはコード生成・変更時の「防衛線」である。**  
> 社長の意思決定に反するコードを絶対に生成しないこと。  
> 新機能・リファクタリング前に必ず参照すること。

---

## 1. インフラコストの変遷

### 1-1. Agora → AWS Chime への切り替え（確定済み）

| 項目 | Agora | AWS Chime SDK | 備考 |
|------|-------|--------------|------|
| 通話コスト | 高額（従量）| $0.0017/分/人 | 公式単価 ap-northeast-1 |
| 15分・2人 | 高額 | $0.051 ≒ **¥8** | ★ 核心数値 |
| 録画なし合計 | - | **¥8/15分** | これが「¥15利益」の根拠 |

**決定:** Agoraは完全廃止。AWS Chime SDK を唯一の通話基盤とする。  
AgoraのコードはAgoraVideoCallコンポーネントとして残存しているが、VideoCallPageでは**使用しない**。

### 1-2. 録画コストの精査記録（確定済み）

| AWS サービス | 単価 | 15分コスト |
|------------|------|-----------|
| WebRTC Attendees（2人）| $0.0017/分/人 | $0.051 ≒ ¥8 |
| Media Capture Pipeline | $0.0102/分 | $0.153 ≒ ¥24 |
| Concatenation（任意）| $0.0102/分 | $0.153 ≒ ¥24 |
| S3ストレージ（50MB/15分）| ~$0.025/GB/月 | ≒ ¥0.2 |

**録画ありコスト合計（Concatenation省略時）: ¥8 + ¥24 = ¥32/15分**  
**「15分¥15以内」は録画なし構成のみ成立する。**  
録画を加えると¥32〜¥56になるため、録画オプションは別途実費補填モデルで設計。

---

## 2. 決済ロジックの確定

### 2-1. 150円通話の「15円利益」モデル（最終確定）

```
リスナー支払い: 150コイン（= ¥150相当）
  └─ ライバー報酬（85%）: 127.5円
  └─ 運営粗利（15%）:     22.5円

AWS Chime 通話コスト: ¥8/15分（2人）
  └─ P2P成功率70%考慮後の実効コスト: ~¥6

運営純利益 = 22.5 - 8 = 約 ¥14〜15/15分 ✅
```

**このモデルを崩すコードは絶対に生成しない。**

### 2-2. Stripe 手数料のリスナー上乗せ（確定）

```
Stripe手数料: 3.6% + ¥30（国内カード標準）
コイン販売時にリスナー側へ上乗せ
  例: 1,000コイン購入 → 1,000 × 1.036 + 30 = ¥1,066 請求
```

- クリエイター報酬・プラットフォーム収益の計算には **Stripe手数料控除後**の数値を使用する。
- コインチャージのStripe手数料はユーザー負担（リスナー上乗せ）が大原則。

### 2-3. プラン別コイン単価（最終確定）

| プラン | コイン/15分 | ライバー率 | 運営率 |
|--------|------------|-----------|--------|
| FREE | 200 | 70% | 30% |
| BASIC | 150 | 85% | 15% |
| CALL&ANSER | 150 | 85% | 15% |

**FREEプランでも通話は可能。** ただし運営手数料30%（ライバー70%）。  
BASICプラン加入でライバー還元率が85%に向上 → ライバーがBASIC加入を推奨する仕組み。

---

## 3. 録画オプションの設計（確定）

### 3-1. 実費補填モデル（運営利益ゼロ）

```
録画オプション料金: +¥50/15分
  └─ 全額 AWS Media Capture Pipeline 実費充当
  └─ ライバーへの収益分配対象外
  └─ 運営利益ゼロ（コスト補填のみ）
```

**設計思想:** 録画機能は「サービス」ではなく「インフラ費用の実費請求」。  
ライバーのアーカイブ販売収益とは**完全分離**する。

### 3-2. 録画起動のガード条件（`startChimeRecording` 関数）

```javascript
// recording_option フラグが true の通話のみ録画起動を許可
if (!call.recording_option) {
  return Response.json({ error: 'Recording option not purchased', code: 'RECORDING_OPTION_REQUIRED' }, { status: 403 });
}
```

**`recording_option: false` の通話に対して録画を起動するコードは生成禁止。**

---

## 4. プラン別機能制限の壁（確定）

### 4-1. 各プランの機能マトリクス

| 機能 | FREE | BASIC | VOD | CALL&ANSER |
|------|------|-------|-----|------------|
| ビデオ通話（有料）| ✅ | ✅ | ✅ | ✅ |
| ビデオ通話（無料枠）| ❌ | ❌ | ❌ | ✅ 60分/日 |
| ライブ配信（1対多）| ❌ | ✅ | ❌ | ❌ |
| アーカイブ保存 | ❌ | ✅ | ✅ | ❌ |
| アーカイブ有料販売 | ❌ | ✅ | ✅ | ❌ |
| VODアップロード | ❌ | ❌ | ✅ | ❌ |

### 4-2. VOD最低価格バリデーション（確定：¥150）

```javascript
// VODアーカイブ・動画販売の最低価格は ¥150
const MIN_VOD_PRICE = 150;
if (archivePrice < MIN_VOD_PRICE) {
  throw new Error('アーカイブ販売価格は¥150以上に設定してください');
}
```

**¥150未満のVOD設定を許可するコードは生成禁止。**

### 4-3. CALL&ANSERプラン 無料枠ルール（確定）

- 1日 **60分**（10分×6スロット）の無料通話枠
- 毎日 JST 0:00 に自動リセット（`resetDailyFreeCallQuota` cron job）
- 無料枠使用通話には `is_free_call: true` フラグを必ず付与
- 無料枠消費は `VideoCall.duration_minutes` で集計

### 4-4. ミリオネア・チャレンジ期間のロック（確定）

```javascript
const MILLIONAIRE_CHALLENGE_START = new Date("2026-04-01");
const MILLIONAIRE_CHALLENGE_END   = new Date("2026-06-30");

// この期間中は全ユーザー・全プランの通話時間を15分に固定
if (isMillionaireChallengePeriod()) {
  return 15; // duration_minutes を強制上書き
}
```

**期間中に15分以外の通話時間を設定するロジックは生成禁止。**

### 4-5. ライブ配信最低コイン価格（プログレッシブ還元率連動）

| 還元率 | 最低コイン/15分 |
|--------|--------------|
| 85〜89% | 150 |
| 90〜94% | 175 |
| 95%〜 | 200 |

キャンペーン許可チャンネル（`campaign_allowed: true`）のみ最低価格制限を免除。

---

## 5. 通話課金フロー（確定）

```
① 通話申し込み（VideoCallRequest）
   → VideoCall レコード作成（status: pending）

② ライバー承諾
   → status: accepted

③ 発信者が通話ボタン押下
   → status: active
   → YellCoinWallet から coins_held 分をホールド

④ 通話中（15分ごとに課金）
   → videoCallBilling function が 15分ごとに実行
   → caller wallet: -min_coins
   → callee wallet: +creator_revenue_coins
   → VideoCall.coins_consumed 更新

⑤ 残高不足時
   → auto_disconnected: true
   → status: ended
   → フロントに showInsufficientModal 表示

⑥ 通話終了
   → videoCallBilling の action: "end" を呼び出し
   → 精算完了
```

---

## 6. AUTO_ACCEPT モード（確定）

- `Channel.incoming_call_mode === 'AUTO_ACCEPT'` の場合、pending 通話を自動承諾
- `autoAcceptCall` バックエンド関数を経由して実行
- 自動承諾後: `accepted` → 即 `active` に遷移
- **手動承諾フロー（MANUAL）がデフォルト。** AUTO_ACCEPTは明示的に設定した場合のみ。

---

## 7. 今後の収益源（計画・未実装）

### 7-1. テキスト化サービス（計画中）
- 通話・ライブ配信の音声をAIでテキスト化
- 追加課金モデル（コイン消費 or サブスク）
- AWS Transcribe または OpenAI Whisper を想定

### 7-2. アフィリエイト機能（計画中）
- クリエイターが外部商品リンクを埋め込み
- 視聴者経由の購入でクリエイターにアフィリエイト報酬
- Amazon PA API または 楽天アフィリエイトとの連携想定

### 7-3. サブスクの拡張（計画中）
- 現在: basic / vod / call-anser / ppv の4プラン
- 将来: エンタープライズプラン（法人向け、複数チャンネル管理）
- ファンクラブ月額の段階的値上げ（現在¥500〜、将来¥2,000〜）
- プログレッシブ還元率の上限引き上げ（現在95%→将来98%検討）

---

## 8. 絶対に変えてはいけないルール（Red Lines）

```
❌ 150円通話の運営利益を削るコード
❌ recording_option なしで録画を起動するコード
❌ VOD価格を¥150未満で設定できるコード
❌ ミリオネア期間中に15分以外の通話時間を許可するコード
❌ FREEプランの通話を完全禁止にするコード（FREEでも通話可能が大原則）
❌ ライバー還元率を85%未満にするコード（BASICプラン以上）
❌ Stripe手数料をプラットフォーム側が負担するコード
❌ Agora SDK を VideoCallPage で使用するコード
```

---

## 9. アーキテクチャ原則

- **バックエンド関数はすべて Deno Deploy（Base44 Functions）**
- **フロントエンド: React + Tailwind CSS + shadcn/ui**
- **DB: Base44 Entities**（スキーマ変更は entities/*.json で管理）
- **動画配信: AWS IVS（ライブ）+ Mux（VOD）**
- **通話: AWS Chime SDK のみ**（Agoraは廃止）
- **録画: AWS S3 + CloudFront**（署名付きURL）
- **決済: Stripe（JPY建て）**

---

*最終更新: 2026-04-15*  
*作成者: 社長の指示に基づく開発バイブル*