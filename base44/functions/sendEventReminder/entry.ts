import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipient_email, event_name, event_date, event_location, message, notification_type } = await req.json();

    if (!recipient_email || !event_name || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // メール送信
    const subject = notification_type === 'reminder'
      ? `【リマインド】${event_name}の開催をお知らせします`
      : `【重要】${event_name}の情報が更新されました`;

    const body = `
${event_name}のチケットをご購入いただきありがとうございます。

${message}

【イベント情報】
開催日時：${event_date ? new Date(event_date).toLocaleString('ja-JP') : '未定'}
場所：${event_location || '未定'}

このメールに心当たりのない場合は、当サービスまでお問い合わせください。
`;

    await base44.integrations.Core.SendEmail({
      to: recipient_email,
      subject: subject,
      body: body,
      from_name: 'Chat Market',
    });

    return Response.json({ 
      success: true, 
      message: 'Reminder sent successfully',
      recipient: recipient_email,
      type: notification_type
    });
  } catch (error) {
    console.error('Error sending reminder:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});