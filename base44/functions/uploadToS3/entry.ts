// S3 Presigned Upload URL generation for VOD
// Frontend uploads directly to S3, then creates Video entity with CloudFront URL
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function hmacSha256(key, data) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data)));
}

function toHex(buf) {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256Hex(data) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(new Uint8Array(buf));
}

async function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { fileName, fileType, duration_seconds } = await req.json();
    if (!fileName || !fileType) return Response.json({ error: 'Missing fileName or fileType' }, { status: 400 });

    // Inline daily 2-hour usage limit check
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartISO = todayStart.toISOString();
    const userVideos = await base44.entities.Video.filter({ created_by: user.email }, '-created_date', 100);
    const todayVideos = userVideos.filter(v => v.created_date >= todayStartISO);
    const usedSeconds = todayVideos.reduce((sum, v) => sum + (v.duration || 0), 0);
    const remaining = Math.max(0, 3600 - usedSeconds);
    if ((duration_seconds || 0) > remaining) {
      return Response.json({ error: `本日の利用制限に達しています。残り利用可能時間: ${Math.floor(remaining / 60)}分` }, { status: 429 });
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const bucket = Deno.env.get('S3_BUCKET_VOD');
    const cloudfrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN');

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

    // Unique S3 key
    const ext = fileName.split('.').pop() || 'mp4';
    const key = `videos/${user.email.replace('@', '_').replace(/\./g, '_')}/${Date.now()}.${ext}`;

    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const endpoint = `https://${host}/${key}`;
    const expiry = 3600; // 1 hour

    const algorithm = 'AWS4-HMAC-SHA256';
    const credential = `${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`;
    const signedHeaders = 'host';

    const canonicalQueryString = [
      `X-Amz-Algorithm=${encodeURIComponent(algorithm)}`,
      `X-Amz-Credential=${encodeURIComponent(credential)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=${expiry}`,
      `X-Amz-SignedHeaders=${signedHeaders}`,
    ].join('&');

    const canonicalHeaders = `host:${host}\n`;
    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = ['PUT', `/${key}`, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [algorithm, amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');

    const signingKey = await getSignatureKey(secretKey, dateStamp, region, 's3');
    const signature = toHex(await hmacSha256(signingKey, stringToSign));

    const presignedUrl = `${endpoint}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
    const cloudFrontUrl = `https://${cloudfrontDomain}/${key}`;

    return Response.json({ presignedUrl, cloudFrontUrl, key });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});