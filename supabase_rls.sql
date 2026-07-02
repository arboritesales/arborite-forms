-- ============================================================================
-- Arborite Field Forms — Row Level Security (RLS) audit & hardening
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Read the whole file before running — Section 0 is informational only
-- (run it first and look at the results), Sections 1-3 make changes.
--
-- What this does:
--   - Confirms every table the app uses has RLS switched on
--   - Grants full CRUD to the `authenticated` role only (this is the single
--     shared login the whole team uses via the lock screen — checkPass() in
--     js/app.js authenticates as login@arborite.app and every request after
--     that carries that user's Bearer token)
--   - Explicitly denies the `anon` role — so the API can't be queried with
--     just the public anon key, only with a valid logged-in session
--   - Adds the Storage bucket policies for Signatures/Documents (the
--     `signatures` bucket policies were flagged as pending after the earlier
--     disk-IO throttling incident — included here so it's all in one place)
--
-- This does NOT change what the app itself can do — the app always sends the
-- authenticated Bearer token, so its behaviour is unaffected. It only closes
-- off direct, unauthenticated access to the API/tables.
-- ============================================================================


-- ============================================================================
-- SECTION 0 — INFORMATIONAL: see what's currently in place before changing anything
-- ============================================================================
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;


-- ============================================================================
-- SECTION 1 — ENABLE RLS on every table the app uses
-- ============================================================================
alter table public.job_forms              enable row level security;
alter table public.vehicle_checks         enable row level security;
alter table public.todays_checks          enable row level security;
alter table public.stump_grinder_checks   enable row level security;
alter table public.woodchipper_checks     enable row level security;
alter table public.digger_checks          enable row level security;
alter table public.green_climber_checks   enable row level security;
alter table public.handheld_tool_checks   enable row level security;
alter table public.trailer_checks         enable row level security;
alter table public.mewp_checks            enable row level security;


-- ============================================================================
-- SECTION 2 — POLICIES: authenticated-only full CRUD, no anon access
-- ============================================================================
-- Same policy shape repeated per table. Drops any existing policy of the
-- same name first so this script is safe to re-run.

do $$
declare
  t text;
  tables text[] := array[
    'job_forms', 'vehicle_checks', 'todays_checks', 'stump_grinder_checks',
    'woodchipper_checks', 'digger_checks', 'green_climber_checks',
    'handheld_tool_checks', 'trailer_checks', 'mewp_checks'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists "authenticated_all" on public.%I;', t);
    execute format(
      'create policy "authenticated_all" on public.%I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;


-- ============================================================================
-- SECTION 3 — STORAGE: Signatures / Documents buckets, authenticated only
-- ============================================================================
-- Covers the `signatures` bucket policies noted as pending, plus the
-- `Documents` bucket used for uploaded method statements / risk assessments etc.
-- Adjust bucket_id values below if your actual bucket names differ.

drop policy if exists "authenticated can read signatures" on storage.objects;
create policy "authenticated can read signatures" on storage.objects
  for select to authenticated using (bucket_id = 'signatures');

drop policy if exists "authenticated can upload signatures" on storage.objects;
create policy "authenticated can upload signatures" on storage.objects
  for insert to authenticated with check (bucket_id = 'signatures');

drop policy if exists "authenticated can update signatures" on storage.objects;
create policy "authenticated can update signatures" on storage.objects
  for update to authenticated using (bucket_id = 'signatures');

drop policy if exists "authenticated can delete signatures" on storage.objects;
create policy "authenticated can delete signatures" on storage.objects
  for delete to authenticated using (bucket_id = 'signatures');

drop policy if exists "authenticated can read documents" on storage.objects;
create policy "authenticated can read documents" on storage.objects
  for select to authenticated using (bucket_id = 'Documents');

drop policy if exists "authenticated can upload documents" on storage.objects;
create policy "authenticated can upload documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'Documents');

drop policy if exists "authenticated can update documents" on storage.objects;
create policy "authenticated can update documents" on storage.objects
  for update to authenticated using (bucket_id = 'Documents');

drop policy if exists "authenticated can delete documents" on storage.objects;
create policy "authenticated can delete documents" on storage.objects
  for delete to authenticated using (bucket_id = 'Documents');


-- ============================================================================
-- SECTION 4 — VERIFY: re-run the Section 0 queries after applying the above
-- ============================================================================
-- Every table listed in Section 1 should now show rowsecurity = true, and
-- pg_policies should show one "authenticated_all" policy per table plus the
-- 8 storage policies above. Then do a smoke test in the app itself: load a
-- job, save a job, open Checks, save a check — confirm nothing regressed.
