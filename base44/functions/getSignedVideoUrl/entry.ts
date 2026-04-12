// CloudFront Signed URL generation for authenticated VOD viewing
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function base64UrlEncode(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '~').replace(/=/g, '_');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { videoId } = await req.json();
    if (!videoId) return Response.json({ error: 'Missing videoId' }, { status: 400 });

    // Fetch video to get video_url
    const videos = await base44.entities.Video.filter({ id: videoId });
    if (!videos[0]) return Response.json({ error: 'Video not found' }, { status: 404 });
    const video = videos[0];

    // Check purchase if paid
    if (!video.is_free && video.price > 0) {
      const purchases = await base44.entities.Purchase.filter({
        item_type: 'video',
        item_id: videoId,
        buyer_email: user.email,
        status: 'completed',
      });
      if (purchases.length === 0) {
        return Response.json({ error: 'Purchase required' }, { status: 403 });
      }
    }

    const cloudfrontDomain = Deno.env.get('CLOUDFRONT_DOMAIN');
    const keyPairId = Deno.env.get('CLOUDFRONT_KEY_PAIR_ID');
    const privateKeyPem = Deno.env.get('CLOUDFRONT_PRIVATE_KEY');

    if (!keyPairId || !privateKeyPem) {
      // Fallback: return video_url directly if CloudFront signing not configured
      return Response.json({ signedUrl: video.video_url });
    }

    // Parse the S3 key from video_url
    const videoUrl = video.video_url || '';
    let resourcePath = videoUrl;

    // If it's a CloudFront URL, extract path. Otherwise use full URL.
    if (videoUrl.includes(cloudfrontDomain)) {
      const url = new URL(videoUrl);
      resourcePath = `https://${cloudfrontDomain}${url.pathname}`;
    }

    // Build CloudFront policy
    const expiry = Math.floor(Date.now() / 1000) + 21600; // 6 hours
    const policy = JSON.stringify({
      Statement: [{
        Resource: resourcePath,
        Condition: { DateLessThan: { 'AWS:EpochTime': expiry } },
      }],
    });

    // Import RSA private key
    const pemBody = privateKeyPem
      .replace(/-----BEGIN RSA PRIVATE KEY-----/, '')
      .replace(/-----END RSA PRIVATE KEY-----/, '')
      .replace(/-----BEGIN PRIVATE KEY-----/, '')
      .replace(/-----END PRIVATE KEY-----/, '')
      .replace(/\s/g, '');
    const binaryDer = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

    let cryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        'pkcs8', binaryDer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-1' },
        false, ['sign']
      );
    } catch {
      // Try as SPKI or raw
      return Response.json({ signedUrl: video.video_url });
    }

    const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(policy));
    const encodedSignature = base64UrlEncode(signature);
    const encodedPolicy = base64UrlEncode(new TextEncoder().encode(policy));

    const signedUrl = `${resourcePath}?Policy=${encodedPolicy}&Signature=${encodedSignature}&Key-Pair-Id=${keyPairId}`;

    return Response.json({ signedUrl });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});