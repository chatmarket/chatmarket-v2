/**
 * whipProxy - SDPクレンジングのみ。WHIPはブラウザ直送。
 *
 * 結論: DenoからIVSへの直接転送は以下の理由で不可能:
 *   1. 標準fetch → rustls が TLS close_notify なし切断を拒否
 *   2. node:https → Denoサンドボックスで制限
 *   3. Deno.connectTls → IVSがHTTP/2必須のため HTTP/1.1 raw TCP では応答なし
 *
 * 解決策: プロキシはSDPクレンジングのみ実施し、クリーン済みSDPをブラウザに返す。
 * ブラウザがIVSへ直接POST。IVSはCORSを許可しているため動作する。
 * ERR_EMPTY_RESPONSEの原因は別にある（下記を参照）。
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
    const { sdp, stream_id } = body;

    if (!sdp) return Response.json({ error: 'sdp is required' }, { status: 400, headers: corsHeaders });

    const cleanedSdp = cleanSdpForIvs(sdp);
    console.log(`[whipProxy] SDP cleaned: ${sdp.length} → ${cleanedSdp.length} bytes`);

    // stream_idが渡された場合はIVS設定も返す（ブラウザ側でURLとkeyを組み立て）
    let whipUrl = null;
    let streamKey = null;
    if (stream_id) {
      const streams = await base44.asServiceRole.entities.LiveStream.filter({ id: stream_id });
      const liveStream = streams[0];
      if (liveStream?.ivs_ingest_endpoint && liveStream?.ivs_stream_key) {
        whipUrl = `https://${liveStream.ivs_ingest_endpoint}/whip`;
        streamKey = liveStream.ivs_stream_key;
        console.log(`[whipProxy] IVS endpoint: ${whipUrl}`);
        console.log(`[whipProxy] Stream key prefix: ${streamKey.slice(0, 20)}...`);
      }
    }

    return Response.json({
      cleaned_sdp: cleanedSdp,
      whip_url: whipUrl,
      stream_key: streamKey,
    }, { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('[whipProxy] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});