import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId } = await req.json();
    if (!callId) return Response.json({ error: 'Missing callId' }, { status: 400 });

    // 通話を取得
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: callId });
    const call = calls[0];
    if (!call) return Response.json({ error: 'Call not found' }, { status: 404 });

    // ライバー（callee）のみが確定可能
    if (user.email !== call.callee_email) {
      return Response.json({ error: 'Only callee can confirm extension' }, { status: 403 });
    }

    // 延長申請ステータスが accepted であることを確認
    if (call.extension_request_status !== 'accepted') {
      return Response.json({ error: 'Extension not accepted yet' }, { status: 400 });
    }

    const extensionMinutes = call.extension_request_minutes;
    if (!extensionMinutes || extensionMinutes <= 0) {
      return Response.json({ error: 'Invalid extension minutes' }, { status: 400 });
    }

    // 現在の残り時間を計算
    const callStartTime = new Date(call.billing_started_at).getTime();
    const originalDurationMs = call.duration_minutes * 60 * 1000;
    const elapsedMs = Date.now() - callStartTime;
    const remainingMs = Math.max(0, originalDurationMs - elapsedMs);

    // 新しい終了時刻 = 現在時刻 + 残り時間 + 延長分数
    const newDurationMs = remainingMs + (extensionMinutes * 60 * 1000);
    const newEndTime = new Date(Date.now() + newDurationMs);

    // 通話レコードを確定に更新
    // duration_minutes を延長後の合計時間に更新
    const newTotalDurationMinutes = call.duration_minutes + extensionMinutes;

    await base44.asServiceRole.entities.VideoCall.update(callId, {
      extension_request_status: 'confirmed',
      extension_confirmed_at: new Date().toISOString(),
      duration_minutes: newTotalDurationMinutes,
      loss_time_buffer_until: null, // バッファをクリア
    });

    console.log(`[Extension] Streamer ${user.email} confirmed extension: +${extensionMinutes}min (new total: ${newTotalDurationMinutes}min)`);

    return Response.json({ 
      success: true, 
      newTotalDurationMinutes,
      newEndTime: newEndTime.toISOString(),
    });
  } catch (error) {
    console.error('[Extension] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});