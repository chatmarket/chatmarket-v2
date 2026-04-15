// @ts-nocheck
/**
 * stopChimeRecording
 * Media Capture Pipeline を停止し、録画ステータスをcompletedに更新する
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

async function chimeMediaRequest(method, path, body, accessKeyId, secretAccessKey) {
  const region   = 'us-east-1';
  const service  = 'chime';
  const host     = 'media-pipelines-chime.us-east-1.amazonaws.com';
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
  if (!response.ok && response.status !== 404) throw new Error(`Chime Media API ${response.status}: ${text}`);
  return text ? JSON.parse(text) : {};
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user   = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId, pipelineId, durationSeconds } = await req.json();
    if (!callId || !pipelineId) return Response.json({ error: 'Missing callId or pipelineId' }, { status: 400 });

    const calls = await base44.entities.VideoCall.filter({ id: callId });
    const call  = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });
    if (call.caller_email !== user.email && call.callee_email !== user.email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accessKeyId     = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    // Pipeline 停止
    await chimeMediaRequest(
      'DELETE',
      `/sdk-media-capture-pipelines/${pipelineId}`,
      null,
      accessKeyId,
      secretAccessKey
    );

    // VideoCall更新
    await base44.entities.VideoCall.update(callId, {
      recording_status:            'completed',
      recording_duration_seconds:  durationSeconds || 0,
    });

    console.log(`[Recording] Pipeline stopped: ${pipelineId}`);
    return Response.json({ success: true });

  } catch (error) {
    console.error('[Recording] Stop error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});