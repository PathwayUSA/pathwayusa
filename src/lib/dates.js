// Shared date helpers for date-only (no time) ISO strings like "2026-03-05",
// as used by deadlines and document-expiry dates. The T12:00:00 anchor avoids
// the date shifting by a day depending on the viewer's timezone.

export function formatDate(iso) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export function daysUntil(iso) {
  return Math.ceil((new Date(iso + 'T12:00:00') - new Date()) / 86400000);
}

// Shared traffic-light colors for "how urgent is this" indicators. Screens
// still choose their own day thresholds (a 90-day visa vs. a 2-year green
// card renewal reasonably mean different urgency windows) — only the colors
// themselves are centralized here.
export const URGENCY_COLORS = {
  ok:   '#27AE60',
  soon: '#E67E22',
  now:  '#E74C3C',
};
