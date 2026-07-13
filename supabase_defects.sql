-- ============================================================================
-- Arborite Field Forms — Defects feature: columns + photo storage bucket
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — every statement uses IF NOT EXISTS / ON CONFLICT so running
-- it twice won't error or duplicate anything.
--
-- What this does:
--   - Adds the new "defects" fields to every inspection check table (vehicle
--     + the 7 equipment categories): has_defect, defect_comment, defect_images
--   - Adds defect_status + office_note columns too (used by the Defects
--     dashboard in the next step — added now so this is a single migration)
--   - Creates a new "defect-photos" Storage bucket, public (same reasoning as
--     the signatures/documents buckets — the app loads images via direct
--     public URLs, not authenticated fetches) with authenticated-only write
--     access, matching the policies in supabase_rls.sql
-- ============================================================================

do $$
declare
  t text;
  tables text[] := array[
    'vehicle_checks', 'stump_grinder_checks', 'woodchipper_checks',
    'digger_checks', 'green_climber_checks', 'handheld_tool_checks',
    'trailer_checks', 'mewp_checks'
  ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I add column if not exists has_defect boolean not null default false;', t);
    execute format('alter table public.%I add column if not exists defect_comment text;', t);
    execute format('alter table public.%I add column if not exists defect_images text[];', t);
    execute format('alter table public.%I add column if not exists defect_status text;', t);
    execute format('alter table public.%I add column if not exists office_note text;', t);
  end loop;
end $$;


-- ============================================================================
-- SECTION 2 — STORAGE: defect-photos bucket + policies
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('defect-photos', 'defect-photos', true)
on conflict (id) do nothing;

drop policy if exists "authenticated can read defect photos" on storage.objects;
create policy "authenticated can read defect photos" on storage.objects
  for select to authenticated using (bucket_id = 'defect-photos');

drop policy if exists "authenticated can upload defect photos" on storage.objects;
create policy "authenticated can upload defect photos" on storage.objects
  for insert to authenticated with check (bucket_id = 'defect-photos');

drop policy if exists "authenticated can update defect photos" on storage.objects;
create policy "authenticated can update defect photos" on storage.objects
  for update to authenticated using (bucket_id = 'defect-photos');

drop policy if exists "authenticated can delete defect photos" on storage.objects;
create policy "authenticated can delete defect photos" on storage.objects
  for delete to authenticated using (bucket_id = 'defect-photos');


-- ============================================================================
-- SECTION 3 — VERIFY
-- ============================================================================
-- Every table in the list above should now show these 5 new columns:
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and column_name in ('has_defect','defect_comment','defect_images','defect_status','office_note')
order by table_name, column_name;

-- Should show one row: defect-photos, public = true
select id, name, public from storage.buckets where id = 'defect-photos';
