import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

/**
 * プログレッシブインセンティブ率を計算
 */
function getProgressiveRate(monthlyGrossRevenue) {
  if (monthlyGrossRevenue > 20000000) return 0.95;
  if (monthlyGrossRevenue > 19500000) return 0.94;
  if (monthlyGrossRevenue > 18000000) return 0.93;
  if (monthlyGrossRevenue > 16500000) return 0.92;
  if (monthlyGrossRevenue > 15000000) return 0.91;
  if (monthlyGrossRevenue > 12000000) return 0.90;
  if (monthlyGrossRevenue > 9000000) return 0.89;
  if (monthlyGrossRevenue > 6000000) return 0.88;
  if (monthlyGrossRevenue > 3000000) return 0.87;
  if (monthlyGrossRevenue > 2000000) return 0.86;
  return 0.85;
}

/**
 * 支払い金額を計算
 */
function calculatePayment(amount, platformFeeRate, monthlyGrossRevenue = 0) {
  const grossAmount = Math.floor(amount);
  const platformFee = Math.floor(grossAmount * platformFeeRate);
  const afterPlatformFee = grossAmount - platformFee;
  const progressiveRate = getProgressiveRate(monthlyGrossRevenue);
  const finalPayment = Math.floor(afterPlatformFee * progressiveRate);

  return {
    grossAmount,
    platformFee,
    afterPlatformFee,
    progressiveRate,
    finalPayment,
  };
}

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

    // 月間総売上を計算
    const recentPurchases = await base44.asServiceRole.entities.Purchase.filter(
      { created_by: user.email },
      '-created_date',
      1000
    );

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const thisMonthPurchases = recentPurchases.filter((p) => p.created_date >= monthStart);

    let monthlyGrossRevenue = 0;
    for (const p of thisMonthPurchases) {
      const rate = p.item_type === 'yellcoin' ? 0.10 : 0.15;
      const fee = Math.floor(p.amount * rate);
      monthlyGrossRevenue += p.amount - fee;
    }

    // 支払い種別に応じた計算
    let paymentDetails;
    const platformFeeRate = item_type === 'yellcoin' ? 0.10 : 0.15;
    paymentDetails = calculatePayment(amount, platformFeeRate, monthlyGrossRevenue);

    // 購入レコード作成
    const purchase = await base44.asServiceRole.entities.Purchase.create({
      item_type,
      item_id,
      amount: paymentDetails.grossAmount,
      buyer_email: user.email,
      status: 'pending',
    });

    return Response.json({
      purchase_id: purchase.id,
      payment_details: paymentDetails,
    });
  } catch (error) {
    console.error('Purchase processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});