// AnimeTrack 10.9: public VAPID key discovery for authenticated users only.
// This endpoint does not reveal the VAPID private key or create subscriptions.
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};
Deno.serve((request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: cors });
  const key = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  if (!/^[A-Za-z0-9_-]{80,100}$/.test(key)) {
    return Response.json({ enabled: false, reason: "not_configured" }, { status: 503, headers: cors });
  }
  return Response.json({ enabled: true, publicKey: key }, {
    headers: cors
  });
});
