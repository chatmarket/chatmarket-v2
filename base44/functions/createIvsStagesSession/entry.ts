/**
 * ██████████████████████████████████████████████████████
 * ██  FROZEN — DO NOT MODIFY                          ██
 * ██  IVS Stages トークン生成関数（凍結済み）          ██
 * ██  Stage ARN: arn:aws:ivs:ap-northeast-1:          ██
 * ██             813133722115:stage/j1Chv6mjXIon      ██
 * ██  接続方式の変更は一切禁止。承認なく変更不可。      ██
 * ██████████████████████████████████████████████████████
 *
 * createIvsStagesSession
 *
 * IVS Stages の Participant Token を caller / callee 両者分生成して
 * VideoCall エンティティの chime_attendee_caller / chime_attendee_callee に保存する。
 *
 * 呼び出しタイミング: VideoCall.status が "accepted" になった直後に caller 側から invoke する。
 *
 * 必要な環境変数:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *   IVS_STAGES_ARN  ← IVS_STAGES_ARN シークレットに設定済み
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  IVSRealTimeClient,
  CreateParticipantTokenCommand,
} from 'npm:@aws-sdk/client-ivs-realtime@3.810.0';

const ivsRealTime = new IVSRealTimeClient({
  region: Deno.env.get('AWS_REGION') || 'ap-northeast-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

const STAGE_ARN = Deno.env.get('IVS_STAGES_ARN');

async function createToken(userId) {
  const cmd = new CreateParticipantTokenCommand({
    stageArn: STAGE_ARN,
    userId,
    capabilities: ['PUBLISH', 'SUBSCRIBE'],
    duration: 60, // 60分有効
  });
  const res = await ivsRealTime.send(cmd);
  return res.participantToken?.token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { call_id } = await req.json();
    if (!call_id) {
      return Response.json({ error: 'call_id is required' }, { status: 400 });
    }

    if (!STAGE_ARN) {
      return Response.json({ error: 'IVS_STAGES_ARN env var not set' }, { status: 500 });
    }

    // VideoCall レコード取得
    const calls = await base44.asServiceRole.entities.VideoCall.filter({ id: call_id });
    const call = calls[0];
    if (!call) {
      return Response.json({ error: 'VideoCall not found' }, { status: 404 });
    }

    // 権限チェック
    if (user.email !== call.caller_email && user.email !== call.callee_email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 既にトークンが存在する場合はそのまま返す（冪等）
    if (call.chime_attendee_caller && call.chime_attendee_callee) {
      console.log('[createIvsStagesSession] Tokens already exist, returning cached');
      return Response.json({
        caller_token: call.chime_attendee_caller,
        callee_token: call.chime_attendee_callee,
      });
    }

    // caller / callee 両者分のトークンを並列生成
    const [callerToken, calleeToken] = await Promise.all([
      createToken(call.caller_email),
      createToken(call.callee_email),
    ]);

    if (!callerToken || !calleeToken) {
      return Response.json({ error: 'Failed to create participant tokens from IVS' }, { status: 500 });
    }

    // VideoCall レコードに保存
    await base44.asServiceRole.entities.VideoCall.update(call_id, {
      chime_attendee_caller: callerToken,
      chime_attendee_callee: calleeToken,
    });

    console.log('[createIvsStagesSession] ✅ Tokens saved for call:', call_id);

    return Response.json({
      caller_token: callerToken,
      callee_token: calleeToken,
    });
  } catch (error) {
    console.error('[createIvsStagesSession] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});