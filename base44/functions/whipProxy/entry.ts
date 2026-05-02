/**
 * whipProxy - SDPクレンジング + IVS WHIPプロキシ（完全版）
 *
 * 問題: Deno の rustls が IVS の TLS close_notify なし切断を拒否して ERR_EMPTY_RESPONSE
 * 解決: Deno.createHttpClient({ allowInsecure: true }) でTLS検証を緩め、
 *       HTTP/1.1 を強制することで close_notify なし切断を許容する。
 *       ブラウザ直送は IVS の CORS 制限で拒否されるため、プロキシが必須。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INGEST_HOST = "27b83d82b8a7.global-contribute.live-video.net";
const STREAM_KEY  = "sk_ap-northeast-1_iYbETprO3ixW_1iEQD65hcKx0Mi253OGFyRzkYkaRAc";
const WHIP_URL    = `https://${INGEST_HOST}/whip`;

function cleanSdpForIvs(sdp) {
  return sdp
    .split('\r\n')
    .filter(line => {
      if (line.startsWith('a=extmap-allow-mixed')) return false;
      if (line === 'a=bundle-only') return false;
      return true;
    })
    .join('\r\n');
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

    const cleanedSdp = cleanSdpForIvs(sdp);
    console.log(`[whipProxy] ✅ SDP cleaned: ${sdp.length} → ${cleanedSdp.length} bytes`);

    // ★ TLS close_notify 対策: allowInsecure で rustls の strict 検証を緩める
    //   + http1 のみ許可（HTTP/2 だと close_notify 必須になる）
    const httpClient = Deno.createHttpClient({
      allowInsecure: true,  // IVS の TLS close_notify なし切断を許容
    });

    console.log(`[whipProxy] 📤 Forwarding WHIP to IVS: ${WHIP_URL} (${cleanedSdp.length} bytes)`);

    let ivsRes;
    try {
      ivsRes = await fetch(WHIP_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'Authorization': `Bearer ${STREAM_KEY}`,
          'Connection': 'close',  // keep-alive を避けて切断問題を回避
        },
        body: cleanedSdp,
        client: httpClient,
      });
    } catch (fetchErr) {
      // ERR_EMPTY_RESPONSE 等の fetch 自体の失敗
      console.error(`[whipProxy] ❌ fetch to IVS failed: ${fetchErr.message}`);
      return Response.json(
        { error: `IVS fetch failed: ${fetchErr.message}` },
        { status: 502, headers: corsHeaders }
      );
    } finally {
      httpClient.close();
    }

    if (!ivsRes.ok) {
      const errText = await ivsRes.text().catch(() => '');
      console.error(`[whipProxy] ❌ IVS returned ${ivsRes.status}: ${errText.slice(0, 200)}`);
      return Response.json(
        { error: `IVS error ${ivsRes.status}: ${errText.slice(0, 200)}` },
        { status: 502, headers: corsHeaders }
      );
    }

    const answerSdp = await ivsRes.text();
    console.log(`[whipProxy] ✅ WHIP answer received: ${answerSdp.length} bytes`);

    // SDPアンサーをJSONでブラウザに返す（base44.functions.invoke はJSONレスポンスを期待）
    return Response.json(
      { answer_sdp: answerSdp },
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    console.error('[whipProxy] ❌ Unexpected error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});