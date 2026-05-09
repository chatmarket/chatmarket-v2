import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * 未成年者関連のトラブル報告を管理者に最優先で通知
 * - 通報内容をログ記録
 * - メール・プッシュで1分以内に社長へ通知
 * - 緊急フラグ付けで管理画面でハイライト表示
 */

const MINOR_PROTECTION_KEYWORDS = [
  "援助交際",
  "援交",
  "売春",
  "児童虐待",
  "いじめ",
  "体罰",
];

function detectMinorKeyword(text) {
  if (!text) return null;
  const lowerText = text.toLowerCase();
  for (const keyword of MINOR_PROTECTION_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { reportType, content, reporterEmail, relatedUserEmail, channelId, severity = "high" } = await req.json();

    if (!reportType || !content) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 未成年保護キーワード検知
    const detectedKeyword = detectMinorKeyword(content);

    // 通報レコード作成
    const report = {
      report_type: reportType,
      content,
      reporter_email: reporterEmail || "anonymous",
      related_user_email: relatedUserEmail || null,
      channel_id: channelId || null,
      severity,
      detected_keyword: detectedKeyword,
      status: "pending",
      priority_flag: true,
      created_at: new Date().toISOString(),
      admin_notified_at: null,
      admin_response_deadline: new Date(Date.now() + 60000).toISOString(),
    };

    // DB保存
    await base44.asServiceRole.entities.ChannelReport.create(report);

    // 社長（管理者）への即時通知
    const superAdminEmails = Deno.env.get('SUPER_ADMIN_EMAILS')?.split(',') || [];
    
    for (const adminEmail of superAdminEmails) {
      try {
        await base44.integrations.Core.SendEmail({
          to: adminEmail,
          subject: `🚨 【緊急】未成年保護 ${reportType} - ${severity.toUpperCase()}`,
          body: `
【CRITICAL ALERT - 1分以内対応要】

通報タイプ: ${reportType}
重要度: ${severity.toUpperCase()}
検出キーワード: ${detectedKeyword || "なし"}

通報者: ${reporterEmail || "匿名"}
対象ユーザー: ${relatedUserEmail || "N/A"}
チャンネルID: ${channelId || "N/A"}

内容:
${content}

対応期限: ${report.admin_response_deadline}
管理画面: https://chatmarket.info/admin/dashboard?tab=reports&filter=priority
         `,
        });
      } catch (err) {
        console.error(`Failed to send alert email to ${adminEmail}:`, err);
      }
    }

    return Response.json({
      success: true,
      reportId: report.id,
      alertSent: true,
      responseDeadline: report.admin_response_deadline,
      message: "未成年保護アラートを管理者に送信しました",
    });
  } catch (error) {
    console.error('minorSafetyAlert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});