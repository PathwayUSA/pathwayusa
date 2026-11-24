-- ═══════════════════════════════════════════════════════════════════════════
-- Schedule news-ingest to run twice a day — run once in the Supabase SQL
-- Editor. Safe to re-run (every statement is idempotent).
--
-- Uses its own Vault secret (news_cron_secret), independent of
-- uscis_cron_secret, so rotating either one can never affect the other
-- function's schedule.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Reuse project_url if some other cron job already created it; create it only
-- if missing.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'project_url') then
    perform vault.create_secret('https://xfuffsilhsdkhgnniiqh.supabase.co', 'project_url', 'Project base URL for cron HTTP calls');
  end if;
end $$;

-- news-ingest's own secret. Only creates it if missing — this file is safe
-- to re-run, but it will NOT rotate an existing secret to a new value (use
-- rotate_news_cron_secret.sql for that). Replace the placeholder below only
-- the first time this ever runs on a fresh project.
do $$
begin
  if not exists (select 1 from vault.decrypted_secrets where name = 'news_cron_secret') then
    perform vault.create_secret(
      'REPLACE_WITH_A_FRESH_RANDOM_VALUE_MATCHING_NEWS_CRON_SECRET',
      'news_cron_secret',
      'Shared secret for news-ingest cron calls — matches the NEWS_CRON_SECRET edge function secret'
    );
  end if;
end $$;

-- Unschedule any previous run of this job name before re-creating it, so
-- re-running this file never produces duplicate jobs.
select cron.unschedule(jobid) from cron.job where jobname = 'news-ingest-check';

select cron.schedule(
  'news-ingest-check',
  '5 12,20 * * *',  -- 8:05am and 4:05pm Eastern (UTC-4/-5 depending on DST)
  $$
  select net.http_post(
    url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
               || '/functions/v1/news-ingest',
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'news_cron_secret')),
    body    := '{}'::jsonb
  );
  $$
);

-- Confirm it's scheduled:
select jobid, jobname, schedule, active from cron.job where jobname = 'news-ingest-check';
