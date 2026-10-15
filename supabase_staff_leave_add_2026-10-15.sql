-- ============================================================================
-- Staff Portal — add booked holiday (2026-10-15) — ALREADY RUN
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Adds the following as approved holiday, using the manager-add RPC,
-- so it counts correctly against each person's balance and shows on the
-- team calendar:
--
--   Frances Winney      22-23 Oct 2026 (Thu-Fri)        (2 days)
--   Luke Richardson     09 Nov 2026 (Mon)               (1 day)
--   Olly Key            29 Jan 2027 (Fri)               (1 day)
--   Brook Taylor-Ware   28 Oct 2026 (Wed), morning off  (0.5 day)
--
-- Safe to re-run: the duplicate guard (supabase_staff_leave_duplicate_guard_
-- 2026-09-28.sql) makes a second run fail with "Already has holiday ...
-- booked" instead of adding it twice.
-- ============================================================================

select sp_manager_add_leave_entry('Frances Winney', '2026-10-22', '2026-10-23', 2, 'holiday', null);
select sp_manager_add_leave_entry('Luke Richardson', '2026-11-09', '2026-11-09', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2027-01-29', '2027-01-29', 1, 'holiday', null);
select sp_manager_add_leave_entry('Brook Taylor-Ware', '2026-10-28', '2026-10-28', 0.5, 'holiday', 'Half day — morning off');

-- Verify
select
  s.name,
  slr.start_date, slr.end_date, slr.days, slr.type, slr.status, slr.note
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where s.name in ('Frances Winney', 'Luke Richardson', 'Olly Key', 'Brook Taylor-Ware')
  and slr.start_date >= '2026-10-01'
order by s.name, slr.start_date;
