// @ts-nocheck
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// CloudFront署名付きURL生成（us-east-1 グローバル配信用）
async function generateSignedUrl(domain, keyPairId, privateKey, path, expiresIn = 3600) {
  const now = Math.floor(Date.now() / 1000);
  const expires = now + expiresIn;

  // Policy: JSON format
  const policy = {
    Statement: [
      {
        Resource: `https://${domain}${path}`,
        Condition: {
          DateLessThan: {
            'AWS:EpochTime': expires,
          },
        },
      },
    ],
  };

  const policyString = JSON.stringify(policy);
  const policyBase64 = btoa(policyString)
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  // Sign policy with private key
  const encoder = new TextEncoder();
  const policyBuffer = encoder.encode(policyString);
  const keyBuffer = await crypto.subtle.importKey(
    'pkcs8',
    privateKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', keyBuffer, policyBuffer);
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/=/g, '_')
    .replace(/\//g, '~');

  return `https://${domain}${path}?Policy=${policyBase64}&Signature=${signatureBase64}&Key-Pair-Id=${keyPairId}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { videoPath, expiresIn = 3600 } = await req.json();
    if (!videoPath) return Response.json({ error: 'Missing videoPath' }, { status: 400 });

    // Get CloudFront credentials from environment
    const domain = Deno.env.get('CLOUDFRONT_DOMAIN');
    const keyPairId = Deno.env.get('CLOUDFRONT_KEY_PAIR_ID');
    const privateKeyStr = Deno.env.get('CLOUDFRONT_PRIVATE_KEY');

    if (!domain || !keyPairId || !privateKeyStr) {
      return Response.json({ error: 'CloudFront credentials not configured' }, { status: 500 });
    }

    // Parse private key from PEM format
    const privateKeyPem = privateKeyStr.replace(/\\n/g, '\n');
    const binaryString = atob(privateKeyPem.split('\n').slice(1, -2).join(''));
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const privateKey = bytes.buffer;

    const signedUrl = await generateSignedUrl(domain, keyPairId, privateKey, videoPath, expiresIn);

    return Response.json({ url: signedUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});