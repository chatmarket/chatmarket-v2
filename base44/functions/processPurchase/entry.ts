import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import {
  calculateVideoPurchasePayment,
  calculateLiveTicketPayment,
  calculateYellCoinPayment,
  calculateMonthlyGrossRevenue,
} from '../lib/pricing.js';

/**
 * 購入処理を実行し、支払い情報を記録
 * 対応: ビデオ購入、ライブチケット、エールコイン
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { item_type, item_id, amount } = await req.json();

    if (!item_type || !item_id || !amount) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 月間総売上を計算（プログレッシブインセンティブ適用用）
    const recentPurchases = await base44.asServiceRole.entities.Purchase.filter(
      { created_by: user.email },
      '-created_date',
      1000
    );

    // 当月の売上を抽出
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthPurchases = recentPurchases.filter((p) => p.created_date >= monthStart);

    const monthlyGrossRevenue = calculateMonthlyGrossRevenue(thisMonthPurchases);

    // 支払い種別に応じた計算
    let paymentDetails;
    switch (item_type) {
      case 'video':
        paymentDetails = calculateVideoPurchasePayment(amount, monthlyGrossRevenue);
        break;
      case 'livestream':
        paymentDetails = calculateLiveTicketPayment(amount, monthlyGrossRevenue);
        break;
      case 'yellcoin':
        paymentDetails = calculateYellCoinPayment(amount, monthlyGrossRevenue);
        break;
      default:
        return Response.json({ error: 'Invalid item_type' }, { status: 400 });
    }

    // 購入レコード作成
    const purchase = await base44.asServiceRole.entities.Purchase.create({
      item_type,
      item_id,
      amount: paymentDetails.grossAmount,
      buyer_email: user.email,
      status: 'pending', // Stripeで確認後にcompleted
    });

    // 決済情報を別途保存（内部参照用）
    // 本来はStripeイベントハンドラーで更新される想定
    const paymentRecord = {
      purchase_id: purchase.id,
      gross_amount: paymentDetails.grossAmount,
      platform_fee: paymentDetails.platformFee,
      after_platform_fee: paymentDetails.afterPlatformFee,
      progressive_rate: paymentDetails.progressiveRate,
      final_payment: paymentDetails.finalPayment,
      created_at: new Date().toISOString(),
    };

    return Response.json({
      purchase_id: purchase.id,
      payment_details: paymentDetails,
      payment_record: paymentRecord,
    });
  } catch (error) {
    console.error('Purchase processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});