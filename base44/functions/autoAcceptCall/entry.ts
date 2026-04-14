import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { call_id } = await req.json();

    if (!call_id) {
      return Response.json({ error: 'call_id required' }, { status: 400 });
    }

    // 通話データ取得
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
    if (!calls || calls.length === 0) {
      return Response.json({ error: 'Call not found' }, { status: 404 });
    }

    const call = calls[0];

    // callee のチャンネル取得
    const channels = await base44.asServiceRole.entities.Channel.filter({ owner_email: call.callee_email });
    if (!channels || channels.length === 0) {
      return Response.json({ error: 'Channel not found' }, { status: 404 });
    }

    const channel = channels[0];

    // incoming_call_mode が AUTO_ACCEPT の場合のみ自動承諾
    if (channel.incoming_call_mode === 'AUTO_ACCEPT') {
      // VideoCall を accepted ステータスに更新
      await base44.asServiceRole.entities.VideoCall.update(call.id, {
        status: 'accepted'
      });

      return Response.json({
        success: true,
        message: `Call ${call.id} auto-accepted (incoming_call_mode: AUTO_ACCEPT)`,
        call: {
          id: call.id,
          status: 'accepted',
          caller_email: call.caller_email,
          callee_email: call.callee_email,
          callee_channel_id: call.callee_channel_id
        }
      });
    }

    return Response.json({
      success: false,
      reason: `Channel ${channel.name} is not in AUTO_ACCEPT mode (current: ${channel.incoming_call_mode || 'MANUAL'})`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});