-- ============================================================================
-- Staff Portal — add booked holiday (2026-09-28) — ALREADY RUN
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Adds the following as approved holiday, using the manager-add RPC,
-- so it counts correctly against the balance and shows on the team calendar:
--
--   James Hilborn   12-14 Oct 2026 (Mon-Wed)   (3 days)
--
-- Safe to re-run: the duplicate guard (supabase_staff_leave_duplicate_guard_
-- 2026-09-28.sql) makes a second run fail with "Already has holiday ...
-- booked" instead of adding it twice.
-- ============================================================================

select sp_manager_add_leave_entry('James Hilborn', '2026-10-12', '2026-10-14', 3, 'holiday', null);

-- Verify
select
  s.name,
  slr.start_date, slr.end_date, slr.days, slr.type, slr.status
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where s.name = 'James Hilborn'
order by slr.start_date;
