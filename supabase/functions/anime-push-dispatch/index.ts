// AnimeTrack 10.9 — opt-in reminder dispatcher, invoked by authenticated cron only.
// Deploy with verify_jwt=false ONLY because a private X-Cron-Secret is checked below.
// Requires VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, ANIMETRACK_CRON_SECRET and Supabase service role.
import { createClient } from "npm:@supabase/supabase-js@2.58.0";
import webpush from "npm:web-push@3.6.7";

function safeEqual(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  if (!x.length || x.length !== y.length) return false;
  let mismatch = 0;
  for (let i = 0; i < x.length; i++) mismatch |= x[i] ^ y[i];
  return mismatch === 0;
}
function permittedEndpoint(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length > 1024) return false;
  try {
    const url = new URL(raw), host = url.hostname.toLowerCase();
    return url.protocol === "https:" && !url.username && !url.password &&
      (host === "fcm.googleapis.com" || host === "updates.push.services.mozilla.com" ||
       host === "updates-autopush.stage.mozaws.net" || host.endsWith(".push.apple.com"));
  } catch { return false }
}
function stillWanted(job: any, payload: any): boolean {
  const prefs = payload?.preferences || {};
  if (!prefs.pushEnabled || !Object.prototype.hasOwnProperty.call(prefs.calendarReminders || {}, job.event_key)) return false;
  const anime = (payload?.anime || []).find((a: any) => a.id === job.anime_id);
  const season = anime?.seasons?.find((s: any) => s.id === job.season_id);
  return !!anime && !!season && !season.watched?.includes(job.episode) &&
    !((prefs.notificationMuted || []).includes("episodes"));
}
Deno.serve(async (request: Request) => {
  const expected = Deno.env.get("ANIMETRACK_CRON_SECRET") || "";
  if (request.method !== "POST" || expected.length < 32 ||
      !safeEqual(request.headers.get("X-Cron-Secret") || "", expected)) {
    return new Response("Unauthorized", { status: 401 });
  }
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";
  if (!url || !key || !publicKey || !privateKey) {
    return Response.json({ error: "Server secrets are not configured" }, { status: 503 });
  }
  webpush.setVapidDetails("https://animetrack-flax.vercel.app", publicKey, privateKey);
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = new Date(), stale = new Date(now.getTime()-10*60000).toISOString();
  // Recover claims abandoned by an interrupted invocation. Claiming is atomic per row.
  await admin.from("anime_push_reminders").update({ claimed_at: null })
    .lt("claimed_at", stale).is("sent_at", null);
  const { data: due, error: readError } = await admin.from("anime_push_reminders")
    .select("id,user_id,event_key,anime_id,season_id,episode,title,air_at,notify_at")
    .is("sent_at", null).is("claimed_at", null)
    .lte("notify_at", now.toISOString())
    .gte("air_at", new Date(now.getTime()-86400000).toISOString())
    .order("notify_at", { ascending: true }).limit(40);
  if (readError) return Response.json({ error: "Queue read failed" }, { status: 500 });
  let sent = 0, skipped = 0, failed = 0;
  for (const job of due || []) {
    const { data: claimed, error: claimError } = await admin.from("anime_push_reminders")
      .update({ claimed_at: new Date().toISOString() })
      .eq("id", job.id).is("claimed_at", null).is("sent_at", null)
      .select("id").maybeSingle();
    if (claimError || !claimed) continue;
    const { data: library } = await admin.from("anime_libraries").select("payload").eq("user_id", job.user_id).maybeSingle();
    if (!stillWanted(job, library?.payload)) {
      await admin.from("anime_push_reminders").update({ sent_at: new Date().toISOString() }).eq("id", job.id);
      skipped++;continue;
    }
    const { data: subs } = await admin.from("anime_push_subscriptions")
      .select("id,endpoint,p256dh,auth_key").eq("user_id", job.user_id).limit(10);
    let anySent = false;
    for (const sub of subs || []) {
      if (!permittedEndpoint(sub.endpoint)) { failed++;continue }
      try {
        const payload = JSON.stringify({
          title: "AnimeTrack · Kujtesa e episodit",
          body: String(job.title).slice(0,140) + " · EP " + job.episode,
          tag: "animetrack:" + job.event_key,
          url: "/?source=push"
        });
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key }
        }, payload, { TTL: 3600, urgency: "normal" });
        sent++;anySent=true;
      } catch (error) {
        const code = Number((error as {statusCode?:number}).statusCode || 0);
        if (code === 404 || code === 410) {
          await admin.from("anime_push_subscriptions").delete().eq("id", sub.id);
        }
        failed++;
      }
    }
    await admin.from("anime_push_reminders").update(
      anySent || !subs?.length ? { sent_at: new Date().toISOString() } : { claimed_at: null }
    ).eq("id", job.id);
  }
  return Response.json({ processed: (due || []).length, sent, skipped, failed }, {
    headers: { "Cache-Control": "no-store" }
  });
});
