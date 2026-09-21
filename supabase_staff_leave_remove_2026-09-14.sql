-- ============================================================================
-- Staff Portal — remove duplicate holiday entries for Olly Key (2026-09-14)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query).
--
-- Olly Key's 23-24 Dec and 29-31 Dec 'holiday' entries (added in
-- supabase_staff_leave_add_2026-09-11.sql) duplicate the company shutdown
-- closure, which is auto-applied to every active staff member as separate
-- 'shutdown' rows (see sp_sync_shutdown_days in supabase_staff_portal.sql)
-- and already counts against his allowance. Removing the redundant
-- 'holiday' rows so he's only charged once for those dates, same as
-- everyone else.
-- ============================================================================

delete from staff_leave_requests
where staff_id = (select id from staff where name = 'Olly Key')
  and type = 'holiday'
  and (start_date, end_date) in (('2026-12-23', '2026-12-24'), ('2026-12-29', '2026-12-31'));

-- Verify — only the shutdown rows should remain for these dates
select
  s.name,
  slr.start_date, slr.end_date, slr.days, slr.type, slr.status
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where s.name = 'Olly Key'
order by slr.start_date;
