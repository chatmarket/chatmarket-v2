import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamKey } = await req.json();
    if (!streamKey) return Response.json({ error: 'streamKey required' }, { status: 400 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    // AWS Signature V4 helper
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

    // Step 1: List all channels
    const host = `ivs.${region}.amazonaws.com`;
    const listBody = JSON.stringify({});
    const listHeaders = await signRequest('POST', host, '/ListChannels', listBody);

    const listRes = await fetch(`https://${host}/ListChannels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...listHeaders },
      body: listBody,
    });
    const listData = await listRes.json();

    if (!listData.channels) {
      return Response.json({ error: 'Failed to list channels', detail: listData }, { status: 500 });
    }

    // Step 2: For each channel, check its stream keys to find matching one
    for (const ch of listData.channels) {
      const skBody = JSON.stringify({ channelArn: ch.arn });
      const skHeaders = await signRequest('POST', host, '/ListStreamKeys', skBody);
      const skRes = await fetch(`https://${host}/ListStreamKeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...skHeaders },
        body: skBody,
      });
      const skData = await skRes.json();
      const keys = skData.streamKeys || [];
      const found = keys.find(k => k.value === streamKey);
      if (found) {
        // Get full channel details for playbackUrl
        const getBody = JSON.stringify({ arn: ch.arn });
        const getHeaders = await signRequest('POST', host, '/GetChannel', getBody);
        const getRes = await fetch(`https://${host}/GetChannel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getHeaders },
          body: getBody,
        });
        const channelData = await getRes.json();
        const playbackUrl = channelData.channel?.playbackUrl;
        if (!playbackUrl) {
          return Response.json({ error: 'No playback URL found', detail: channelData }, { status: 404 });
        }
        return Response.json({ playbackUrl, channelArn: ch.arn });
      }
    }

    return Response.json({ 
      error: 'Stream key not found in any channel',
      channels: listData.channels.map(c => ({ name: c.name, arn: c.arn }))
    }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});