-- ═══════════════════════════════════════════════════════════════════════════════
-- MISSING TABLES BACKFILL — run this once in the Supabase SQL Editor
--
-- 19 of ~25 tables declared in supabase_setup.sql were never actually applied
-- to production. This creates the 15 approved ones (attorney portal, document
-- review pipeline, quiz progress tracking, case tracking/document expiry).
-- Intentionally excluded: attorneys, community_posts, community_replies,
-- local_resources (forum already removed from nav / unused), conversations,
-- client_attorney_messages (dead code — AttorneyMessagesScreen.js actually
-- uses the existing `messages` table, which already exists live).
--
-- Every statement here is idempotent (if not exists / drop-if-exists) so this
-- is safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Attorney profile fields (needed for AttorneySettingsScreen.js etc.) ───────
alter table public.profiles add column if not exists firm_name         text;
alter table public.profiles add column if not exists bar_number        text;
alter table public.profiles add column if not exists specialties       text;
alter table public.profiles add column if not exists languages_spoken  text;
alter table public.profiles add column if not exists profile_photo_url text;
alter table public.profiles add column if not exists invite_code       text unique;
alter table public.profiles add column if not exists roadmap_path      text;

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

-- ── Attorney Clients ──────────────────────────────────────────────────────────
-- attorney_id is nullable: AttorneyMatchScreen.js inserts a row with
-- attorney_id: null to create a pending lead, and AttorneyClientsScreen.js
-- queries/claims it via .is('attorney_id', null). client_id references
-- public.profiles(id) (not auth.users(id)) so PostgREST's
-- `profiles!attorney_clients_client_id_fkey(...)` embed used throughout the
-- attorney screens actually resolves.
create table if not exists public.attorney_clients (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade,
  client_id   uuid references public.profiles(id) on delete cascade not null,
  linked_at   timestamptz default now(),
  notes       text,
  status      text,
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

create policy "Clients create their own pending match request"
  on public.attorney_clients for insert
  with check (client_id = auth.uid() and attorney_id is null);

create policy "Attorneys view unclaimed leads"
  on public.attorney_clients for select
  using (
    attorney_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'attorney')
  );

create policy "Attorneys claim unclaimed leads"
  on public.attorney_clients for update
  using (
    attorney_id is null
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'attorney')
  )
  with check (attorney_id = auth.uid());

-- Now that attorney_clients exists, let attorneys and their linked clients
-- read each other's profile (needed for names shown across attorney screens),
-- and let anyone look up an attorney by invite code during signup linking.
drop policy if exists "Attorneys read linked client profiles" on public.profiles;
create policy "Attorneys read linked client profiles"
  on public.profiles for select
  using (
    auth.uid() = id
    or exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid() and ac.client_id = profiles.id
    )
    or exists (
      select 1 from public.attorney_clients ac
      where ac.client_id = auth.uid() and ac.attorney_id = profiles.id
    )
  );

drop policy if exists "Anyone can look up attorneys by invite code" on public.profiles;
create policy "Anyone can look up attorneys by invite code"
  on public.profiles for select
  using (invite_code is not null and role = 'attorney');

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
      where ac.attorney_id = auth.uid() and ac.client_id = roadmap_documents.user_id
    )
  );

create policy "Attorneys update linked clients' roadmap document status"
  on public.roadmap_documents for update
  using (
    exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid() and ac.client_id = roadmap_documents.user_id
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
      where rd.id = document_reviews.document_id and rd.user_id = auth.uid()
    )
  );

-- ── Storage: client-documents bucket ──────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('client-documents', 'client-documents', false)
on conflict (id) do nothing;

drop policy if exists "Clients upload their own documents" on storage.objects;
create policy "Clients upload their own documents"
  on storage.objects for insert
  with check (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Clients read their own documents" on storage.objects;
create policy "Clients read their own documents"
  on storage.objects for select
  using (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Clients update their own documents" on storage.objects;
create policy "Clients update their own documents"
  on storage.objects for update
  using (bucket_id = 'client-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Attorneys read linked client documents" on storage.objects;
create policy "Attorneys read linked client documents"
  on storage.objects for select
  using (
    bucket_id = 'client-documents'
    and exists (
      select 1 from public.attorney_clients ac
      where ac.attorney_id = auth.uid() and ac.client_id::text = (storage.foldername(name))[1]
    )
  );

-- ── Attorney Invites ──────────────────────────────────────────────────────────
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
-- client_id references public.profiles(id): AttorneyHomeScreen.js embeds
-- `profiles!appointments_client_id_fkey(full_name)`.
create table if not exists public.appointments (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references public.profiles(id) on delete cascade not null,
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

-- ── Attorney Access Codes ─────────────────────────────────────────────────────
-- Created directly with scoped policies (not the wide-open originals Phase 0
-- had to patch elsewhere) since this table has never existed live.
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

drop policy if exists "Anyone can read unused access codes" on public.attorney_access_codes;
create policy "Anyone can read unused access codes"
  on public.attorney_access_codes for select
  using (used = false);

drop policy if exists "Users claim an unused access code for themselves" on public.attorney_access_codes;
create policy "Users claim an unused access code for themselves"
  on public.attorney_access_codes for update
  using (used = false)
  with check (used = true and used_by = auth.uid());

-- Deliberately NOT seeding ATT-2024-DEMO / ATT-2024-TEST demo codes into
-- production. Add real firm codes yourself via the dashboard when ready.

-- ── Attorney Reminders ────────────────────────────────────────────────────────
-- client_id references public.profiles(id): AttorneyContext.js embeds
-- `profiles!attorney_reminders_client_id_fkey(...)`.
create table if not exists public.attorney_reminders (
  id          uuid default gen_random_uuid() primary key,
  attorney_id uuid references auth.users(id) on delete cascade not null,
  client_id   uuid references public.profiles(id) on delete cascade,
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
create table if not exists public.quiz_sessions (
  id               uuid default gen_random_uuid() primary key,
  user_id          uuid references auth.users(id) on delete cascade not null,
  mode             text not null check (mode in ('practice','test','weakspots','daily')),
  category         text default 'all',
  score            integer,
  total            integer not null,
  passed           boolean,
  duration_seconds integer,
  created_at       timestamptz default now()
);

alter table public.quiz_sessions enable row level security;

create policy "Users manage their own quiz sessions"
  on public.quiz_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists quiz_sessions_user_idx on public.quiz_sessions (user_id, created_at desc);

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

-- ── Document Expiry Tracking ───────────────────────────────────────────────────
-- Note: no screen currently reads/writes this table. Creating it unblocks a
-- future UI for expiring-document reminders but doesn't turn anything on by
-- itself.
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
