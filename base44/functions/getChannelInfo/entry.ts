import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    async function hmac(key, data) {
      const k = typeof key === 'string' ? new TextEncoder().encode(key) : key;
      const cryptoKey = await crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      return new Uint8Array(await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data)));
    }

    async function sha256hex(data) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    async function ivsPost(path, body) {
      const host = `ivs.${region}.amazonaws.com`;
      const bodyStr = JSON.stringify(body);
      const now = new Date();
      const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
      const dateStamp = amzDate.slice(0, 8);
      const service = 'ivs';
      const bodyHash = await sha256hex(bodyStr);
      const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
      const signedHeaders = 'content-type;host;x-amz-date';
      const canonicalRequest = ['POST', path, '', canonicalHeaders, signedHeaders, bodyHash].join('\n');
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256hex(canonicalRequest)].join('\n');
      const signingKey = await hmac(
        await hmac(await hmac(await hmac('AWS4' + secretAccessKey, dateStamp), region), service),
        'aws4_request'
      );
      const signature = Array.from(await hmac(signingKey, stringToSign)).map(b => b.toString(16).padStart(2, '0')).join('');
      const res = await fetch(`https://${host}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Amz-Date': amzDate,
          Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
        },
        body: bodyStr,
      });
      return res.json();
    }

    const channelArn = 'arn:aws:ivs:ap-northeast-1:813372611580:channel/xuKjuYTGr3sc';

    // Get channel details (playback URL, ingest endpoint)
    const channelData = await ivsPost('/GetChannel', { arn: channelArn });

    // Get stream keys for this channel
    const keysData = await ivsPost('/ListStreamKeys', { channelArn });

    const channel = channelData.channel;
    const streamKeys = keysData.streamKeys || [];

    // Get stream key values
    const keyDetails = await Promise.all(
      streamKeys.map(k => ivsPost('/GetStreamKey', { arn: k.arn }))
    );

    return Response.json({
      channelArn,
      channelName: channel?.name,
      playbackUrl: channel?.playbackUrl,
      ingestEndpoint: channel?.ingestEndpoint ? `rtmps://${channel.ingestEndpoint}:443/app/` : null,
      streamKeys: keyDetails.map(k => ({
        arn: k.streamKey?.arn,
        value: k.streamKey?.value,
      })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});