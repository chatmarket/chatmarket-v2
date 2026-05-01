/**
 * whipProxy - IVS WHIP エンドポイントへのサーバーサイドプロキシ
 *
 * ブラウザから直接 IVS に fetch すると CORS/sandbox ドメイン問題が発生するため、
 * バックエンド経由でリレーする。SDP クレンジングもここで行う。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// IVS 向け SDP クレンジング
function cleanSdpForIvs(sdp) {
  return sdp
    .split('\r\n')
    .filter(line => {
      // IVS が拒否する Chrome 独自拡張属性を除去
      if (line.startsWith('a=extmap-allow-mixed')) return false;
      // bundle-only は IVS WHIP と相性が悪いため除去
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
    const { sdp, ingest_endpoint, stream_key } = body;

    if (!sdp || !ingest_endpoint || !stream_key) {
      return Response.json({ error: 'sdp, ingest_endpoint, stream_key are required' }, { status: 400, headers: corsHeaders });
    }

    const cleanedSdp = cleanSdpForIvs(sdp);
    const whipUrl = `https://${ingest_endpoint}/whip`;

    console.log(`[whipProxy] 📤 Forwarding WHIP to ${whipUrl} (${cleanedSdp.length} bytes)`);

    const ivsResponse = await fetch(whipUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/sdp',
        'Authorization': `Bearer ${stream_key}`,
      },
      body: cleanedSdp,
    });

    const responseText = await ivsResponse.text();

    if (!ivsResponse.ok) {
      console.error(`[whipProxy] ❌ IVS error: ${ivsResponse.status} ${responseText.slice(0, 300)}`);
      return Response.json(
        { error: `IVS WHIP error: ${ivsResponse.status}`, detail: responseText.slice(0, 300) },
        { status: ivsResponse.status, headers: corsHeaders }
      );
    }

    console.log(`[whipProxy] ✅ IVS answer received (${responseText.length} bytes)`);

    // ★ base44.functions.invoke は JSON を期待するため、SDP を JSON でラップして返す
    return Response.json(
      { answer_sdp: responseText },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error('[whipProxy] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});