/**
 * setAdminRole — 指定メールアドレスのユーザーに admin ロールを付与する
 * ※ この関数はBase44ダッシュボードのテスト実行から呼び出す一時的な修復ツール
 * ※ 環境変数 SUPER_ADMIN_EMAILS に含まれるメールのみ対象に絞る（セキュリティ）
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const body = await req.json().catch(() => ({}));
    const targetEmail = body.email;

    if (!targetEmail) {
      return Response.json({ error: 'email パラメータが必要です' }, { status: 400 });
    }

    // 許可リスト: SUPER_ADMIN_EMAILS に含まれるメールのみ
    const allowedEmails = (Deno.env.get('SUPER_ADMIN_EMAILS') || '')
      .split(',').map(e => e.trim()).filter(Boolean);

    if (allowedEmails.length > 0 && !allowedEmails.includes(targetEmail)) {
      return Response.json({ error: `${targetEmail} は SUPER_ADMIN_EMAILS に登録されていません` }, { status: 403 });
    }

    // ユーザーを検索
    const users = await base44.asServiceRole.entities.User.filter({ email: targetEmail });
    if (!users || users.length === 0) {
      return Response.json({ error: `ユーザーが見つかりません: ${targetEmail}` }, { status: 404 });
    }

    const targetUser = users[0];

    if (targetUser.role === 'admin') {
      return Response.json({ success: true, message: `${targetEmail} はすでに admin です`, role: 'admin' });
    }

    // admin ロールを付与
    await base44.asServiceRole.entities.User.update(targetUser.id, { role: 'admin' });

    console.log(`[setAdminRole] ✅ ${targetEmail} → role: admin`);

    return Response.json({
      success: true,
      message: `${targetEmail} に admin ロールを付与しました`,
      userId: targetUser.id,
      role: 'admin',
    });

  } catch (error) {
    console.error('[setAdminRole] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});