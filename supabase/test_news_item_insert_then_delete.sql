-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPORARY TEST ROW — run the INSERT to see the Home screen news UI live,
-- then run the DELETE at the bottom when you're done. Do not leave this row
-- in the table; it's fabricated content, not a real news item.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.news_items (
  source, source_id, source_url, source_title, published_at,
  headline, kind, summary, who_affected, examples, questions,
  audience, status
) values (
  'uscis',
  'test:do-not-publish-for-real',
  'https://www.uscis.gov/test-item-do-not-publish',
  'TEST ITEM — safe to delete',
  now(),
  'TEST ITEM — delete me',
  'change',
  'This is a test row inserted to check the Home screen news UI. It is not real news and should be deleted, not published to real users.',
  'Nobody — this is a test.',
  '[]'::jsonb,
  '{}',
  '{"all": true, "statuses": [], "goals": [], "countries": []}'::jsonb,
  'published'
);

-- ── When you're done looking at it, run this to remove it: ──────────────────
-- delete from public.news_items where source_id = 'test:do-not-publish-for-real';
