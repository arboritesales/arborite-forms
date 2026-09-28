-- ============================================================================
-- Staff Portal — add new starter George Sim (2026-09-28)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Safe to re-run.
--
-- 20 days holiday allowance, 0 used, not a manager. No password yet — he
-- picks his own the first time he signs in to the Staff Portal.
--
-- The Christmas shutdown days are applied to him straight away below. UK bank
-- holidays get added automatically the next time a manager opens Staff
-- Dashboards (same as for everyone else).
-- ============================================================================

insert into staff (name, holiday_allowance_days, is_manager, active)
values ('George Sim', 20, false, true)
on conflict (name) do update
  set holiday_allowance_days = excluded.holiday_allowance_days,
      active = true;

select sp_sync_shutdown_days();

-- Verify — should show George Sim, allowance 20, active true
select
  s.name,
  s.holiday_allowance_days as allowance,
  s.is_manager,
  s.active,
  coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_used,
  s.holiday_allowance_days - coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_remaining
from staff s
where s.name = 'George Sim';
