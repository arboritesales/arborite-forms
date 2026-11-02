-- ============================================================================
-- Check every job for cross-job signature leaks (2026-09-02)
-- ============================================================================
-- Background: QU3050 (Hurst Road) had its signatures also show up saved onto
-- QU2466 (36 Bullbrook) and QU2757 (34 Winscombe). Cause: switching jobs in
-- the app without a full reload could leave a stale signature reference in
-- memory, which then got silently saved onto whichever job was opened next.
-- Fixed in app v1.9.37/1.9.38 — this script is to find out whether any OTHER
-- jobs were affected by the same bug before the fix.
--
-- How a leak shows up in the data: once a signature is saved, it's stored as
-- a reference like "storage:QU3050/s-client.jpg" — the text before the "/"
-- is the job it was uploaded under, but with anything other than a letter,
-- digit, "_" or "-" turned into "_" first (see _storagePath() in js/app.js)
-- e.g. quote_ref "QU 3050" becomes folder "QU_3050". This script applies that
-- exact same substitution before comparing, otherwise ordinary job refs with
-- a space or other punctuation in them look like false-positive leaks.
--
-- A leak is a signature whose storage folder — after that substitution —
-- still doesn't match the job it's sitting on.
--
-- This is READ-ONLY — it only selects data, it does not change anything.
-- Run it in the Supabase SQL editor.
-- ============================================================================

-- 0) Quick sanity count first — should be a small number (ideally 0-20-ish).
select count(*) as suspected_leak_count
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g');

-- 0b) Characterize the 200 before looking at raw rows: which signature slot
-- is involved, and is it concentrated in a handful of jobs or spread out?
-- (No client names/addresses in this output — just counts.)
select
  sig.key as signature_field,
  count(*) as leak_count,
  count(distinct jf.quote_ref) as distinct_jobs_affected
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g')
group by sig.key
order by leak_count desc;

-- 0c) How many distinct jobs in total, and how old is the oldest/newest one?
select
  count(distinct jf.quote_ref) as distinct_jobs_affected,
  min(jf.updated_at) as earliest_affected_save,
  max(jf.updated_at) as latest_affected_save
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g');

-- 1) Live data: jobs that RIGHT NOW have a signature pointing at another job
-- (job refs only — no client/site details — safe to paste back in full).
select
  jf.quote_ref                                                     as affected_job,
  sig.key                                                          as signature_field,
  split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)  as signature_actually_belongs_to,
  jf.updated_at
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g')
order by jf.quote_ref, sig.key
limit 200;

-- 2) History: every time this ever happened, even if it was later overwritten
-- with a correct signature and so wouldn't show up in query 1 above. Needs
-- the job_forms_audit_log table (see supabase_job_forms_audit_log.sql) — if
-- that hasn't been run yet, this second query will error; queries 0-1 above
-- still work on their own.
select
  al.quote_ref                                                     as affected_job,
  sig.key                                                          as signature_field,
  split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)  as signature_actually_belongs_to,
  al.operation,
  al.logged_at
from job_forms_audit_log al,
     jsonb_each(coalesce(al.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(al.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g')
order by al.logged_at desc
limit 200;
