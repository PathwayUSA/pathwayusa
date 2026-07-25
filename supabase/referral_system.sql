-- ═══════════════════════════════════════════════════════════════════════════════
-- REFERRAL SYSTEM — run this once in the Supabase SQL Editor
--
-- ReferralScreen.js has always read/displayed profiles.referral_code and
-- referral_count, but nothing anywhere ever wrote to them: no signup flow
-- captured an entered invite code, and referred_by/referral_count were never
-- set or incremented. Every user's real referral_count has been 0 forever —
-- the "Top Inviters" leaderboard and "Friends Joined" stat were both showing
-- fabricated numbers layered on top of dead columns.
--
-- This wires the counters up for real via two SECURITY DEFINER functions
-- (so a new user's signup can safely increment a *different* user's row
-- without needing a broader profiles RLS policy) and a view for the public
-- leaderboard that exposes only a privacy-safe display name + count, never
-- full_name or any other profile column.
--
-- Every statement here is idempotent (create or replace / drop-if-exists) so
-- this is safe to run more than once.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── Backfill the referral columns themselves ──────────────────────────────────
-- supabase_setup.sql declares these on profiles, but (same schema-drift trap as
-- the Phase 0 backfill) that file is a wishlist, not proof they ever ran live —
-- confirmed missing when this migration first errored with "column referral_count
-- does not exist". Add them for real before anything below can reference them.
alter table public.profiles add column if not exists referral_code   text unique;
alter table public.profiles add column if not exists referred_by     uuid references public.profiles(id);
alter table public.profiles add column if not exists referral_count  integer default 0;
create index if not exists profiles_referral_code_idx on public.profiles (referral_code) where referral_code is not null;

-- ── Redeem an invite code at signup ───────────────────────────────────────────
-- Called once, right after a new user's session exists. Silently no-ops on an
-- invalid code, a self-referral, or if the caller has already redeemed one —
-- a bad/missing code must never block account creation.
create or replace function public.redeem_referral_code(p_code text)
returns void language plpgsql security definer as $$
declare
  v_referrer_id uuid;
begin
  select id into v_referrer_id
  from public.profiles
  where referral_code = upper(trim(p_code));

  if v_referrer_id is null or v_referrer_id = auth.uid() then
    return;
  end if;

  update public.profiles
  set referred_by = v_referrer_id
  where id = auth.uid()
    and referred_by is null;

  if found then
    update public.profiles
    set referral_count = coalesce(referral_count, 0) + 1
    where id = v_referrer_id;
  end if;
end;
$$;

grant execute on function public.redeem_referral_code(text) to authenticated;

-- ── Real stats for the current user ───────────────────────────────────────────
-- invited = profiles.referral_count (already readable on the caller's own row,
-- included here just for a single round trip); joined = a real count of
-- profiles that were actually linked via this user's code.
create or replace function public.get_my_referral_stats()
returns table(invited integer, joined integer)
language plpgsql security definer as $$
begin
  return query
  select
    coalesce(p.referral_count, 0) as invited,
    (select count(*)::integer from public.profiles where referred_by = auth.uid()) as joined
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

grant execute on function public.get_my_referral_stats() to authenticated;

-- ── Public leaderboard view ───────────────────────────────────────────────────
-- Views run with the owner's privileges by default, so this can read across
-- all profiles without a new blanket SELECT policy on the base table (the
-- kind of policy Phase 0 removed for leaking PII). Only a "First L." style
-- display name and the count are exposed — nothing else from profiles.
create or replace view public.referral_leaderboard as
select
  case
    when full_name is null or trim(full_name) = '' then 'A PathwayUSA user'
    when position(' ' in trim(full_name)) = 0 then trim(full_name)
    else split_part(trim(full_name), ' ', 1)
      || ' ' || left(split_part(trim(full_name), ' ', 2), 1) || '.'
  end as display_name,
  referral_count
from public.profiles
where referral_count > 0
order by referral_count desc
limit 20;

grant select on public.referral_leaderboard to authenticated;
