-- ============================================================================
-- Restore QU2997 - Catherine De Barns - Cala Chiltern (2026-08-28)
-- ============================================================================
-- Run this in the Supabase SQL editor. The row for this job vanished from
-- job_forms sometime after its last save at 07:38 this morning — the audit
-- log still has every version, so this pulls the very last one recorded
-- (whatever it was: an update or a delete) and puts it back.
-- ============================================================================

insert into job_forms (quote_ref, updated_at, form_data)
select quote_ref, now(), form_data
from job_forms_audit_log
where quote_ref = 'QU2997 - CATHERINE DE BARNS - CALA CHILTERN'
order by logged_at desc
limit 1
on conflict (quote_ref) do update set form_data = excluded.form_data, updated_at = excluded.updated_at;

-- Verify — should show the restored record
select quote_ref, updated_at
from job_forms
where quote_ref = 'QU2997 - CATHERINE DE BARNS - CALA CHILTERN';
