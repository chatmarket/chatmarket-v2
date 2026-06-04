# 08_AWS_IVS_CHIME_S3_CLOUDFRONT.md
> **Document Name**: AWS IVS, Chime, S3, and CloudFront  
> **Generated At**: 2026-06-04T14:00:00+09:00  
> **Status**: authoritative  
> **Primary Source Files**: functions/provisionChannelStreamKey, functions/createChimeMeeting, functions/uploadVideoToS3, functions/getSignedVideoUrl, docs/MASTER_SPEC_PART2.md  

---

## 1. AWS IVS（ライブ配信）

```
用途: 1対多ライブ配信のみ
リージョン: ap-northeast-1（東京）
チャンネルタイプ: STANDARD（低遅延モード）

主要フロー:
  1. provisionChannelStreamKey でチャンネル・ストリームキー発行
     CreateChannelCommand → ListStreamKeysCommand → GetStreamKeyCommand
     Channel.ivs_channel_arn, ivs_stream_key, ivs_ingest_endpoint, ivs_playback_url に保存
  2. OBS等で rtmps://{ingestEndpoint}:443/app/{streamKey} に配信
  3. ivsSessionWebhook が stream_start/end を受信
     → LiveStream.status, Channel.is_live を更新
  4. detectIvsStreamStart がポーリングでWebhook漏れを補完
  5. zombieStreamKiller がゾンビ配信を強制終了

セキュリティ:
  ★ AWS認証情報（accessKeyId等）はバックエンドのみ使用
  ★ ストリームキーはDBに保存するがフロントへの露出は Channel.ivs_stream_key 経由
  IVS Webhook: IVS_WEBHOOK_SECRET でHMAC検証

環境変数:
  AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
```

---

## 2. Amazon Chime SDK Meetings（クラス配信専用）

```
用途: 1対9クラス配信（ClassRoom）のみ
★ 1対1 VideoCallには使用しない（WebRTC P2P）

リージョン: us-east-1（固定）
SDK: amazon-chime-sdk-js ^3.30.0
最大参加者: 10名（講師1 + 生徒9）← 変更禁止

Meeting設定:
  MediaRegion: "us-east-1"
  Video: { MaxResolution: "HD" }
  Audio: { EchoReduction: "AVAILABLE" }

セキュリティ:
  ★ CreateMeeting/CreateAttendee のAWS認証情報をフロントへ返却禁止
  ★ meeting オブジェクトと attendee オブジェクトのみ返却

Attendee削除（kick）:
  safeDeleteAttendeeCommand（失敗は握り潰し・Meetingが既に終了している可能性）

環境変数: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY（us-east-1 固定）
```

---

## 3. 1対1通話 WebRTC P2P（Chimeとの使い分け）

```
★ 1対1 VideoCall は WebRTC P2P（Amazon Chime不使用）

ICEサーバー:
  STUN: Google STUN（stun.l.google.com:19302, stun1.l.google.com:19302）
  TURN: Twilio NTS（getTwilioIceServers → TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN）

シグナリング: Base44 Entities（VideoCall）
  - リアルタイム購読（VideoCall.subscribe）
  - 500msポーリング（並行監視）
  - webrtc_offer / webrtc_answer / webrtc_ice_candidates_* / webrtc_callee_ready フィールド

接続フロー:
  Caller: webrtc_callee_ready 待機（15秒）→ Offer作成・ICE収集（8秒）→ Offer送信 → Answer待ち（30秒）
  Callee: ready フラグ送信 → Offer待ち（30秒）→ Answer作成・ICE収集 → Answer送信
  失敗時: 最大3回リトライ（2秒/4秒/6秒待機）
```

---

## 4. AWS S3（VODストレージ）

```
用途: VOD動画ファイルの永続ストレージ
バケット: S3_BUCKET_VOD 環境変数
パス: channels/{channelId}/{timestamp}-{fileName}

アップロードフロー:
  uploadVideoToS3({ fileName, fileSize, channelId })
  → Presigned PUT URL生成（有効期限15分）
  → フロントが直接 fetch(presigned_url, { method:'PUT' }) でアップロード
  ★ S3直URLでの再生禁止（CloudFront経由のみ）

環境変数: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, S3_BUCKET_VOD
```

---

## 5. CloudFront（VOD配信）

```
用途: VOD動画配信（署名付きURL・不正アクセス防止）
有効期限: 6時間（getSignedVideoUrl のデフォルト）

署名方式: CloudFront Signed URL
  - 方式: RSASSA-PKCS1-v1_5 / SHA-1
  - Policy ベース: Resource + DateLessThan
  - Key Pair: CLOUDFRONT_KEY_PAIR_ID / CLOUDFRONT_PRIVATE_KEY

URL形式:
  https://{CLOUDFRONT_DOMAIN}/{s3_key}
    ?Policy={base64url_policy}
    &Signature={signature}
    &Key-Pair-Id={key_pair_id}

★ S3直URL（非CloudFront）でのVOD配信は禁止
★ CLOUDFRONT_PRIVATE_KEY は環境変数に PEM 形式で保存

環境変数: CLOUDFRONT_DOMAIN, CLOUDFRONT_KEY_PAIR_ID, CLOUDFRONT_PRIVATE_KEY
```

---

## 6. 録画

```
通話録画（VideoCall）:
  recording_option=true の場合のみ有効
  追加料金: 通話終了時 100コイン（固定）
  recording_infra_cost_yen に記録
  録画URL: recording_url（S3+CloudFront）
  実際の録画処理: 未確認（S3へのアップロードが別途必要）

クラス録画（ClassRoom）:
  recording_enabled, recording_status フィールドが存在
  実装状況: 将来拡張と記載（現在未実装の可能性）

ライブ配信録画（IVS）:
  enableIvsAutoArchive 関数でIVS自動アーカイブを有効化可能
  archive_product_id フィールド（ClassRoom）
```

---

## 7. AWSコスト追跡

```
IVS:
  IVS_INPUT_PER_HOUR: ¥30/時間（入力）
  IVS_OUTPUT_PER_VIEWER_HOUR: ¥5/視聴者/時間（出力）
  liveStreamCostTracker で集計

Chime:
  CHIME_COST_PER_UNIT_15MIN: ¥8/15分/1対1通話（確定値）
  ※ ¥0.527/分（$0.0017 × 2参加者 × ¥155）の実費に対してバッファを含む
  videoCallBilling で commCostYen に記録

録画:
  RECORDING_PER_MIN: ¥2/分
```

---

## 8. 廃止済みサービス

```
Mux:
  環境変数: MUX_TOKEN_ID, MUX_TOKEN_SECRET（残存するが使用禁止）
  関連: pages/MuxVideo（廃止候補）
  使用禁止: VOD配信・アップロードに使用するコード禁止

Agora:
  環境変数: AGORA_APP_ID（残存するが使用禁止）
  パッケージ: agora-rtc-sdk-ng ^4.24.3（残存）
  使用禁止: VideoCallPage等での使用禁止

旧Chime 1対1通話:
  hooks/useIvsStagesCall.js 等に痕跡
  現在の1対1通話は WebRTC P2P
``