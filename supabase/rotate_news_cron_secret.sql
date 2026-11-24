-- Rotates the news_cron_secret Vault value to match a new NEWS_CRON_SECRET
-- edge function secret. Replace the placeholder below with the actual new
-- value (given to you separately, never committed here) before running.

select vault.update_secret(
  (select id from vault.secrets where name = 'news_cron_secret'),
  'PASTE_THE_NEW_SECRET_VALUE_HERE'
);

-- Confirm the cron job's next run will use the new value automatically —
-- it reads from vault.decrypted_secrets at call time, no redeploy needed.
select name, created_at, updated_at from vault.secrets where name = 'news_cron_secret';
