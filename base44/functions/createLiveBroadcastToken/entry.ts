/**
 * createLiveBroadcastToken
 * 
 * IVS Real-Time Stage の WHIP エンドポイントと配信者用 Participant Token を返す。
 * 
 * 動作:
 *   1. GetStage で stage.endpoints.whip を取得
 *   2. CreateParticipantToken (PUBLISH) でトークン生成
 *   3. { whip_url, token } をフロントに返す
 * 
 * フロントは:
 *   1. whipProxy で SDP クレンジング
 *   2. fetch(whip_url, { method:'POST', headers:{ Authorization:'Bearer '+token }, body: cleanedSdp })
 *      ※ IVS は 307 リダイレクトするため redirect:'follow' + manual header injection が必要
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  IVSRealTimeClient,
  GetStageCommand,
  CreateParticipantTokenCommand,
} from 'npm:@aws-sdk/client-ivs-realtime@3.810.0';

const ivsClient = new IVSRealTimeClient({
  region: Deno.env.get('AWS_REGION') || 'ap-northeast-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stageArn = Deno.env.get('IVS_STAGES_ARN');
    if (!stageArn) {
      return Response.json({ error: 'IVS_STAGES_ARN not configured' }, { status: 500 });
    }

    console.log(`[createLiveBroadcastToken] Getting stage: ${stageArn}`);

    // 1. Stage の WHIP エンドポイントを取得
    const stageRes = await ivsClient.send(new GetStageCommand({ arn: stageArn }));
    const whipUrl = stageRes.stage?.endpoints?.whip;

    if (!whipUrl) {
      console.error('[createLiveBroadcastToken] Stage endpoints:', JSON.stringify(stageRes.stage?.endpoints));
      return Response.json({ error: 'WHIP endpoint not found on stage' }, { status: 500 });
    }

    console.log(`[createLiveBroadcastToken] WHIP URL: ${whipUrl}`);

    // 2. 配信者用 Participant Token (PUBLISH only) を生成
    const tokenRes = await ivsClient.send(new CreateParticipantTokenCommand({
      stageArn,
      userId: user.email,
      capabilities: ['PUBLISH'],
      duration: 240, // 4時間
      attributes: {
        role: 'broadcaster',
        email: user.email,
      },
    }));

    const token = tokenRes.participantToken?.token;
    if (!token) {
      return Response.json({ error: 'Failed to create participant token' }, { status: 500 });
    }

    console.log(`[createLiveBroadcastToken] ✅ Token created for ${user.email} (PUBLISH, 240min)`);
    console.log(`[createLiveBroadcastToken] Token prefix: ${token.slice(0, 30)}...`);

    return Response.json({
      whip_url: whipUrl,
      token,
      stage_arn: stageArn,
    });

  } catch (error) {
    console.error('[createLiveBroadcastToken] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});