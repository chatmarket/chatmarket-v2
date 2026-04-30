/**
 * loadTestBot - 負荷テスト用スクリプト
 * 
 * Staging環境専用：100名同時エール爆撃 + チャット洪水シミュレーション
 * 本番環境では実行禁止・ダミートランザクションのみ
 * 
 * 起動コマンド:
 * POST /api/loadTestBot
 * Body: {
 *   "action": "start_yell_burst" | "start_chat_flood" | "start_combined" | "stop",
 *   "duration_seconds": 30,
 *   "stream_id": "live_stream_123",
 *   "user_count": 100,
 *   "mode": "dummy" (開発) | "dry_run" (本番シミュレーション)
 * }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ──────────────────────────────────────────────────────────
// グローバル制御フラグ
// ──────────────────────────────────────────────────────────
let botRunning = false;
const botMetrics = {
  yellsSent: 0,
  messagesSent: 0,
  startTime: null,
  endTime: null,
  errors: [],
};

// ──────────────────────────────────────────────────────────
// ダミーユーザー生成
// ──────────────────────────────────────────────────────────
function generateDummyUsers(count) {
  const users = [];
  for (let i = 0; i < count; i++) {
    users.push({
      id: `bot_user_${i}`,
      email: `bot_user_${i}@test.internal`,
      name: `Bot User ${i}`,
    });
  }
  return users;
}

// ──────────────────────────────────────────────────────────
// エール爆撃（ランダムタイミング）
// ──────────────────────────────────────────────────────────
async function runYellBurst(base44, streamId, dummyUsers, durationSeconds, mode) {
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;
  const yellAmounts = [100, 200, 500, 1000]; // ランダムなエール金額

  console.log(`[LoadTestBot] 🚀 Yell burst started: ${dummyUsers.length} users × ${durationSeconds}s`);

  while (Date.now() < endTime && botRunning) {
    // ランダムな遅延（0～500ms）
    const delay = Math.random() * 500;
    await new Promise(resolve => setTimeout(resolve, delay));

    // ランダムにユーザーを選択
    const user = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];
    const amount = yellAmounts[Math.floor(Math.random() * yellAmounts.length)];

    try {
      if (mode === 'dummy') {
        // 開発環境：ダミートランザクション（DB書き込みなし、ログのみ）
        botMetrics.yellsSent++;
        console.log(`[YellBurst] 💰 ${user.name}: ${amount}coins → stream ${streamId}`);
      } else if (mode === 'dry_run') {
        // 本番シミュレーション：実際にAPIを呼ぶが、テストフラグ付き
        // （このフラグをバックエンドで受け取って、実トランザクションをスキップ）
        try {
          const res = await base44.functions.invoke('createYellTransaction', {
            sender_email: user.email,
            sender_name: user.name,
            stream_id: streamId,
            amount: amount,
            message: `[BOT TEST] ${user.name}が${amount}コイン投げました`,
            is_test: true, // テストフラグ
          });
          if (res?.data?.success) {
            botMetrics.yellsSent++;
          }
        } catch (err) {
          botMetrics.errors.push(`Yell error: ${err.message}`);
        }
      }
    } catch (err) {
      botMetrics.errors.push(`Yell creation failed: ${err.message}`);
    }
  }

  console.log(`[LoadTestBot] ✅ Yell burst completed: ${botMetrics.yellsSent} yells sent`);
}

// ──────────────────────────────────────────────────────────
// チャット洪水（1秒あたり5通以上）
// ──────────────────────────────────────────────────────────
async function runChatFlood(base44, streamId, dummyUsers, durationSeconds, mode) {
  const startTime = Date.now();
  const endTime = startTime + durationSeconds * 1000;

  const messages = [
    'すごい！',
    '楽しい！',
    'もっと見たい',
    'ありがとう',
    '応援してます',
    '最高',
    'いいね',
    'おもしろい',
    '続けて',
    'グレート',
  ];

  console.log(`[LoadTestBot] 💬 Chat flood started: ${dummyUsers.length} users × ${durationSeconds}s`);

  while (Date.now() < endTime && botRunning) {
    // 1秒あたり5～10メッセージ送信
    const msgCount = 5 + Math.floor(Math.random() * 6);

    for (let i = 0; i < msgCount; i++) {
      const user = dummyUsers[Math.floor(Math.random() * dummyUsers.length)];
      const msg = messages[Math.floor(Math.random() * messages.length)];

      try {
        if (mode === 'dummy') {
          botMetrics.messagesSent++;
          console.log(`[ChatFlood] 💬 ${user.name}: "${msg}"`);
        } else if (mode === 'dry_run') {
          try {
            const res = await base44.functions.invoke('createLiveComment', {
              sender_email: user.email,
              sender_name: user.name,
              stream_id: streamId,
              content: `[BOT] ${msg}`,
              is_test: true,
            });
            if (res?.data?.success) {
              botMetrics.messagesSent++;
            }
          } catch (err) {
            botMetrics.errors.push(`Chat error: ${err.message}`);
          }
        }
      } catch (err) {
        botMetrics.errors.push(`Chat creation failed: ${err.message}`);
      }
    }

    // 1秒待機
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`[LoadTestBot] ✅ Chat flood completed: ${botMetrics.messagesSent} messages sent`);
}

// ──────────────────────────────────────────────────────────
// メインハンドラー
// ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // OPTIONS プリフライト対応
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  // GET のみ許可
  if (req.method !== 'GET') {
    console.warn(`[loadTestBot] ❌ ${req.method} not allowed (GET only)`);
    return Response.json(
      { error: `${req.method} not allowed. Use GET.` },
      { status: 405, headers }
    );
  }

  const env = Deno.env.get('ENVIRONMENT') || 'unknown';
  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'status';
  const streamId = url.searchParams.get('stream_id') || 'test_stream';
  const durationSeconds = parseInt(url.searchParams.get('duration_seconds')) || 30;
  const userCount = parseInt(url.searchParams.get('user_count')) || 100;
  const mode = url.searchParams.get('mode') || 'dummy';

  console.log(`[loadTestBot] 🚀 START | GET | env=${env} | action=${action}`);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // ── 認証チェック ──
    if (!user || user.role !== 'admin') {
      console.warn(`[loadTestBot] ❌ FORBIDDEN | env=${env} | user=${user?.email || 'none'}`);
      return Response.json({ error: 'Forbidden: admin only', env: env }, { status: 403, headers });
    }

    // ── 環境チェック ──
    const isProduction = env === 'production';
    if (isProduction) {
      console.warn(`[loadTestBot] ❌ PRODUCTION BLOCKED | env=${env}`);
      return Response.json({
        error: 'LoadTestBot disabled in production',
        warning: 'This tool is Staging-only for safety',
        env: env,
      }, { status: 403, headers });
    }

    const body = await req.json();
    const { action, duration_seconds = 30, stream_id, user_count = 100, mode = 'dummy' } = body;

    if (!action || !stream_id) {
      console.warn(`[loadTestBot] ❌ INVALID_REQUEST | env=${env}`);
      return Response.json({ error: 'action and stream_id required', env: env }, { status: 400, headers });
    }

    // ── stop アクション ──
    if (action === 'stop') {
      botRunning = false;
      botMetrics.endTime = new Date().toISOString();
      console.log(`[loadTestBot] ✅ STOP | env=${env} | yells=${botMetrics.yellsSent} | msgs=${botMetrics.messagesSent}`);
      return Response.json({
        success: true,
        message: 'Bot stopped',
        env: env,
        metrics: botMetrics,
      }, { headers });
    }

    // ── status アクション ──
    if (action === 'status') {
      console.log(`[loadTestBot] 📊 STATUS | env=${env} | running=${botRunning}`);
      return Response.json({
        success: true,
        message: 'Bot status',
        env: env,
        running: botRunning,
        metrics: botMetrics,
      }, { headers });
    }

    // ── 新規実行（重複実行防止） ──
    if (botRunning) {
      console.warn(`[loadTestBot] ⚠️ ALREADY_RUNNING | env=${env}`);
      return Response.json({ error: 'Bot already running', env: env }, { status: 409, headers });
    }

    botRunning = true;
    botMetrics.yellsSent = 0;
    botMetrics.messagesSent = 0;
    botMetrics.errors = [];
    botMetrics.startTime = new Date().toISOString();

    const dummyUsers = generateDummyUsers(userCount);

    // ── 非同期でボット実行（レスポンスを返す） ──
    (async () => {
      try {
        if (action === 'start_yell_burst') {
          await runYellBurst(base44, streamId, dummyUsers, durationSeconds, mode);
        } else if (action === 'start_chat_flood') {
          await runChatFlood(base44, streamId, dummyUsers, durationSeconds, mode);
        } else if (action === 'start_combined') {
          await Promise.all([
            runYellBurst(base44, streamId, dummyUsers, durationSeconds, mode),
            runChatFlood(base44, streamId, dummyUsers, durationSeconds, mode),
          ]);
        }
      } finally {
        botRunning = false;
      }
    })();

    console.log(`[loadTestBot] ✅ STARTED | env=${env} | action=${action} | users=${userCount} | duration=${durationSeconds}s`);
    return Response.json({
      success: true,
      message: `Bot started: ${action} for ${durationSeconds}s`,
      env: env,
      mode: mode,
      users: userCount,
      stream_id: streamId,
    }, { headers });
  } catch (error) {
    console.error(`[loadTestBot] ❌ ERROR | env=${env} | error=${error.message}`);
    return Response.json({ error: error.message, env: env }, { status: 500, headers });
  }
});