/**
 * agoraTokenGenerator
 * 
 * Agora RTC SDK用のアクセストークンを生成する関数。
 * App IDとApp Certificateを用いて、署名付きトークンを返す。
 * 
 * POST body: { channel_id: string, user_id: string, role: "publisher" | "subscriber" }
 * Response: { token: string, app_id: string, uid: number, channel_id: string }
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Token生成用ライブラリ（npm:agora-token使用） ──
import { RtcTokenBuilder } from 'npm:agora-token@0.0.9';

const ONE_HOUR = 3600; // トークン有効期限: 1時間

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { channel_id, user_id, role } = body;

    if (!channel_id || !user_id || !role) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // 環境変数からApp ID・Certificateを取得
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      return Response.json(
        { error: 'Agora credentials not configured' },
        { status: 500 }
      );
    }

    // トークン生成
    const uid = parseInt(user_id, 10);
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channel_id,
      uid,
      role === 'publisher' ? 1 : 2, // 1: publisher, 2: subscriber
      Math.floor(Date.now() / 1000) + ONE_HOUR
    );

    return Response.json({
      token,
      app_id: appId,
      uid,
      channel_id,
      user_email: user.email,
    });
  } catch (error) {
    console.error('agoraTokenGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});