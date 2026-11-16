// Sends an email whenever news-ingest holds an item for review, so it
// doesn't just sit silently until someone happens to open News Review.
//
// Secrets required:
//   RESEND_API_KEY     — from resend.com (free tier is enough for this volume)
//   NEWS_NOTIFY_EMAIL   — where the notification goes (realpathwayusa@gmail.com)
// Optional:
//   NEWS_NOTIFY_FROM    — defaults to Resend's shared test address, which
//                         works with no domain verification. Switch to an
//                         address on a verified domain later if you want.

const DEFAULT_FROM = "PathwayUSA News <onboarding@resend.dev>";

export async function notifyHeldForReview(item: { title: string; reason: string; sourceUrl: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const to = Deno.env.get("NEWS_NOTIFY_EMAIL");
  if (!apiKey || !to) {
    console.log("notifyHeldForReview: skipped — RESEND_API_KEY or NEWS_NOTIFY_EMAIL not set");
    return;
  }
  const from = Deno.env.get("NEWS_NOTIFY_FROM") || DEFAULT_FROM;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `News item held for review: ${item.title}`,
        text: `A new immigration news item is waiting for your review in PathwayUSA.\n\n` +
          `Title: ${item.title}\n` +
          `Held because: ${item.reason}\n` +
          `Official source: ${item.sourceUrl}\n\n` +
          `Review and publish it from Settings → News Review in the app.`,
      }),
    });
    if (!res.ok) console.log("notifyHeldForReview: Resend error", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.log("notifyHeldForReview: failed", String(e));
  }
}
