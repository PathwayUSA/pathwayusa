-- Creates the 'avatars' bucket used by ProfileScreen.js's handlePickAvatar.
-- Confirmed missing in production (only client-documents existed) — the upload
-- has been silently failing and falling back to a dead local URI ever since
-- it was written. Public bucket by design: avatars are shown in-app without
-- auth friction, unlike client-documents (private, immigration paperwork).
--
-- Path convention matches client-documents' folder-per-user pattern:
-- `${auth.uid()}/avatar.<ext>` — so the same storage.foldername(name)[1]
-- check works for RLS, and ProfileScreen.js's `path` construction needs to
-- change from `${user.id}.${ext}` to `${user.id}/avatar.${ext}` to match.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- No SELECT policy needed: the bucket is public, so reads go through the
-- public URL endpoint (getPublicUrl), which bypasses storage.objects RLS.
