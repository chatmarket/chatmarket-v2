// @ts-nocheck
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// AWS Signature V4 helper
async function sha256(message) {
  const data = new TextEncoder().encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hmacSha256(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    'raw', typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(sig);
}

async function getSignatureKey(secretKey, dateStamp, regionName, serviceName) {
  const kDate = await hmacSha256('AWS4' + secretKey, dateStamp);
  const kRegion = await hmacSha256(kDate, regionName);
  const kService = await hmacSha256(kRegion, serviceName);
  return await hmacSha256(kService, 'aws4_request');
}

function toHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Chime SDK Meetings API (新エンドポイント: us-east-1固定)
async function chimeSDKRequest(method, path, body, accessKeyId, secretAccessKey) {
  const region = 'us-east-1';
  const service = 'chime';
  // ★ Chime SDK Meetings の正しいエンドポイント
  const host = `chime-sdk-meetings.${region}.amazonaws.com`;
  const endpoint = `https://${host}${path}`;

  const now = new Date();
  const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
  const dateStamp = amzDate.slice(0, 8);

  const bodyStr = body ? JSON.stringify(body) : '';
  const payloadHash = await sha256(bodyStr);

  const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';

  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, await sha256(canonicalRequest)].join('\n');

  const signingKey = await getSignatureKey(secretAccessKey, dateStamp, region, service);
  const signature = toHex(await hmacSha256(signingKey, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Amz-Date': amzDate,
      'Authorization': authHeader,
    },
    body: bodyStr || undefined,
  });

  const text = await response.text();
  console.log(`[Chime] ${method} ${path} → ${response.status}: ${text.slice(0, 300)}`);
  if (!response.ok) {
    throw new Error(`Chime API error ${response.status}: ${text}`);
  }
  return JSON.parse(text);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId } = await req.json();
    if (!callId) return Response.json({ error: 'Missing callId' }, { status: 400 });

    const calls = await base44.entities.VideoCall.filter({ id: callId });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    if (user.email !== call.caller_email && user.email !== call.callee_email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!['accepted', 'active'].includes(call.status)) {
      return Response.json({ error: `Call status is '${call.status}'. Must be 'accepted' or 'active'.` }, { status: 400 });
    }

    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    let meetingId = call.chime_meeting_id;
    let Meeting;

    if (!meetingId) {
      // ★ 新規ミーティング作成 - MediaRegion は us-east-1 が必須
      console.log(`[Chime] Creating NEW meeting for call ${callId}`);
      const createResult = await chimeSDKRequest(
        'POST',
        '/meetings',
        {
          ClientRequestToken: callId,
          ExternalMeetingId: callId,
          MediaRegion: 'us-east-1',
          MeetingFeatures: {
            Audio: { EchoReduction: 'AVAILABLE' }
          }
        },
        accessKeyId,
        secretAccessKey
      );
      Meeting = createResult.Meeting;
      meetingId = Meeting.MeetingId;

      // DB保存 + status を active に
      await base44.entities.VideoCall.update(callId, {
        chime_meeting_id: meetingId,
        status: 'active',
        billing_started_at: new Date().toISOString(),
      });
      console.log('[Chime] ✓ Created meeting:', meetingId);
    } else {
      // 既存ミーティングに参加
      console.log(`[Chime] Joining existing meeting ${meetingId}`);
      const getResult = await chimeSDKRequest(
        'GET',
        `/meetings/${meetingId}`,
        null,
        accessKeyId,
        secretAccessKey
      );
      Meeting = getResult.Meeting;
      console.log('[Chime] ✓ Joined meeting:', meetingId);
    }

    // 参加者追加
    console.log(`[Chime] Adding attendee: ${user.email}`);
    const attendeeResult = await chimeSDKRequest(
      'POST',
      `/meetings/${meetingId}/attendees`,
      { ExternalUserId: user.email },
      accessKeyId,
      secretAccessKey
    );
    const Attendee = attendeeResult.Attendee;

    console.log(`[Chime] ✓ Attendee ready: ${Attendee.AttendeeId}`);
    return Response.json({ Meeting, Attendee });

  } catch (error) {
    console.error('[Chime] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});