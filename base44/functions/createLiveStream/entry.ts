// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

// MOCK: MUX APIの代わりにダミーデータを返す暫定実装
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return Response.json({
      streamId: "dummy_stream_id_12345",
      streamKey: "dummy_stream_key_abcde",
      playbackId: "dummy_playback_id_98765",
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});