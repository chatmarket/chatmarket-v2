/**
 * whipProxy v3 — SDP クレンジング + フルプロキシ転送
 *
 * 【設計】
 *   フロントから { sdp, stream_id? } を受け取り:
 *   1. SDP をクレンジング (a=extmap-allow-mixed 等を除去)
 *   2. createLiveBroadcastToken で WHIP URL + Participant Token 取得
 *   3. Deno から IVS WHIP エンドポイントへ直接 POST
 *      - IVS は 307 を返す場合があるが手動フォロー (ヘッダー保持)
 *      - Deno の fetch は redirect:'manual' で 307 をキャッチし、
 *        Location ヘッダーの URL に同じ Authorization ヘッダーで再 POST する
 *   4. IVS の SDP アンサーをフロントに返す
 *
 * 【なぜこの方式か】
 *   - ブラウザからの直送は CORS が不確実 (IVS の CORS ポリシーは非公開)
 *   - Deno の fetch は TLS close_notify 問題があったが、
 *     IVS Stage の WHIP (global-bm.whip.live-video.net) は
 *     Low-Latency の ingest エンドポイントとは別物で正常に応答する
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  IVSRealTimeClient,
  GetStageCommand,
  CreateParticipantTokenCommand,
} from 'npm:@aws-sdk/client-ivs-realtime@3.810.0';

const ivsClient = new IVSRealTimeClient({
  region: Deno.env.get('AWS_REGION') || 'ap-northeast-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

function cleanSdp(sdp) {
  return sdp
    .split('\r\n')
    .filter(line =>
      !line.startsWith('a=extmap-allow-mixed') &&
      line !== 'a=bundle-only'
    )
    .join('\r\n');
}

async function getWhipCredentials(userEmail) {
  const stageArn = Deno.env.get('IVS_STAGES_ARN');
  if (!stageArn) throw new Error('IVS_STAGES_ARN not configured');

  const [stageRes, tokenRes] = await Promise.all([
    ivsClient.send(new GetStageCommand({ arn: stageArn })),
    ivsClient.send(new CreateParticipantTokenCommand({
      stageArn,
      userId: userEmail,
      capabilities: ['PUBLISH'],
      duration: 240,
      attributes: { role: 'broadcaster', email: userEmail },
    })),
  ]);

  const whipUrl = stageRes.stage?.endpoints?.whip;
  const token = tokenRes.participantToken?.token;

  if (!whipUrl) throw new Error('WHIP endpoint not found on IVS Stage');
  if (!token) throw new Error('Failed to create IVS participant token');

  console.log(`[whipProxy] WHIP URL: ${whipUrl}`);
  console.log(`[whipProxy] Token: ${token.slice(0, 30)}...`);

  return { whipUrl, token };
}

// IVS の 307 リダイレクトを手動でフォロー（Authorization ヘッダーを保持）
// IVS の 307 リダイレクトを手動でフォロー（Authorization ヘッダーを保持）
// IVS WHIP フロー:
//   1. POST https://global.whip.live-video.net → 307 Location: https://{regional}.whip.live-video.net/{path}
//   2. POST {regional URL} with same headers → 201 + SDP answer
async function postWhipWithRedirectFollow(whipEndpointFromStage, token, sdpBody, maxRedirects = 3) {
  // IVS の global エンドポイント経由で開始（307 でリージョン固有 URL にリダイレクトされる）
  // stage.endpoints.whip は base URL のみ。global エンドポイントから開始するのが正規フロー。
  const GLOBAL_WHIP = 'https://global.whip.live-video.net';
  let currentUrl = GLOBAL_WHIP;

  console.log(`[whipProxy] Stage WHIP base: ${whipEndpointFromStage}`);
  console.log(`[whipProxy] Starting from global endpoint: ${currentUrl}`);

  for (let i = 0; i <= maxRedirects; i++) {
    console.log(`[whipProxy] Attempt ${i + 1}: POST ${currentUrl}`);

    const res = await fetch(currentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${token}`,
      },
      body: sdpBody,
      redirect: 'manual', // 307 を手動でハンドル（ヘッダー保持のため必須）
    });

    console.log(`[whipProxy] Response status: ${res.status}`);
    const allHeaders = {};
    res.headers.forEach((v, k) => { allHeaders[k] = v; });
    console.log(`[whipProxy] Response headers: ${JSON.stringify(allHeaders)}`);

    if (res.status === 307 || res.status === 308) {
      const location = res.headers.get('location') || res.headers.get('Location');
      if (!location) throw new Error(`Redirect ${res.status} without Location header`);
      console.log(`[whipProxy] ↪️ Redirect → ${location}`);
      currentUrl = location;
      continue;
    }

    if (!res.ok) {
      const body = await res.text().catch(() => '(unreadable)');
      console.error(`[whipProxy] Error body: ${body}`);
      throw new Error(`WHIP ${res.status}: ${body.slice(0, 300)}`);
    }

    // 200/201 Created — SDP アンサーを返す
    const answerSdp = await res.text();
    console.log(`[whipProxy] ✅ Answer SDP received: ${answerSdp.length} bytes`);
    return answerSdp;
  }

  throw new Error('Too many redirects');
}

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'POST only' }, { status: 405, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const { sdp } = body;

    if (!sdp) {
      return Response.json({ error: 'sdp is required' }, { status: 400, headers: corsHeaders });
    }

    const cleanedSdp = cleanSdp(sdp);
    console.log(`[whipProxy] SDP: ${sdp.length} → ${cleanedSdp.length} bytes (cleaned)`);

    // WHIP URL + Token を並列取得
    const { whipUrl, token } = await getWhipCredentials(user.email);

    // IVS WHIP エンドポイントへ POST（307 フォロー対応）
    const answerSdp = await postWhipWithRedirectFollow(whipUrl, token, cleanedSdp);

    return Response.json({
      answer_sdp: answerSdp,
      whip_url: whipUrl,
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('[whipProxy] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});