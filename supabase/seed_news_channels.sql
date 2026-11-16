-- ═══════════════════════════════════════════════════════════════════════════
-- Seed video_channels with real channel IDs — run once in the Supabase SQL
-- Editor. Safe to re-run.
--
-- IDs verified directly against each channel's own canonical YouTube page
-- (not guessed, not taken from search results alone):
--   PathwayUSA — youtube.com/@PathwayUSA     → UCTN0kC-5yGgKOjw0CFXKCuw
--   USCIS      — youtube.com/@uscis          → UChm7CIhH8gLOH3YTP6HM0Hg
--   State Dept — youtube.com/@StateDept      → UC6ZhpmNnLxlOYipqh8wbM3A
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.video_channels (key, name, lang, channel_id) values
  ('pathwayusa', 'PathwayUSA', 'en', 'UCTN0kC-5yGgKOjw0CFXKCuw')
on conflict (key) do update set channel_id = excluded.channel_id, name = excluded.name;

update public.video_channels set channel_id = 'UChm7CIhH8gLOH3YTP6HM0Hg' where key = 'uscis';
update public.video_channels set channel_id = 'UC6ZhpmNnLxlOYipqh8wbM3A' where key = 'state';

-- Check the result:
select key, name, channel_id, lang, active from public.video_channels order by key;
