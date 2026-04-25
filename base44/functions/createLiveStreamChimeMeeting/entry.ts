import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const AWS_REGION = Deno.env.get("AWS_REGION") || "ap-northeast-1";
const AWS_ACCESS_KEY = Deno.env.get("AWS_ACCESS_KEY_ID");
const AWS_SECRET_KEY = Deno.env.get("AWS_SECRET_ACCESS_KEY");

// SHA256ハッシュ（16進文字列を返す）
async function sha256Hex(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(x => x.toString(16).padStart(2, '0')).join('');
}

// HMAC-SHA256（バイト列を返す）
async function hmacSha256(keyBytes, message) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return new Uint8Array(sig);
}

// 署名キー生成（リージョンを引数で受け取る）
async function getSigningKeyForRegion(dateStamp, serviceName, region) {
  const enc = new TextEncoder();
  const kDate   = await hmacSha256(enc.encode(`AWS4${AWS_SECRET_KEY}`), dateStamp);
  const kRegion = await hmacSha256(kDate, region);
  const kService = await hmacSha256(kRegion, serviceName);
  const kSigning = await hmacSha256(kService, 'aws4_request');
  return kSigning;
}

// AWS SigV4署名付きヘッダー生成
async function signAWSRequest(method, host, path, bodyStr, service, region = AWS_REGION) {
  const now = new Date();
  const amzdate = now.toISOString().replace(/[:-]/g, '').replace(/\.\d+Z$/, 'Z');
  const datestamp = amzdate.slice(0, 8);

  const payloadHash = await sha256Hex(bodyStr || '');
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzdate}\n`;
  const signedHeaders = 'host;x-amz-date';
  const canonicalRequest = [method, path, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
  const stringToSign = ['AWS4-HMAC-SHA256', amzdate, credentialScope, await sha256Hex(canonicalRequest)].join('\n');
  const signingKey = await getSigningKeyForRegion(datestamp, service, region);
  const signature = Array.from(await hmacSha256(signingKey, stringToSign)).map(x => x.toString(16).padStart(2, '0')).join('');

  return {
    'Authorization': `AWS4-HMAC-SHA256 Credential=${AWS_ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-date': amzdate,
    'Content-Type': 'application/json',
  };
}

// Chime SDK Meetings API はグローバルエンドポイント（us-east-1）固定
// ★ 署名リージョンも us-east-1 に固定しないと 403 "Credential should be scoped to a valid region" になる
const CHIME_HOST = 'meetings-chime.us-east-1.amazonaws.com';
const CHIME_REGION = 'us-east-1';
const CHIME_SERVICE = 'chime';

async function chimeRequest(method, path, body) {
  const bodyStr = body ? JSON.stringify(body) : '';
  const headers = await signAWSRequest(method, CHIME_HOST, path, bodyStr, CHIME_SERVICE, CHIME_REGION);
  
  console.log(`[Chime] ${method} https://${CHIME_HOST}${path}`);
  
  const response = await fetch(`https://${CHIME_HOST}${path}`, {
    method,
    headers,
    body: bodyStr || undefined,
  });

  // 204 No Content は成功（DELETEなど）— JSONパース不要
  if (response.status === 204) {
    console.log(`[Chime] Response 204: No Content (success)`);
    return null;
  }

  const responseText = await response.text();
  console.log(`[Chime] Response ${response.status}: ${responseText.slice(0, 500)}`);

  if (!responseText) {
    if (!response.ok) throw new Error(`Chime ${response.status}: empty response`);
    return null;
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Chime non-JSON response (${response.status}): ${responseText.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`Chime ${response.status}: ${data.Message || data.message || data.Code || responseText.slice(0, 200)}`);
  }

  return data;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    // 認証情報チェック
    if (!AWS_ACCESS_KEY || !AWS_SECRET_KEY) {
      return new Response(JSON.stringify({ error: 'AWS credentials not configured (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY)' }), { status: 500 });
    }

    const base44 = createClientFromRequest(req);

    // ★ 視聴者はログイン不要（ゲストも視聴可）。ログイン済みなら情報取得、失敗してもゲスト扱いで続行
    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      // 未ログイン or 403 → ゲストとして続行
      console.log('[Chime] Guest viewer (no auth) — continuing without user');
    }

    const body = await req.json();
    const { streamId, role } = body;

    // StreamID の形式チェック（コロン始まりやリテラル文字列を明示的に拒否）
    if (!streamId || typeof streamId !== 'string' || streamId.startsWith(':') || streamId.length < 8) {
      return new Response(JSON.stringify({ error: `Invalid Stream ID: "${streamId}". URLパラメータが正しく渡されていません。` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!['broadcaster', 'viewer'].includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role: "${role}". Must be 'broadcaster' or 'viewer'.` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // ライブストリーム情報取得
    const streams = await base44.asServiceRole.entities.LiveStream.filter({ id: streamId });
    if (!streams[0]) return new Response(JSON.stringify({ error: `Stream not found: ${streamId}` }), { status: 404, headers: { 'Content-Type': 'application/json' } });
    const stream = streams[0];

    // Meetingを作成または既存のものを再利用
    let meetingId = stream.chime_meeting_id;
    let meetingData = null;

    if (!meetingId) {
       console.log('[Chime] Creating new meeting...');
       console.log(`[Chime] 🌍 MediaRegion FIXED: ${AWS_REGION} (broadcaster & viewer同期リージョン)`);
       const meetingRes = await chimeRequest('POST', '/meetings', {
         ClientRequestToken: `livestream-${streamId}-${Date.now()}`,
         MediaRegion: AWS_REGION,
         ExternalMeetingId: `livestream-${streamId}`,
       });
       meetingData = meetingRes.Meeting;
       meetingId = meetingData.MeetingId;
       console.log(`[Chime] Meeting created: ${meetingId}`);
       console.log(`[Chime] MediaPlacement: ${JSON.stringify(meetingData.MediaPlacement)}`);
       await base44.asServiceRole.entities.LiveStream.update(streamId, { chime_meeting_id: meetingId });
     } else {
       // 既存Meetingのフル情報（MediaPlacement等）を取得 — これがないとSDKが接続できない
       console.log(`[Chime] Getting existing meeting info: ${meetingId}`);
       try {
         const getMeetingRes = await chimeRequest('GET', `/meetings/${meetingId}`, null);
         meetingData = getMeetingRes.Meeting;
         console.log(`[Chime] Got meeting data: ${meetingId}`);
         console.log(`[Chime] MediaPlacement: ${JSON.stringify(meetingData.MediaPlacement)}`);
       } catch (err) {
         // Meetingが期限切れの場合は新規作成
         console.warn(`[Chime] Meeting not found (expired?), creating new: ${err.message}`);
         console.log(`[Chime] 🌍 MediaRegion FIXED: ${AWS_REGION} (broadcaster & viewer同期リージョン)`);
         const meetingRes = await chimeRequest('POST', '/meetings', {
           ClientRequestToken: `livestream-${streamId}-${Date.now()}`,
           MediaRegion: AWS_REGION,
           ExternalMeetingId: `livestream-${streamId}`,
         });
         meetingData = meetingRes.Meeting;
         meetingId = meetingData.MeetingId;
         console.log(`[Chime] 🔄 New Meeting created: ${meetingId}`);
         console.log(`[Chime] MediaPlacement: ${JSON.stringify(meetingData.MediaPlacement)}`);
         await base44.asServiceRole.entities.LiveStream.update(streamId, { chime_meeting_id: meetingId });
       }
     }

    // ★ 重複Attendeeの強制削除（古いセッション洗浄）
    const userId = user?.email || `guest-${Date.now()}`;
    const externalUserId = `${role}-${userId}`;
    
    console.log(`[Chime] 🧹 重複Attendee検索開始: userId=${userId}, role=${role}`);
    try {
      // Meeting内の全Attendeeを取得
      const attendeesRes = await chimeRequest('GET', `/meetings/${meetingId}/attendees`, null);
      const existingAttendees = attendeesRes.Attendees || [];
      
      for (const attendee of existingAttendees) {
        if (attendee.ExternalUserId === externalUserId) {
          console.log(`[Chime] 🗑️ 古いAttendee検出 ID=${attendee.AttendeeId}, 削除中...`);
          try {
            await chimeRequest('DELETE', `/meetings/${meetingId}/attendees/${attendee.AttendeeId}`, null);
            console.log(`[Chime] ✅ 古いAttendee削除完了: ${attendee.AttendeeId}`);
          } catch (delErr) {
            console.warn(`[Chime] ⚠️ 削除失敗: ${delErr.message}`);
          }
        }
      }
    } catch (err) {
      console.warn(`[Chime] ⚠️ 重複検索失敗（続行）: ${err.message}`);
    }

    // Attendee登録
    const capabilities = role === 'viewer'
      ? { Audio: 'Receive', Video: 'Receive', Content: 'Receive' }
      : { Audio: 'SendReceive', Video: 'SendReceive', Content: 'SendReceive' };

    const attendeeRes = await chimeRequest('POST', `/meetings/${meetingId}/attendees`, {
      ExternalUserId: externalUserId,
      Capabilities: capabilities,
    });

    console.log(`[Chime] ✅ 新規Attendee作成完了: role=${role}, attendeeId=${attendeeRes.Attendee.AttendeeId}`);

    return new Response(JSON.stringify({
      Meeting: meetingData,
      Attendee: attendeeRes.Attendee,
      role,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('[createLiveStreamChimeMeeting] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});