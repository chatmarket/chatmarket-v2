// S3オブジェクトのメタデータ（Content-Type等）を確認するデバッグ関数
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
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const { s3Key } = await req.json();
    if (!s3Key) return Response.json({ error: 'Missing s3Key' }, { status: 400 });

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const bucket = Deno.env.get('S3_BUCKET_VOD');

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';

    const host = `${bucket}.s3.${region}.amazonaws.com`;
    const signedHeaders = 'host';
    const canonicalHeaders = `host:${host}\n`;

    const canonicalQueryString = [
      `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
      `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`)}`,
      `X-Amz-Date=${amzDate}`,
      `X-Amz-Expires=60`,
      `X-Amz-SignedHeaders=${signedHeaders}`,
    ].join('&');

    const payloadHash = 'UNSIGNED-PAYLOAD';
    const canonicalRequest = ['HEAD', `/${s3Key}`, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
    const signingKey = await getSignatureKey(secretKey, dateStamp, region, 's3');
    const signature = toHex(await hmacSha256(signingKey, stringToSign));

    const presignedUrl = `https://${host}/${s3Key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;

    // HEAD request to get object metadata
    const headRes = await fetch(presignedUrl, { method: 'HEAD' });

    const headers = {};
    headRes.headers.forEach((value, key) => { headers[key] = value; });

    // Also test CloudFront access
    const cloudfrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN');
    const cfUrl = `https://${cloudfrontDomain}/${s3Key}`;
    const cfRes = await fetch(cfUrl, { method: 'HEAD' });
    const cfHeaders = {};
    cfRes.headers.forEach((value, key) => { cfHeaders[key] = value; });

    return Response.json({
      s3: {
        status: headRes.status,
        contentType: headers['content-type'],
        contentLength: headers['content-length'],
        allHeaders: headers,
      },
      cloudfront: {
        url: cfUrl,
        status: cfRes.status,
        contentType: cfHeaders['content-type'],
        allHeaders: cfHeaders,
      }
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});