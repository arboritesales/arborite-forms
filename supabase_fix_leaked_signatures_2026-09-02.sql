-- ============================================================================
-- Clear leaked cross-job signatures (2026-09-02)
-- ============================================================================
-- Found via supabase_check_signature_leaks_2026-09-02.sql: these 4 jobs each
-- have signature fields whose storage reference points at a DIFFERENT job's
-- folder — the same bug that hit QU2466/QU2757 (fixed in app v1.9.37/1.9.38).
--
--   QU-3011 CALA CHILTERN FAIRFORD GL7 4NP        <- signatures actually QU2997's   (44 fields)
--   QU-3040 MILLER HOMES DEER PARK GU9 9RL        <- signatures actually QU-2863's/QU-2914's (10+28 fields)
--   QU2466- 36 BULLBROOK DRIVE - ABRI             <- signatures actually QU3050's   (38 fields)
--   QU2757 - 34 WINSCOMBE - ABRI                  <- signatures actually QU3050's   (38 fields)
--
-- This does NOT try to guess or restore a "correct" signature — there isn't
-- one recoverable; the real person never actually signed in the app because
-- the leaked value silently stood in for it. It just removes the wrong
-- entries so the affected fields go back to genuinely blank, ready to be
-- signed properly. Nothing is permanently lost either way: the audit log
-- (job_forms_audit_log) already has the pre-corruption history for every one
-- of these jobs from before this bug touched them.
--
-- Run step 1 first and check the preview looks right, THEN run step 2.
-- ============================================================================

-- Step 1 — PREVIEW ONLY. Shows exactly which fields on which jobs would be
-- cleared. Nothing is changed by this query.
select
  jf.quote_ref as job,
  sig.key as signature_field_to_clear,
  split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1) as currently_points_to
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where jf.quote_ref in (
    'QU-3011 CALA CHILTERN FAIRFORD GL7 4NP',
    'QU-3040 MILLER HOMES DEER PARK GU9 9RL',
    'QU2466- 36 BULLBROOK DRIVE - ABRI',
    'QU2757 - 34 WINSCOMBE - ABRI'
  )
  and sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g')
order by jf.quote_ref, sig.key;

-- Step 2 — ACTUALLY CLEARS THEM. Only run this after checking step 1's
-- preview looks right. Rebuilds each affected job's "signatures" object,
-- dropping exactly the fields flagged above and keeping every other
-- signature (and all non-signature data) untouched.
update job_forms jf
set form_data = jsonb_set(
  jf.form_data,
  '{signatures}',
  (
    select coalesce(jsonb_object_agg(s.key, s.value), '{}'::jsonb)
    from jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as s(key, value)
    where not (
      s.value #>> '{}' like 'storage:%'
      and split_part(replace(s.value #>> '{}', 'storage:', ''), '/', 1)
          <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g')
    )
  ),
  false
)
where jf.quote_ref in (
    'QU-3011 CALA CHILTERN FAIRFORD GL7 4NP',
    'QU-3040 MILLER HOMES DEER PARK GU9 9RL',
    'QU2466- 36 BULLBROOK DRIVE - ABRI',
    'QU2757 - 34 WINSCOMBE - ABRI'
  );

-- Step 3 — verify: should return zero rows for these 4 jobs now.
select
  jf.quote_ref as job,
  sig.key as signature_field,
  split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1) as points_to
from job_forms jf,
     jsonb_each(coalesce(jf.form_data -> 'signatures', '{}'::jsonb)) as sig(key, value)
where jf.quote_ref in (
    'QU-3011 CALA CHILTERN FAIRFORD GL7 4NP',
    'QU-3040 MILLER HOMES DEER PARK GU9 9RL',
    'QU2466- 36 BULLBROOK DRIVE - ABRI',
    'QU2757 - 34 WINSCOMBE - ABRI'
  )
  and sig.value #>> '{}' like 'storage:%'
  and split_part(replace(sig.value #>> '{}', 'storage:', ''), '/', 1)
      <> regexp_replace(jf.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g');
