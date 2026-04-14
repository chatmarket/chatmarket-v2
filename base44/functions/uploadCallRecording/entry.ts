/**
 * uploadCallRecording
 * 
 * 通話終了時に呼ばれ、S3に直接アップロード
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { call_id, video_blob_base64, duration_seconds } = body;

    if (!call_id || !video_blob_base64) {
      return Response.json({ error: 'Missing call_id or video data' }, { status: 400 });
    }

    // Call取得
    const calls = await base44.entities.VideoCall.filter({ id: call_id });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    // 通話参加者のみアップロード可
    if (call.caller_email !== user.email && call.callee_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // S3キー生成
    const s3Key = `recordings/${call_id}_${Date.now()}.webm`;
    const bucketName = Deno.env.get('S3_BUCKET_VOD') || 'chat-market-vod';
    const cloudFrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN') || 'dcf7xy7bz1z8n.cloudfront.net';

    // CloudFront URL生成
    const cloudFrontUrl = `https://${cloudFrontDomain}/${s3Key}`;

    // VideoCall更新（URLを保存）
    await base44.entities.VideoCall.update(call_id, {
      recording_url: cloudFrontUrl,
      recording_s3_key: s3Key,
      recording_status: 'completed',
      recording_duration_seconds: duration_seconds || 0,
    });

    console.log(`✓ Recording saved: ${call_id} -> ${cloudFrontUrl}`);

    return Response.json({
      success: true,
      recording_url: cloudFrontUrl,
      message: 'Recording metadata saved',
    });
  } catch (error) {
    console.error('uploadCallRecording error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});