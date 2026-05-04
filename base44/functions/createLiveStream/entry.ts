// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // ★ chatmarket-main 固定リソース（AWS クォータ無視・リソース再生成ゼロ）
    const FIXED_CHANNEL_ARN = "arn:aws:ivs:ap-northeast-1:813372611580:channel/pVdn6DgvnSMG";
    const FIXED_PLAYBACK_URL = "https://27b83d82b8a7.ap-northeast-1.playback.live-video.net/api/video/v1/ap-northeast-1.813372611580.channel.pVdn6DgvnSMG.m3u8";
    const FIXED_STREAM_KEY = "sk_ap-northeast-1_iYbETprO3ixW_1iEQD65hcKx0Mi253OGFyRzkYkaRAc";
    const FIXED_INGEST_ENDPOINT = "27b83d82b8a7.global-contribute.live-video.net";

    console.log(`[createLiveStream] ✅ chatmarket-main 固定キー返却（リソース再生成ゼロ）`, {
      user: user.email,
      channelArn: FIXED_CHANNEL_ARN,
    });

    return Response.json({
      streamId: FIXED_CHANNEL_ARN,
      streamKey: FIXED_STREAM_KEY,
      ingestEndpoint: FIXED_INGEST_ENDPOINT,
      rtmpsUrl: `rtmps://${FIXED_INGEST_ENDPOINT}:443/app/`,
      playbackUrl: FIXED_PLAYBACK_URL,
      channelArn: FIXED_CHANNEL_ARN,
    });
  } catch (error) {
    console.error('[createLiveStream] ❌ Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});