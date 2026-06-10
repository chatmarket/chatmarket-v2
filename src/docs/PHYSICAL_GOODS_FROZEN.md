# 物理グッズ販売 凍結記録

## 状態
**現在非公開（将来対応候補）**

凍結日: 2026-06-10

---

## 凍結理由

以下の運用負荷・リスクを避けるため、物理グッズ販売（`Product.is_digital === false`）を
ユーザー向け公開導線から一時非表示にしています。

- 住所・電話番号などの配送先個人情報の収集・管理
- 発送対応・在庫管理の運用コスト
- 未発送トラブル・返品対応リスク
- 個人情報漏洩リスクの最小化

---

## 現在公開している商品タイプ

| タイプ | `is_digital` | `delivery_mode` | 説明 |
|---|---|---|---|
| デジタル即時配信 | `true` | `instant` | PDF・音声・資料など事前アップ済みファイルを購入即時DL |
| オーダーメイド納品 | `true` | `custom_order` | 注文後に販売者が個別作成・手動納品（鑑定書・教材等） |

---

## 非公開にしている商品タイプ

| タイプ | `is_digital` | 状態 |
|---|---|---|
| 物理グッズ | `false` | **現在非公開**（将来対応候補） |

---

## 凍結している箇所

| ファイル | 変更内容 |
|---|---|
| `components/shop/ProductCard` | `is_digital === false` の場合 `null` を返す |
| `components/shop/ProductPurchaseModal` | `is_digital === false` の場合 `null` を返す |
| `components/shop/ProductManagePanel` | `is_digital` を `true` 固定、「デジタルコンテンツ販売」に文言変更 |
| `functions/createProductCheckout` | `is_digital === false` のリクエストを 400 エラーで拒否 |
| `pages/MyPurchases` | 物理グッズ注文一覧セクションをコメントアウト |

---

## 将来対応時の復元手順

1. 上記各ファイルのコメント / 早期returnを削除
2. `ProductManagePanel` の `EMPTY_FORM.is_digital` を `false` に戻す
3. `createProductCheckout` の is_digital ガードを削除
4. MyPurchases の物理グッズセクションのコメントアウトを解除
5. 個人情報取り扱い方針・特定商取引法表記の更新
6. 発送フロー・返品ポリシーの整備

---

## 変更していないもの

- `Product` / `ProductOrder` エンティティ定義
- Stripe 設定・Webhook 署名検証
- デジタル商品決済フロー
- オーダーメイド納品フロー
- ダウンロードURL発行ロジック（`getProductDownloadUrl`）
- DB・AWS・エールコイン設定