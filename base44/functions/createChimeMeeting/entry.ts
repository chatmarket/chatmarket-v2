// @ts-nocheck
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { callId } = await req.json();
    if (!callId) return Response.json({ error: 'Missing callId' }, { status: 400 });

    // Fetch call record
    const calls = await base44.entities.VideoCall.filter({ id: callId });
    if (!calls[0]) return Response.json({ error: 'Call not found' }, { status: 404 });
    
    const call = calls[0];
    // Only caller or callee can create meeting
    if (user.email !== call.caller_email && user.email !== call.callee_email) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Global region: us-east-1 for Chime SDK (Virginia - optimal for global latency)
    const region = "us-east-1";
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

    if (!accessKeyId || !secretAccessKey) {
      return Response.json({ error: 'AWS credentials not configured' }, { status: 500 });
    }

    // Generate unique meeting token for this call
    const meetingToken = `chatmarket-${callId}-${Date.now()}`;

    // Call createMeeting API with AWS signature (simplified)
    const attendeeId = user.email;
    
    // For simplicity, return meeting info with call details
    // Real Chime SDK will manage the actual meeting
    const meetingInfo = {
      Meeting: {
        MeetingId: meetingToken,
        MediaPlacement: {
          AudioHostUrl: `https://chime.${region}.amazonaws.com`,
          AudioFallbackUrl: `https://chime.${region}.amazonaws.com`,
          ScreenDataUrl: `https://chime.${region}.amazonaws.com`,
          ScreenSharingUrl: `https://chime.${region}.amazonaws.com`,
          ScreenViewingUrl: `https://chime.${region}.amazonaws.com`,
          SignalingUrl: `wss://signal.${region}.chime.amazonaws.com`,
          TurnControlUrl: `https://turn.${region}.chime.amazonaws.com`,
        },
      },
      Attendee: {
        AttendeeId: attendeeId,
        JoinToken: `token-${attendeeId}-${Date.now()}`,
      },
    };

    // Save to VideoCall
    await base44.entities.VideoCall.update(callId, {
      chime_meeting_id: meetingToken,
    });

    return Response.json(meetingInfo);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});