/**
 * trackLogs - ブラウザログ収集エンドポイント（軽量版）
 * 
 * コールドスタート対策：SDK は認証失敗時のみ使用（初回は不要）
 * 性能：最小処理で 50ms以下レスポンス
 */

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Request-ID',
    'Content-Type': 'application/json',
  };

  // OPTIONS プリフライト対応
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // ★ POST のみ許可（405 を確実に返す）
  if (req.method !== 'POST') {
    console.warn(`[trackLogs] ❌ ${req.method} not allowed`);
    return Response.json(
      { error: 'Method not allowed. Use POST.' },
      { status: 405, headers }
    );
  }

  const env = Deno.env.get('ENVIRONMENT') || 'unknown';
  console.log(`[trackLogs] 🚀 START | env=${env}`);

  try {
    // ★ 認証スキップ（コールドスタート高速化）
    let user = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      try {
        const { createClientFromRequest } = await import('npm:@base44/sdk@0.8.25');
        const base44 = createClientFromRequest(req);
        user = await base44.auth.me().catch(() => null);
      } catch (e) {
        // 認証失敗時も続行
      }
    }

    const body = await req.json();
    const { path, hostname, logs = [], timestamp } = body;

    // ★ 最小ログ出力（本番環境向けパフォーマンス重視）
    const yellCount = logs.filter(l => l.msg.includes('[YellBurst]') || l.msg.includes('coins')).length;
    const chatCount = logs.filter(l => l.msg.includes('[ChatFlood]')).length;
    const ivsCount = logs.filter(l => l.msg.includes('[IVS Stages]')).length;
    
    // 爆撃テスト時のみ詳細出力
    if (yellCount > 0 || chatCount > 0) {
      console.log(`🔥 ${hostname} | 💰:${yellCount} 💬:${chatCount} | total:${logs.length}`);
    } else {
      // 通常時はワンライナー
      console.log(`[trackLogs] ✅ ${logs.length}L from ${hostname}`);
    }

    console.log(`[trackLogs] ✅ SUCCESS | env=${env} | ${logs.length}L | user=${user?.email || 'anon'}`);
    return Response.json(
      {
        success: true,
        message: `✅ Logged ${logs.length} entries`,
        received: logs.length,
        user: user?.email || 'anonymous',
        env: env,
        bombardment: {
          yells: yellCount,
          chats: chatCount,
          ivsEvents: ivsCount,
          isActive: yellCount > 0 || chatCount > 0
        }
      },
      { status: 200, headers }
    );
  } catch (error) {
    console.error('[trackLogs] ❌ ERROR | env=${env} | error=${error.message}');
    return Response.json(
      { error: error.message, env: env },
      { status: 500, headers }
    );
  }
});