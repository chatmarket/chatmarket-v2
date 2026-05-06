import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // エンティティ自動化から受け取るペイロード
    const streamId = body?.data?.id || body?.stream_id;
    const channelId = body?.data?.channel_id || body?.channel_id;
    const channelName = body?.data?.channel_name || body?.channel_name;
    const streamTitle = body?.data?.title || body?.title || "ライブ配信";
    const status = body?.data?.status || body?.status;

    if (!channelId) {
      return Response.json({ error: 'channel_id is required' }, { status: 400 });
    }

    // live 状態でなければスキップ
    if (status && status !== 'live') {
      return Response.json({ skipped: true, reason: 'not live' });
    }

    // このチャンネルで過去に鑑定を受けたリスナーのメールアドレスを取得
    const kartes = await base44.asServiceRole.entities.FortuneKarte.filter({
      channel_id: channelId
    });

    if (!kartes || kartes.length === 0) {
      return Response.json({ sent: 0, reason: 'no past clients found' });
    }

    // ユニークなクライアントメールを収集（占い師自身は除外）
    const channelData = await base44.asServiceRole.entities.Channel.filter({ id: channelId });
    const ownerEmail = channelData[0]?.owner_email;

    const uniqueEmails = [...new Set(
      kartes
        .filter(k => k.client_email && k.client_email !== ownerEmail)
        .map(k => k.client_email)
    )];

    if (uniqueEmails.length === 0) {
      return Response.json({ sent: 0, reason: 'no client emails recorded' });
    }

    // 各リスナーに重複送信しないよう、直近24時間以内に同じchannelIdの通知が届いていないか確認
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // 通知を並列作成
    let sent = 0;
    await Promise.all(
      uniqueEmails.map(async (email) => {
        // 重複チェック
        const recent = await base44.asServiceRole.entities.Notification.filter({
          user_email: email,
          type: 'fortune_live_reminder',
          channel_id: channelId,
        });
        const alreadySentToday = recent.some(n => n.created_date >= oneDayAgo);
        if (alreadySentToday) return;

        // 最後に鑑定を受けた日時を取得（パーソナライズメッセージ用）
        const myKartes = kartes.filter(k => k.client_email === email);
        const lastKarte = myKartes.sort((a, b) =>
          new Date(b.created_date) - new Date(a.created_date)
        )[0];
        const consultationTheme = lastKarte?.consultation_theme || '';
        const repeatCount = myKartes.length;

        const title = `🔮 ${channelName || '占い師'} さんがライブ中です`;
        const message = repeatCount > 1
          ? `${repeatCount}回目のご縁💫 前回の${consultationTheme ? `「${consultationTheme}」` : ''}鑑定はいかがでしたか？ぜひまたお話しましょう。`
          : `前回のご縁から${channelName || '占い師'}さんが配信を始めました。また鑑定を受けてみませんか？`;

        await base44.asServiceRole.entities.Notification.create({
          user_email: email,
          type: 'fortune_live_reminder',
          title,
          message,
          link: `/live/${streamId}`,
          is_read: false,
          channel_id: channelId,
          channel_name: channelName || '',
        });
        sent++;
      })
    );

    return Response.json({ success: true, sent, total_clients: uniqueEmails.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});