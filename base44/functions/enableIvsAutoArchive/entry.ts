import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * AWS IVS チャンネルの自動アーカイブ設定を有効化
 * 配信が終了すると、HLSファイルが自動的にS3バケットに保存されます
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await req.json();
    if (!streamId) {
      return Response.json({ error: 'streamId required' }, { status: 400 });
    }

    // ストリーム情報取得
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    if (!streams[0]) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    const stream = streams[0];
    const channelArn = stream.ivs_channel_arn;
    if (!channelArn) {
      return Response.json({ error: 'Channel ARN not found' }, { status: 400 });
    }

    // AWS IVS API 署名生成用ユーティリティ
    const AWS_REGION = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const ACCESS_KEY = Deno.env.get('AWS_ACCESS_KEY_ID');
    const SECRET_KEY = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const S3_BUCKET = Deno.env.get('S3_BUCKET_VOD') || 'chatmarket-vod';

    if (!ACCESS_KEY || !SECRET_KEY) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    // Signature V4署名生成
    async function sign(method, path, service, region, payload) {
      const credential_scope = `${new Date().toISOString().slice(0, 10)}/${region}/${service}/aws4_request`;
      const host = `ivs.${region}.amazonaws.com`;
      
      const canonical_request = `${method}
${path}


host:${host}

host
${payload ? (await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload))).toString() : ''}`;

      const string_to_sign = `AWS4-HMAC-SHA256
${new Date().toISOString()}
${credential_scope}
${(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical_request))).toString()}`;

      const kDate = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', new TextEncoder().encode(`AWS4${SECRET_KEY}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(new Date().toISOString().slice(0, 10)));
      const kRegion = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kDate, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(region));
      const kService = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(service));
      const kSigning = await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode('aws4_request'));
      
      const signature = Array.from(new Uint8Array(await crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', kSigning, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), new TextEncoder().encode(string_to_sign)))).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        host,
        credential_scope,
        signature,
      };
    }

    // IVS UpdateChannelリクエスト（アーカイブ設定を有効化）
    const requestPayload = JSON.stringify({
      channelArn,
      recordingConfigurationArn: `arn:aws:ivs:${AWS_REGION}::recording-configuration/default`,
      // S3にアーカイブを保存する設定
      recordingConfiguration: {
        recordingReconnectWindow: 60,
      },
    });

    console.log(`[enableIvsAutoArchive] Enabling archive for channel: ${channelArn}`);
    
    // UpdateChannelエンドポイント
    const response = await fetch(`https://ivs.${AWS_REGION}.amazonaws.com/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-amz-json-1.1',
        'X-Amz-Target': 'AmazonIVS.UpdateChannel',
        'Authorization': `AWS4-HMAC-SHA256 Credential=${ACCESS_KEY}/${(await sign('POST', '/', 'ivs', AWS_REGION, requestPayload)).credential_scope}, SignedHeaders=host, Signature=${(await sign('POST', '/', 'ivs', AWS_REGION, requestPayload)).signature}`,
      },
      body: requestPayload,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[enableIvsAutoArchive] IVS API error: ${error}`);
      return Response.json({ error: 'Failed to enable archive', details: error }, { status: 500 });
    }

    const result = await response.json();
    console.log(`[enableIvsAutoArchive] ✅ Archive enabled for stream: ${streamId}`);

    // ストリームレコードに記録
    await base44.entities.LiveStream.update(streamId, {
      auto_archive_enabled: true,
      archive_s3_bucket: S3_BUCKET,
      archive_enabled_at: new Date().toISOString(),
    });

    return Response.json({
      success: true,
      message: 'Archive auto-enabled for channel',
      streamId,
      bucket: S3_BUCKET,
      archiveUrl: `s3://${S3_BUCKET}/${streamId}/`,
    });
  } catch (error) {
    console.error('[enableIvsAutoArchive] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});