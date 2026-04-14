/**
 * agoraTokenGenerator
 * 
 * Agora RTC SDK用のアクセストークンを生成する関数。
 * App IDとApp Certificateを用いて、署名付きトークンを返す。
 * 
 * MVP版: 仮のダミートークンを返す（本番ではAgoraの公式SDKで署名を生成）
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ONE_HOUR = 3600;

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

    const appId = Deno.env.get('AGORA_APP_ID') || 'sandbox_app_id';
    const uid = parseInt(user_id, 10);
    
    // MVP版: 仮のトークンを生成（Sandbox環境向け）
    // 本番環境ではhttps://github.com/AgoraIO/Tools/tree/master/DynamicKey/AgoraDynamicKeyで署名を生成
    const timestamp = Math.floor(Date.now() / 1000);
    const expirationTime = timestamp + ONE_HOUR;
    const token = btoa(JSON.stringify({
      cname: channel_id,
      uid: uid,
      iat: timestamp,
      exp: expirationTime,
      role: role === 'publisher' ? 1 : 2,
    }));

    console.log(`Token generated for ${user.email} in channel ${channel_id}`);

    return Response.json({
      token,
      app_id: appId,
      uid,
      channel_id,
      user_email: user.email,
      expires_in: ONE_HOUR,
    });
  } catch (error) {
    console.error('agoraTokenGenerator error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});