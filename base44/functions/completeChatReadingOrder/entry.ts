/**
 * completeChatReadingOrder
 * 占い師が鑑定を完了状態にする
 * （回答済み・または追加質問対応後に明示的に完了する場合）
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id required' }, { status: 400 });

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

    // ③ 完了可能ステータスチェック
    // answered → 相談者が追加質問しなかった場合に占い師が手動完了できる
    // follow_up_received → 追加質問が届いている状態なので最終回答なしで完了は禁止
    if (order.status !== 'answered') {
      return Response.json({ error: `「追加質問受信」状態では、最終回答を送信してください。手動完了は「回答済み」状態のみ可能です。` }, { status: 400 });
    }

    await base44.asServiceRole.entities.ChatReadingOrder.update(order.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    try {
      await base44.asServiceRole.entities.Notification.create({
        user_email: order.buyer_email,
        type: 'chat_reading_completed',
        title: '鑑定が完了しました',
        message: `「${order.menu_title}」の鑑定が完了しました。`,
        link: '/chat-readings',
        is_read: false,
      });
    } catch (_) {}

    return Response.json({ ok: true });
  } catch (error) {
    console.error('[completeChatReadingOrder]', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});