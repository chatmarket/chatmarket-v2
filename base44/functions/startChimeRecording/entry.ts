// @ts-nocheck
/**
 * startChimeRecording
 * Amazon Chime SDK Media Capture Pipeline を起動してS3に録画保存する
 *
 * ── コスト内訳（AWS公式 ap-northeast-1） ──────────────────────────
 *   WebRTC Attendees : $0.0017/分/人 × 2人 × 15分 = $0.051  ≒ ¥8
 *   Media Capture    : $0.0102/分    × 15分       = $0.153  ≒ ¥24  ← ★ここが追加コスト
 *   Concatenation    : $0.0102/分    × 15分       = $0.153  ≒ ¥24  (任意)
 *   S3ストレージ      : ~$0.025/GB/月 ≒ 15分で約50MB → ≒¥0.2
 *   ─────────────────────────────────────────────────────────────
 *   録画なし合計      : ¥8  / 15分
 *   録画あり合計      : ¥8 + ¥24 = ¥32 / 15分  (Concatenation省略時)
 *   録画+連結合計     : ¥8 + ¥24 + ¥24 = ¥56 / 15分
 *
 * ★ 「15分¥15以内」は録画なし構成のみ成立。録画を加えると¥32〜¥56。
 *    アーカイブ販売で補填する場合は別途課金設計が必要。
 * ──────────────────────────────────────────────────────────────────
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

async function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate    = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion  = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  return await hmacSha256(kService, 'aws4_request');
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Chime SDK Media Pipelines は us-east-1 エンドポイントのみ
async function chimeMediaRequest(method, path, body, accessKeyId, secretAccessKey) {
  const region  = 'us-east-1';
  const service = 'chime';
  const host    = 'media-pipelines-chime.us-east-1.amazonaws.com';
  const endpoint = `https://${host}${path}`;

  const now = new Date();
  const amzDate   = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);
  const bodyStr   = body ? JSON.stringify(body) : '';
  const payloadHash = await sha256(bodyStr);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders    = 'content-type;host;x-amz-date';
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope  = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign     = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256(canonicalRequest)].join('\n');
  const signingKey       = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature        = toHex(await hmacSha256(signingKey, stringToSign));
  const authHeader       = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      'Authorization': authHeader,
    },
    body: bodyStr || undefined,
  });

  const text = await response.text();
  if (!response.ok) throw new Error(`Chime Media API ${response.status}: ${text}`);
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId } = await req.json();
    if (!callId) return Response.json({ error: 'Missing callId' }, { status: 400 });

    const calls = await base44.entities.VideoCall.filter({ id: callId });
    const call  = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });
    if (!call.chime_meeting_id) return Response.json({ error: 'Meeting not started' }, { status: 400 });

    // 通話参加者のみ録画開始可
    if (call.caller_email !== user.email && call.callee_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessKeyId     = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const bucketName      = Deno.env.get('S3_BUCKET_VOD') || 'chat-market-vod';
    const awsRegion       = Deno.env.get('AWS_REGION') || 'ap-northeast-1';

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    // S3保存先プレフィックス
    const s3Prefix = `recordings/${callId}/`;

    // Media Capture Pipeline 作成
    // ドキュメント: https://docs.aws.amazon.com/chime-sdk/latest/APIReference/API_media-pipelines-chime_CreateMediaCapturePipeline.html
    const pipeline = await chimeMediaRequest(
      'POST',
      '/sdk-media-capture-pipelines',
      {
        SourceType: 'ChimeSdkMeeting',
        SourceArn: `arn:aws:chime::${Deno.env.get('AWS_ACCOUNT_ID') || ''}:meeting:${call.chime_meeting_id}`,
        SinkType: 'S3Bucket',
        SinkArn: `arn:aws:s3:::${bucketName}`,
        ClientRequestToken: `rec-${callId}-${Date.now()}`,
        ChimeSdkMeetingConfiguration: {
          ArtifactsConfiguration: {
            Audio: { MuxType: 'AudioWithCompositedVideo' },
            Video: { State: 'Enabled', MuxType: 'VideoOnly' },
            Content: { State: 'Disabled' },
            CompositedVideo: {
              Layout: 'GridView',
              Resolution: 'FHD',
              GridViewConfiguration: {
                ContentShareLayout: 'ActiveSpeakerOnly',
              },
            },
          },
        },
      },
      accessKeyId,
      secretAccessKey
    );

    const pipelineId  = pipeline.MediaCapturePipeline?.MediaPipelineId;
    const s3Key       = `${s3Prefix}composited.mp4`;
    const cloudFrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN') || '';
    const recordingUrl = cloudFrontDomain ? `https://${cloudFrontDomain}/${s3Key}` : '';

    // VideoCallレコードに録画情報を保存
    await base44.entities.VideoCall.update(callId, {
      recording_status: 'processing',
      recording_s3_key: s3Key,
      recording_url:    recordingUrl,
    });

    console.log(`[Recording] Pipeline started: ${pipelineId} for call ${callId}`);
    return Response.json({
      success:     true,
      pipeline_id: pipelineId,
      s3_key:      s3Key,
    });

  } catch (error) {
    console.error('[Recording] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});