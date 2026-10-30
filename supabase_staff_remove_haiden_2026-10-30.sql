-- ============================================================================
-- Remove Haiden R-Brown from the app (2026-10-30)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Run step 1 on its own first and
-- check what it finds, then run step 2.
-- RUN 2026-10-30: Staff Portal name list dropped from 16 to 15, Haiden gone.
--
-- Haiden was never in the app's hard-coded crew lists, only in the database:
-- the Staff Portal roster (staff) and anything hanging off it. Deleting the
-- staff row cascades to his leave entries, clock events, portal sessions and
-- overtime approvals. He was not a manager, so no one else's leave decision
-- points at him.
--
-- Not touched: completed, signed paperwork (toolbox talks, job forms, checks)
-- that he may have signed in the past. Those are safety records, so they're
-- kept as they were signed.
-- ============================================================================

-- 1. Preview — what will be removed. Expect one staff row.
select 'staff' as what, count(*) from staff where name = 'Haiden R-Brown'
union all
select 'leave entries', count(*) from staff_leave_requests slr join staff s on s.id = slr.staff_id where s.name = 'Haiden R-Brown'
union all
select 'clock events', count(*) from staff_clock_events sce join staff s on s.id = sce.staff_id where s.name = 'Haiden R-Brown'
union all
select 'overtime approvals', count(*) from staff_overtime_approvals soa join staff s on s.id = soa.staff_id where s.name = 'Haiden R-Brown'
union all
select 'method statement staff', count(*) from ms_staff where name ilike '%haiden%';

-- 2. Remove.
delete from staff where name = 'Haiden R-Brown';
delete from ms_staff where name ilike '%haiden%';

-- Verify — both should be 0.
select (select count(*) from staff where name ilike '%haiden%') as staff_left,
       (select count(*) from ms_staff where name ilike '%haiden%') as ms_staff_left;
