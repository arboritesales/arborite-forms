-- ============================================================================
-- Staff Portal — Liam Couling-Foulkes holiday balance correction (2026-08-25)
-- ============================================================================
-- Run this once in the Supabase SQL editor.
--
-- Context: the 2026-08-21 balance correction (supabase_staff_holiday_balance_
-- update_2026-08.sql) set his "days used" target to 16 as of end of July
-- 2026, via a historical catch-up row. Since then, 2 new bookings were added
-- (14-15 Sep 2026, 21-22 Dec 2026 = 4 days), which pushed his live total to
-- 20 used / 0 remaining. Correct current figure should be 16 used / 4
-- remaining (allowance stays 20) — this adjusts the same historical catch-up
-- row so the total lands on 16, same technique as the previous script.
-- ============================================================================

do $$
declare
  v_staff_id uuid;
  v_other_used numeric;
  v_hist_id uuid;
  v_target_used numeric := 16;
begin
  select id into v_staff_id from staff where name = 'Liam Couling-Foulkes';
  if v_staff_id is null then
    raise exception 'Staff member not found: Liam Couling-Foulkes';
  end if;

  select coalesce(sum(days), 0) into v_other_used
  from staff_leave_requests
  where staff_id = v_staff_id
    and status = 'approved'
    and type in ('holiday', 'shutdown')
    and note not like 'Historical balance import%';

  select id into v_hist_id
  from staff_leave_requests
  where staff_id = v_staff_id and note like 'Historical balance import%'
  limit 1;

  if v_hist_id is not null then
    update staff_leave_requests
    set days = v_target_used - v_other_used
    where id = v_hist_id;
  else
    insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
    values (v_staff_id, '2026-04-01', '2026-04-01', v_target_used - v_other_used, 'holiday',
      'Historical balance import from Holiday Chart 2026-2027.xlsx (as of end of July 2026)', 'approved', now());
  end if;
end $$;

-- Verify — should now show days_used = 16, days_remaining = 4
select
  s.name,
  s.holiday_allowance_days as allowance,
  coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_used,
  s.holiday_allowance_days - coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_remaining
from staff s
where s.name = 'Liam Couling-Foulkes';
