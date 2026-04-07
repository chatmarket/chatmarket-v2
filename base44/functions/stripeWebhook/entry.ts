import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const signature = req.headers.get('stripe-signature');
    const body = await req.text();
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !webhookSecret) {
      return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    // Verify Stripe webhook signature
    const encoder = new TextEncoder();
    const [timestamp, signedContent] = signature.split(',')[0].split('=')[1] + ',' + signature.split(',')[1].split('=')[1];
    const parts = signature.split(',');
    const timestampPart = parts[0].split('=')[1];
    const signaturePart = parts[1].split('=')[1];

    const signedData = `${timestampPart}.${body}`;
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(webhookSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      new Uint8Array(Buffer.from(signaturePart, 'hex')),
      encoder.encode(signedData)
    );

    if (!isValid) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const event = JSON.parse(body);
    const base44 = createClientFromRequest(req);

    // Handle payment success
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const { videoId, userEmail } = session.metadata;

      if (videoId && userEmail) {
        // Create purchase record
        await base44.asServiceRole.entities.Purchase.create({
          item_type: 'video',
          item_id: videoId,
          amount: session.amount_total / 100,
          buyer_email: userEmail,
          status: 'completed',
          stripe_session_id: session.id,
        });
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});