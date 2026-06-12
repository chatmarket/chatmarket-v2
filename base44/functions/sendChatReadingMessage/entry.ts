/**
 * sendChatReadingMessage
 * 相談者が追加質問を送信する（2往復制：相談者メッセージは最大2回 = 初回1回 + 追加1回）
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
    if (message.trim().length > 3000) return Response.json({ error: 'メッセージは3000文字以内です' }, { status: 400 });

    const orders = await base44.asServiceRole.entities.ChatReadingOrder.filter({ id: order_id });
    const order = orders[0];
    if (!order) return Response.json({ error: '注文が見つかりません' }, { status: 404 });

    // ① 相談者本人チェック
    if (order.buyer_email !== user.email) {
      return Response.json({ error: '権限がありません' }, { status: 403 });
    }

    // ② 決済完了チェック
    if (order.payment_status !== 'paid') {
      return Response.json({ error: '決済が完了していません' }, { status: 400 });
    }

    // ③ 相談者はstatus=answeredのときのみ追加質問可
    if (order.status !== 'answered') {
      return Response.json({ error: `現在のステータス（${order.status}）では追加質問を送れません` }, { status: 400 });
    }

    // ④ 相談者メッセージ数チェック（初回=1は作成時にカウント済み → 追加は1回まで、合計2回）
    const buyerCount = order.buyer_message_count || 1;
    if (buyerCount >= 2) {
      return Response.json({ error: '追加質問は1回までです（2往復制）' }, { status: 400 });
    }

    const now = new Date().toISOString();

    await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
      status: 'follow_up_received',
      buyer_follow_up: message.trim(),
      follow_up_sent_at: now,
      buyer_message_count: 2,
    });

    // ChatReadingMessage にも記録
    await base44.asServiceRole.entities.ChatReadingMessage.create({
      order_id: order.id,
      sender_email: user.email,
      sender_role: 'buyer',
      message: message.trim(),
    });

    // 占い師へ通知
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email: order.creator_email,
        type: 'chat_reading_followup',
        title: '追加質問が届きました',
        message: `${order.buyer_name}さんから「${order.menu_title}」の追加質問が届きました。最終回答をお願いします。`,
        link: '/chat-readings',
        is_read: false,
      });
    } catch (_) {}

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[sendChatReadingMessage]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});