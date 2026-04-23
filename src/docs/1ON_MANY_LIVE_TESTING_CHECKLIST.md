# 1対多ライブ配信テスト完全チェックリスト

**テスト日程：** 夜間（複数端末で負荷テスト）  
**プラットフォーム：** ChatMarket  
**バージョン：** MVP（ベータ版）

---

## ✅ 3つの重要チェックポイント

### 1️⃣ 視聴者側の『受信専用ロール』徹底確認

#### 期待される動作
- 視聴者が入室したとき、マイク・カメラが **自動的に無効化** される
- ChimeのCapabilities設定が正しく適用されている

#### テスト方法
```bash
# 配信テストページで、視聴者ロール選択後に以下をコンソール確認
# [Chime] Attendee created: role=viewer, capabilities=Receiver-Only, attendeeId=...
```

#### チェックリスト
- [ ] **配信者側** の `createLiveStreamChimeMeeting` で Broadcaster ロール確認
  - 期待: `capabilities=Broadcaster` （双方向）
- [ ] **視聴者側** が Viewer ロール選択後、コンソールログで確認
  - 期待: `capabilities=Receiver-Only` （受信のみ）
- [ ] 視聴者が複数入室しても、**マイク・カメラから音声/映像が漏れない**
  - テスト: マイク/カメラ権限をONにしても、配信者側で検知されていない

#### トラブル対応
| 問題 | 原因 | 対応 |
|------|------|------|
| 視聴者のマイクが配信に乗っている | Capabilities が正しく設定されていない | `createLiveStreamChimeMeeting` で Viewer → `Audio: 'None', Video: 'None'` を確認 |
| 複数視聴者で音声重複 | ロール設定忘れ | 配信ページで Viewer ロールに統一確認 |

---

### 2️⃣ 視聴者側のバインド処理（映像表示）の精度確認

#### 期待される動作
- 視聴者が配信ページに入った直後、配信者の映像が **自動的に検知**
- `<video>` タグに Chime ミーティングがバインド
- **1対1通話と同じ精度** で映像が表示される

#### テスト方法
```javascript
// ブラウザコンソールで確認
[ViewerStream] ✅ Chime session created: {
  meetingId: "m-xxxxx",
  attendeeId: "a-xxxxx"
}
[ViewerStream] 🎯 Searching for broadcaster tile...
```

#### チェックリスト
- [ ] 複数端末（3台以上）から同時入室
  - [ ] 端末A（配信者）のプレビュー映像が表示される
  - [ ] 端末B～D（視聴者）が **5秒以内** に映像を受信
- [ ] 映像ラグ測定
  - [ ] 配信者が手をかざすと → 視聴者に遅延 **2～3秒** で表示
  - [ ] SD/HD/FHD全画質でバインド確認
- [ ] 弱い通信環境（3G/4G）のテスト
  - [ ] 自動フォールバック（解像度低下）が機能
  - [ ] 再接続時のバインド再実行

#### トラブル対応
| 問題 | 原因 | 対応 |
|------|------|------|
| 視聴者に配信者の映像が映らない | Attendee マネージャーで入室記録失敗 | コンソールで `liveStreamAttendeeManager action=join` ログ確認 |
| 長時間（30分以上）で映像が黒くなる | タイル識別ロジックのタイムアウト | `chimeSessionRef.current` が null に なってないか確認 |
| 複数視聴者で同時表示できない | Chime Meeting タイル管理の競合 | 各視聴者に独立した Attendee ID があるか確認 |

---

### 3️⃣ エール・スーパーチャット欄のリアルタイム更新確認

#### 期待される動作
- チャットパネルが **3秒間隔** でリアルタイム同期
- エールコイン送信 → 全端末に **即座に反映**
- Socket.ioが正しく接続している

#### テスト方法
```bash
# 配信者がエールコイン送信後、視聴者側のコンソール確認
[ChatPanel] 🎯 SuperChat sync: 5 items fetched (interval: 3s)
[ChatPanel] 💰 SuperChat burst: ¥1000 from User123
```

#### チェックリスト
- [ ] **エール送信の疎通確認**
  - [ ] 端末A（視聴者）がエールコイン送信
  - [ ] 端末B（他の視聴者）のチャット欄に **即座に** バースト演出が表示
  - [ ] 端末C（配信者）も同様に確認
- [ ] 複数エール同時送信テスト
  - [ ] 3台の視聴者から同時にエール送信
  - [ ] すべての端末で **順序が保持** されているか確認
- [ ] 遅延測定
  - [ ] エール送信 → 画面反映まで **3～5秒以内**
  - [ ] 複数入室時の遅延増加をモニタリング

#### トラブル対応
| 問題 | 原因 | 対応 |
|------|------|------|
| エールが表示されない | Socket.io接続失敗 | ブラウザ DevTools → Network → WS タブで接続確認 |
| 5秒以上遅延 | refetchInterval が長すぎる | ChatPanel の `refetchInterval: 3000` が設定されているか確認 |
| 重複表示 | latestSuperChatId の重複 | useEffect 依存配列に `latestSuperChatId` が含まれているか確認 |

---

## 🧪 本番テスト実施スケジュール

### Phase 1: 単一配信者 + 複数視聴者（5～10台）
**所要時間:** 30分  
**測定項目:**
- [ ] Attendee 入退室の正確さ
- [ ] 映像ラグ（リアルタイム性）
- [ ] チャット遅延

### Phase 2: ストレステスト（50～100視聴者をシミュレート）
**所要時間:** 30分  
**測定項目:**
- [ ] AWS Chime 同時接続数の耐久性
- [ ] メモリ使用率（フロントエンド）
- [ ] データベース ポーリング遅延

### Phase 3: 配信終了＆精算フロー
**所要時間:** 15分  
**測定項目:**
- [ ] auto_stopped フラグが正しく記録される
- [ ] 視聴者数リセット（viewer_attendee_ids のクリア）
- [ ] 収益計算の正確さ

---

## 📊 ログ出力ガイド

### フロント側の重要ログ
```javascript
// [Chime] で始まるログ → ChimeVideoCall コンポーネント
[Chime] ✓ Local video bound to tileId: 1
[Chime] ✓ Remote video bound to tileId: 2

// [ViewerStream] で始まるログ → 視聴者側の映像バインド
[ViewerStream] ✅ Chime session created
[ViewerStream] 🎯 Searching for broadcaster tile...

// [ChatPanel] で始まるログ → リアルタイムチャット
[ChatPanel] 🎯 SuperChat sync: N items fetched
[ChatPanel] 💰 SuperChat burst: ¥XXXX from Username
```

### バック側の重要ログ
```javascript
// [createLiveStreamChimeMeeting] で始まるログ
[Chime] Attendee created: role=viewer, capabilities=Receiver-Only

// [liveStreamAttendeeManager] で始まるログ
[LiveStreamAttendee] Viewer joined: user@example.com, total: 5
[LiveStreamAttendee] Viewer left: attendee-id-xxx, active: 4
```

---

## 🎯 テスト終了時の確認項目

- [ ] すべての視聴者が正常に退室
- [ ] `zero_viewer_since` タイムスタンプが記録されている
- [ ] `viewer_attendee_ids` が完全にクリアされている
- [ ] 配信のステータスが `ended` に更新されている
- [ ] 収益レポート（エール集計）に誤りがない

---

## 🚨 トラブルシューティング早見表

| 症状 | 確認項目 | コマンド |
|------|---------|---------|
| 映像が表示されない | Attendee が正しく作成されている | F12 Console: `[ViewerStream] ✅ Chime session created` 確認 |
| エールが反映されない | SuperChat が DB に保存されている | DevTools: Network → XHR でリクエスト成功確認 |
| 視聴者数が増えない | liveStreamAttendeeManager が呼ばれている | コンソール: `[LiveStreamAttendee] Viewer joined` ログ確認 |
| ブラウザクラッシュ | メモリリーク（Chime SDK） | Chrome DevTools: Memory タブで確認、garbage collection 手動実行 |

---

## 📝 テスト結果記録テンプレート

```markdown
## 日時: YYYY-MM-DD HH:MM

### 参加者
- 配信者: N台
- 視聴者: N台
- 総接続数: N

### 結果サマリー
| チェック項目 | 状態 | 備考 |
|-----------|------|------|
| 受信専用ロール | ✅/❌ | コンソールログで確認 |
| 映像バインド精度 | ✅/❌ | ラグ: XX秒 |
| チャット同期 | ✅/❌ | 遅延: XX秒 |

### 問題検出
- [ ] 問題1: 詳細
- [ ] 問題2: 詳細

### 改善案
- 案1: 詳細
- 案2: 詳細
```

---

**準備完了！夜間テストを安全に実施してください。🚀**