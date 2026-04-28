/**
 * ██████████████████████████████████████████████████████
 * ██  FROZEN — DO NOT MODIFY                          ██
 * ██  S3 + CloudFront 動画アップロード関数（凍結済み）  ██
 * ██  再生URLは必ず CloudFront ドメインを使用する。    ██
 * ██  S3直URL配信は絶対禁止（転送料垂れ流し防止）。    ██
 * ██████████████████████████████████████████████████████
 *
 * uploadVideoToS3
 *
 * S3 Presigned PUT URL を生成してフロントエンドに返す。
 * フロントは直接 S3 に PUT し、完了後に CloudFront URL を使って再生する。
 * S3直URLは絶対に返さない — playback_url は常に CloudFront ドメイン。
 *
 * 必要な環境変数:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *   S3_BUCKET_VOD       ← 動画保存バケット名
 *   CLOUDFRONT_DOMAIN   ← CloudFront ドメイン（例: d1234.cloudfront.net）
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3@3.810.0';
import { getSignedUrl } from 'npm:@aws-sdk/s3-request-presigner@3.810.0';

const s3 = new S3Client({
  region: Deno.env.get('AWS_REGION') || 'ap-northeast-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

const BUCKET = Deno.env.get('S3_BUCKET_VOD');
const CF_DOMAIN = Deno.env.get('CLOUDFRONT_DOMAIN');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename, content_type, channel_id } = await req.json();

    if (!filename || !content_type) {
      return Response.json({ error: 'filename and content_type are required' }, { status: 400 });
    }

    if (!BUCKET) {
      return Response.json({ error: 'S3_BUCKET_VOD not configured' }, { status: 500 });
    }

    // S3 キー: channels/{channel_id}/{timestamp}-{filename}
    const timestamp = Date.now();
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const s3Key = channel_id
      ? `channels/${channel_id}/${timestamp}-${safeFilename}`
      : `uploads/${user.email}/${timestamp}-${safeFilename}`;

    // Presigned PUT URL 生成（15分有効）
    const putCommand = new PutObjectCommand({
      Bucket: BUCKET,
      Key: s3Key,
      ContentType: content_type,
    });

    const presignedUrl = await getSignedUrl(s3, putCommand, { expiresIn: 900 });

    // CloudFront 経由の再生 URL（S3直URLは絶対に使わない）
    if (!CF_DOMAIN) {
      return Response.json({ error: 'CLOUDFRONT_DOMAIN not configured — S3 direct URL is forbidden' }, { status: 500 });
    }
    const cfDomain = CF_DOMAIN.startsWith('https://') ? CF_DOMAIN : `https://${CF_DOMAIN}`;
    const playback_url = `${cfDomain}/${s3Key}`;

    console.log('[uploadVideoToS3] ✅ Presigned URL generated for:', s3Key);

    return Response.json({
      presigned_url: presignedUrl,
      s3_key: s3Key,
      playback_url,
    });
  } catch (error) {
    console.error('[uploadVideoToS3] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});