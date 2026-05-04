import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const region = Deno.env.get('AWS_REGION') || 'ap-northeast-1';
    const accessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID');
    const secretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY');
    const channelArn = "arn:aws:ivs:ap-northeast-1:813372611580:channel/pVdn6DgvnSMG";

    // AWS Signature V4
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);

    const body = JSON.stringify({ channelArn });
    const url = `https://ivs.${region}.amazonaws.com/GetStream`;

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

    const bodyHash = await sha256Hex(body);
    const host = `ivs.${region}.amazonaws.com`;
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

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Date": amzDate,
        "Authorization": authHeader,
      },
      body,
    });

    const data = await res.json();
    console.log(`[checkIvsStreamStatus] Status: ${res.status}`, JSON.stringify(data));

    return Response.json({ 
      http_status: res.status, 
      stream_state: data.stream?.state || "NOT_STREAMING",
      stream_health: data.stream?.health || "UNKNOWN",
      viewer_count: data.stream?.viewerCount,
      started_at: data.stream?.startTime,
      raw: data 
    });
  } catch (error) {
    console.error('[checkIvsStreamStatus] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});