// AnimeTrack 10.9: public VAPID key discovery for authenticated users only.
// This endpoint does not reveal the VAPID private key or create subscriptions.
Deno.serve((request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const key = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(key)) {
    return Response.json({ enabled: false, reason: "not_configured" }, { status: 503 });
  }
  return Response.json({ enabled: true, publicKey: key }, {
    headers: { "Cache-Control": "no-store" }
  });
});
