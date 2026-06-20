import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, channelArn: directArn } = await req.json();

    // channelArnが渡されていない場合は早期リターン
    if (!directArn && !streamId) {
      return Response.json({ skipped: true, reason: "no_channelArn" }, { status: 200 });
    }

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');

    // channelArn を streamId から動的取得、または直接指定
    let channelArn = directArn;
    if (!channelArn && streamId) {
      const streams = await base44.asServiceRole.entities.LiveStream.filter({ id: streamId });
      channelArn = streams[0]?.ivs_channel_arn;
    }
    if (!channelArn) {
      return Response.json({ skipped: true, reason: "no_channelArn" }, { status: 200 });
    }

    // アクティブなストリームが存在するか確認（直近48h以内 or is_live=true or live/starting状態）
    const now48hAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const liveStreams = await base44.asServiceRole.entities.LiveStream.filter({ status: "live" });
    const startingStreams = await base44.asServiceRole.entities.LiveStream.filter({ status: "starting" });
    const hasActiveStream = liveStreams.length > 0 || startingStreams.length > 0;

    if (!hasActiveStream && !directArn) {
      return Response.json({ skipped: true, reason: "no_active_streams", checked: 0 }, { status: 200 });
    }

    async function sha256Hex(message) {
      const msgBuffer = new TextEncoder().encode(message);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
    }

    async function hmacKey(key, message) {
      const keyBuffer = typeof key === "string" ? new TextEncoder().encode(key) : key;
      const cryptoKey = await crypto.subtle.importKey("raw", keyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const msgBuffer = new TextEncoder().encode(message);
      const sig = await crypto.subtle.sign("HMAC", cryptoKey, msgBuffer);
      return new Uint8Array(sig);
    }

    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const body = JSON.stringify({ channelArn });
    const host = `ivs.${region}.amazonaws.com`;
    const bodyHash = await sha256Hex(body);
    const canonicalHeaders = `content-type:application/json\nhost:${host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-date";
    const canonicalRequest = ["POST", "/GetStream", "", canonicalHeaders, signedHeaders, bodyHash].join("\n");
    const credentialScope = `${dateStamp}/${region}/ivs/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

    const kDate = await hmacKey("AWS4" + secretAccessKey, dateStamp);
    const kRegion = await hmacKey(kDate, region);
    const kService = await hmacKey(kRegion, "ivs");
    const kSigning = await hmacKey(kService, "aws4_request");
    const signingKey = await crypto.subtle.importKey("raw", kSigning, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBytes = await crypto.subtle.sign("HMAC", signingKey, new TextEncoder().encode(stringToSign));
    const signature = Array.from(new Uint8Array(sigBytes)).map(b => b.toString(16).padStart(2, "0")).join("");
    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const res = await fetch(`https://${host}/GetStream`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Amz-Date": amzDate, "Authorization": authHeader },
      body,
    });

    const data = await res.json();
    const streamState = data.stream?.state || "NOT_STREAMING";
    const isSignalReceived = streamState === "LIVE";

    console.log(`[checkIvsStreamStatus] ARN=${channelArn} State=${streamState} Health=${data.stream?.health}`);

    return Response.json({
      http_status: res.status,
      stream_state: streamState,
      stream_health: data.stream?.health || "UNKNOWN",
      viewer_count: data.stream?.viewerCount || 0,
      started_at: data.stream?.startTime,
      signal_received: isSignalReceived, // PRISMから信号が届いているか
    });
  } catch (error) {
    console.error('[checkIvsStreamStatus] Error:', error);
    return Response.json({ error: error.message, stream_state: 'NOT_STREAMING' }, { status: 500 });
  }
});