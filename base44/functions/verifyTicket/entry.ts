import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { qrPayload, staffEmail } = await req.json();
  if (!qrPayload) return Response.json({ valid: false, error: 'no_payload' });

  // Decode base64 QR payload: ticketId|ownerEmail|timeSlot
  let ticketId, ownerEmail, timeSlot;
  try {
    const decoded = atob(qrPayload);
    [ticketId, ownerEmail, timeSlot] = decoded.split('|');
  } catch {
    return Response.json({ valid: false, error: 'invalid_format' });
  }

  // Check time slot validity: allow current slot and 1 slot back (±30s window)
  const currentSlot = Math.floor(Date.now() / 30000);
  const payloadSlot = parseInt(timeSlot, 10);
  if (Math.abs(currentSlot - payloadSlot) > 1) {
    return Response.json({ valid: false, error: 'expired_token' });
  }

  // Fetch ticket
  const tickets = await base44.asServiceRole.entities.DigitalTicket.filter({ id: ticketId });
  const ticket = tickets[0];

  if (!ticket) return Response.json({ valid: false, error: 'not_found' });

  // Verify ownership (anti-resale)
  if (ticket.owner_email !== ownerEmail) {
    return Response.json({ valid: false, error: 'owner_mismatch', ticket });
  }

  if (ticket.status === 'used') {
    return Response.json({ valid: false, error: 'already_used', ticket });
  }

  if (ticket.status === 'cancelled') {
    return Response.json({ valid: false, error: 'cancelled', ticket });
  }

  // Mark as used
  await base44.asServiceRole.entities.DigitalTicket.update(ticketId, {
    status: 'used',
    used_at: new Date().toISOString(),
    used_by_email: staffEmail || user.email,
  });

  ticket.status = 'used';
  ticket.used_at = new Date().toISOString();

  return Response.json({ valid: true, ticket });
});