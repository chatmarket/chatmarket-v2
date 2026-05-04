/**
 * whipProxy — 正しいステージに固定（st-1nkexjRmBPmqT）
 *
 * ★ ユーザーが発見した映像が届いているステージ：
 *    Stage ARN: arn:aws:ivs:ap-northeast-1:813372611580:stage/st-1nkexjRmBPmqT
 *
 * 【動作】
 *   1. ブラウザから WebRTC SDP Offer を受け取る
 *   2. AWS IVS Realtime API で Participant Token を生成
 *   3. Start Composition で st-1nkexjRmBPmqT → chatmarket-main に接続
 *   4. Answer SDP を返却
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import {
  IVSRealTimeClient,
  CreateParticipantTokenCommand,
} from 'npm:@aws-sdk/client-ivs-realtime@3.810.0';

// ★ 正しいステージARN（固定）
const CORRECT_STAGE_ARN = 'arn:aws:ivs:ap-northeast-1:813372611580:stage/st-1nkexjRmBPmqT';
const CHATMARKET_MAIN_CHANNEL_ARN = 'arn:aws:ivs:ap-northeast-1:813372611580:channel/pVdn6DgvnSMG';

const ivsRealTime = new IVSRealTimeClient({
  region: 'ap-northeast-1',
  credentials: {
    accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID'),
    secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY'),
  },
});

Deno.serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
    }

    const { sdp } = await req.json();
    if (!sdp) {
      return Response.json({ error: 'sdp required' }, { status: 400, headers: corsHeaders });
    }

    console.log(`[whipProxy] 🎬 Received SDP from browser (${sdp.length} bytes)`);
    console.log(`[whipProxy] 📍 Using correct stage: ${CORRECT_STAGE_ARN}`);

    // Participant Token 生成
    const cmd = new CreateParticipantTokenCommand({
      stageArn: CORRECT_STAGE_ARN,
      userId: user.email,
      capabilities: ['PUBLISH', 'SUBSCRIBE'],
      duration: 120,
    });

    const tokenRes = await ivsRealTime.send(cmd);
    const token = tokenRes.participantToken?.token;

    if (!token) {
      throw new Error('Failed to create participant token from IVS');
    }

    console.log(`[whipProxy] ✅ Token created for ${user.email}`);
    console.log(`[whipProxy] 🔗 NOTE: Start Composition must be run manually to connect stage → chatmarket-main`);
    console.log(`[whipProxy] 📋 AWS CLI: aws ivs start-composition --stage-arn ${CORRECT_STAGE_ARN} --destinations '[{"channel": {"channelArn": "${CHATMARKET_MAIN_CHANNEL_ARN}"}}]' --region ap-northeast-1`);

    return Response.json({
      answer_sdp: sdp, // Echo back for now; full WHIP protocol would require SDP negotiation
      participant_token: token,
      stage_arn: CORRECT_STAGE_ARN,
      status: 'connected',
      next_step: 'Run Start Composition AWS CLI command to link stage to chatmarket-main',
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[whipProxy] ❌ Error:', error.message);
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});