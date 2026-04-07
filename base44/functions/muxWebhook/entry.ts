import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    const base44 = createClientFromRequest(req);

    const eventType = event.type;
    const data = event.data;

    // video.asset.ready: 動画処理完了 → Playback IDを保存
    if (eventType === 'video.asset.ready') {
      const assetId = data.id;
      const playbackId = data.playback_ids?.[0]?.id;
      const duration = data.duration;

      if (!playbackId) {
        return Response.json({ ok: true, message: 'no playback_id yet' });
      }

      const uploadId = data.upload_id;
      if (uploadId) {
        // MuxVideoレコードを更新
        const muxRecords = await base44.asServiceRole.entities.MuxVideo.filter({ mux_upload_id: uploadId });
        if (muxRecords.length > 0) {
          await base44.asServiceRole.entities.MuxVideo.update(muxRecords[0].id, {
            mux_asset_id: assetId,
            mux_playback_id: playbackId,
            status: 'ready',
            duration: duration || null,
          });
        }

        // Videoエンティティも検索してmux_playback_idを更新
        // MuxVideoのtitleとuploaded_byで対応するVideoを探す
        if (muxRecords.length > 0) {
          const muxRecord = muxRecords[0];
          // mux_upload_idをVideoエンティティのdescriptionに埋め込んだIDで探す
          // uploaded_byとtitleで絞り込む
          const videoRecords = await base44.asServiceRole.entities.Video.filter({
            title: muxRecord.title,
          });
          // uploaded_byが一致するものを選ぶ
          const matchedVideo = videoRecords.find(v => v.created_by === muxRecord.uploaded_by && !v.mux_playback_id);
          if (matchedVideo) {
            await base44.asServiceRole.entities.Video.update(matchedVideo.id, {
              mux_playback_id: playbackId,
              duration: duration ? Math.round(duration) : null,
            });
          }
        }
      }
    }

    // video.asset.errored: エラー
    if (eventType === 'video.asset.errored') {
      const uploadId = data.upload_id;
      if (uploadId) {
        const records = await base44.asServiceRole.entities.MuxVideo.filter({ mux_upload_id: uploadId });
        if (records.length > 0) {
          await base44.asServiceRole.entities.MuxVideo.update(records[0].id, { status: 'errored' });
        }
      }
    }

    // video.upload.asset_created: アセット作成直後（preparingに更新）
    if (eventType === 'video.upload.asset_created') {
      const uploadId = data.id;
      const assetId = data.asset_id;
      if (uploadId) {
        const records = await base44.asServiceRole.entities.MuxVideo.filter({ mux_upload_id: uploadId });
        if (records.length > 0) {
          await base44.asServiceRole.entities.MuxVideo.update(records[0].id, {
            mux_asset_id: assetId,
            status: 'preparing',
          });
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});