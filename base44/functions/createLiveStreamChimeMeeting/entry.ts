import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AWS_REGION = Deno.env.get("AWS_REGION") || "ap-northeast-1";
const AWS_ACCESS_KEY = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");

// SHA256 and HMAC signing for AWS
function sha256(message) {
  const encoder = new TextEncoder();
  return crypto.subtle.digest('SHA-256', encoder.encode(message));
}

async function hmacSha256(key, message) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);
  return crypto.subtle.sign('HMAC', await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']), messageData);
}

async function signAWSRequest(method, endpoint, path, payload) {
  const algorithm = 'AWS4-HMAC-SHA256';
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]/g, '').replace(/\.\d+Z$/, 'Z');
  const datestamp = amzdate.slice(0, 8);
  const credentialScope = `${datestamp}/${AWS_REGION}/chime/aws4_request`;
  const canonicalRequest = `${method}\n${path}\n\nhost:${endpoint}\nx-amz-date:${amzdate}\n\nhost;x-amz-date\n${payload ? (await sha256(payload)).then(b => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')) : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}`;
  const stringToSign = `${algorithm}\n${amzdate}\n${credentialScope}\n${Array.from(new Uint8Array(await sha256(canonicalRequest))).map(x => x.toString(16).padStart(2, '0')).join('')}`;
  const signature = Array.from(new Uint8Array(await hmacSha256(`AWS4${AWS_SECRET_KEY}`, stringToSign))).map(x => x.toString(16).padStart(2, '0')).join('');
  return {
    'Authorization': `${algorithm} Credential=${AWS_ACCESS_KEY}/${credentialScope}, SignedHeaders=host;x-amz-date, Signature=${signature}`,
    'x-amz-date': amzdate,
  };
}

async function chimeRequest(method, endpoint, path, body) {
  const headers = {
    'Content-Type': 'application/x-amz-json-1.1',
    ...(await signAWSRequest(method, endpoint, path, body))
  };
  const response = await fetch(`https://${endpoint}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Chime API error: ${data.Message || response.statusText}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { streamId, role } = await req.json();
    if (!streamId || !['broadcaster', 'viewer'].includes(role)) {
      return new Response(JSON.stringify({ error: 'Invalid streamId or role' }), { status: 400 });
    }

    // ライブストリーム情報取得
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    if (!streams[0]) return new Response(JSON.stringify({ error: 'Stream not found' }), { status: 404 });
    const stream = streams[0];

    // 既存MeetingがあればUUID取得、なければ新規作成
    let meetingId = stream.chime_meeting_id;
    if (!meetingId) {
      const meetingRes = await chimeRequest('POST', 'chime.ap-northeast-1.amazonaws.com', '/meetings', {
        ClientRequestToken: `stream-${streamId}-${Date.now()}`,
      });
      meetingId = meetingRes.Meeting.MeetingId;
      await base44.entities.LiveStream.update(streamId, { chime_meeting_id: meetingId });
    }

    // Attendee登録（ロール付き）
    const attendeeRes = await chimeRequest('POST', 'chime.ap-northeast-1.amazonaws.com', `/meetings/${meetingId}/attendees`, {
      ExternalUserId: `${role}-${user.email}-${Date.now()}`,
    });

    return new Response(JSON.stringify({
      Meeting: { MeetingId: meetingId },
      Attendee: attendeeRes.Attendee,
      role: role,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('[createLiveStreamChimeMeeting] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});