import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 1対多ライブ配信用のAttendee管理
 * - 視聴者の入室・退室を追跡
 * - 配信者と視聴者のロール分離
 * - 視聴者数カウント更新
 */
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

    const { stream_id, action, attendee_id, attendee_email, attendee_name } = await req.json();
    if (!stream_id || !['join', 'leave'].includes(action)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), { status: 400 });
    }

    // ライブストリーム取得
    const streams = await base44.entities.LiveStream.filter({ id: stream_id });
    if (!streams[0]) return new Response(JSON.stringify({ error: 'Stream not found' }), { status: 404 });
    const stream = streams[0];

    if (action === 'join') {
      // 視聴者入室
      const newAttendee = {
        attendee_id,
        user_email: attendee_email || user.email,
        user_name: attendee_name || user.full_name,
        joined_at: new Date().toISOString(),
      };

      const viewerAttendeeIds = stream.viewer_attendee_ids || [];
      // 重複チェック
      if (!viewerAttendeeIds.find(a => a.attendee_id === attendee_id)) {
        viewerAttendeeIds.push(newAttendee);
      }

      await base44.entities.LiveStream.update(stream_id, {
        viewer_attendee_ids: viewerAttendeeIds,
        viewer_count: viewerAttendeeIds.length,
      });

      console.log(`[LiveStreamAttendee] Viewer joined: ${attendee_email}, total: ${viewerAttendeeIds.length}`);
      return new Response(JSON.stringify({ success: true, viewer_count: viewerAttendeeIds.length }), { status: 200 });
    }

    if (action === 'leave') {
      // 視聴者退室
      let viewerAttendeeIds = stream.viewer_attendee_ids || [];
      viewerAttendeeIds = viewerAttendeeIds.map(a => 
        a.attendee_id === attendee_id 
          ? { ...a, left_at: new Date().toISOString() }
          : a
      );

      // 退室済みを除外してカウント更新
      const activeCount = viewerAttendeeIds.filter(a => !a.left_at).length;

      await base44.entities.LiveStream.update(stream_id, {
        viewer_attendee_ids: viewerAttendeeIds,
        viewer_count: activeCount,
        zero_viewer_since: activeCount === 0 ? new Date().toISOString() : null,
      });

      console.log(`[LiveStreamAttendee] Viewer left: ${attendee_id}, active: ${activeCount}`);
      return new Response(JSON.stringify({ success: true, viewer_count: activeCount }), { status: 200 });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), { status: 400 });
  } catch (error) {
    console.error('[liveStreamAttendeeManager] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});