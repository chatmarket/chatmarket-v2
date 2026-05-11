/**
 * checkTwilioCostAlert — Twilioの残高を監視し、無料クレジットの80%消費時にアラートを送信
 * 管理者のみ実行可能
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (user?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

  if (!accountSid || !authToken) {
    return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
  }

  const credentials = btoa(`${accountSid}:${authToken}`);

  // Twilioアカウント残高取得
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Balance.json`,
    { headers: { 'Authorization': `Basic ${credentials}` } }
  );

  if (!res.ok) {
    return Response.json({ error: 'Failed to fetch Twilio balance' }, { status: 500 });
  }

  const data = await res.json();
  const balance = parseFloat(data.balance);
  const currency = data.currency;

  console.log(`[Twilio Cost] 残高: ${balance} ${currency}`);

  // Twilio無料トライアルは$15.50スタート
  const FREE_CREDIT_TOTAL = 15.50;
  const consumed = FREE_CREDIT_TOTAL - balance;
  const consumedPct = Math.round((consumed / FREE_CREDIT_TOTAL) * 100);

  const result = { balance, currency, consumed_usd: consumed.toFixed(2), consumed_pct: consumedPct };

  // 80%以上消費でアラートメール送信
  if (consumedPct >= 80) {
    const superAdmins = (Deno.env.get('SUPER_ADMIN_EMAILS') || '').split(',').map(e => e.trim()).filter(Boolean);
    for (const email of superAdmins) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `⚠️ [ChatMarket] Twilio残高アラート — ${consumedPct}%消費`,
        body: `Twilioの無料クレジットを${consumedPct}%消費しました。\n\n残高: $${balance} ${currency}\n消費額: $${consumed.toFixed(2)}\n\n有料プランへのアップグレードをご検討ください。\nhttps://console.twilio.com/`,
      });
    }
    console.log(`[Twilio Cost] ⚠️ アラートメール送信 → ${superAdmins.join(', ')}`);
    result.alert_sent = true;
  }

  return Response.json(result);
});