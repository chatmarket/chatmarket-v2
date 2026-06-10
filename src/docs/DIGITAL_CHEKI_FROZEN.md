# デジタルチェキ機能 — 凍結ステータス記録

## ステータス: 凍結中（公開導線から非表示）

最終更新: 2026-06-10

---

## 概要

デジタルチェキ（2ショットチェキ含む）機能は、アイドルカテゴリ向けに本実装に近い状態でコードが存在しています。
ただし、購入・納品・閲覧フローが未完成のため、現在は公開導線から非表示にしています。

---

## 存在するコード（削除していない）

| ファイル | 内容 |
|---|---|
| `pages/ChekiCaptureEditor` | チェキ編集エディター（現在は準備中画面を表示） |
| `components/cheki/ChekiCallEndBanner` | 通話終了後バナー（非表示中） |
| `components/cheki/ChekiSettingsPanel` | クリエイター向け商品管理（非表示中） |
| `components/cheki/ChekiPurchaseModal` | ファン向け購入モーダル（非表示中） |
| `hooks/useChekiCapture.js` | 通話終了後エディター遷移フック（使用停止中） |
| `entities/DigitalCheki.json` | チェキ商品エンティティ（削除しない） |
| `entities/DigitalChekiPurchase.json` | 購入記録エンティティ（削除しない） |

---

## 非表示にした導線

1. **MyChannel（チャンネル管理）** — 「チェキ販売」タブを非表示
2. **ChannelPage（チャンネルページ）** — チェキタブ・購入ボタン・ChekiPurchaseModal を非表示
3. **VideoCallPage（通話ページ）** — 通話終了後の ChekiCallEndBanner 表示を停止
4. **/cheki-editor ルート** — 直接アクセス時「準備中」画面を表示（B案相当）

---

## 未実装の部分（将来対応が必要）

1. **`createChekiCheckout` バックエンド関数** — 未実装。ChekiPurchaseModal が呼び出しているが存在しない
2. **MyPurchases の DigitalChekiPurchase 表示** — ProductOrder のみ対象。チェキ購入履歴は未表示
3. **通話後チェキの自動遷移フロー** — useChekiCapture.js は存在するが使用停止中

---

## 将来再開する場合の作業リスト

- [ ] `createChekiCheckout` バックエンド関数を実装（Stripe Checkout + DigitalChekiPurchase 作成）
- [ ] チェキWebhookで `DigitalChekiPurchase.status` を `completed` に更新する処理
- [ ] `MyPurchases` に DigitalChekiPurchase の購入履歴表示を追加
- [ ] 返金フロー設計（Stripe refund + DigitalChekiPurchase status 管理）
- [ ] 権利管理設計（転売防止・ダウンロード制限・有効期限）
- [ ] ChekiSettingsPanel / ChekiPurchaseModal / ChekiCallEndBanner の再公開
- [ ] `useChekiCapture.js` による `/cheki-editor` 自動遷移の再有効化
- [ ] MyChannel の「チェキ販売」タブ再表示
- [ ] ChannelPage のチェキタブ・購入ボタン再表示

---

## 変更していないもの

- Stripe 決済全般
- エールコイン
- 1対1通話機能（VideoCall 本体）
- DB エンティティ定義
- AWS / S3 設定
- 収益還元率ロジック
- 占い師LP / 家庭教師LP / ClassRoom