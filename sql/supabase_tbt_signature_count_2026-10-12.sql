-- ============================================================================
-- Toolbox talk signature counts (2026-10-12, app v1.9.64)
-- ============================================================================
-- The Welcome screen's Toolbox talks row now shows "N forms to do" — the
-- number of TBTs with fewer than 10 signatures — and the TBT list marks each
-- form "4 of 10 signatures". Both read form_data.tbt_signed_count.
--
-- Until v1.9.64 the app saved every one of the 20 signature boxes, including
-- empty ones (as plain white JPEGs), so the saved signatures can't simply be
-- counted. Empty boxes on one form are all the same size, so they encode to
-- byte-identical images: the image that appears more than once is the empty
-- box. A box then counts as signed only if its image is at least 20% bigger
-- than that empty one — a stray tap or dot is only ~4% bigger (on COSHH,
-- TBT-20260917-406: empty 3,411 bytes, stray tap 3,543, signature 16,559).
-- The app applies the same 20% rule when it saves (TBT_SIGNATURE_MIN_RATIO
-- in toolbox-talks.js), and from v1.9.64 only saves boxes that pass it, sending
-- its own count — kept as-is below when there are no empty boxes to measure.
--
-- The trigger keeps the count right on every save — including saves from
-- devices still on an older app version that don't send a count.
--
-- Run 1 (2026-10-12) used a "unique image" rule that counted COSHH's stray tap
-- as a signature (2 instead of 1); re-run 2026-10-12 with the 20% rule.
-- Safe to run more than once. Section 3 re-saves each TBT row (form_data
-- unchanged apart from the count), so each shows up in job_forms_audit_log
-- as an UPDATE.
-- ============================================================================

-- SECTION 1 — how many real signatures a TBT's form_data holds, or null if
-- it has no repeated (empty-box) image to measure against
create or replace function tbt_signed_count(p_form_data jsonb)
returns int
language sql
immutable
as $$
  with sigs as (
    select value, length(value) as size, count(*) over (partition by value) as copies
    from jsonb_each_text(coalesce(p_form_data -> 'signatures', '{}'::jsonb))
  ),
  blank as (
    select max(size) as size from sigs where copies > 1
  )
  select case when blank.size is null then null
              else (select count(*)::int from sigs where copies = 1 and size > blank.size * 1.2)
         end
  from blank;
$$;

-- SECTION 2 — keep form_data.tbt_signed_count up to date on every TBT save
create or replace function tbt_set_signed_count()
returns trigger
language plpgsql
as $$
declare
  v_count int;
begin
  if new.quote_ref like 'TBT-%' and jsonb_typeof(new.form_data) = 'object' then
    v_count := tbt_signed_count(new.form_data);
    if v_count is null then
      -- No empty boxes saved: either v1.9.64+ (which only saves real
      -- signatures and sends its own count) or an old save with every box
      -- signed. Keep the app's count if it sent one, otherwise count them all.
      if new.form_data ? 'tbt_signed_count' then
        return new;
      end if;
      select count(*)::int into v_count
      from jsonb_each_text(coalesce(new.form_data -> 'signatures', '{}'::jsonb))
      where length(value) > 100;
    end if;
    new.form_data := jsonb_set(new.form_data, '{tbt_signed_count}', to_jsonb(v_count));
  end if;
  return new;
end;
$$;

drop trigger if exists tbt_signed_count on job_forms;
create trigger tbt_signed_count
  before insert or update of form_data on job_forms
  for each row execute function tbt_set_signed_count();

-- SECTION 3 — fill in the count on every existing TBT (the trigger does the work)
update job_forms set form_data = form_data where quote_ref like 'TBT-%';

-- SECTION 4 — check (read-only): every TBT with its count, the ones under 10 first
select quote_ref,
       form_data ->> 'tbt_topic'               as topic,
       form_data ->> 'tbt_date'                as date,
       (form_data ->> 'tbt_signed_count')::int as signatures
from job_forms
where quote_ref like 'TBT-%'
order by (form_data ->> 'tbt_signed_count')::int >= 10, updated_at desc;
