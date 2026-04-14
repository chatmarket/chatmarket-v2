# S3ライフサイクル設定ガイド

## 概要
通話録画アーカイブを安価に長期保管するため、以下のライフサイクルルールを設定してください。

## 要件
- **OAC設定**: CloudFront Origin Access Control (OAC) で直接S3アクセスを禁止
- **署名付きURL**: 全アクセスは有効期限付きCloudFront署名URLのみ
- **ライフサイクル**: 低頻度アクセス → Glacier（深い冷却） → 削除

---

## S3ライフサイクルポリシー設定

### AWS Management Console での設定方法

1. **S3バケット選択** → 「管理」タブ → 「ライフサイクルルール」
2. 以下のルールを追加

### JSON ポリシー（推奨）

```json
{
  "Rules": [
    {
      "Id": "archive-to-glacier-after-30days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "recordings/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ],
      "Expiration": {
        "Days": 2555
      }
    },
    {
      "Id": "delete-incomplete-multipart-uploads",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "recordings/"
      },
      "AbortIncompleteMultipartUpload": {
        "DaysAfterInitiation": 7
      }
    }
  ]
}
```

### 料金シミュレーション（月額）

| 保管期間 | ストレージ | コスト/GB | 推定月額（1TB） |
|---------|---------|---------|-------------|
| 0-30日（Standard） | ホットデータ | $0.023 | $23 |
| 30-90日（Standard-IA） | ウォームデータ | $0.0125 | $12.50 |
| 90-365日（Glacier） | コールドデータ | $0.004 | $4 |
| 365日以上（Deep Archive） | ディープコールド | $0.00099 | $0.99 |

**合計**: 1年で約1TBなら月平均 **~$5-8/TB**（通常S3の 約 70% 削減）

---

## 設定詳細

### 1. 30日以降 → Standard-IA への移行
```
- 用途: 月1-2回アクセスされるアーカイブ
- コスト削減: 約 46%
- アクセス時の取出料金: GB単価 + リクエスト料
```

### 2. 90日以降 → Glacier への移行
```
- 用途: 年1-2回のみアクセス（コンプライアンス保管）
- コスト削減: 約 82%
- 取出時間: 1-5分（Expedited）から 3-5時間（Bulk）
```

### 3. 365日以降 → Deep Archive への移行
```
- 用途: 7年保管義務（金融・医療業界）
- コスト削減: 約 95%
- 取出時間: 12時間（Bulk）
```

### 4. 古いアップロード失敗の自動削除
```
- AbortIncompleteMultipartUpload: 7日以内の未完了マルチパートアップロードを削除
- ストレージ浪費を防止
```

---

## CloudFront OAC 設定（必須）

### Origin Access Control (OAC) 作成

1. **CloudFront コンソール** → 「Policies」→ 「Origin access control」
2. 新規作成：
   ```
   - 名前: s3-recordings-oac
   - Origin type: S3
   - Signing behavior: Always (for all requests)
   ```

3. **S3 バケットポリシー**に OAC を含める：
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "CloudFrontOAC",
         "Effect": "Allow",
         "Principal": {
           "Service": "cloudfront.amazonaws.com"
         },
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::chat-market-vod/recordings/*",
         "Condition": {
           "StringEquals": {
             "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
           }
         }
       }
     ]
   }
   ```

### S3 バケットをパブリックアクセスブロック

```
- Block public ACLs: ✓
- Ignore public ACLs: ✓
- Block public bucket policies: ✓
- Restrict public bucket access: ✓
```

---

## 署名付きURL 実装（Base44）

### 1. CloudFront キーペア作成（AWS Account Root Only）
```bash
# AWS マネジメントコンソール → Account > Security Credentials
# CloudFront Key Pairs セクション
# → Create a Key Pair を実行
```

### 2. Base44 環境変数設定
```
CLOUDFRONT_KEY_PAIR_ID=APKA...
CLOUDFRONT_PRIVATE_KEY=-----BEGIN RSA PRIVATE KEY-----\n...
CLOUDFRONT_DOMAIN=dcf7xy7bz1z8n.cloudfront.net
```

### 3. 署名URL生成関数呼び出し
```javascript
const res = await base44.functions.invoke('generateSignedCloudFrontUrl', {
  s3_key: 'recordings/call-123_1234567890.webm',
  call_id: 'call-123',
  expires_in_seconds: 86400, // 24時間
});

const signedUrl = res.data.signed_url;
// → https://dcf7xy7bz1z8n.cloudfront.net/recordings/...?Policy=...&Signature=...
```

---

## 監視 & アラート

### CloudWatch メトリクス設定
```
- S3 Storage Bytes by Storage Class
- Glacier/Deep Archive への移行量を監視
- 月額コスト推移
```

### AWS Budgets アラート
```
- 月額コスト予算: $10/TB を超えたら通知
- アノマリ検知: 前月比 +20% で警告
```

---

## トラブルシューティング

### Q: 署名URLでアクセスできない
A: 
- OAC が CloudFront に設定されているか確認
- S3 バケットポリシーで OAC を許可しているか確認
- CloudFront キーペアの有効期限確認

### Q: Glacier から復元に時間がかかる
A:
- Bulk 取出（最大12時間）を選択している可能性
- 急ぎなら Expedited（最大1時間）オプション有料

### Q: ライフサイクルが動作していない
A:
- ルールのフィルター（Prefix）を確認
- 最大 `24-48時間` のタイムラグあり

---

## 参考リンク
- [AWS S3 Lifecycle Policies](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
- [CloudFront Origin Access Control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html)
- [CloudFront Signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/PrivateContent.html)