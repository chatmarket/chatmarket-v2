/**
 * getTwilioIceServers — Twilio NTS (Network Traversal Service) からICE credentialsを取得
 * Twilio NTSは北米・欧州・アジアにグローバルTURNサーバーを持つマネージドサービス
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
  }

  // Twilio NTS Token API (TTL: 86400秒 = 24時間)
  const credentials = btoa(`${accountSid}:${authToken}`);
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Tokens.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'Ttl=86400',
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.error('[Twilio NTS] API error:', response.status, text);
    return Response.json({ error: 'Failed to fetch Twilio ICE servers', detail: text }, { status: 500 });
  }

  const data = await response.json();
  console.log('[Twilio NTS] ✅ ICE servers fetched for user:', user.email, '— servers:', data.ice_servers?.length);

  return Response.json({ iceServers: data.ice_servers });
});