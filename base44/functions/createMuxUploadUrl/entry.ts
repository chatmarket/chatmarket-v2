import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description } = await req.json();

    const tokenId = Deno.env.get('MUX_TOKEN_ID');
    const tokenSecret = Deno.env.get('MUX_TOKEN_SECRET');
    const credentials = btoa(`${tokenId}:${tokenSecret}`);

    // Mux Direct Upload URLを作成
    const muxRes = await fetch('https://api.mux.com/video/v1/uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
        },
      }),
    });

    if (!muxRes.ok) {
      const err = await muxRes.text();
      return Response.json({ error: 'Mux upload URL creation failed', detail: err }, { status: 500 });
    }

    const muxData = await muxRes.json();
    const uploadId = muxData.data.id;
    const uploadUrl = muxData.data.url;

    // DBにレコードを作成（Playback IDはWebhookで後から更新）
    const record = await base44.entities.MuxVideo.create({
      title,
      description: description || '',
      mux_upload_id: uploadId,
      status: 'waiting',
      uploaded_by: user.email,
    });

    return Response.json({ uploadUrl, uploadId, recordId: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});