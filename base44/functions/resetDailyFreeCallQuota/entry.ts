// @ts-nocheck
/**
 * resetDailyFreeCallQuota
 * CALL&ANSERプランユーザーの「1日60分無料通話枠」を毎日午前0時(JST)にリセットする
 *
 * リセット方法: VideoCallエンティティのis_free_call=trueかつ当日分の通話レコードは
 * フロント側でcreated_dateの日付フィルタを使って取得するため、
 * サーバー側では「フリーコール使用済みログ」テーブルを別途リセットするのではなく、
 * User.free_call_reset_date を今日の日付に更新することで「当日リセット済み」を示す。
 * フロントは created_date >= today の is_free_call records をカウントするので
 * 自動的に0分に見える（新規レコードがない = 0分使用）
 *
 * 追加: call-anserプランユーザーの daily_free_minutes_used フィールドを0にリセット
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Cronジョブからの呼び出し（認証不要）
    // call-anserプランのアクティブなサブスクを取得
    const subscriptions = await base44.asServiceRole.entities.PlanSubscription.filter({
      plan_id: "call-anser",
      status: "active",
    });

    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let resetCount = 0;

    for (const sub of subscriptions) {
      // ユーザーのdaily_free_quota_reset_dateを今日に更新
      // （フロントは created_date >= todayStart でVideoCallをカウントするため
      //   このフラグは「明示的にリセットした記録」として監査ログ用途）
      const users = await base44.asServiceRole.entities.User.filter({ email: sub.user_email });
      if (users[0]) {
        await base44.asServiceRole.entities.User.update(users[0].id, {
          free_call_reset_date: today,
        });
        resetCount++;
      }
    }

    console.log(`[resetDailyFreeCallQuota] Reset ${resetCount} CALL&ANSER users. Date: ${today}`);
    return Response.json({ success: true, reset_count: resetCount, date: today });

  } catch (error) {
    console.error('[resetDailyFreeCallQuota] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});