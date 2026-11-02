-- ============================================================================
-- Staff Portal — add booked holiday (2026-09-11)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Adds the following as approved holiday, using the manager-add RPC,
-- so it counts correctly against each person's balance via
-- sp_my_leave_balance / sp_team_summary and shows on the team calendar:
--
--   Sarah Haste   25 Sep 2026        (1 day)
--   Sarah Haste   28 Sep 2026        (1 day)
--   Olly Key      08 Oct 2026        (1 day)
--   Olly Key      12 Oct 2026        (1 day)
--   Olly Key      02 Nov 2026        (1 day)
--   Olly Key      06 Nov 2026        (1 day)
--   Olly Key      20 Nov 2026        (1 day)
--   Olly Key      23-24 Dec 2026     (2 days)
--   Olly Key      29-31 Dec 2026     (3 days)
-- ============================================================================

select sp_manager_add_leave_entry('Sarah Haste', '2026-09-25', '2026-09-25', 1, 'holiday', null);
select sp_manager_add_leave_entry('Sarah Haste', '2026-09-28', '2026-09-28', 1, 'holiday', null);

select sp_manager_add_leave_entry('Olly Key', '2026-10-08', '2026-10-08', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-10-12', '2026-10-12', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-11-02', '2026-11-02', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-11-06', '2026-11-06', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-11-20', '2026-11-20', 1, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-12-23', '2026-12-24', 2, 'holiday', null);
select sp_manager_add_leave_entry('Olly Key', '2026-12-29', '2026-12-31', 3, 'holiday', null);

-- Verify
select
  s.name,
  slr.start_date, slr.end_date, slr.days, slr.type, slr.status
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where s.name in ('Sarah Haste', 'Olly Key')
order by s.name, slr.start_date;
