/**
 * whipProxy — DEPRECATED & CONSOLIDATED
 *
 * ★ このエンドポイントは廃止されました。
 *
 * 【背景】
 *   - IVS Stages API コスト: $0.0100/分 (小規模配信では高額)
 *   - 標準チャンネル（RTMPS）: $0.005/分 (50%安い)
 *   - ブラウザ配信も RTMPS に統一し、AWS管理を簡素化
 *
 * 【新方式】
 *   - BrowserBroadcaster: WebRTC → RTMPS トランスコード（ローカル処理）
 *   - 全配信（OBS + ブラウザ）が同じ IVS Channel に到達
 *   - whipProxy: 削除済み
 *
 * 【AWS 削除タスク】
 *   1. AWS Console → IVS Stages → 該当ステージを削除
 *   2. 環境変数 IVS_STAGES_ARN を削除
 *   3. このファイルは placeholder として残す
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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

    console.warn('[whipProxy] ⚠️ DEPRECATED ENDPOINT - Use createLiveStream + RTMPSendpoint instead');
    
    return Response.json({
      error: 'whipProxy is deprecated. Use RTMPS endpoint from createLiveStream instead.',
      info: 'All broadcasts should use the standard IVS Channel (RTMPS) for cost optimization.',
    }, { status: 410, headers: corsHeaders }); // 410 Gone
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: corsHeaders });
  }
});