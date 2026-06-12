/**
 * submitChatReadingReply
 * 占い師が鑑定回答を送信する（1回目 or 最終回答）
 * 2往復制：占い師返信は最大2回
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id, message } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });
    if (!message?.trim()) return Response.json({ error: 'message required' }, { status: 400 });
    if (message.trim().length > 5000) return Response.json({ error: 'メッセージは5000文字以内です' }, { status: 400 });

    // 注文取得（service role: RLSはpayment_status=paidで制限されているため）
    const orders = await base44.asServiceRole.entities.ChatReadingOrder.filter({ id: order_id });
    const order = orders[0];
    if (!order) return Response.json({ error: '注文が見つかりません' }, { status: 404 });

    // ① 占い師本人チェック
    if (order.creator_email !== user.email) {
      return Response.json({ error: '権限がありません' }, { status: 403 });
    }

    // ② 決済完了チェック
    if (order.payment_status !== 'paid') {
      return Response.json({ error: '決済が完了していません' }, { status: 400 });
    }

    // ③ 無効ステータスチェック
    if (['cancelled', 'refunded', 'completed', 'pending_payment'].includes(order.status)) {
      return Response.json({ error: `このステータス（${order.status}）では回答できません` }, { status: 400 });
    }

    // ④ 占い師返信回数チェック（最大2回）
    const creatorCount = order.creator_message_count || 0;
    if (creatorCount >= 2) {
      return Response.json({ error: '占い師の返信上限（2回）に達しています' }, { status: 400 });
    }

    // ⑤ 2往復制フロー制御
    // 1回目返信：status が paid / in_progress のとき
    // 2回目（最終）返信：status が follow_up_received のとき
    const isFirstReply = creatorCount === 0 && ['paid', 'in_progress'].includes(order.status);
    const isFinalReply = creatorCount === 1 && order.status === 'follow_up_received';

    if (!isFirstReply && !isFinalReply) {
      return Response.json({ error: `現在のステータス（${order.status}）では回答できません` }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isFirstReply) {
      await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
        status: 'answered',
        creator_reply: message.trim(),
        answered_at: now,
        creator_message_count: 1,
      });
      // 相談者へ通知
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: order.buyer_email,
          type: 'chat_reading_answered',
          title: '占い師から鑑定結果が届きました',
          message: `「${order.menu_title}」の鑑定回答が届きました。追加質問は1回まで可能です。`,
          link: '/chat-readings',
          is_read: false,
        });
      } catch (_) {}
    } else {
      // 最終回答
      await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
        status: 'completed',
        creator_final_reply: message.trim(),
        final_answered_at: now,
        completed_at: now,
        creator_message_count: 2,
      });
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: order.buyer_email,
          type: 'chat_reading_completed',
          title: '鑑定が完了しました',
          message: `「${order.menu_title}」の最終鑑定が完了しました。`,
          link: '/chat-readings',
          is_read: false,
        });
      } catch (_) {}
    }

    // ChatReadingMessage にも記録
    await base44.asServiceRole.entities.ChatReadingMessage.create({
      order_id: order.id,
      sender_email: user.email,
      sender_role: 'creator',
      message: message.trim(),
    });

    return Response.json({ ok: true, is_first_reply: isFirstReply, is_final_reply: isFinalReply });
  } catch (error) {
    console.error('[submitChatReadingReply]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});