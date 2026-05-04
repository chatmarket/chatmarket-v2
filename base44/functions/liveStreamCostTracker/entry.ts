/**
 * liveStreamCostTracker
 * 
 * スケジュール実行（1分ごと）:
 * - ライブ中の全配信のコスト（場所代・送料）を積み増し
 * - 視聴者0人が5分以上継続した配信を強制終了（オートストップ）
 * 
 * コスト定義:
 *   場所代（入力費）: 30円/時間 = 0.5円/分
 *   送料（出力費）:   5円/視聴者/時間 = 約0.0833円/視聴者/分
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const INPUT_COST_PER_MIN = 30 / 60;          // 0.5円/分
const OUTPUT_COST_PER_VIEWER_PER_MIN = 5 / 60; // 0.0833円/視聴者/分
const AUTO_STOP_ZERO_VIEWER_MINUTES = 60;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // admin check for manual calls; scheduled calls have no user
    let isScheduled = false;
    try {
      const user = await base44.auth.me();
      if (user && user.role !== 'admin') {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } catch {
      // scheduled automation has no user context — allow
      isScheduled = true;
    }

    const now = new Date();

    // ライブ中の配信を全取得
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ status: 'live' });

    const results = [];

    for (const stream of liveStreams) {
      const viewerCount = stream.viewer_count || 0;
      const updates = {};

      // --- コスト積み増し（1分分）---
      updates.cost_input_yen = (stream.cost_input_yen || 0) + INPUT_COST_PER_MIN;
      updates.cost_output_yen = (stream.cost_output_yen || 0) + (OUTPUT_COST_PER_VIEWER_PER_MIN * viewerCount);
      updates.total_viewer_minutes = (stream.total_viewer_minutes || 0) + viewerCount;

      // --- オートストップ判定 ---
      if (viewerCount === 0) {
        if (!stream.zero_viewer_since) {
          // 視聴者0人になった時刻を記録
          updates.zero_viewer_since = now.toISOString();
        } else {
          const zeroSince = new Date(stream.zero_viewer_since);
          const zeroMinutes = (now - zeroSince) / 1000 / 60;

          if (zeroMinutes >= AUTO_STOP_ZERO_VIEWER_MINUTES) {
            // 強制終了
            updates.status = 'ended';
            updates.live_ended_at = now.toISOString();
            updates.auto_stopped = true;
            console.log(`[AutoStop] stream ${stream.id} ended after ${zeroMinutes.toFixed(1)} min with 0 viewers`);
          }
        }
      } else {
        // 視聴者がいる間はリセット
        if (stream.zero_viewer_since) {
          updates.zero_viewer_since = null;
        }
      }

      await base44.asServiceRole.entities.LiveStream.update(stream.id, updates);

      results.push({
        id: stream.id,
        title: stream.title,
        viewers: viewerCount,
        cost_input_yen: updates.cost_input_yen.toFixed(2),
        cost_output_yen: updates.cost_output_yen.toFixed(2),
        auto_stopped: updates.status === 'ended' ? true : false,
      });
    }

    return Response.json({
      success: true,
      processed: results.length,
      timestamp: now.toISOString(),
      streams: results,
    });
  } catch (error) {
    console.error('liveStreamCostTracker error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});