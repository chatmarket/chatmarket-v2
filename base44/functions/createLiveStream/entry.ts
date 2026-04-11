// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isArchiveSaved } = await req.json();

    const tokenId = Deno.env.get("MUX_TOKEN_ID");
    const tokenSecret = Deno.env.get("MUX_TOKEN_SECRET");
    const credentials = btoa(`${tokenId}:${tokenSecret}`);

    const body = {
      playback_policy: ['public'],
      test: true,
    };

    if (isArchiveSaved) {
      body.new_asset_settings = {
        playback_policy: ['public'],
      };
    }

    const response = await fetch('https://api.mux.com/video/v1/live-streams', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: JSON.stringify(data) }, { status: 500 });
    }

    const liveStream = data.data;

    return Response.json({
      streamId: liveStream.id,
      streamKey: liveStream.stream_key,
      playbackId: liveStream.playback_ids[0].id,
    });
  } catch (error) {
    return Response.json({ error: error.message || 'MUX API error' }, { status: 500 });
  }
});