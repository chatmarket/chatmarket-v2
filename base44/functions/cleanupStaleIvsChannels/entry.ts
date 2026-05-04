// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { IvsClient, DeleteChannelCommand } from 'npm:@aws-sdk/client-ivs@3.1029.0';

/**
 * cleanupStaleIvsChannels
 * 
 * 定期実行用タスク（例：1日1回）
 * 7日以上未使用のチャネルを自動削除・アーカイブ
 * スケーラブルなシステムの不要リソース削減
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin のみ実行可能
    if (!user || user.role !== 'admin') {
      console.warn('[cleanupStaleIvsChannels] Unauthorized attempt');
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const ivsClient = new IvsClient({
      region: region,
      credentials: {
        accessKeyId: Deno.env.get('AWS_ACCESS_KEY_ID') || '',
        secretAccessKey: Deno.env.get('AWS_SECRET_ACCESS_KEY') || '',
      },
    });

    // 7日以上未使用のチャネルを検索
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    console.log(`[cleanupStaleIvsChannels] Looking for channels not used since: ${sevenDaysAgo}`);

    const staleChannels = await base44.entities.IvsChannelRegistry.filter({
      last_used_at: { $lt: sevenDaysAgo },
      status: 'active',
    }).catch(() => []);

    console.log(`[cleanupStaleIvsChannels] Found ${staleChannels.length} stale channels`);

    let deletedCount = 0;
    let archivedCount = 0;

    for (const channelRecord of staleChannels) {
      try {
        // AWS IVS チャネルを削除
        const deleteCommand = new DeleteChannelCommand({
          arn: channelRecord.channel_arn,
        });
        await ivsClient.send(deleteCommand);
        deletedCount++;
        console.log(`[cleanupStaleIvsChannels] ✅ Deleted AWS channel: ${channelRecord.channel_arn}`);

        // DB レコードをアーカイブ
        await base44.entities.IvsChannelRegistry.update(channelRecord.id, {
          status: 'archived',
          notes: `Auto-archived on ${new Date().toISOString()} - 7+ days unused`,
        });
        archivedCount++;
      } catch (err) {
        console.warn(`[cleanupStaleIvsChannels] ⚠️ Failed to clean channel ${channelRecord.channel_arn}:`, err.message);
      }
    }

    return Response.json({
      success: true,
      message: `Cleanup complete: ${deletedCount} channels deleted from AWS, ${archivedCount} archived in DB`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[cleanupStaleIvsChannels] ❌ Error:', error.message);
    return Response.json({ 
      error: error.message || 'Cleanup failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
});