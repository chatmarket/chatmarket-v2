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

  try {
    // ★ 認証スキップ（コールドスタート高速化）
    // 実装予定：Authorization ヘッダーがあればベアトークン検証のみ
    let user = null;
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      // 本当に必要な場合のみ SDK を import
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

    return Response.json(
      {
        success: true,
        message: `✅ Logged ${logs.length} entries`,
        received: logs.length,
        user: user?.email || 'anonymous',
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
    console.error('[trackLogs] ❌ Error:', error.message);
    return Response.json(
      { error: error.message },
      { status: 500, headers }
    );
  }
});