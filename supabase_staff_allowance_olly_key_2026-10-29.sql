-- ============================================================================
-- Staff Portal — Olly Key's holiday allowance is 12 days, not 20 (2026-10-29)
-- ============================================================================
-- Run this once in the Supabase SQL editor. He was set up on the default 20
-- as a new starter (supabase_staff_holiday_balance_update_2026-08.sql).
-- Days used / remaining are worked out live from his approved leave, so
-- only the allowance needs changing — no leave bookings are touched.
-- ============================================================================

update staff set holiday_allowance_days = 12 where name = 'Olly Key';

-- Verify — allowance should be 12; days_remaining should be 2
select
  s.name,
  s.holiday_allowance_days as allowance,
  coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_used,
  s.holiday_allowance_days - coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_remaining
from staff s
where s.name = 'Olly Key';
