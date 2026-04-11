// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import Mux from 'npm:@mux/mux-node@8.3.0';

const mux = new Mux({
  tokenId: Deno.env.get("MUX_TOKEN_ID"),
  tokenSecret: Deno.env.get("MUX_TOKEN_SECRET"),
});

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isArchiveSaved } = await req.json();

    const params = {
      playback_policy: ['public'],
    };

    if (isArchiveSaved) {
      params.new_asset_settings = {
        playback_policy: ['public'],
      };
    }

    const liveStream = await mux.video.liveStreams.create(params);

    return Response.json({
      streamId: liveStream.id,
      streamKey: liveStream.stream_key,
      playbackId: liveStream.playback_ids[0].id,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'MUX API error' }, { status: 500 });
  }
});