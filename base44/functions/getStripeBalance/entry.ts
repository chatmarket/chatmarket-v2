import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.email !== "unei@chatmarket.info") {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const stripeApiKey = Deno.env.get("STRIPE_API_KEY");
    if (!stripeApiKey) {
      return Response.json({ error: 'Stripe API key not configured' }, { status: 400 });
    }

    // Fetch balance from Stripe
    const balanceResponse = await fetch("https://api.stripe.com/v1/balance", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${stripeApiKey}`,
        "Content-Type": "application/x-www-form-urlencoded"
      }
    });

    if (!balanceResponse.ok) {
      return Response.json({ error: 'Failed to fetch Stripe balance' }, { status: 500 });
    }

    const balanceData = await balanceResponse.json();

    // Calculate totals from available and pending balances
    const available = balanceData.available || [];
    const pending = balanceData.pending || [];

    const availableJPY = available.find((b) => b.currency === "jpy")?.amount || 0;
    const pendingJPY = pending.find((b) => b.currency === "jpy")?.amount || 0;

    return Response.json({
      available: availableJPY / 100, // Convert from cents
      pending: pendingJPY / 100,
      total: (availableJPY + pendingJPY) / 100,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});