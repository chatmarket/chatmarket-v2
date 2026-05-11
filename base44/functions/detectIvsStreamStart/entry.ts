/**
 * === detectIvsStreamStart ===
 * 外部配信ソフト（OBS/PRISM等）から映像信号が到達したかを検知
 * 配信者が「配信開始」ボタンを押した後、映像受信をモニタリングして
 * 自動でLiveStream状態を「scheduled」→「live」に遷移させる
 * 
 * ポーリング周期: 30秒（配信開始から約1分で検知）
 */

import {
  IvsClient,
  GetStreamCommand,
} from 'npm:@aws-sdk/client-ivs@3.1029.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await req.json().catch(() => ({}));
    if (!streamId) {
      return Response.json({ error: 'streamIdが必要です' }, { status: 400 });
    }

    // LiveStream取得
    const streams = await base44.entities.LiveStream.filter({ id: streamId });
    const stream = streams[0];
    if (!stream) {
      return Response.json({ error: 'StreamNotFound' }, { status: 404 });
    }

    // IVSチャンネルARNが設定されていない
    if (!stream.ivs_channel_arn) {
      return Response.json({ 
        error: 'IVS channel not provisioned',
        status: 'not_ready'
      }, { status: 400 });
    }

    // AWS認証
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ 
        error: 'AWS credentials missing',
        status: 'error'
      }, { status: 500 });
    }

    const ivsClient = new IvsClient({
      credentials: { accessKeyId, secretAccessKey },
      region,
    });

    // IVSチャンネルから現在のストリーム状態を取得
    let streamState = 'NOT_STREAMING';
    let streamHealth = 'UNKNOWN';
    let viewerCount = 0;
    let videoCodec = null;
    let audioCodec = null;

    try {
      const getStreamRes = await ivsClient.send(
        new GetStreamCommand({
          channelArn: stream.ivs_channel_arn,
        })
      );

      if (getStreamRes.stream) {
        streamState = getStreamRes.stream.state || 'NOT_STREAMING';
        streamHealth = getStreamRes.stream.health || 'UNKNOWN';
        viewerCount = getStreamRes.stream.viewerCount || 0;
        videoCodec = getStreamRes.stream.videoCodec;
        audioCodec = getStreamRes.stream.audioCodec;

        console.log(`[detectIvsStreamStart] 📡 Channel: ${stream.channel_name} | State: ${streamState} | Health: ${streamHealth} | Viewers: ${viewerCount}`);

        // ── 自動遷移ロジック: LIVE信号を検知したらDBを自動更新 ──
        if (streamState === 'LIVE' && stream.status === 'scheduled') {
          console.log(`[detectIvsStreamStart] 🚀 映像受信開始を検知! 自動で配信状態に遷移します`);
          
          try {
            await base44.entities.LiveStream.update(streamId, {
              status: 'live',
              live_started_at: new Date().toISOString(),
            });
            console.log(`[detectIvsStreamStart] ✅ 配信状態に自動遷移しました`);
          } catch (updateErr) {
            console.error(`[detectIvsStreamStart] ⚠️ 自動遷移更新失敗: ${updateErr.message}`);
            // 更新失敗してもレスポンスは返す
          }
        }
      }
    } catch (ivsErr) {
      console.error(`[detectIvsStreamStart] IVS API error: ${ivsErr.message}`);
      return Response.json({
        error: 'IVS API call failed',
        detail: ivsErr.message,
        status: 'error'
      }, { status: 500 });
    }

    // レスポンス
    return Response.json({
      success: true,
      stream_id: streamId,
      channel_name: stream.channel_name,
      current_status: stream.status,
      stream_state: streamState,
      stream_health: streamHealth,
      viewer_count: viewerCount,
      video_codec: videoCodec,
      audio_codec: audioCodec,
      auto_transitioned: streamState === 'LIVE' && stream.status === 'scheduled',
      message: streamState === 'LIVE' 
        ? '📡 映像受信中！配信がアクティブです'
        : '⏳ 映像待機中...',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error(`[detectIvsStreamStart] 💥 Unexpected error: ${err.message}`);
    return Response.json({
      error: 'Internal server error',
      detail: err.message,
    }, { status: 500 });
  }
});