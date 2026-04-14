import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    // 管理者のみ
    if (user?.role !== "admin") {
      return Response.json({ error: "Forbidden: Admin only" }, { status: 403 });
    }

    const geminiEmail = "ono@onestepinc.jp";

    // ono@onestepinc.jp のチャンネルを取得
    const channels = await base44.entities.Channel.filter({ owner_email: geminiEmail });
    if (channels.length === 0) {
      return Response.json({ error: `Channel not found for ${geminiEmail}` }, { status: 404 });
    }

    const channel = channels[0];

    // 既存の待機状態 VideoCall がないか確認
    const existingCalls = await base44.entities.VideoCall.filter({
      callee_email: geminiEmail,
      status: "waiting"
    });

    if (existingCalls.length > 0) {
      return Response.json({
        success: true,
        message: "Already waiting",
        call: existingCalls[0]
      });
    }

    // 新規 waiting VideoCall を作成
    const waitingCall = await base44.entities.VideoCall.create({
      caller_email: geminiEmail,
      caller_name: channel.name,
      callee_email: geminiEmail,
      callee_name: channel.name,
      callee_channel_id: channel.id,
      status: "waiting",
      is_free_call: true,
      message: "待機中"
    });

    return Response.json({
      success: true,
      message: `Gemini (${geminiEmail}) is now waiting`,
      call: waitingCall,
      channel: {
        id: channel.id,
        name: channel.name,
        avatar_url: channel.avatar_url
      }
    });
  } catch (error) {
    console.error("setupGeminiLiveWaiting error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});