-- ============================================================================
-- Job documents → Supabase Storage (2026-10-12, app v1.9.61)
-- ============================================================================
-- From v1.9.61 the app uploads job documents (method statements, site plans,
-- tree survey reports, …) to the private `documents` Storage bucket as the
-- original file, and job_documents just records 'storage:<path>'. Before
-- this, every document went into job_documents.data as base64 text — long
-- PDFs were flattened into one giant image first, which broke uploads of big
-- survey reports (QU-2999) and made the table very heavy for the database.
--
-- The code has always pointed at a bucket called `documents` (lowercase), but
-- supabase_rls.sql gave its policies to `Documents` (capital D), so uploads
-- there have likely never been allowed. This creates the lowercase bucket if
-- it's missing and gives the logged-in app access to it.
--
-- Until this is run the app still works: Storage uploads fail and it falls
-- back to the old base64-in-table storage, for files up to 5 MB.
--
-- Safe to run more than once.
-- ============================================================================

-- SECTION 1 — the bucket (private; 50 MB per file, matching the app's limit)
insert into storage.buckets (id, name, public, file_size_limit)
values ('documents', 'documents', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

-- SECTION 2 — logged-in app users can read / upload / replace / delete
drop policy if exists "authenticated can read job documents" on storage.objects;
create policy "authenticated can read job documents" on storage.objects
  for select to authenticated using (bucket_id = 'documents');

drop policy if exists "authenticated can upload job documents" on storage.objects;
create policy "authenticated can upload job documents" on storage.objects
  for insert to authenticated with check (bucket_id = 'documents');

drop policy if exists "authenticated can update job documents" on storage.objects;
create policy "authenticated can update job documents" on storage.objects
  for update to authenticated using (bucket_id = 'documents');

drop policy if exists "authenticated can delete job documents" on storage.objects;
create policy "authenticated can delete job documents" on storage.objects
  for delete to authenticated using (bucket_id = 'documents');

-- SECTION 3 — check (read-only): should list the bucket and the four policies
select id, public, file_size_limit from storage.buckets where id = 'documents';
select policyname, cmd from pg_policies
where schemaname = 'storage' and tablename = 'objects' and policyname like '%job documents%';

-- SECTION 4 — report (read-only): the largest documents still stored as
-- base64 in the table, and the total. Run on its own if you want to see how
-- much is in there — this is what can be moved into Storage later.
-- select job_ref, category, name, mime_type,
--        pg_size_pretty(octet_length(data)::bigint) as size
-- from job_documents
-- where data not like 'storage:%'
-- order by octet_length(data) desc
-- limit 25;
--
-- select count(*) as docs, pg_size_pretty(sum(octet_length(data))::bigint) as total
-- from job_documents where data not like 'storage:%';
