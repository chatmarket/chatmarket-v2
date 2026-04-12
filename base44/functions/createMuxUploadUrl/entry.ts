// DEPRECATED: MUX has been removed. This function is a no-op stub.
// Use uploadToS3 instead.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  return Response.json({ error: 'MUX has been removed. Use uploadToS3 instead.' }, { status: 410 });
});