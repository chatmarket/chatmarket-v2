// DEPRECATED: MUX has been removed.
Deno.serve(async (req) => {
  return Response.json({ ok: true, message: 'MUX removed' });
});