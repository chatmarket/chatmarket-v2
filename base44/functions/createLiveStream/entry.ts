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

    // ChatMarket-Main チャンネル（固定）の情報を返す
    // arn:aws:ivs:ap-northeast-1:813372611580:channel/xuKjuYTGr3sc
    const FIXED_CHANNEL_ARN = "arn:aws:ivs:ap-northeast-1:813372611580:channel/xuKjuYTGr3sc";
    const FIXED_STREAM_KEY = "sk_ap-northeast-1_LlX8hjN5vJEs_KWdRW6FDzFFkwmeSkbGvXsthhsb1Ub";
    const FIXED_INGEST_ENDPOINT = "27b83d82b8a7.global-contribute.live-video.net";
    const FIXED_PLAYBACK_URL = "https://27b83d82b8a7.ap-northeast-1.playback.live-video.net/api/video/v1/ap-northeast-1.813372611580.channel.xuKjuYTGr3sc.m3u8";
    const FIXED_RTMPS_URL = "rtmps://27b83d82b8a7.global-contribute.live-video.net:443/app/";

    return Response.json({
      streamId: FIXED_CHANNEL_ARN,
      streamKey: FIXED_STREAM_KEY,
      ingestEndpoint: FIXED_INGEST_ENDPOINT,
      rtmpsUrl: FIXED_RTMPS_URL,
      playbackUrl: FIXED_PLAYBACK_URL,
      channelArn: FIXED_CHANNEL_ARN,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});