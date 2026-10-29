-- ============================================================================
-- Staff Portal — Olly Key: bring holiday used to 10 so he has 2 of 12 left
-- (2026-10-29)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Safe to re-run.
--
-- His allowance is 12 (supabase_staff_allowance_olly_key_2026-10-29.sql) but
-- only 6 days of holiday are recorded, so he showed 6 left. Holiday he took
-- before he was on the system was never entered. Same fix as everyone else
-- had in supabase_staff_holiday_balance_update_2026-08.sql: one "Historical
-- balance import" catch-up row, sized so that
--
--   (catch-up row) + (all his other approved holiday/shutdown) = 10
--
-- No real bookings are touched. The catch-up row doesn't show on the team
-- calendar or in leave history — it only counts towards the balance.
-- ============================================================================

do $$
declare
  v_target_used numeric := 10;
  v_staff_id uuid;
  v_other_used numeric;
  v_hist_id uuid;
begin
  select id into v_staff_id from staff where name = 'Olly Key';
  if v_staff_id is null then
    raise exception 'Olly Key not found';
  end if;

  select coalesce(sum(days), 0) into v_other_used
  from staff_leave_requests
  where staff_id = v_staff_id
    and status = 'approved'
    and type in ('holiday', 'shutdown')
    and coalesce(note, '') not like 'Historical balance import%';

  select id into v_hist_id
  from staff_leave_requests
  where staff_id = v_staff_id and note like 'Historical balance import%'
  limit 1;

  if v_hist_id is not null then
    update staff_leave_requests set days = v_target_used - v_other_used where id = v_hist_id;
  else
    insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
    values (v_staff_id, '2026-04-01', '2026-04-01', v_target_used - v_other_used, 'holiday',
      'Historical balance import — catch-up so Olly Key shows 2 of 12 days left (2026-10-29)', 'approved', now());
  end if;
end $$;

-- Verify — allowance 12, days_used 10, days_remaining 2
select
  s.name,
  s.holiday_allowance_days as allowance,
  coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_used,
  s.holiday_allowance_days - coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_remaining
from staff s
where s.name = 'Olly Key';
