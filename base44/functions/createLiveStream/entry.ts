// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// AWS Signature V4 helper for Deno (no SDK needed)
async function signRequest({ method, url, region, service, accessKeyId, secretAccessKey, body }) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
  const dateStamp = amzDate.slice(0, 8);

  const parsedUrl = new URL(url);
  const host = parsedUrl.host;
  const canonicalUri = parsedUrl.pathname;
  const canonicalQuerystring = "";

  const bodyHash = await sha256Hex(body || "");

  const canonicalHeaders = `content-type:application/x-amz-json-1.0\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";

  const canonicalRequest = [method, canonicalUri, canonicalQuerystring, canonicalHeaders, signedHeaders, bodyHash].join("\n");

  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const signingKey = await getSigningKey(secretAccessKey, dateStamp, region, service);
  const signature = await hmacHex(signingKey, stringToSign);

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    "Authorization": authHeader,
    "Content-Type": "application/x-amz-json-1.0",
    "X-Amz-Date": amzDate,
  };
}

async function sha256Hex(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(key, message) {
  const msgBuffer = new TextEncoder().encode(message);
  const cryptoKey = typeof key === "string"
    ? await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    : key;
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBuffer);
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function hmacKey(key, message) {
  const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key;
  const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const msgBuffer = new TextEncoder().encode(message);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBuffer);
  return new Uint8Array(sig);
}

async function getSigningKey(secret, dateStamp, region, service) {
  const kDate = await hmacKey("AWS4" + secret, dateStamp);
  const kRegion = await hmacKey(kDate, region);
  const kService = await hmacKey(kRegion, service);
  const kSigning = await hmacKey(kService, "aws4_request");
  return await crypto.subtle.importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    console.log(`[createLiveStream] 🚀 Creating new stream for user: ${user.email}`);

    // AWS Signature V4 署名関数
    async function hmac(key, data) {
      const k = typeof key === 'string' ? new TextEncoder().encode(key) : key;
      const cryptoKey = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data)));
    }

    async function sha256hex(data) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function signRequest(method, host, path, body) {
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
      const dateStamp = amzDate.slice(0, 8);
      const service = 'ivs';
      const bodyHash = await sha256hex(body);

      const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = 'content-type;host;x-amz-date';
      const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');

      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256hex(canonicalRequest)].join('\n');

      const signingKey = await hmac(
        await hmac(await hmac(await hmac('AWS4' + secretAccessKey, dateStamp), region), service),
        'aws4_request'
      );
      const signature = Array.from(await hmac(signingKey, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');

      return {
        Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        'X-Amz-Date': amzDate,
      };
    }

    // Step 1: Create a new channel
    const host = `ivs.${region}.amazonaws.com`;
    const createBody = JSON.stringify({
      name: `stream_${user.email.split('@')[0]}_${Date.now()}`,
      type: 'STANDARD',
    });
    const createHeaders = await signRequest('POST', host, '/CreateChannel', createBody);

    const createRes = await fetch(`https://${host}/CreateChannel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...createHeaders },
      body: createBody,
    });
    const createData = await createRes.json();

    if (!createData.channel) {
      console.error('[createLiveStream] ❌ Failed to create channel:', createData);
      return Response.json({ error: 'Failed to create channel', detail: createData }, { status: 500 });
    }

    const channelArn = createData.channel.arn;
    const playbackUrl = createData.channel.playbackUrl;

    console.log(`[createLiveStream] ✅ Channel created:`, {
      arn: channelArn,
      playbackUrl: playbackUrl?.substring(0, 80) + '...',
    });

    // Step 2: Create stream key
    const keyBody = JSON.stringify({ channelArn });
    const keyHeaders = await signRequest('POST', host, '/CreateStreamKey', keyBody);

    const keyRes = await fetch(`https://${host}/CreateStreamKey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...keyHeaders },
      body: keyBody,
    });
    const keyData = await keyRes.json();

    if (!keyData.streamKey) {
      console.error('[createLiveStream] ❌ Failed to create stream key:', keyData);
      return Response.json({ error: 'Failed to create stream key', detail: keyData }, { status: 500 });
    }

    const streamKey = keyData.streamKey.value;
    const ingestEndpoint = keyData.streamKey.ingestEndpoint || '27b83d82b8a7.global-contribute.live-video.net';

    console.log(`[createLiveStream] ✅ Stream key created:`, {
      streamKey: streamKey?.substring(0, 40) + '...',
      ingestEndpoint,
    });

    return Response.json({
      streamId: channelArn,
      streamKey,
      ingestEndpoint,
      rtmpsUrl: `rtmps://${ingestEndpoint}:443/app/`,
      playbackUrl, // ★ ここが生のURL（毎回異なる）
      channelArn,
    });
  } catch (error) {
    console.error('[createLiveStream] ❌ Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});