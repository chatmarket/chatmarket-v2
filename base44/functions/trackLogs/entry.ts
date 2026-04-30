/**
 * trackLogs - ブラウザログ収集エンドポイント（認証対応）
 * 
 * - POST のみ受け付け（GET は 405）
 * - CORS 完全対応
 * - Authorization ヘッダーを処理（オプション）
 * - 開発環境でのみログ記録
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
    // ★ リクエスト認証を試みる（失敗してもログ送信は進む）
    let user = null;
    try {
      const base44 = createClientFromRequest(req);
      user = await base44.auth.me();
    } catch (authErr) {
      console.warn('[trackLogs] ⚠️ Auth failed (optional):', authErr.message);
      // 認証失敗でもログ送信は続行
    }

    const body = await req.json();
    const { path, hostname, logs = [], timestamp } = body;

    console.log(`[trackLogs] 📥 Received ${logs.length} logs from ${hostname}${user ? ` (user: ${user.email})` : ' (unauthenticated)'}`);

    // ★ 爆撃テスト検証：yell/chat ログをカウント
    const yellCount = logs.filter(l => l.msg.includes('[YellBurst]') || l.msg.includes('coins')).length;
    const chatCount = logs.filter(l => l.msg.includes('[ChatFlood]') || l.msg.includes('💬')).length;
    const ivsCount = logs.filter(l => l.msg.includes('[IVS Stages]')).length;
    
    if (yellCount > 0 || chatCount > 0) {
      console.log(`🔥 BOMBARDMENT DETECTED:`);
      console.log(`   💰 Yells: ${yellCount} | 💬 Chats: ${chatCount} | 📡 IVS: ${ivsCount}`);
    }

    // ログの内容を表示（最初の5件）
    logs.slice(0, 5).forEach((log, idx) => {
      console.log(`  [${idx + 1}] [${log.level.toUpperCase()}] ${log.msg.substring(0, 100)}`);
    });

    if (logs.length > 5) {
      console.log(`  ... +${logs.length - 5} more`);
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