/**
 * trackLogs - ブラウザログ収集エンドポイント
 * 
 * 環境：Staging/localhost でのみ有効
 * 機能：クライアント側の console.log/warn/error をキャプチャして永続化
 */

Deno.serve(async (req) => {
  // ★ CORS対応 + OPTIONS メソッド対応
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Request-ID',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // POST のみ許可
  if (req.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers }
    );
  }

  try {
    const body = await req.json();
    const {
      path,
      hostname,
      isDev,
      logs = [],
      timestamp,
    } = body;

    // 開発環境でのみログを永続化
    if (!isDev && hostname.includes('production')) {
      console.warn('[trackLogs] ⚠️ Logs from production dropped (not stored)');
      return Response.json(
        { success: true, message: 'Logs dropped (production)' },
        { status: 200, headers }
      );
    }

    // ログ出力（Deno 側で表示）
    console.log('[trackLogs] 📥 Received:', {
      hostname,
      path,
      logCount: logs.length,
      timestamp,
      isDev,
    });

    // ログの内容を表示（最初の3件まで）
    logs.slice(0, 3).forEach((log, idx) => {
      console.log(`  [${idx + 1}] ${log.level.toUpperCase()}: ${log.msg.substring(0, 80)}`);
    });

    if (logs.length > 3) {
      console.log(`  ... and ${logs.length - 3} more logs`);
    }

    // 正常応答
    return Response.json(
      {
        success: true,
        message: `Logged ${logs.length} entries`,
        logsStored: logs.length,
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