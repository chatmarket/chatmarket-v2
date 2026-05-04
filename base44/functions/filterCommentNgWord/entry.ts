// @ts-nocheck
/* global Deno */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * コメント投稿前のNGワードチェック
 * コメント内容がNGワード一覧に違反していないか確認
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { livestream_id, content } = await req.json();

    if (!livestream_id || !content) {
      return Response.json({
        error: 'Missing required fields: livestream_id, content',
      }, { status: 400 });
    }

    // ライブストリーム情報を取得
    const streams = await base44.entities.LiveStream.filter({
      id: livestream_id,
    });

    if (!streams[0]) {
      return Response.json({
        error: 'Live stream not found',
      }, { status: 404 });
    }

    // チャンネル情報を取得（NGワード一覧）
    const channels = await base44.entities.Channel.filter({
      id: streams[0].channel_id,
    });

    if (!channels[0]) {
      return Response.json({
        error: 'Channel not found',
      }, { status: 404 });
    }

    const channel = channels[0];
    const ngWords = channel.ng_words || [];

    // NGワードチェック
    const lowerContent = content.toLowerCase();
    for (const word of ngWords) {
      const lowerWord = word.toLowerCase();
      if (lowerContent.includes(lowerWord)) {
        console.log(`[filterCommentNgWord] ⛔ NG word detected: "${word}" by ${user.email}`);

        return Response.json({
          blocked: true,
          blockedWord: word,
          message: '不適切な言葉が含まれているため、投稿できません',
          status: 'blocked',
        }, { status: 200 });
      }
    }

    // NGワードなし → 投稿OK
    return Response.json({
      blocked: false,
      message: 'Comment is safe to post',
      status: 'approved',
    }, { status: 200 });
  } catch (error) {
    console.error('[filterCommentNgWord] Error:', error.message);
    return Response.json({
      error: error.message || 'Failed to filter comment',
    }, { status: 500 });
  }
});