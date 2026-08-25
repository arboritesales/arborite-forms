-- ============================================================================
-- Staff Portal — add booked holiday (2026-08-25)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Adds the following as approved holiday, using the same
-- manager-add RPC the (not-yet-live) Staff Dashboards UI uses, so it counts
-- correctly against each person's balance via sp_my_leave_balance /
-- sp_team_summary:
--
--   Liam Couling-Foulkes  14-15 Sep 2026  (2 days)
--   Liam Couling-Foulkes  21-22 Dec 2026  (2 days)
--   Jack Fisher            4-6 Jan 2027   (3 days)
-- ============================================================================

select sp_manager_add_leave_entry('Liam Couling-Foulkes', '2026-09-14', '2026-09-15', 2, 'holiday', null);
select sp_manager_add_leave_entry('Liam Couling-Foulkes', '2026-12-21', '2026-12-22', 2, 'holiday', null);
select sp_manager_add_leave_entry('Jack Fisher', '2027-01-04', '2027-01-06', 3, 'holiday', null);

-- Verify
select
  s.name,
  slr.start_date, slr.end_date, slr.days, slr.type, slr.status
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where s.name in ('Liam Couling-Foulkes', 'Jack Fisher')
order by s.name, slr.start_date;
