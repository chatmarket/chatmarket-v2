# 🚀 本番環境デプロイメント・チェックリスト

## デバッグモードの確認
- ✅ **本番では debug パラメータなし**: `https://live-chat-market.com/go-live` ← デバッグ非表示
- ✅ **管理者用デバッグURL**: `https://live-chat-market.com/go-live?debug=true` ← デバッグ情報表示
- ✅ **エラーメッセージは「ブランド保護文言」** : ユーザーには親切に、会社のイメージを損なわない

---

## 緊急時のロールバック手順

### 1秒で前のバージョンに戻す
```bash
# 現在のコミット確認
git log --oneline -5

# 直前の安定版コミットに戻す（ローカル）
git revert HEAD --no-edit

# デプロイ
npm run deploy
```

### Git コミット履歴の管理
- **毎回デプロイ前**: `git commit -m "🚀 prod: [機能説明]"` で記録
- **失敗時**: `git revert [commit-hash]` で直前版に戻す
- **緊急ホットフィックス**: 新しいブランチで修正 → デプロイ

---

## ブラウザ配信（BrowserBroadcaster）の本番チェック

### ローディング画面
- ✅ 3秒後に自動的に消える（強制OFF）
- ✅ マイク音が拾えたら即座にローディング解除
- ✅ 映像要素は常に DOM に存在（削除されない）

### エラー発生時
- ✅ デバッグ情報は **debug=true のみ** 表示
- ✅ ユーザーには「配信環境を準備中」と優しく案内
- ✅ OBS配信への誘導ボタンを用意

### デバイス周り
- ✅ video タグ属性：autoPlay, muted, playsInline, id="browser-broadcaster-video"
- ✅ CSS 直書き：width/height 100%, objectFit cover, opacity 1, zIndex 10
- ✅ srcObject 直接代入 + loadedmetadata で play() を明示実行

---

## 本番環境の監視ポイント

### コンソールログで確認すべき項目
```
[BrowserBroadcaster] ✅ Stream INJECTED with MAXED-OUT attributes
[BrowserBroadcaster] 📹 Metadata loaded, playing...
[BrowserBroadcaster] ✅ WHIP connection established successfully
```

### もし問題が発生したら
1. **ユーザーに**: 「配信環境を準備中です。お急ぎの方は OBS 配信をご利用ください」
2. **管理者に**: `?debug=true` で詳細ログを確認
3. **開発チームに**: Git コミットで直前の安定版に即座にロールバック

---

## 社長向けメッセージ

> 💯 **これで 100 万人の見守る舞台に立つ準備ができた**
>
> ✅ デバッグ情報は本番では隠れている  
> ✅ エラーもブランドを守る文言で返す  
> ✅ 1 秒で前のバージョンに戻せる仕組みがある  
> ✅ ユーザーはストレスなく OBS 配信へ誘導できる  
>
> **本番テストを完璧に完走すれば、社長は胸を張って『100 万人の未来』を語られます。**

---

## デプロイ後の確認

### チェックリスト
- [ ] 本番環境にデプロイ完了
- [ ] debug パラメータなしで通常ユーザーと同じ見た目を確認
- [ ] debug=true で管理者向けデバッグ情報を確認
- [ ] エラーメッセージがブランド保護文言で表示されるか確認
- [ ] OBS 配信誘導ボタンが動作するか確認
- [ ] Git コミット履歴が最新状態か確認

---

**「社長の心配を力に変えろ。本番は、完璧に。」**