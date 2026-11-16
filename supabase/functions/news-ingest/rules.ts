// Pure rules for the news feature (no network). Kept separate so they can be
// tested on their own.

export const OFFICIAL_URL = /^https:\/\/(www\.)?(federalregister\.gov|uscis\.gov|state\.gov|travel\.state\.gov|dhs\.gov)\//i;

export const STATUSES = ["citizen", "green_card", "tps", "visa", "student", "asylum", "other"] as const;
export const GOALS = ["green_card", "citizenship", "extend_renew", "family", "work_auth", "asylum", "renew_gc", "help_relative"] as const;

// Federal Register notices that are routine paperwork, not news for families.
const PAPERWORK = /information collection|currently approved collection|paperwork reduction|privacy act of 1974|system of records|advisory committee|meeting|sunshine act|comment request|correction$|; correction/i;

// Must mention immigration at all (DHS also publishes FEMA, TSA, Coast Guard…).
const IMMIGRATION = /immigra|visa|naturaliz|citizenship|asylum|refugee|parole|green card|permanent resident|employment authorization|work permit|temporary protected status|\btps\b|uscis|nonimmigrant|h-1b|daca|deferred action|deportation|removal|biometric|fee schedule|filing fee|adjustment of status|diversity|special immigrant/i;

// Notices worth showing even though they're not rules.
const NEWSWORTHY_NOTICE = /temporary protected status|designation of|termination of the designation|extension of the designation|parole|automatic extension|employment authorization|fee|registration|special immigrant|diversity|visa bulletin|processing/i;

// Press releases about a specific enforcement action against a named person —
// filtered out entirely, never inserted as a row at all (not even hidden).
// Targets case-outcome language (someone WAS arrested/convicted/sentenced),
// not general policy topics that merely mention "fraud" or "enforcement" —
// a rule change about fraud prevention is still eligible for the feed.
export const ENFORCEMENT_PRESS_RELEASE = /plead(?:ed|s)? guilty|pled guilty|guilty plea|\barrest(ed|s)?\b|\bcharged with\b|has been charged|have been charged|\bindict(ed|ment)?\b|federal grand jury|convicted of|\bconvict(ed|ion)?\b|\bsentenc(ed|ing)\b|denaturali[sz](e|ation|ed)|\bsmuggl(ing|er|ed)\b|\btraffick(ing|er|ed)\b|visa fraud scheme|marriage fraud scheme|fugitive from justice|u\.s\. attorney('|’)s office|department of justice announced|admits? to (immigration )?fraud|pleads? guilty|prison sentence|years in (federal )?prison/i;

// Removal/deportation/detention/asylum/criminal matters — never auto-published
// even when the AI summary is otherwise clean. These still go through AI
// summarization and get queued for review; they just can't skip the human
// step the way a routine fee-schedule notice can.
const SENSITIVE_TOPIC = /removal proceeding|notice to appear|deportation|\bdeport(ed|ation)?\b|detain(ed|er|ment)?\b|detention (facility|center)|asylum (seeker|claim|application|officer|interview)|credible fear|withholding of removal|criminal (history|record|conviction|charge|background|offense)|inadmissib(le|ility)|deportable|expedited removal/i;

/** Does this press release describe a specific enforcement action (arrest,
 * conviction, sentencing, denaturalization case)? These never enter the feed. */
export function isEnforcementPressRelease(text: string): boolean {
  return ENFORCEMENT_PRESS_RELEASE.test(text);
}

/** Heuristic, keyword-only check — used as a floor under the AI's own
 * `sensitive` classification, not a replacement for it. Either one saying
 * "sensitive" is enough to hold the item for review. */
export function mentionsSensitiveTopic(text: string): boolean {
  return SENSITIVE_TOPIC.test(text);
}

export interface FrDoc {
  document_number: string;
  title: string;
  type: string;            // "Rule" | "Proposed Rule" | "Notice" | "Presidential Document"
  abstract?: string | null;
  publication_date: string;
  html_url: string;
  effective_on?: string | null;
}

/** Should this Federal Register document be considered for the news feed? */
export function isNewsworthyFr(d: FrDoc): boolean {
  const text = `${d.title} ${d.abstract ?? ""}`;
  if (!OFFICIAL_URL.test(d.html_url)) return false;
  if (PAPERWORK.test(d.title)) return false;
  if (isEnforcementPressRelease(text)) return false;
  if (!IMMIGRATION.test(text)) return false;
  if (d.type === "Rule" || d.type === "Proposed Rule" || d.type === "Presidential Document") return true;
  return NEWSWORTHY_NOTICE.test(text);
}

export interface AiNews {
  relevant: boolean;
  headline: string;
  kind: "good" | "change" | "deadline";
  summary: string;
  who_affected: string;
  examples: { title: string; text: string }[];
  questions: string[];
  audience: { all: boolean; statuses: string[]; goals: string[]; countries: string[] };
  deadline: string | null;
  effective_date: string | null;
  video_id: string | null;
  sensitive: boolean;
}

// Direct instructions to the reader are not allowed — the app educates, it
// doesn't advise. Hypothetical examples can say what "Maria may" do.
const DIRECT_ADVICE = /\byou (should|must|need to|have to|are required to)\b|\bwe recommend\b|\bdo not apply\b/i;

/** Clean the AI's JSON and decide if it's safe to auto-publish. */
export function checkAi(raw: any, allowedVideoIds: string[] = []): { ok: true; value: AiNews } | { ok: false; reason: string } {
  if (!raw || typeof raw !== "object") return { ok: false, reason: "AI returned no data" };
  if (raw.relevant === false) return { ok: false, reason: "not relevant to individuals" };
  const str = (v: any, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
  const kind = ["good", "change", "deadline"].includes(raw.kind) ? raw.kind : "change";
  const date = (v: any) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  const arr = (v: any) => (Array.isArray(v) ? v : []);
  const value: AiNews = {
    relevant: true,
    headline: str(raw.headline, 120),
    kind,
    summary: str(raw.summary, 900),
    who_affected: str(raw.who_affected, 500),
    examples: arr(raw.examples).slice(0, 3)
      .map((e: any) => ({ title: str(e?.title, 80), text: str(e?.text, 600) }))
      .filter((e) => e.title && e.text),
    questions: arr(raw.questions).map((q: any) => str(q, 200)).filter(Boolean).slice(0, 4),
    audience: {
      all: raw.audience?.all === true,
      statuses: arr(raw.audience?.statuses).filter((s: string) => (STATUSES as readonly string[]).includes(s)),
      goals: arr(raw.audience?.goals).filter((g: string) => (GOALS as readonly string[]).includes(g)),
      countries: arr(raw.audience?.countries).map((c: any) => str(c, 60)).filter(Boolean).slice(0, 20),
    },
    deadline: date(raw.deadline),
    effective_date: date(raw.effective_date),
    // Only accept a video we actually offered (from an official channel).
    video_id: typeof raw.matching_video_id === "string" && allowedVideoIds.includes(raw.matching_video_id)
      ? raw.matching_video_id : null,
    // Fail closed: anything other than an explicit `false` is treated as
    // sensitive, so a malformed or missing field holds for review rather
    // than silently auto-publishing.
    sensitive: raw.sensitive !== false,
  };
  if (!value.headline || !value.summary) return { ok: false, reason: "summary missing" };
  if (kind === "deadline" && !value.deadline) value.kind = "change"; // never claim a deadline the text didn't give
  const allText = [value.headline, value.summary, value.who_affected, ...value.questions].join(" ");
  if (DIRECT_ADVICE.test(allText)) return { ok: false, reason: "contains direct advice — needs review" };
  return { ok: true, value };
}

/** How long an item stays in the feed. */
export function expiresAt(publishedISO: string, deadline: string | null): string {
  const base = Date.parse(publishedISO) + 90 * 864e5;
  const dl = deadline ? Date.parse(deadline) + 14 * 864e5 : 0;
  return new Date(Math.max(base, dl)).toISOString();
}

export const SYSTEM_PROMPT = `You write short, plain-language explanations of official U.S. immigration announcements for PathwayUSA, an app used by immigrants, many of whom read English as a second language.

Rules:
- Use ONLY the official text provided. Never add facts, dates, numbers or names that are not in it. If something is unclear, say "The official notice does not say."
- Educate, never advise. Do not tell the reader what to do. Never write "you should", "you must", "you need to", or "we recommend". Describe what the change means for people in different situations.
- Write at a 6th-grade reading level. Short sentences. Explain any form numbers in plain words (for example "Form N-400, the citizenship application").
- Be calm and neutral. No political opinion, no alarming words.
- Examples are made-up people (use simple first names) in hypothetical situations, showing how the change could apply. Say "may" or "could", because individual cases differ.
- Questions help the reader think about their own situation, for example "When does your work permit expire?"
- Mark relevant=false for routine paperwork, internal agency matters, or anything that does not change anything for individual immigrants or their families.

Reply with JSON only, no other text, in exactly this shape:
{
  "relevant": true,
  "headline": "plain-language title, max 12 words",
  "kind": "good" | "change" | "deadline",
  "summary": "2-4 sentences: what happened",
  "who_affected": "1-2 sentences: who this may affect",
  "examples": [{ "title": "Maria, TPS holder from Haiti", "text": "2-3 sentences" }],
  "questions": ["...", "..."],
  "audience": {
    "all": false,
    "statuses": [subset of "citizen","green_card","tps","visa","student","asylum","other"],
    "goals": [subset of "green_card","citizenship","extend_renew","family","work_auth","asylum","renew_gc","help_relative"],
    "countries": ["country names exactly as commonly written, only if the notice names specific countries"]
  },
  "deadline": "YYYY-MM-DD only if the notice states a date people must act by, else null",
  "effective_date": "YYYY-MM-DD if stated, else null",
  "matching_video_id": "the id of one video from the OFFICIAL VIDEOS list that explains this same announcement, or null",
  "sensitive": true | false
}
Only pick a video if its title clearly covers the same topic. When in doubt, use null.
"kind" is "good" for changes that make things easier (fee waivers, extensions, new benefits), "deadline" only when the notice states a date people must act by, otherwise "change".
"sensitive" is true if the notice is substantially about removal or deportation, immigration detention, asylum or refugee claims, or criminal history/background checks — these always wait for a human to publish them, even when your summary is otherwise fine. A rule that only tangentially touches one of these (for example, a fee-schedule update that lists asylum applications among many other form types) is not sensitive on that basis alone — judge the notice's actual subject, not every word it contains. If genuinely unsure, answer true.`;

/** Parse a YouTube channel RSS feed into videos. */
export function parseYoutubeFeed(xml: string): { id: string; title: string; published: string }[] {
  return xml.split(/<entry>/i).slice(1).map((e) => {
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) ?? [])[1] ?? "";
    const title = ((e.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? "")
      .replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
    const published = (e.match(/<published>([^<]+)<\/published>/) ?? [])[1] ?? "";
    return { id, title, published };
  }).filter((v) => /^[A-Za-z0-9_-]{11}$/.test(v.id) && v.title && !Number.isNaN(Date.parse(v.published)));
}
