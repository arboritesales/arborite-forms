-- ============================================================================
-- job_forms audit log (2026-08-25)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Adds a permanent, append-only
-- history of every insert/update/delete on job_forms (Method Statements,
-- Toolbox Talks, Audits, and regular jobs all live in this one table).
--
-- Why: the Forestry England method statement has vanished from job_forms
-- three times now, and each time the cause turned out to be different — an
-- app bug, then a different app bug, then (this time) every single MSB row
-- disappearing at once with no delete command run and nothing left behind,
-- which points at something outside the app's own code entirely.
--
-- This closes the gap regardless of cause: it's a database-level trigger,
-- so it fires on ANY write to job_forms — through the app, through the SQL
-- editor, through anything — and keeps a full copy of the row every time,
-- including a full copy of what was there right before a delete. The one
-- thing it can't survive is restoring the whole database to a point in time
-- before this table existed (a Point-in-Time Recovery "Restore"), since that
-- reverts everything, including this log itself.
-- ============================================================================

create table if not exists job_forms_audit_log (
  id bigserial primary key,
  logged_at timestamptz not null default now(),
  operation text not null, -- 'INSERT', 'UPDATE', or 'DELETE'
  quote_ref text,
  form_data jsonb
);

-- Fast lookup by quote_ref when recovering a specific document
create index if not exists job_forms_audit_log_quote_ref_idx on job_forms_audit_log (quote_ref);

alter table job_forms_audit_log enable row level security;
drop policy if exists "authenticated_all" on job_forms_audit_log;
create policy "authenticated_all" on job_forms_audit_log for all to authenticated using (true) with check (true);

create or replace function _job_forms_audit_trigger() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (TG_OP = 'DELETE') then
    insert into job_forms_audit_log (operation, quote_ref, form_data) values ('DELETE', old.quote_ref, old.form_data);
    return old;
  else
    insert into job_forms_audit_log (operation, quote_ref, form_data) values (TG_OP, new.quote_ref, new.form_data);
    return new;
  end if;
end;
$$;

drop trigger if exists job_forms_audit on job_forms;
create trigger job_forms_audit
after insert or update or delete on job_forms
for each row
execute function _job_forms_audit_trigger();

-- Verify — should show a fresh 'INSERT' or 'UPDATE' row every time you save
-- anything in the app from now on
select operation, quote_ref, logged_at, form_data->'job'->>'client' as client
from job_forms_audit_log
order by logged_at desc
limit 20;
