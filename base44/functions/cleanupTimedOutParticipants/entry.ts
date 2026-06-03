/**
 * cleanupTimedOutParticipants — 90秒無応答参加者を自動退出させるAutomation
 *
 * 5分ごとにスケジュール実行。
 * active な ClassRoom のみ対象とし、heartbeat が途絶えた参加者を left_at でマーク。
 */
import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

const HEARTBEAT_TIMEOUT_MS = 90_000;

function evictTimedOut(participants) {
  const now = Date.now();
  let changed = false;
  const updated = (participants || []).map((p) => {
    if (p.left_at) return p;
    const lastSeen = p.last_seen_at
      ? new Date(p.last_seen_at).getTime()
      : new Date(p.joined_at).getTime();
    if (now - lastSeen > HEARTBEAT_TIMEOUT_MS) {
      changed = true;
      return { ...p, left_at: new Date().toISOString(), exit_reason: "timeout" };
    }
    return p;
  });
  return { updated, changed };
}

function countActive(participants) {
  return (participants || []).filter((p) => !p.left_at).length;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Admin 認証チェック（スケジュール実行の場合は service role で呼ばれるためスキップ可だが念のため）
    // Automation から呼ばれる場合は user が存在しないことがある → asServiceRole で操作

    // status: active の ClassRoom のみ取得
    const rooms = await base44.asServiceRole.entities.ClassRoom.filter({ status: "active" });

    let totalEvicted = 0;
    const updates = [];

    for (const room of (rooms || [])) {
      const { updated, changed } = evictTimedOut(room.participants);
      if (!changed) continue;

      const activeCount = countActive(updated);
      updates.push(
        base44.asServiceRole.entities.ClassRoom.update(room.id, {
          participants: updated,
          current_participants_count: activeCount,
        })
      );
      totalEvicted += (room.participants || []).filter((p) => !p.left_at).length - activeCount;
    }

    await Promise.all(updates);

    console.log(`[cleanupTimedOutParticipants] Evicted ${totalEvicted} timed-out participants from ${updates.length} rooms.`);
    return Response.json({ ok: true, evicted: totalEvicted, rooms_affected: updates.length });

  } catch (error) {
    console.error("[cleanupTimedOutParticipants] Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});