import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId, extensionMinutes, extensionCoins } = await req.json();
    if (!callId || !extensionMinutes || !extensionCoins) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 通話を取得
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: callId });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    // ライバー（callee）のみがリクエスト可能
    if (user.email !== call.callee_email) {
      return Response.json({ error: 'Only callee can request extension' }, { status: 403 });
    }

    // 延長申請ステータスを pending に設定
    await base44.asServiceRole.entities.VideoCall.update(callId, {
      extension_request_minutes: extensionMinutes,
      extension_request_coins: extensionCoins,
      extension_request_status: 'pending',
      extension_requested_at: new Date().toISOString(),
    });

    console.log(`[Extension] Streamer ${user.email} requested ${extensionMinutes}min / ${extensionCoins} coins`);

    return Response.json({ success: true, callId });
  } catch (error) {
    console.error('[Extension] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});