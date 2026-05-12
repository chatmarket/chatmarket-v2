/**
 * trackLogs - ブラウザログ収集エンドポイント
 * POST対応追加: PrismWebOverlayからのアクセスログを受信
 */

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Content-Type': 'application/json',
    // ★ キャッシュ完全無効化
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const env = Deno.env.get('ENVIRONMENT') || 'unknown';

  // ── POST: PrismOverlay アクセスログ ──
  if (req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (_) {}

    const { eventName, properties } = body;

    if (eventName === 'prism_overlay_loaded') {
      console.log(`🎯 [PRISM_OVERLAY_ACCESS] =============================`);
      console.log(`🎯 streamId   : ${properties?.streamId || 'unknown'}`);
      console.log(`🎯 viewport   : ${properties?.viewport || 'unknown'}`);
      console.log(`🎯 timestamp  : ${properties?.ts || new Date().toISOString()}`);
      console.log(`🎯 ua         : ${properties?.ua || 'unknown'}`);
      console.log(`🎯 env        : ${env}`);
      console.log(`🎯 =========================================== LOGGED`);
    } else {
      console.log(`[trackLogs POST] event=${eventName} | props=${JSON.stringify(properties)}`);
    }

    return Response.json({ success: true, event: eventName, logged_at: new Date().toISOString() }, { status: 200, headers });
  }

  // ── GET: 既存ログ収集 ──
  if (req.method !== 'GET') {
    return Response.json({ error: `${req.method} not allowed.` }, { status: 405, headers });
  }

  const url = new URL(req.url);
  const logs = url.searchParams.get('logs') ? JSON.parse(url.searchParams.get('logs')) : [];

  let user = null;
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    try {
      const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.25');
      const base44 = createClientFromRequest(req);
      user = await base44.auth.me().catch(() => null);
    } catch (_) {}
  }

  const hostname = url.searchParams.get('hostname') || 'unknown';
  const yellCount = logs.filter(l => l.msg?.includes('[YellBurst]') || l.msg?.includes('coins')).length;
  const chatCount = logs.filter(l => l.msg?.includes('[ChatFlood]')).length;

  if (yellCount > 0 || chatCount > 0) {
    console.log(`🔥 ${hostname} | 💰:${yellCount} 💬:${chatCount} | total:${logs.length}`);
  } else {
    console.log(`[trackLogs] ✅ ${logs.length}L from ${hostname}`);
  }

  return Response.json(
    { success: true, received: logs.length, user: user?.email || 'anonymous', env },
    { status: 200, headers }
  );
});