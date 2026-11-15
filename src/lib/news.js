import { supabase } from './supabase';

// Immigration news — only official sources, summarized for education.
// Reading is open to signed-in users; hiding is limited to news admins by RLS.

export const KIND_STYLE = {
  good:     { label: 'Good news', icon: 'sunny',        fg: '#067647', bg: '#ECFDF3' },
  change:   { label: 'Change',    icon: 'swap-horizontal', fg: '#B45309', bg: '#FFF7E6' },
  deadline: { label: 'Deadline',  icon: 'alarm',        fg: '#B42318', bg: '#FEF3F2' },
};

export const SOURCE_LABEL = {
  federal_register: 'Federal Register',
  uscis: 'USCIS',
  state: 'U.S. State Department',
  dhs: 'Department of Homeland Security',
};

export async function fetchNews(limit = 30) {
  const { data, error } = await supabase
    .from('news_items')
    .select('*, video:news_videos(youtube_id, title, lang)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data ?? [];
}

/** Latest official explainer videos (for the "Watch" row). */
export async function fetchVideos(limit = 10) {
  const { data } = await supabase
    .from('news_videos')
    .select('youtube_id, title, lang, published_at, channel:video_channels(name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(limit);
  return data ?? [];
}

/**
 * Does this item probably concern this person? Used only to sort and to show
 * a gentle "May affect you" tag — never to hide news from anyone.
 */
export function mayAffect(item, { status, goals = [], country } = {}) {
  const a = item?.audience ?? {};
  if (a.all) return true;
  if (status && (a.statuses ?? []).includes(status)) return true;
  if ((a.goals ?? []).some((g) => goals.includes(g))) return true;
  if (country && (a.countries ?? []).some((c) => c.toLowerCase() === String(country).toLowerCase())) return true;
  return false;
}

/** Items that may affect the person first, then newest. */
export function sortForUser(items, ctx) {
  return [...items].sort((x, y) => {
    const mx = mayAffect(x, ctx) ? 1 : 0;
    const my = mayAffect(y, ctx) ? 1 : 0;
    if (mx !== my) return my - mx;
    return Date.parse(y.published_at) - Date.parse(x.published_at);
  });
}

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export async function reportNews(newsId, userId, reason) {
  return supabase.from('news_flags').insert({ news_id: newsId, user_id: userId, reason: reason?.slice(0, 500) || null });
}

// ── Admin ──────────────────────────────────────────────────────────────────
export async function isNewsAdmin(userId) {
  if (!userId) return false;
  const { data } = await supabase.from('news_admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !!data;
}

export async function fetchAdminNews() {
  const [{ data: items }, { data: flags }] = await Promise.all([
    supabase.from('news_items').select('*').in('status', ['published', 'hidden']).order('published_at', { ascending: false }).limit(60),
    supabase.from('news_flags').select('news_id, reason, created_at'),
  ]);
  const byItem = {};
  for (const f of flags ?? []) (byItem[f.news_id] ??= []).push(f);
  return (items ?? []).map((i) => ({ ...i, flags: byItem[i.id] ?? [] }));
}

export async function setNewsStatus(id, status, reason = null) {
  return supabase.from('news_items')
    .update({ status, hidden_reason: status === 'hidden' ? (reason ?? 'Hidden by admin') : null, updated_at: new Date().toISOString() })
    .eq('id', id);
}
