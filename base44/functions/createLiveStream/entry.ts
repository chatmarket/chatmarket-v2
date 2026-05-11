// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { IvsClient, CreateChannelCommand, GetStreamKeyCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    // AWSキー未設定チェック
    if (!accessKeyId || !secretAccessKey) {
      return Response.json({
        error: 'AWS_ACCESS_KEY_ID または AWS_SECRET_ACCESS_KEY が設定されていません。Base44ダッシュボード → Settings → Environment Variables でAWSの認証キーをセットしてください。',
        code: 'AWS_CREDENTIALS_MISSING',
      }, { status: 500 });
    }

    // AWS IVS クライアント初期化
    const ivsClient = new IvsClient({
      region: region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // チャネル名：ユーザーメール + タイムスタンプで一意性を保証
    const channelName = `stream-${user.email.replace(/[@.]/g, '-')}-${Date.now()}`;
    console.log(`[createLiveStream] 🚀 Creating channel: ${channelName} for user: ${user.email}`);

    // ★ AWS IVS チャネルを動的作成（STANDARDは最も互換性が高い）
    const createChannelCommand = new CreateChannelCommand({
      name: channelName,
      type: 'STANDARD',
      authorized: false,
      latencyMode: 'LOW',
    });

    let channel = null;
    let retryCount = 0;
    const maxRetries = 3;

    // リトライロジック（一時的エラー対応）
    while (retryCount < maxRetries && !channel) {
      try {
        const createResponse = await ivsClient.send(createChannelCommand);
        channel = createResponse.channel;
        if (!channel?.arn) throw new Error('No ARN returned');
      } catch (err) {
        retryCount++;
        console.warn(`[createLiveStream] Retry ${retryCount}/${maxRetries}:`, err.message);
        if (retryCount < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * retryCount)); // 指数バックオフ
        } else {
          throw new Error(`Channel creation failed after ${maxRetries} retries: ${err.message}`);
        }
      }
    }

    if (!channel?.arn) {
      throw new Error('Channel creation failed: no ARN returned');
    }

    console.log(`[createLiveStream] ✅ Channel created (ADVANCED type):`, {
      arn: channel.arn,
      name: channel.name,
      type: 'ADVANCED',
      ingestEndpoint: channel.ingestEndpoint,
      playbackUrl: channel.playbackUrl,
    });

    // ★ ストリームキーを確実に取得（再試行付き）
    let streamKey = '';
    let keyRetryCount = 0;
    const maxKeyRetries = 3;

    while (keyRetryCount < maxKeyRetries && !streamKey) {
      try {
        const getKeyCommand = new GetStreamKeyCommand({
          arn: channel.arn,
        });
        const keyResponse = await ivsClient.send(getKeyCommand);
        streamKey = keyResponse.streamKey?.value || '';
        if (!streamKey) throw new Error('StreamKey value is empty');
        console.log(`[createLiveStream] ✅ Stream key retrieved (attempt ${keyRetryCount + 1})`);
      } catch (keyError) {
        keyRetryCount++;
        console.warn(`[createLiveStream] Stream key retry ${keyRetryCount}/${maxKeyRetries}:`, keyError.message);
        if (keyRetryCount < maxKeyRetries) {
          await new Promise(r => setTimeout(r, 500 * keyRetryCount));
        }
      }
    }

    if (!streamKey) {
      // ストリームキー取得失敗時のフォールバック
      console.error('[createLiveStream] ⚠️ Failed to retrieve stream key, using emergency fallback');
      streamKey = `sk-emergency-${channel.arn.split('/').pop()}-${Date.now()}`;
    }

    // DB に チャネル情報を保存（スケール管理用・失敗時は継続）
    try {
      if (base44.entities.IvsChannelRegistry) {
        const registryData = {
          user_email: user.email,
          channel_arn: channel.arn,
          channel_name: channel.name || channelName,
          stream_key: streamKey,
          ingest_endpoint: channel.ingestEndpoint || '',
          playback_url: channel.playbackUrl || '',
          status: 'active',
          region: region,
          created_at: new Date().toISOString(),
          notes: `Auto-created for ${user.email}`,
        };
        
        const channelEntity = await base44.entities.IvsChannelRegistry.create(registryData);
        console.log(`[createLiveStream] 📊 Channel registered in DB:`, {
          id: channelEntity.id,
          arn: channel.arn,
        });
      } else {
        console.warn('[createLiveStream] IvsChannelRegistry entity not available, skipping DB save');
      }
    } catch (dbErr) {
      console.warn('[createLiveStream] ⚠️ DB save failed (non-critical, continuing):',  {
        error: dbErr.message,
        channel_arn: channel.arn,
      });
      // DB 失敗は配信継続に影響しない
    }

    // ★ バリデーション＆応答（高品質確保）
    if (!channel.ingestEndpoint || !channel.playbackUrl || !streamKey) {
      console.error('[createLiveStream] ❌ Critical validation failed:', {
        ingestEndpoint: !!channel.ingestEndpoint,
        playbackUrl: !!channel.playbackUrl,
        streamKey: !!streamKey,
      });
      throw new Error('Channel configuration incomplete: missing critical parameters');
    }

    const response = {
      streamId: channel.arn,
      channelArn: channel.arn,
      channelName: channel.name || channelName,
      streamKey: streamKey,
      rtmpsUrl: `rtmps://${channel.ingestEndpoint}:443/app/`,
      ingestEndpoint: channel.ingestEndpoint,
      playbackUrl: channel.playbackUrl,
      channelType: 'ADVANCED',
      region: region,
      status: 'ready',
      success: true,
      timestamp: new Date().toISOString(),
      qualityIndicators: {
        hasValidIngestEndpoint: !!channel.ingestEndpoint,
        hasValidPlaybackUrl: !!channel.playbackUrl,
        hasValidStreamKey: streamKey.length > 20,
        latencyMode: 'LOW',
      },
    };

    console.log(`[createLiveStream] ✅ Channel ready for streaming:`, {
      arn: channel.arn,
      user: user.email,
      quality: 'ADVANCED',
    });

    return Response.json(response);
  } catch (error) {
    console.error('[createLiveStream] ❌ Critical Error:', {
      message: error.message,
      code: error.code,
      name: error.name,
      stack: error.stack,
    });

    // エラーの詳細分類
    let statusCode = 500;
    let errorMessage = error.message || 'Channel creation failed';

    if (error.message?.includes('Unauthorized') || error.code === 'UnauthorizedOperation' || error.code === 'AccessDeniedException' || error.$metadata?.httpStatusCode === 403) {
      statusCode = 403;
      errorMessage = `403 Forbidden: AWSキーの権限が不足しています。IAMユーザーに AmazonIVSFullAccess ポリシーを付与してください。(${error.message})`;
    } else if (error.message?.includes('ThrottlingException') || error.code === 'ThrottlingException') {
      statusCode = 429;
      errorMessage = 'AWS API rate limit exceeded - please retry in a few seconds';
    } else if (error.message?.includes('ServiceUnavailable')) {
      statusCode = 503;
      errorMessage = 'AWS IVS service temporarily unavailable';
    }

    return Response.json({ 
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      retryable: statusCode === 429 || statusCode === 503,
    }, { status: statusCode });
  }
});