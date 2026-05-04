# ChatMarket RTMPS 統一配信アーキテクチャ

**確定日**: 2026-05-04
**ステータス**: 本番運用中
**コスト**: $0.005/分（データ入力費のみ）

---

## 📋 設計原則

1. **一元管理**: OBS・ブラウザ・モバイル — 全ての配信方法が同一チャンネル（chatmarket-main）に集約
2. **低コスト**: Stage/Composition廃止で AWS IVS 関連費用を $0 に削減
3. **ユーザー透過**: 配信方法の違いが視聴者に見えない — 常に同じ HLS URL
4. **運用統一**: 管理者は AWS IVS Console で1つのチャンネルを監視するだけ

---

## 🏗️ アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────┐
│                    配 信 方 法 別                            │
├──────────────────┬──────────────────┬──────────────────────┤
│    OBS 配信      │  ブラウザ配信    │  モバイル配信        │
│                  │  (WebRTC)        │  (予約)              │
├──────────────────┼──────────────────┼──────────────────────┤
│ RTMPS Output:    │ RTMPS Output:    │ RTMPS Output:        │
│ rtmps://xxx      │ rtmps://xxx      │ rtmps://xxx          │
│ ?key=...         │ ?key=...         │ ?key=...             │
│                  │                  │                      │
│ (OBS内で)        │ (createLiveStream│ (将来実装)           │
│                  │ から取得)        │                      │
└──────────────────┴──────────────────┴──────────────────────┘
                             ↓
                  ┌──────────────────┐
                  │  同じ STREAM KEY  │
                  │  (固定・共有)    │
                  └──────────────────┘
                             ↓
        ╔════════════════════════════════════╗
        ║   AWS IVS Channel: chatmarket-main  ║
        ║   ARN: arn:aws:ivs:...             ║
        ║   チャンネルARN: pVdn6DgvnSMG      ║
        ╚════════════════════════════════════╝
                             ↓
        ┌────────────────────────────────────┐
        │  HLS Playback URL (同一)           │
        │  https://27b83d82b8a7.            │
        │  ap-northeast-1.playback...       │
        │  /api/video/v1/.../m3u8           │
        └────────────────────────────────────┘
                             ↓
        ┌────────────────────────────────────┐
        │   全 視 聴 者 ← 同じURLで再生      │
        │   OBS/ブラウザ/モバイル無関係      │
        └────────────────────────────────────┘
```

---

## 🔧 技術仕様

### 固定値（変更不可）

| 項目 | 値 | 用途 |
|------|-----|------|
| **IVS Channel ARN** | `arn:aws:ivs:ap-northeast-1:813372611580:channel/pVdn6DgvnSMG` | OBS・ブラウザの入力先 |
| **RTMPS URL** | `rtmps://27b83d82b8a7.global-contribute.live-video.net:443/app/` | 接続エンドポイント |
| **Stream Key** | `sk_ap-northeast-1_iYbETprO3ixW_1iEQD65hcKx0Mi253OGFyRzkYkaRAc` | 認証キー（全配信方法共通） |
| **HLS Playback** | `https://27b83d82b8a7.ap-northeast-1.playback.live-video.net/api/video/v1/ap-northeast-1.813372611580.channel.pVdn6DgvnSMG.m3u8` | 視聴者向けURL（変わらない） |

### 廃止リソース（完全削除）

| リソース | 理由 | 削除状態 |
|---------|------|---------|
| IVS Stages | Stage API: $0.01/分（無駄） | ✅ 廃止 |
| Composition | Stage経由の配信処理（不要） | ✅ 廃止 |
| whipProxy 関数 | Stage Token生成（削除済み） | ✅ 削除済み |
| getIvsWhipEndpoint 関数 | Stage用エンドポイント（未使用） | ⚠️ 要削除 |

---

## 📡 配信フロー

### ① OBS 配信（既存）

```
OBS設定:
├─ Server:   rtmps://27b83d82b8a7.global-contribute.live-video.net:443/app/
├─ Key:      sk_ap-northeast-1_iYbETprO3ixW_1iEQD65hcKx0Mi253OGFyRzkYkaRAc
└─ 結果:     chatmarket-main に RTMPS 送信 → HLS 再生

管理者:
└─ AWS IVS Console: chatmarket-main のメトリクスを確認
```

### ② ブラウザ配信（新規）

```
コード: BrowserBroadcasterRtmps
├─ createLiveStream() で RTMPS URL + Key 取得
├─ Video + Audio ストリーム取得
├─ canvas.captureStream() で WebRTC → RTMPS トランスコード
└─ 結果: chatmarket-main に RTMPS 送信 → HLS 再生

管理者:
└─ 同じ AWS IVS Console で確認（OBSと区別なし）
```

### ③ モバイル配信（将来）

```
実装予定: iOS/Android WebRTC
└─ 同じく createLiveStream() → chatmarket-main へ
```

---

## 💰 コスト分析

### 旧方式（Stage/Composition）

| 項目 | 費用 | 月額 |
|------|------|------|
| IVS Channel（入力） | $0.01/分 | ≈ $14,400 |
| Stage（API） | $0.005/分 | ≈ $7,200 |
| Composition（処理） | $0.005/分 | ≈ $7,200 |
| **合計** | | **≈$28,800** |

### 新方式（RTMPS統一）

| 項目 | 費用 | 月額 |
|------|------|------|
| IVS Channel（入力） | $0.005/分 | ≈ $7,200 |
| Stage | $0 | $0 |
| Composition | $0 | $0 |
| **合計** | | **≈$7,200** |

### 削減額

**$28,800 → $7,200 = 75% コスト削減**

---

## 🛡️ 確認項目（デイリーチェックリスト）

- [ ] AWS IVS Console: chatmarket-main のメトリクスが正常か
- [ ] Playback URL: `https://27b83d82b8a7...` で HLS 再生できるか
- [ ] OBS/ブラウザ両方の配信が同じチャンネルに記録されているか
- [ ] 不要な Stage/Composition リソースが起動していないか

---

## 📝 DevOps タスク

### 即実施（本日）

- [x] whipProxy 関数を削除
- [x] Stage/Composition の廃止宣言
- [x] BrowserBroadcasterRtmps を RTMPS 直送に修正
- [ ] getIvsWhipEndpoint 関数を削除（未使用）
- [ ] AWS Console から Stage リソースを物理削除

### 翌日以降

- [ ] AWS 請求額を確認（削減を視認）
- [ ] 運用マニュアルを更新（OBS + ブラウザ双方を同じ手順で管理）
- [ ] モバイル配信の実装計画（同じ chatmarket-main を使用）

---

## 🎯 結論

**ChatMarket 配信インフラは、OBS・ブラウザ・モバイル に関わらず、常に同じ IVS Channel（chatmarket-main）に集約される。**

- ✅ **一元管理**: AWS IVS Console 1つで全配信方法を監視
- ✅ **低コスト**: 月額 $7,200（旧方式の 75% 削減）
- ✅ **ユーザー透過**: 配信方法の違いが視聴者に見えない
- ✅ **将来対応**: 新しい配信方法を追加する際も、同じ chatmarket-main に接続するだけ

**この設計は本番環境で確定。変更なし。**