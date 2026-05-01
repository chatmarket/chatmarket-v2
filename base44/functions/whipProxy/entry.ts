/**
 * whipProxy - SDP クレンジングのみ実施し、クリーン済みSDPをブラウザに返す
 *
 * 問題: Deno の rustls が IVS の TLS close_notify なし切断を拒否して500エラー
 * 解決: WHIPリクエスト自体はブラウザから直接送る。このプロキシはSDPクレンジングのみ担当。
 *       IVSはブラウザからの直接POSTに対してCORSを許可している。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    // クリーン済みSDPをブラウザに返す。ブラウザが直接IVSへPOSTする。
    return Response.json({ cleaned_sdp: cleanedSdp }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('[whipProxy] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});