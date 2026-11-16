// news-ingest — reads OFFICIAL immigration sources and writes an educational
// plain-language summary with AI. Items auto-publish immediately UNLESS the
// AI or our own keyword check thinks the notice is substantially about
// removal/deportation, detention, asylum, or criminal matters — those always
// wait for a news admin to tap Publish in the NewsReview screen, no matter
// how clean the summary is. Enforcement/fraud press releases about a named
// person (arrests, convictions, denaturalization cases) are filtered out
// entirely before they ever reach the AI — see rules.ts.
//
// Sources (nothing else is ever accepted — see OFFICIAL_URL in rules.ts):
//   1. Federal Register API (rules, TPS designations, fee changes) — reliable
//   2. USCIS News Releases RSS — USCIS sometimes blocks automated readers;
//      if it does, we skip it quietly and rely on the Federal Register.
//
// Called by the cron job twice a day: POST {} with header x-cron-secret.
// Secrets: ANTHROPIC_API_KEY, NEWS_CRON_SECRET (own secret, not shared with
//          uscis-case-status — rotating it can't break that function's cron),
//          RESEND_API_KEY + NEWS_NOTIFY_EMAIL (email when something's held —
//          see notify.ts; both optional, notification is skipped if unset),
//          optional NEWS_AI_MODEL (default claude-sonnet-5)
// Deploy:  npx supabase@latest functions deploy news-ingest --no-verify-jwt --use-api

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAi, expiresAt, FrDoc, isEnforcementPressRelease, isNewsworthyFr, mentionsSensitiveTopic, OFFICIAL_URL, parseYoutubeFeed, SYSTEM_PROMPT } from "./rules.ts";
import { notifyHeldForReview } from "./notify.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = Deno.env.get("NEWS_AI_MODEL") ?? "claude-sonnet-5";
const MAX_NEW_PER_RUN = 8; // keeps AI cost small and predictable

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

type Candidate = {
  source: "federal_register" | "uscis";
  source_id: string;
  source_url: string;
  source_title: string;
  published_at: string;
  official_text: string;   // what the AI is allowed to use
  effective_on?: string | null;
};

// ── 1. Federal Register ─────────────────────────────────────────────────────
async function fromFederalRegister(): Promise<Candidate[]> {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const p = new URLSearchParams();
  for (const a of ["u-s-citizenship-and-immigration-services", "homeland-security-department", "state-department"]) {
    p.append("conditions[agencies][]", a);
  }
  p.set("conditions[publication_date][gte]", since);
  for (const f of ["title", "type", "abstract", "document_number", "publication_date", "html_url", "raw_text_url", "effective_on"]) {
    p.append("fields[]", f);
  }
  p.set("per_page", "100");
  p.set("order", "newest");
  const res = await fetch(`https://www.federalregister.gov/api/v1/documents.json?${p}`);
  if (!res.ok) throw new Error(`Federal Register ${res.status}`);
  const data = await res.json();
  const docs: (FrDoc & { raw_text_url?: string })[] = data.results ?? [];
  const out: Candidate[] = [];
  for (const d of docs.filter(isNewsworthyFr)) {
    let body = "";
    if (d.raw_text_url) {
      try { body = (await (await fetch(d.raw_text_url)).text()).slice(0, 14000); } catch { /* abstract only */ }
    }
    out.push({
      source: "federal_register",
      source_id: `fr:${d.document_number}`,
      source_url: d.html_url,
      source_title: d.title,
      published_at: new Date(`${d.publication_date}T12:00:00Z`).toISOString(),
      official_text: `TITLE: ${d.title}\nTYPE: ${d.type}\nPUBLISHED: ${d.publication_date}\nEFFECTIVE: ${d.effective_on ?? "not stated"}\nSUMMARY: ${d.abstract ?? "none"}\n\nTEXT:\n${body}`,
      effective_on: d.effective_on,
    });
  }
  return out;
}

// ── 2. USCIS news releases (RSS) ────────────────────────────────────────────
function tag(xml: string, name: string) {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return (m?.[1] ?? "").replace(/<!\[CDATA\[|\]\]>/g, "").trim();
}
const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

async function fromUscisRss(): Promise<Candidate[]> {
  const res = await fetch("https://www.uscis.gov/news/rss-feed/23269", {
    headers: { "User-Agent": "PathwayUSA news reader (contact via pathwayusa.app)", Accept: "application/rss+xml, application/xml" },
  });
  if (!res.ok) { console.log("USCIS RSS unavailable:", res.status); return []; }
  const xml = await res.text();
  const items = xml.split(/<item>/i).slice(1).map((chunk) => chunk.split(/<\/item>/i)[0]);
  const cutoff = Date.now() - 14 * 864e5;
  const out: Candidate[] = [];
  for (const it of items) {
    const link = tag(it, "link");
    const pub = Date.parse(tag(it, "pubDate"));
    if (!OFFICIAL_URL.test(link) || !pub || pub < cutoff) continue;
    const title = stripHtml(tag(it, "title"));
    const description = stripHtml(tag(it, "description")).slice(0, 8000);
    // USCIS's own news feed carries enforcement/fraud press releases
    // alongside policy news — filter those out entirely, same as Federal
    // Register candidates.
    if (isEnforcementPressRelease(`${title} ${description}`)) continue;
    out.push({
      source: "uscis",
      source_id: `uscis:${link}`,
      source_url: link,
      source_title: title,
      published_at: new Date(pub).toISOString(),
      official_text: `TITLE: ${title}\nPUBLISHED: ${new Date(pub).toISOString().slice(0, 10)}\n\nTEXT:\n${description}`,
    });
  }
  return out;
}

// ── 3. Official YouTube channels ────────────────────────────────────────────
// Reads only channels listed in video_channels (filled in by you). Returns the
// recent videos so the AI can match one to a news item.
async function syncVideos(): Promise<{ id: string; title: string }[]> {
  const { data: channels } = await admin.from("video_channels").select("*").eq("active", true).not("channel_id", "is", null);
  const cutoff = Date.now() - 60 * 864e5;
  for (const ch of channels ?? []) {
    try {
      const res = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${ch.channel_id}`);
      if (!res.ok) { console.log("YouTube feed", ch.key, res.status); continue; }
      const rows = parseYoutubeFeed(await res.text())
        .filter((v) => Date.parse(v.published) > cutoff)
        .map((v) => ({ youtube_id: v.id, channel_key: ch.key, title: v.title, published_at: v.published, lang: ch.lang }));
      if (rows.length) await admin.from("news_videos").upsert(rows, { onConflict: "youtube_id", ignoreDuplicates: true });
    } catch (e) { console.log("YouTube feed error", ch.key, String(e)); }
  }
  const { data: recent } = await admin.from("news_videos").select("youtube_id, title")
    .eq("status", "published").gte("published_at", new Date(cutoff).toISOString())
    .order("published_at", { ascending: false }).limit(40);
  return (recent ?? []).map((v: any) => ({ id: v.youtube_id, title: v.title }));
}

// ── 4. AI summary ───────────────────────────────────────────────────────────
async function summarize(c: Candidate, videos: { id: string; title: string }[]) {
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content:
        `Official text from ${c.source_url}:\n\n${c.official_text}\n\n` +
        `OFFICIAL VIDEOS (id: title):\n${videos.length ? videos.map((v) => `${v.id}: ${v.title}`).join("\n") : "none"}` }],
    }),
  });
  if (!res.ok) throw new Error(`AI ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const data = await res.json();
  const text = (data.content ?? []).map((b: any) => b.text ?? "").join("");
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  return JSON.parse(text.slice(start, end + 1));
}

serve(async (req) => {
  const secret = Deno.env.get("NEWS_CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Unauthorized" }, 401);

  const report = { candidates: 0, auto_published: 0, held_for_review: 0, skipped: 0, errors: [] as string[] };

  // Expire old items
  await admin.from("news_items").update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("status", "published").lt("expires_at", new Date().toISOString());

  let videos: { id: string; title: string }[] = [];
  try { videos = await syncVideos(); } catch (e) { report.errors.push(`videos: ${String(e)}`); }

  let candidates: Candidate[] = [];
  for (const load of [fromFederalRegister, fromUscisRss]) {
    try { candidates = candidates.concat(await load()); }
    catch (e) { report.errors.push(String(e)); }
  }
  report.candidates = candidates.length;
  if (!candidates.length) return json({ ...report, videos: videos.length });

  // Skip anything we've already processed (published, hidden or skipped)
  const { data: seen } = await admin.from("news_items").select("source_id").in("source_id", candidates.map((c) => c.source_id));
  const seenIds = new Set((seen ?? []).map((r: any) => r.source_id));
  const fresh = candidates.filter((c) => !seenIds.has(c.source_id)).slice(0, MAX_NEW_PER_RUN);

  for (const c of fresh) {
    try {
      const checked = checkAi(await summarize(c, videos), videos.map((v) => v.id));
      const base = {
        source: c.source, source_id: c.source_id, source_url: c.source_url,
        source_title: c.source_title, published_at: c.published_at, ai_model: MODEL,
      };
      if (!checked.ok) {
        const held = checked.reason.includes("review");
        await admin.from("news_items").insert({ ...base, status: held ? "hidden" : "skipped", hidden_reason: checked.reason });
        if (held) {
          report.held_for_review++;
          await notifyHeldForReview({ title: c.source_title, reason: checked.reason, sourceUrl: c.source_url });
        } else {
          report.skipped++;
        }
        continue;
      }
      const v = checked.value;
      // Auto-publish unless the AI flagged it sensitive OR our own keyword
      // check independently thinks it touches removal/detention/asylum/
      // criminal matters — either signal alone is enough to hold it, since
      // getting this wrong in the "should have held it" direction is the
      // only safe failure mode.
      const sensitive = v.sensitive || mentionsSensitiveTopic(c.official_text);
      const status = sensitive ? "hidden" : "published";
      await admin.from("news_items").insert({
        ...base,
        headline: v.headline, kind: v.kind, summary: v.summary, who_affected: v.who_affected,
        examples: v.examples, questions: v.questions, audience: v.audience,
        deadline: v.deadline, effective_date: v.effective_date ?? c.effective_on ?? null,
        video_id: v.video_id,
        status,
        hidden_reason: sensitive ? "Sensitive topic — awaiting admin review" : null,
        expires_at: expiresAt(c.published_at, v.deadline),
      });
      if (sensitive) {
        report.held_for_review++;
        await notifyHeldForReview({ title: v.headline || c.source_title, reason: "Sensitive topic", sourceUrl: c.source_url });
      } else {
        report.auto_published++;
      }
    } catch (e) {
      report.errors.push(`${c.source_id}: ${String(e).slice(0, 200)}`);
    }
  }
  return json({ ...report, videos: videos.length });
});
