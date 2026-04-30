# LoadTestPanel スマホ実機テスト手順

## 📱 テスト環境構成

**マルチブラウザ・マルチデバイス構成（完全隔離検証）:**

```
┌─────────────────────────────────────────────────────────────┐
│ PC ブラウザ1（Chrome DevTools開き）                          │
│ → Home → LoadTestPanel 表示                                  │
│ → 【爆撃開始】ボタン押下 → FPS計測スタート                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ スマホ実機（iPhone/Android）                                 │
│ → 同じアプリを開く                                          │
│ → LoadTestPanel → 爆撃開始 → FPS リアルタイム監視          │
│ → 停止ボタン確実性テスト                                    │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ PC ブラウザ2（別タブ）                                       │
│ → /video-call/[call_id] で1対1ビデオ通話開始                │
│ → 映像・音声品質 監視                                       │
│ → 爆撃中でも映像フレームロス ゼロか確認                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 テスト Step1: スマホFPS変動確認

**目的:** LoadTestPanel が実スマホでどの程度の負荷を生成するか計測

### 1.1 環境準備
```bash
# スマホWiFi設定: PC と同じWiFi接続
# Staging環境: http://app.staging.local:3000
# または本番: https://app.prod.example.com
```

### 1.2 実行手順
1. **スマホでアプリ開く**
   - Home → LoadTestPanel 表示（右下フローティングパネル）
   - 初期 FPS: **60/50/30** のいずれか（デバイス依存）

2. **爆撃開始ボタン押下**
   ```
   【Start】 → 処理開始ログ出現 → メトリクス更新開始
   ```

3. **FPS 低下パターン記録**
   ```
   📊 計測結果例（iPhone 12）:
   - 開始直後: 60 FPS (normal)
   - +5秒: 45 FPS (yell burst 50件/s)
   - +15秒: 20 FPS (chat flood + yells)
   - +25秒: 5 FPS (max load)
   ```

4. **停止ボタン信頼性テスト**
   ```
   FPS最低時点で【Stop】押下
   → UI即座に停止表示
   → 3秒以内に log 「✅ Bot stopped」出現
   ```

   **失敗パターン:**
   - 【Stop】押しても反応なし → ブラウザハング
   - 5秒以上待つ → 中止リクエストタイムアウト

### 1.3 記録フォーマット
```markdown
## スマホ実機テスト結果 - 2026-04-30

| デバイス | OS | FPS初期 | FPS最低 | 停止反応 | 備考 |
|---------|-----|--------|--------|---------|------|
| iPhone 12 | iOS 17 | 60 | 8 | 即座 | WiFi接続良好 |
| Pixel 7 | Android 14 | 50 | 12 | 遅延3s | 4G接続 |
```

---

## 🔐 テスト Step2: 1対1隔離確認（最重要）

**目的:** ライブ爆撃が 1対1ビデオ通話の映像品質に全く影響しないこと証明

### 2.1 環境構成
```
ブラウザA（PC Chrome）
  ├─ タブ1: Home → LoadTestPanel
  └─ タブ2: /video-call/[call_id] → 1対1受信中

ブラウザB（スマホ Safari）
  ├─ 同じ1対1通話で発信側
  └─ 映像・音声品質監視
```

### 2.2 詳細手順

#### Step 2.2.1: 1対1通話セットアップ
```
1. ブラウザA タブ2: 
   - /call-request/[streamer_channel_id] で通話申請
   - ステリーマー側（ブラウザB）で承認 → active 状態

2. ブラウザB:
   - /video-call/[call_id] で通話中の映像確認
   - カメラON・音声確認
```

#### Step 2.2.2: 爆撃 vs 通話隔離テスト
```
⏱️ Timeline:
  T+0s:  ブラウザA タブ1 【爆撃開始】
  T+5s:  ブラウザB 画面（映像フレーム）検査
         → フレームロス ≥ 5フレーム/s → ❌ FAIL
         → フレームロス < 1フレーム/5s → ✅ PASS

  T+15s: ブラウザA タブ1 ログ確認
         → 💰 Yells: 50+
         → 💬 Messages: 100+
         
  T+20s: ブラウザB 音声再生 確認
         → 音途切れ ゼロ
         → 遅延増加 < 50ms
         → ✅ PASS

  T+28s: ブラウザA タブ1 【停止ボタン】
  T+30s: ブラウザB 通話継続（平常）
```

### 2.3 隔離失敗検出シグナル
```markdown
❌ 隔離失敗（以下いずれか該当）:

1. 映像フレームロス
   - 連続 >3フレーム落下
   - フレームレート低下（60→30FPS以下）
   
2. 音声品質低下
   - 音途切れ（>100ms）
   - ノイズ・エコー発生（爆撃開始と同期）
   - 遅延増加（往復RTT +100ms以上）

3. タイムアウト
   - 1対1受信側でHLS/IVS buffering開始
   - 再接続メッセージ出現
```

---

## 🛡️ テスト Step3: 隔離メカニズム確認（コード検証）

**目的:** アーキテクチャレベルで爆撃が1対1に漏れていないことを確認

### 3.1 ネットワークバンド分離
```javascript
// ✅ 正常（隔離済み）
LoadTestBot:
  └─ API: /api/loadTestBot (POST)
     └─ Entity: YellCoinTransaction
     └─ Function: videoCallBilling (別スレッド)

VideoCall:
  └─ API: /api/videoCall/:id (WebRTC/IVS Stages)
     └─ Entity: VideoCall (独立RLS)
     └─ Connection: IVS Stages (専用トークン)
```

### 3.2 チェックリスト
- [ ] LoadTestBot が **爆撃用の仮想ユーザー** を生成
- [ ] 実際の VideoCall レコード にクエリ **しない**
- [ ] YellCoinTransaction は **非実トランザクション**（is_test フラグで除外）
- [ ] VideoCall.update は **爆撃ボット経由でなく、通話当事者のみ**
- [ ] IVS Stages トークン生成 は `createIvsStagesSession()` 専用（爆撃無関係）

---

## 📊 テスト結果報告フォーマット

```markdown
## LoadTest Mobile Verification - 2026-04-30

### Step1: FPS 変動確認
| Device | iOS/Android | FPS@Start | FPS@Peak Load | Stop Response | Status |
|--------|-------------|-----------|---------------|---------------|--------|
| iPhone 12 | iOS 17 | 60 | 8 | ✅ 即座 | PASS |
| Pixel 6 | Android 14 | 50 | 10 | ✅ 即座 | PASS |

**結論:** スマホで **最低 FPS 5-10** までの負荷耐性確認。UI操作可能範囲。

### Step2: 1対1 隔離確認
| Item | Result | 詳細 |
|------|--------|------|
| 映像フレームロス | ✅ PASS | <0.5フレーム/s（計測不可レベル） |
| 音声連続性 | ✅ PASS | 途切れゼロ、遅延安定 |
| IVS Stages安定性 | ✅ PASS | バッファリング発生ゼロ |
| ボット停止応答 | ✅ PASS | 【Stop】から <2秒で終了 |

**結論:** 爆撃とライブ通話の **完全隔離を確認**。戦場と個室は無関係。

### Step3: メカニズム確認
- ✅ ボット生成ユーザーは実ユーザーテーブル非汚染
- ✅ YellCoinTransaction（爆撃）は VideoCall トランザクション経路と非接続
- ✅ IVS Stages トークン生成はボット無関係
- ✅ RLS: VideoCall アクセスは当事者のみ（爆撃ユーザー含まず）

---

## 🔧 トラブルシューティング

### 【Stop】が効かない場合
```
1. DevTools（F12）→ Console で AbortController がログ出現？
2. Network タブで /api/loadTestBot STOP リクエスト完了？
3. バックエンド logs で botRunning = false 確認？

→ 確認不可 → バックエンド強制停止リクエスト（curl）:
curl -X POST http://localhost:5000/api/loadTestBot \
  -H "Content-Type: application/json" \
  -d '{"action":"stop"}'
```

### FPS低下しない（爆撃が走ってない）場合
```
1. LoadTestPanel ログ確認 → 「❌ Start failed」？
2. /api/loadTestBot エンドポイント応答確認（curl）
3. ブラウザコンソール → CORS エラー？
   → Staging環境のCORS設定確認

→ 強制テスト:
curl -X POST http://localhost:5000/api/loadTestBot \
  -H "Content-Type: application/json" \
  -d '{"action":"start_yell_burst","stream_id":"test","user_count":50,"duration_seconds":30}'
```

---

## ✨ 最終確認チェックリスト

- [ ] スマホ × 2デバイス（iOS + Android）で FPS 計測完了
- [ ] 停止ボタン確実性 × 3回 テスト完了（全て即座）
- [ ] 1対1隔離テスト完了（映像・音声・遅延 = 正常）
- [ ] 爆撃中に /video-call で再接続・バッファリング ゼロ
- [ ] コード隔離メカニズム確認（RLS・Entity経路分離）
- [ ] 本番環境デプロイ OK

**結論:** 完全隔離確認 → 負荷テストツール本格運用可能 ✅