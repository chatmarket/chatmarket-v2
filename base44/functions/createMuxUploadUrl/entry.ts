import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, channel_id, channel_name, channel_avatar, price, is_free, category } = await req.json();

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

    // MuxVideoレコードを作成
    const muxRecord = await base44.entities.MuxVideo.create({
      title,
      description: description || '',
      mux_upload_id: uploadId,
      status: 'waiting',
      uploaded_by: user.email,
    });

    // Videoエンティティも同時作成（mux_playback_idはWebhookで後から更新）
    const videoRecord = await base44.entities.Video.create({
      title,
      description: description || '',
      channel_id: channel_id || '',
      channel_name: channel_name || '',
      channel_avatar: channel_avatar || '',
      price: is_free ? 0 : (price || 0),
      is_free: is_free || false,
      category: category || 'その他',
      moderation_status: 'approved',
      view_count: 0,
      is_featured: false,
    });

    return Response.json({ uploadUrl, uploadId, muxRecordId: muxRecord.id, videoRecordId: videoRecord.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});