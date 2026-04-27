import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await req.json();
    if (!streamId) {
      return Response.json({ error: 'streamId required' }, { status: 400 });
    }

    // IVS チャンネル情報を取得
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    if (!streams[0]) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    const stream = streams[0];
    
    // AWS IVS は WebRTC をサポート
    // チャンネルから WHIP エンドポイント生成
    // フォーマット: https://aws.ivs.<region>.whip.live/channel/<channelArn>/ingest
    const channelArn = stream.ivs_channel_arn || `arn:aws:ivs:${Deno.env.get('AWS_REGION')}:${stream.account_id}:channel/${stream.channel_id}`;
    
    // WHIP エンドポイント（AWS IVS WebRTC 対応）
    const whipEndpoint = `https://aws.ivs.${Deno.env.get('AWS_REGION') || 'ap-northeast-1'}.whip.live/channel/${stream.channel_id}/ingest`;
    
    // WHIP アクセストークン（通常は ingestEndpoint と streamKey の組み合わせで認証）
    const whipToken = stream.ivs_stream_key || '';

    return Response.json({
      whipEndpoint,
      whipToken,
      channelArn,
      success: true,
    });
  } catch (error) {
    console.error('[getIvsWhipEndpoint] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});