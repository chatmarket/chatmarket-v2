// S3への小さなテストファイルアップロードとCloudFront確認
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

async function generatePresignedPut(bucket, region, accessKeyId, secretKey, key, contentType) {
  const now = new Date();
  const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const host = `${bucket}.s3.${region}.amazonaws.com`;
  const signedHeaders = 'content-type;host';

  const canonicalQueryString = [
    `X-Amz-Algorithm=AWS4-HMAC-SHA256`,
    `X-Amz-Credential=${encodeURIComponent(`${accessKeyId}/${dateStamp}/${region}/s3/aws4_request`)}`,
    `X-Amz-Date=${amzDate}`,
    `X-Amz-Expires=3600`,
    `X-Amz-SignedHeaders=${encodeURIComponent(signedHeaders)}`,
  ].join('&');

  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const canonicalRequest = ['PUT', `/${key}`, canonicalQueryString, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSignatureKey(secretKey, dateStamp, region, 's3');
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  return `https://${host}/${key}?${canonicalQueryString}&X-Amz-Signature=${signature}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin only' }, { status: 403 });
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const bucket = Deno.env.get('S3_BUCKET_VOD');
    const cloudfrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN');

    // テスト用テキストファイルをアップロード
    const testKey = `debug/test-${Date.now()}.txt`;
    const testContent = 'Hello from debug test';
    const contentType = 'text/plain';

    const presignedUrl = await generatePresignedPut(bucket, region, accessKeyId, secretKey, testKey, contentType);

    // PUT
    const putRes = await fetch(presignedUrl, {
      method: 'PUT',
      body: testContent,
      headers: { 'Content-Type': contentType },
    });
    const putBody = await putRes.text();

    // CloudFront経由で取得
    const cfUrl = `https://${cloudfrontDomain}/${testKey}`;
    await new Promise(r => setTimeout(r, 1000)); // 1秒待機
    const cfRes = await fetch(cfUrl);
    const cfBody = await cfRes.text();

    return Response.json({
      testKey,
      put: {
        status: putRes.status,
        body: putBody,
      },
      cloudfront: {
        url: cfUrl,
        status: cfRes.status,
        contentType: cfRes.headers.get('content-type'),
        body: cfBody.slice(0, 500),
      },
      presignedUrlPreview: presignedUrl.slice(0, 200) + '...',
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});