/**
 * notifyLineAdminSale
 * 運営LINE Notifyへ売上通知を送る共通ユーティリティ関数
 * payload: { type: "ticket" | "goods", message: string }
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message } = await req.json();
    if (!message) return Response.json({ error: 'message is required' }, { status: 400 });

    await sendLineNotify(message);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

export async function sendLineNotify(message) {
  const token = Deno.env.get('LINE_NOTIFY_TOKEN');
  if (!token) {
    console.warn('[LineNotify] LINE_NOTIFY_TOKEN が設定されていません。スキップします。');
    return;
  }
  const body = new URLSearchParams({ message });
  const res = await fetch('https://notify-api.line.me/api/notify', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`[LineNotify] 送信失敗 ${res.status}: ${text}`);
  } else {
    console.log(`[LineNotify] 送信成功: ${message.slice(0, 50)}`);
  }
}