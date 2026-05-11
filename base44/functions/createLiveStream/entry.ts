// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { IvsClient, CreateChannelCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

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
      region,
      credentials: { accessKeyId, secretAccessKey },
    });

    // チャネル名：ユーザーメール + タイムスタンプで一意性を保証
    const channelName = `stream-${user.email.replace(/[@.]/g, '-')}-${Date.now()}`;
    console.log(`[createLiveStream] Creating STANDARD channel: ${channelName} for ${user.email}`);

    // STANDARD タイプ（最も安価・互換性最高・コスト最小）
    // ADVANCED は追加権限が必要で403の原因になるため使用しない
    const createResponse = await ivsClient.send(new CreateChannelCommand({
      name: channelName,
      type: 'STANDARD',
      authorized: false,
      latencyMode: 'LOW',
    }));

    const channel = createResponse.channel;
    if (!channel?.arn) {
      throw new Error('IVSチャンネル作成失敗: ARNが返されませんでした');
    }

    // CreateChannel レスポンスには streamKeys が含まれている
    const streamKey = createResponse.streamKey?.value || '';
    if (!streamKey) {
      throw new Error('ストリームキーが取得できませんでした。IAM権限を確認してください。');
    }

    console.log(`[createLiveStream] ✅ STANDARD channel ready:`, {
      arn: channel.arn,
      ingestEndpoint: channel.ingestEndpoint,
      hasStreamKey: !!streamKey,
    });

    // DB保存（失敗しても配信は継続）
    try {
      await base44.asServiceRole.entities.IvsChannelRegistry.create({
        user_email: user.email,
        channel_arn: channel.arn,
        channel_name: channel.name || channelName,
        stream_key: streamKey,
        ingest_endpoint: channel.ingestEndpoint || '',
        playback_url: channel.playbackUrl || '',
        status: 'active',
        region,
        created_at: new Date().toISOString(),
        notes: `Auto-created STANDARD for ${user.email}`,
      });
    } catch (dbErr) {
      console.warn('[createLiveStream] DB保存失敗（配信は継続）:', dbErr.message);
    }

    if (!channel.ingestEndpoint || !channel.playbackUrl) {
      throw new Error('チャンネル設定が不完全です: ingestEndpoint または playbackUrl が不足しています');
    }

    return Response.json({
      streamId: channel.arn,
      channelArn: channel.arn,
      channelName: channel.name || channelName,
      streamKey,
      rtmpsUrl: `rtmps://${channel.ingestEndpoint}:443/app/`,
      ingestEndpoint: channel.ingestEndpoint,
      playbackUrl: channel.playbackUrl,
      channelType: 'STANDARD',
      region,
      status: 'ready',
      success: true,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('[createLiveStream] ❌ Error:', error.message, 'code:', error.code, 'httpStatus:', error.$metadata?.httpStatusCode);

    let statusCode = 500;
    let errorMessage = error.message || 'Channel creation failed';

    if (
      error.code === 'AccessDeniedException' ||
      error.code === 'UnauthorizedOperation' ||
      error.$metadata?.httpStatusCode === 403 ||
      error.message?.includes('Unauthorized')
    ) {
      statusCode = 403;
      errorMessage = `403 権限エラー: IAMユーザーに AmazonIVSFullAccess ポリシーが付与されているか確認してください。(${error.message})`;
    } else if (error.code === 'ThrottlingException') {
      statusCode = 429;
      errorMessage = 'AWS API レート制限 — 数秒待ってから再試行してください';
    } else if (error.message?.includes('ServiceUnavailable')) {
      statusCode = 503;
      errorMessage = 'AWS IVS が一時的に利用不可です';
    }

    return Response.json({
      error: errorMessage,
      code: error.code || 'UNKNOWN_ERROR',
      timestamp: new Date().toISOString(),
      retryable: statusCode === 429 || statusCode === 503,
    }, { status: statusCode });
  }
});