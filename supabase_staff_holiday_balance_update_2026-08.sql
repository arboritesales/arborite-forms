-- ============================================================================
-- Staff Portal — holiday balance correction (2026-08-21)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Updates everyone's "days used" so it matches the figures given,
-- without touching or deleting any real approved leave bookings already on
-- the calendar.
--
-- How it works: days_used/days_remaining are never stored directly — they're
-- computed live (by sp_my_leave_balance and sp_team_summary) as the sum of
-- everyone's approved 'holiday'/'shutdown' staff_leave_requests rows. Rather
-- than deleting real booked dates to hit a target total, this only adjusts
-- the single "Historical balance import..." catch-up row per person (the one
-- from supabase_staff_portal.sql) so that:
--
--   (historical row) + (every OTHER approved holiday/shutdown row) = target
--
-- If someone has no historical row yet, one is created. If someone already
-- has more real approved days booked than their target, the historical row
-- is allowed to go negative — that's a correct "credit back" adjustment, not
-- a bug.
--
-- Allowance stays 20 for everyone (already the default) — set explicitly
-- below just to be certain.
--
-- Olly Key is a new starter — 20 allowance, 0 used, pending his real figures
-- being confirmed later.
-- ============================================================================

update staff set holiday_allowance_days = 20
where name in (
  'Brook Taylor-Ware','Liam Cooper','Liam Couling-Foulkes','Joel Cripps','Jack Fisher',
  'Joe Grace','Sarah Haste','Shai Kelleher','James Hilborn','Jason Hiscock',
  'Dave Norris','Luke Richardson','Frances Winney','Haiden R-Brown','Olly Key'
);

do $$
declare
  v record;
  v_staff_id uuid;
  v_other_used numeric;
  v_hist_id uuid;
begin
  for v in (
    select * from (values
      ('Brook Taylor-Ware', 9.5),
      ('Liam Cooper', 14),
      ('Liam Couling-Foulkes', 16),
      ('Joel Cripps', 5),
      ('Jack Fisher', 14),
      ('Joe Grace', 19),
      ('Sarah Haste', 12),
      ('Shai Kelleher', 5),
      ('James Hilborn', 10),
      ('Jason Hiscock', 14),
      ('Dave Norris', 18),
      ('Luke Richardson', 18),
      ('Frances Winney', 12),
      ('Haiden R-Brown', 8),
      ('Olly Key', 0)
    ) as t(name, target_used)
  )
  loop
    select id into v_staff_id from staff where name = v.name;
    if v_staff_id is null then
      raise notice 'Staff member not found, skipping: %', v.name;
      continue;
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
      set days = v.target_used - v_other_used
      where id = v_hist_id;
    else
      insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
      values (v_staff_id, '2026-04-01', '2026-04-01', v.target_used - v_other_used, 'holiday',
        'Historical balance import from Holiday Chart 2026-2027.xlsx (as of end of July 2026)', 'approved', now());
    end if;
  end loop;
end $$;

-- Verify — days_used/days_remaining should now match the figures given
select
  s.name,
  s.holiday_allowance_days as allowance,
  coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_used,
  s.holiday_allowance_days - coalesce((select sum(slr.days) from staff_leave_requests slr
            where slr.staff_id = s.id and slr.status = 'approved' and slr.type in ('holiday','shutdown')), 0) as days_remaining
from staff s
order by s.name;
