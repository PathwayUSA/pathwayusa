create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  full_name     text,
  role          text default 'client' check (role in ('client', 'attorney')),
  country       text,
  theme         text,
  reading_speed text default 'normal' check (reading_speed in ('slow', 'normal', 'fast')),
  tutorial_done boolean default false,
  created_at    timestamptz default now()
);

-- Migrations for existing databases
alter table public.profiles
  add column if not exists reading_speed text default 'normal'
    check (reading_speed in ('slow', 'normal', 'fast'));

alter table public.profiles
  add column if not exists tutorial_done boolean default false;

-- Skip tutorial for users who already completed onboarding (have a theme set)
update public.profiles set tutorial_done = true where theme is not null and tutorial_done = false;

alter table public.profiles enable row level security;

create policy "Anyone can view profiles"
  on public.profiles for select using (true);

create policy "Users insert their own profile"
  on public.profiles for insert with check (auth.uid() = id);

create policy "Users update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- Updated trigger: also reads 'role' from signup metadata so attorney accounts
-- get role='attorney' set immediately, even before email confirmation.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.user_progress (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users(id) on delete cascade not null,
  step_id    text not null,
  completed  boolean default false not null,
  updated_at timestamptz default now(),
  unique(user_id, step_id)
);

alter table public.user_progress enable row level security;

create policy "Users manage their own progress"
  on public.user_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.messages (
  id         uuid default gen_random_uuid() primary key,
  from_id    uuid references auth.users(id) on delete cascade not null,
  to_id      uuid references auth.users(id) on delete cascade not null,
  content    text not null,
  read       boolean default false,
  created_at timestamptz default now()
);

alter table public.messages enable row level security;

create policy "Participants can read messages"
  on public.messages for select
  using (auth.uid() = from_id or auth.uid() = to_id);

create policy "Users can send messages"
  on public.messages for insert
  with check (auth.uid() = from_id);

create policy "Recipients can mark as read"
  on public.messages for update
  using (auth.uid() = to_id);

-- ── Attorneys ───────────────────────────────────────────────────────────────
create table if not exists public.attorneys (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  firm        text,
  specialty   text,
  languages   text[] default '{}',
  address     text,
  city        text,
  state       text,
  phone       text,
  email       text,
  rating      numeric(3,1) default 4.5,
  verified    boolean default false,
  created_at  timestamptz default now()
);

alter table public.attorneys enable row level security;

create policy "Anyone can view attorneys"
  on public.attorneys for select using (true);

-- ── Community Posts ─────────────────────────────────────────────────────────
create table if not exists public.community_posts (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  topic       text not null,
  title       text not null,
  content     text not null,
  language    text default 'en',
  reply_count integer default 0,
  created_at  timestamptz default now()
);

alter table public.community_posts enable row level security;

create policy "Anyone can read posts"
  on public.community_posts for select using (true);

create policy "Users can create posts"
  on public.community_posts for insert with check (auth.uid() = user_id);

create policy "Users can update own posts"
  on public.community_posts for update using (auth.uid() = user_id);

-- ── Community Replies ────────────────────────────────────────────────────────
create table if not exists public.community_replies (
  id          uuid default gen_random_uuid() primary key,
  post_id     uuid references public.community_posts(id) on delete cascade not null,
  user_id     uuid references auth.users(id) on delete cascade not null,
  content     text not null,
  created_at  timestamptz default now()
);

alter table public.community_replies enable row level security;

create policy "Anyone can read replies"
  on public.community_replies for select using (true);

create policy "Users can create replies"
  on public.community_replies for insert with check (auth.uid() = user_id);

-- Auto-increment reply_count on post when a reply is inserted
create or replace function public.increment_reply_count()
returns trigger language plpgsql security definer as $$
begin
  update public.community_posts set reply_count = reply_count + 1 where id = new.post_id;
  return new;
end;
$$;

drop trigger if exists on_reply_created on public.community_replies;
create trigger on_reply_created
  after insert on public.community_replies
  for each row execute procedure public.increment_reply_count();

-- ── User Documents ───────────────────────────────────────────────────────────
create table if not exists public.user_documents (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  document_name text not null,
  checked       boolean default false,
  photo_uri     text,
  created_at    timestamptz default now(),
  unique(user_id, document_name)
);

alter table public.user_documents enable row level security;

create policy "Users manage their own documents"
  on public.user_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── User Deadlines ───────────────────────────────────────────────────────────
create table if not exists public.user_deadlines (
  id              uuid default gen_random_uuid() primary key,
  user_id         uuid references auth.users(id) on delete cascade not null,
  title           text not null,
  deadline_date   date not null,
  notified_7day   boolean default false,
  notified_3day   boolean default false,
  notified_1day   boolean default false,
  created_at      timestamptz default now()
);

alter table public.user_deadlines enable row level security;

create policy "Users manage their own deadlines"
  on public.user_deadlines for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Case Numbers ─────────────────────────────────────────────────────────────
create table if not exists public.case_numbers (
  id             uuid default gen_random_uuid() primary key,
  user_id        uuid references auth.users(id) on delete cascade not null,
  receipt_number text not null,
  last_status    text,
  last_checked   timestamptz,
  created_at     timestamptz default now(),
  unique(user_id, receipt_number)
);

alter table public.case_numbers enable row level security;

create policy "Users manage their own cases"
  on public.case_numbers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Subscriptions ─────────────────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id                     uuid default gen_random_uuid() primary key,
  user_id                uuid references auth.users(id) on delete cascade not null unique,
  status                 text not null default 'free',
  plan                   text default 'free',
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "Users read their own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create policy "Users insert their own subscription"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

create policy "Users update their own subscription"
  on public.subscriptions for update
  using (auth.uid() = user_id);

-- ── Attorney Clients ──────────────────────────────────────────────────────────
create table if not exists public.attorney_clients (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references auth.users(id) on delete cascade not null,
  linked_at   timestamptz default now(),
  notes       text,
  unique(attorney_id, client_id)
);

alter table public.attorney_clients enable row level security;

create policy "Attorneys manage their client relationships"
  on public.attorney_clients for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);

create policy "Clients read their own attorney link"
  on public.attorney_clients for select
  using (auth.uid() = client_id);

-- ── Attorney Notes ────────────────────────────────────────────────────────────
create table if not exists public.attorney_notes (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references auth.users(id) on delete cascade not null,
  note        text not null,
  created_at  timestamptz default now()
);

alter table public.attorney_notes enable row level security;

create policy "Attorneys manage their own notes"
  on public.attorney_notes for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);

-- ── Profile migrations ────────────────────────────────────────────────────────
alter table public.profiles add column if not exists pro_subscriber boolean default false;
alter table public.profiles add column if not exists last_lat float8;
alter table public.profiles add column if not exists last_lng float8;

-- ── Roadmap Documents ─────────────────────────────────────────────────────────
create table if not exists public.roadmap_documents (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references auth.users(id) on delete cascade not null,
  step_id       text not null,
  document_name text not null,
  file_url      text,
  status        text not null default 'uploaded'
                  check (status in ('uploaded', 'approved', 'needs_revision')),
  uploaded_at   timestamptz default now(),
  unique(user_id, step_id, document_name)
);

alter table public.roadmap_documents enable row level security;

create policy "Users manage their own roadmap documents"
  on public.roadmap_documents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Attorneys read linked clients' roadmap documents"
  on public.roadmap_documents for select
  using (
    exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid()
        and ac.client_id   = roadmap_documents.user_id
    )
  );

create policy "Attorneys update linked clients' roadmap document status"
  on public.roadmap_documents for update
  using (
    exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid()
        and ac.client_id   = roadmap_documents.user_id
    )
  );

-- ── Document Reviews ──────────────────────────────────────────────────────────
create table if not exists public.document_reviews (
  id           uuid default gen_random_uuid() primary key,
  document_id  uuid references public.roadmap_documents(id) on delete cascade not null,
  attorney_id  uuid references auth.users(id) on delete cascade not null,
  status       text not null check (status in ('approved', 'needs_revision')),
  comment      text,
  reviewed_at  timestamptz default now(),
  unique(document_id)
);

alter table public.document_reviews enable row level security;

create policy "Attorneys manage their own reviews"
  on public.document_reviews for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);

create policy "Clients read reviews of their own documents"
  on public.document_reviews for select
  using (
    exists (
      select 1 from public.roadmap_documents rd
      where rd.id      = document_reviews.document_id
        and rd.user_id = auth.uid()
    )
  );

-- ── Storage: client-documents bucket ──────────────────────────────────────────
-- Run these in the Supabase Dashboard → Storage, or via the SQL editor:

insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

-- Clients can upload their own files (path must start with their user_id)
create policy "Clients upload their own documents"
  on storage.objects for insert
  with check (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients can read their own uploaded files
create policy "Clients read their own documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Clients can replace (upsert) their own files
create policy "Clients update their own documents"
  on storage.objects for update
  using (
    bucket_id = 'client-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Attorneys can read files belonging to their linked clients
create policy "Attorneys read linked client documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid()
        and ac.client_id::text = (storage.foldername(name))[1]
    )
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- ATTORNEY PLATFORM v2 — run these migrations on your existing database
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Profile additions ─────────────────────────────────────────────────────────
alter table public.profiles add column if not exists firm_name        text;
alter table public.profiles add column if not exists bar_number       text;
alter table public.profiles add column if not exists specialties      text;
alter table public.profiles add column if not exists languages_spoken text;
alter table public.profiles add column if not exists profile_photo_url text;
alter table public.profiles add column if not exists invite_code      text unique;
alter table public.profiles add column if not exists roadmap_path     text;

-- ── Attorney Invites ──────────────────────────────────────────────────────────
-- Stores invite codes attorneys generate to share with new clients.
create table if not exists public.attorney_invites (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  invite_code text not null unique,
  uses        integer default 0,
  created_at  timestamptz default now(),
  unique(attorney_id)
);

alter table public.attorney_invites enable row level security;

create policy "Attorneys manage their own invites"
  on public.attorney_invites for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);

create policy "Anyone can read invite codes (for validation)"
  on public.attorney_invites for select
  using (true);

-- ── Appointments ──────────────────────────────────────────────────────────────
create table if not exists public.appointments (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references auth.users(id) on delete cascade not null,
  title       text not null,
  date        date not null,
  time        time,
  duration    integer default 30,
  notes       text,
  created_at  timestamptz default now()
);

alter table public.appointments enable row level security;

create policy "Attorneys manage their appointments"
  on public.appointments for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);

create policy "Clients read their own appointments"
  on public.appointments for select
  using (auth.uid() = client_id);

-- ── Conversations (metadata layer for messaging UI) ───────────────────────────
-- Tracks last message and unread counts per attorney-client pair.
create table if not exists public.conversations (
  id               uuid default gen_random_uuid() primary key,
  attorney_id      uuid references auth.users(id) on delete cascade not null,
  client_id        uuid references auth.users(id) on delete cascade not null,
  last_message     text,
  last_message_at  timestamptz default now(),
  unread_attorney  integer default 0,
  unread_client    integer default 0,
  created_at       timestamptz default now(),
  unique(attorney_id, client_id)
);

alter table public.conversations enable row level security;

create policy "Participants access their conversations"
  on public.conversations for all
  using (auth.uid() = attorney_id or auth.uid() = client_id);

-- ── Client-Attorney Messages (dedicated table, future migration from messages) ─
create table if not exists public.client_attorney_messages (
  id              uuid default gen_random_uuid() primary key,
  conversation_id uuid references public.conversations(id) on delete cascade not null,
  sender_id       uuid references auth.users(id) on delete cascade not null,
  content         text not null,
  read            boolean default false,
  created_at      timestamptz default now()
);

alter table public.client_attorney_messages enable row level security;

create policy "Conversation participants read messages"
  on public.client_attorney_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = client_attorney_messages.conversation_id
        and (c.attorney_id = auth.uid() or c.client_id = auth.uid())
    )
  );

create policy "Participants send messages"
  on public.client_attorney_messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = client_attorney_messages.conversation_id
        and (c.attorney_id = auth.uid() or c.client_id = auth.uid())
    )
  );

-- ── Allow attorneys to read linked clients' profiles ──────────────────────────
-- (needed for attorney home screen activity feed and client list name lookup)
create policy "Attorneys read linked client profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid()
        and ac.client_id = profiles.id
    )
    or exists (
      select 1 from public.attorney_clients ac
      where ac.client_id = auth.uid()
        and ac.attorney_id = profiles.id
    )
  );

-- ── Allow invite code lookup (anyone can look up by invite_code to link) ──────
create policy "Anyone can look up attorneys by invite code"
  on public.profiles for select
  using (
    invite_code is not null
    and role = 'attorney'
  );

-- ── Mark messages as read when attorney opens conversation ────────────────────
create policy "Attorneys mark received messages as read"
  on public.messages for update
  using (auth.uid() = to_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Retention, Engagement & Subscription columns (v3)
-- Run these after the attorney platform migrations above
-- ─────────────────────────────────────────────────────────────────────────────

-- Streak tracking
alter table public.profiles add column if not exists current_streak        integer default 0;
alter table public.profiles add column if not exists longest_streak        integer default 0;
alter table public.profiles add column if not exists last_opened_date      date;

-- Daily challenge
alter table public.profiles add column if not exists daily_challenge_completed      boolean default false;
alter table public.profiles add column if not exists total_challenges_completed     integer default 0;

-- Badges (array of badge IDs earned)
alter table public.profiles add column if not exists badges                text[] default '{}';

-- Streak milestones already seen (to avoid re-showing celebration)
alter table public.profiles add column if not exists streak_milestones_seen text[] default '{}';

-- Quiz stats
alter table public.profiles add column if not exists total_quiz_completed   integer default 0;

-- Subscription plan column (3-tier): subscriptions table already has plan column
-- Make sure the subscriptions.plan check constraint allows all three tiers:
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'basic', 'pro'));

-- Streak freeze support
alter table public.profiles add column if not exists streak_freezes_remaining integer default 2;
alter table public.profiles add column if not exists streak_freeze_month      text;

-- Index for fast streak lookups
create index if not exists profiles_last_opened_idx on public.profiles (last_opened_date);

-- ─────────────────────────────────────────────────────────────────────────────
-- XP / Level / Referral / Weekly Challenge (v4)
-- ─────────────────────────────────────────────────────────────────────────────

-- XP and level tracking
alter table public.profiles add column if not exists total_xp          integer default 0;
alter table public.profiles add column if not exists level             integer default 1;
alter table public.profiles add column if not exists weekly_xp         integer default 0;
alter table public.profiles add column if not exists weekly_xp_reset   date;

-- Weekly challenge tracking
alter table public.profiles add column if not exists weekly_steps_completed  integer default 0;
alter table public.profiles add column if not exists weekly_quiz_correct      integer default 0;
alter table public.profiles add column if not exists weekly_challenge_reset   date;

-- Referral system
alter table public.profiles add column if not exists referral_code   text unique;
alter table public.profiles add column if not exists referred_by     uuid references public.profiles(id);
alter table public.profiles add column if not exists referral_count  integer default 0;

-- Index for fast XP leaderboard queries
create index if not exists profiles_total_xp_idx on public.profiles (total_xp desc);
create index if not exists profiles_referral_code_idx on public.profiles (referral_code) where referral_code is not null;

-- ── Attorney Access Codes ─────────────────────────────────────────────────────
-- Each row is a one-time-use code given to a law firm when they partner with PathwayUSA.
-- The mobile app validates the code on attorney signup, sets role='attorney' in profiles,
-- and marks the code as used. Existing attorneys sign in without a code.
create table if not exists public.attorney_access_codes (
  id            uuid default gen_random_uuid() primary key,
  code          text unique not null,
  firm_name     text,
  attorney_name text,
  email         text,
  used          boolean default false,
  used_by       uuid references auth.users(id),
  created_at    timestamptz default now()
);

alter table public.attorney_access_codes enable row level security;

-- Anyone (including anon) can SELECT to validate a code pre-signup
create policy "Anyone can read access codes"
  on public.attorney_access_codes for select
  using (true);

-- Only authenticated users can mark a code as used
create policy "Auth users can update access codes"
  on public.attorney_access_codes for update
  using (auth.uid() is not null);

-- Seed demo codes for testing
insert into public.attorney_access_codes (code, firm_name) values
  ('ATT-2024-DEMO', 'Demo Law Firm'),
  ('ATT-2024-TEST', 'Test Immigration Law')
on conflict (code) do nothing;

-- ── Attorney Reminders ────────────────────────────────────────────────────────
-- Attorneys can set dated reminders for specific clients, shown on their dashboard.
create table if not exists public.attorney_reminders (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references auth.users(id) on delete cascade,
  message     text not null,
  due_date    date not null,
  created_at  timestamptz default now()
);

alter table public.attorney_reminders enable row level security;

create policy "Attorneys manage their own reminders"
  on public.attorney_reminders for all
  using (auth.uid() = attorney_id)
  with check (auth.uid() = attorney_id);


-- ── Quiz Tables ───────────────────────────────────────────────────────────────
-- Tracks each quiz/practice session a user completes.
create table if not exists public.quiz_sessions (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  mode             text not null check (mode in ('practice','test','weakspots','daily')),
  category         text default 'all',
  score            integer,          -- null for practice mode
  total            integer not null,
  passed           boolean,          -- null for practice mode
  duration_seconds integer,
  created_at       timestamptz default now()
);

alter table public.quiz_sessions enable row level security;

create policy "Users manage their own quiz sessions"
  on public.quiz_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists quiz_sessions_user_idx on public.quiz_sessions (user_id, created_at desc);

-- Tracks each individual question answer within a session.
create table if not exists public.quiz_answers (
  id          uuid default gen_random_uuid() primary key,
  session_id  uuid references public.quiz_sessions(id) on delete cascade,
  user_id     uuid references auth.users(id) on delete cascade not null,
  question_id integer not null,
  is_correct  boolean not null,
  chosen      text,
  mode        text not null,
  created_at  timestamptz default now()
);

alter table public.quiz_answers enable row level security;

create policy "Users manage their own quiz answers"
  on public.quiz_answers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists quiz_answers_user_wrong_idx
  on public.quiz_answers (user_id, question_id, is_correct)
  where is_correct = false;

-- Tracks flashcard spaced-repetition progress per user per question.
create table if not exists public.flashcard_progress (
  user_id               uuid references auth.users(id) on delete cascade not null,
  question_id           integer not null,
  status                text not null check (status in ('know_it','still_learning')),
  know_count            integer default 0,
  still_learning_count  integer default 0,
  last_reviewed         timestamptz default now(),
  next_review           date,
  primary key (user_id, question_id)
);

alter table public.flashcard_progress enable row level security;

create policy "Users manage their own flashcard progress"
  on public.flashcard_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists flashcard_progress_review_idx
  on public.flashcard_progress (user_id, next_review);

-- ─── Document Expiry Tracking ─────────────────────────────────────────────────

create table if not exists public.document_expiry (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  doc_name    text not null,
  doc_type    text not null check (doc_type in ('green_card','passport','ead','visa','i94','medical_exam','other')),
  expiry_date date not null,
  notes       text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.document_expiry enable row level security;

create policy "Users manage their own document expiry records"
  on public.document_expiry for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists doc_expiry_user_date_idx
  on public.document_expiry (user_id, expiry_date);

-- ─── Local Resources (for future Supabase-backed org data) ───────────────────

create table if not exists public.local_resources (
  id          uuid default gen_random_uuid() primary key,
  name        text not null,
  category    text not null check (category in ('Legal','Medical','Housing','Education','Food')),
  address     text,
  phone       text,
  website     text,
  hours       text,
  description text,
  rating      numeric(2,1),
  lat         double precision,
  lng         double precision,
  city        text,
  state       text,
  is_national boolean default false,
  created_at  timestamptz default now()
);

-- No RLS — public read-only resource data
alter table public.local_resources enable row level security;
create policy "Anyone can read local resources" on public.local_resources for select using (true);

-- ── Smart Onboarding intake fields (v5) ──────────────────────────────────────
-- These columns are written by IntakeStack and ResumeOnboardingStack after the
-- 6-screen assessment flow. Run these migrations on your existing database.
alter table public.profiles add column if not exists onboarding_complete      boolean default false;
alter table public.profiles add column if not exists onboarding_completed_at  timestamptz;
alter table public.profiles add column if not exists immigration_status        text;
alter table public.profiles add column if not exists immigration_goals         text[] default '{}';
alter table public.profiles add column if not exists years_in_us               text;
alter table public.profiles add column if not exists date_of_birth             text;
alter table public.profiles add column if not exists country_of_birth          text;
alter table public.profiles add column if not exists primary_language          text;
alter table public.profiles add column if not exists has_attorney              boolean;
alter table public.profiles add column if not exists pathway_type              text;
alter table public.profiles add column if not exists immigration_path          text;

-- ── Subscription tier & Stripe columns (v6) ──────────────────────────────────
-- profiles.subscription_tier is the authoritative source read by SubscriptionContext.
-- profiles.stripe_customer_id is needed so the webhook can look up the user.
alter table public.profiles add column if not exists subscription_tier   text default 'free';
alter table public.profiles add column if not exists subscription_status text default 'active';
alter table public.profiles add column if not exists stripe_customer_id  text;

-- subscriptions table needs these for full Stripe event data
alter table public.subscriptions add column if not exists stripe_price_id      text;
alter table public.subscriptions add column if not exists current_period_start timestamptz;
alter table public.subscriptions add column if not exists current_period_end   timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean default false;

-- Updated trigger: now sets subscription_tier = 'free' and subscription_status = 'active'
-- so new users always have a fully initialised profile row from the moment they sign up.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, subscription_tier, subscription_status, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    'free',
    'active',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ═══════════════════════════════════════════════════════════════════════════════
-- SECURITY HARDENING (Phase 0) — run this after all migrations above
-- Fixes: world-readable profiles, client-writable role/entitlement columns,
-- a client-writable subscriptions table, and an attorney_access_codes update
-- policy that let any signed-in user reset or overwrite any code.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── profiles: remove the blanket "select using (true)" policy ────────────────
-- The two policies added in the attorney-platform v2 section above
-- ("Attorneys read linked client profiles" and "Anyone can look up attorneys
-- by invite code") already cover every legitimate read case: own row, linked
-- attorney<->client, and public attorney directory lookup by invite code.
-- This policy made all of that redundant by also exposing every column of
-- every profile — including date_of_birth, immigration_status,
-- immigration_goals, last_lat/last_lng, and stripe_customer_id — to anyone
-- holding the public anon key.
drop policy if exists "Anyone can view profiles" on public.profiles;

-- ── profiles: block client writes to role/entitlement columns ────────────────
-- Row-level USING/WITH CHECK can't restrict individual columns, so this uses
-- Postgres column-level privileges instead. Only the service_role (used by
-- the Stripe webhook, and by the handle_new_user trigger's SECURITY DEFINER
-- context, which is unaffected by grants) can still change these columns;
-- authenticated users keep write access to every other profile column.
revoke update (role, subscription_tier, subscription_status, pro_subscriber, stripe_customer_id)
  on public.profiles from authenticated, anon;

-- ── subscriptions: entitlement must only ever be written by the webhook ──────
-- These policies let any authenticated user upsert their own row directly
-- (status: 'active', plan: 'pro'), granting themselves Pro without ever going
-- through Stripe. The only legitimate writer is the stripe-webhook edge
-- function, which uses the service_role key and is not subject to RLS.
-- Reads stay open to the owner.
drop policy if exists "Users insert their own subscription" on public.subscriptions;
drop policy if exists "Users update their own subscription" on public.subscriptions;

-- ── attorney_access_codes: stop leaking claimed codes, stop arbitrary resets ──
-- "Anyone can read access codes" exposed every code row, including firm
-- name/attorney name/email on already-claimed codes. "Auth users can update
-- access codes" had no WITH CHECK and wasn't scoped to a specific row, so any
-- signed-in user could edit ANY code row — including resetting a used code
-- back to used = false to reuse it, or overwriting another firm's metadata.
drop policy if exists "Anyone can read access codes" on public.attorney_access_codes;
create policy "Anyone can read unused access codes"
  on public.attorney_access_codes for select
  using (used = false);

drop policy if exists "Auth users can update access codes" on public.attorney_access_codes;
create policy "Users claim an unused access code for themselves"
  on public.attorney_access_codes for update
  using (used = false)
  with check (used = true and used_by = auth.uid());
