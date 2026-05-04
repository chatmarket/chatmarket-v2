/**
 * zombieStreamKiller — ゾンビ配信自動終了
 * 5分ごとに実行。liveステータスで viewer_count=0 かつ
 * live_started_at から30分以上経過しているものを自動終了。
 * また、live_started_at から2時間以上経過した配信も強制終了。
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // サービスロールで全liveストリームを取得
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ status: "live" });

    if (!liveStreams || liveStreams.length === 0) {
      return Response.json({ message: "No live streams found", killed: 0 });
    }

    const now = new Date();
    const killed = [];

    for (const stream of liveStreams) {
      const startedAt = stream.live_started_at ? new Date(stream.live_started_at) : null;
      if (!startedAt) continue;

      const elapsedMinutes = (now - startedAt) / 1000 / 60;
      const viewerCount = stream.viewer_count ?? 0;

      // 条件1: 30分以上経過 & 視聴者0人
      // 条件2: 2時間以上経過（強制終了）
      const shouldKill = (elapsedMinutes >= 30 && viewerCount === 0) || elapsedMinutes >= 120;

      if (shouldKill) {
        await base44.asServiceRole.entities.LiveStream.update(stream.id, {
          status: "ended",
          live_ended_at: now.toISOString(),
          auto_stopped: true,
        });

        // チャンネルのis_liveもfalseに
        if (stream.channel_id) {
          await base44.asServiceRole.entities.Channel.update(stream.channel_id, {
            is_live: false,
          }).catch(() => {}); // チャンネルが見つからなくてもエラーにしない
        }

        killed.push({
          id: stream.id,
          title: stream.title,
          elapsed_minutes: Math.round(elapsedMinutes),
          viewer_count: viewerCount,
          reason: elapsedMinutes >= 120 ? "2h_force_stop" : "30min_no_viewers",
        });

        console.log(`[zombieStreamKiller] ✅ Killed: ${stream.id} (${stream.title}) - ${Math.round(elapsedMinutes)}min, ${viewerCount} viewers`);
      }
    }

    console.log(`[zombieStreamKiller] Checked ${liveStreams.length} streams, killed ${killed.length}`);
    return Response.json({ killed: killed.length, details: killed });

  } catch (error) {
    console.error('[zombieStreamKiller] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});