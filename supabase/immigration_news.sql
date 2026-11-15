-- ════════════════════════════════════════════════════════════════════════════
-- Immigration news ("What's new in immigration")
--
-- News comes ONLY from official government sources (Federal Register, USCIS,
-- State Department, DHS). The news-ingest Edge Function reads those feeds,
-- writes a plain-language educational summary with AI, and publishes it
-- automatically. Admins can hide any item with one tap; users can report one.
--
-- Run once in the Supabase SQL editor. Safe to re-run.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. News items ───────────────────────────────────────────────────────────
create table if not exists public.news_items (
  id              uuid default gen_random_uuid() primary key,
  source          text not null check (source in ('federal_register','uscis','state','dhs')),
  source_id       text not null unique,          -- e.g. Federal Register document number
  source_url      text not null check (source_url ~ '^https://(www\.)?(federalregister\.gov|uscis\.gov|state\.gov|travel\.state\.gov|dhs\.gov)/'),
  source_title    text not null,                 -- official title, unchanged
  published_at    timestamptz not null,

  -- Written by AI from the official text only
  headline        text,                          -- plain-language title
  kind            text check (kind in ('good','change','deadline')),
  summary         text,                          -- what happened
  who_affected    text,                          -- who this MAY affect
  examples        jsonb default '[]'::jsonb,     -- [{ "title": "...", "text": "..." }] hypothetical people
  questions       text[] default '{}',           -- questions to think about
  audience        jsonb default '{}'::jsonb,     -- { all: bool, statuses: [], goals: [], countries: [] }
  deadline        date,                          -- only if the official text states one
  effective_date  date,
  video_url       text check (video_url is null or video_url ~ '^https://(www\.)?(youtube\.com|youtu\.be)/'),

  status          text not null default 'published' check (status in ('published','hidden','skipped','expired')),
  hidden_reason   text,
  expires_at      timestamptz,
  ai_model        text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index if not exists news_items_feed_idx on public.news_items (status, published_at desc);

alter table public.news_items enable row level security;

drop policy if exists "Signed-in users read published news" on public.news_items;
create policy "Signed-in users read published news"
  on public.news_items for select to authenticated
  using (status = 'published' and (expires_at is null or expires_at > now()));

-- ── 2. News admins (who can hide items) ─────────────────────────────────────
-- Nobody can add themselves: there are no insert/update policies.
-- Add yourself once with the line at the very bottom of this file.
create table if not exists public.news_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.news_admins enable row level security;

drop policy if exists "Admins can see themselves" on public.news_admins;
create policy "Admins can see themselves"
  on public.news_admins for select to authenticated using (auth.uid() = user_id);

create or replace function public.is_news_admin() returns boolean
  language sql stable security definer set search_path = public
  as $$ select exists (select 1 from public.news_admins where user_id = auth.uid()) $$;

drop policy if exists "Admins read all news" on public.news_items;
create policy "Admins read all news"
  on public.news_items for select to authenticated using (public.is_news_admin());

drop policy if exists "Admins hide or restore news" on public.news_items;
create policy "Admins hide or restore news"
  on public.news_items for update to authenticated
  using (public.is_news_admin()) with check (public.is_news_admin());

-- ── 3. "Something wrong?" reports ───────────────────────────────────────────
create table if not exists public.news_flags (
  id         uuid default gen_random_uuid() primary key,
  news_id    uuid references public.news_items(id) on delete cascade not null,
  user_id    uuid references auth.users(id) on delete cascade not null,
  reason     text check (char_length(reason) <= 500),
  created_at timestamptz default now() not null,
  unique (news_id, user_id)
);
alter table public.news_flags enable row level security;

drop policy if exists "Users report news" on public.news_flags;
create policy "Users report news"
  on public.news_flags for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists "Admins read reports" on public.news_flags;
create policy "Admins read reports"
  on public.news_flags for select to authenticated using (public.is_news_admin());

-- ── 4. Make yourself the news admin ─────────────────────────────────────────
-- Replace the email with the one you sign in to PathwayUSA with, then run:
-- insert into public.news_admins (user_id)
--   select id from auth.users where email = 'YOUR_EMAIL_HERE'
--   on conflict do nothing;

-- ── 5. Check for news twice a day (8:05am and 4:05pm Eastern) ────────────────
-- Uses the same Vault secrets as the USCIS daily check. Uncomment and run.
-- select cron.schedule(
--   'immigration-news-check',
--   '5 12,20 * * *',
--   $$
--   select net.http_post(
--     url     := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url')
--                || '/functions/v1/news-ingest',
--     headers := jsonb_build_object(
--                  'Content-Type', 'application/json',
--                  'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'uscis_cron_secret')),
--     body    := '{}'::jsonb
--   );
--   $$
-- );

-- ════════════════════════════════════════════════════════════════════════════
-- Official videos (YouTube channels of government agencies only)
-- ════════════════════════════════════════════════════════════════════════════

-- Which channels to read. Only add official government channels.
-- To find a channel ID: open the channel on YouTube → "More about this channel"
-- → "Share channel" → "Copy channel ID" (starts with UC…), then fill it in below.
create table if not exists public.video_channels (
  key        text primary key,
  name       text not null,
  channel_id text check (channel_id is null or channel_id ~ '^UC[A-Za-z0-9_-]{22}$'),
  lang       text default 'en',
  active     boolean default true not null
);
alter table public.video_channels enable row level security;
drop policy if exists "Signed-in users read channels" on public.video_channels;
create policy "Signed-in users read channels"
  on public.video_channels for select to authenticated using (true);

insert into public.video_channels (key, name, lang) values
  ('uscis',    'USCIS',                       'en'),
  ('uscis_es', 'USCIS en Español',            'es'),
  ('state',    'U.S. Department of State',    'en'),
  ('dhs',      'Department of Homeland Security', 'en')
on conflict (key) do nothing;

-- Example, after you copy the ID from YouTube:
-- update public.video_channels set channel_id = 'UCxxxxxxxxxxxxxxxxxxxxxx' where key = 'uscis';

create table if not exists public.news_videos (
  youtube_id   text primary key check (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  channel_key  text references public.video_channels(key) on delete cascade not null,
  title        text not null,
  published_at timestamptz not null,
  lang         text default 'en',
  status       text not null default 'published' check (status in ('published','hidden')),
  created_at   timestamptz default now() not null
);
create index if not exists news_videos_feed_idx on public.news_videos (status, published_at desc);
alter table public.news_videos enable row level security;

drop policy if exists "Signed-in users read videos" on public.news_videos;
create policy "Signed-in users read videos"
  on public.news_videos for select to authenticated using (status = 'published');
drop policy if exists "Admins hide videos" on public.news_videos;
create policy "Admins hide videos"
  on public.news_videos for update to authenticated
  using (public.is_news_admin()) with check (public.is_news_admin());

-- Each news item can point to one matching official video.
alter table public.news_items add column if not exists video_id text references public.news_videos(youtube_id) on delete set null;
