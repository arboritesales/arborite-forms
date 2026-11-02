-- ============================================================================
-- Staff Portal — per-person dashboard audit (2026-09-28) — READ ONLY
-- ============================================================================
-- Run in the Supabase SQL editor. Changes nothing. One row per active staff
-- member showing the figures their dashboard shows (worked out exactly as
-- sp_my_leave_balance / sp_team_summary do), plus an "issues" column listing
-- anything that looks wrong. Ideally every issues cell is blank.
--
-- Columns:
--   allowance        holiday allowance for the year
--   carried_in       holiday used before the app (historical import /
--                    balance adjustment rows dated 1 Apr)
--   holiday_booked   approved holiday booked since
--   shutdown         Christmas shutdown days (auto-applied)
--   used / remaining what the dashboard shows
--   sick             approved sick days (informational)
--   pending          requests still waiting for a manager
--
-- Issues checked:
--   - remaining balance is negative
--   - missing (or extra) Christmas shutdown days compared to the company list
--   - fewer bank holidays than everyone else
--   - a leave entry whose "days" doesn't match the working days in its dates
--     (weekdays, minus bank holidays/shutdown) — often fine for half days,
--     but worth a look
--   - holiday/shutdown dated after 31 Mar 2027 (would wrongly come off this
--     year's balance, which counts every entry)
--   - requests pending for over 7 days
--   - past days clocked in with no clock-out (hours/overtime missing)
--   - days with a clock-out but no clock-in
-- ============================================================================

select
  s.name,
  s.holiday_allowance_days                          as allowance,
  a.carried_in,
  a.holiday_booked,
  a.shutdown,
  a.used,
  s.holiday_allowance_days - a.used                 as remaining,
  a.sick,
  a.pending,
  concat_ws('; ',
    case when s.holiday_allowance_days - a.used < 0
         then 'Remaining balance is negative' end,
    case when a.shutdown_rows <> (select count(*) from company_shutdown_days)
         then format('Has %s of %s shutdown days', a.shutdown_rows, (select count(*) from company_shutdown_days)) end,
    case when a.bank_hol_rows < (select max(c) from (select count(*) c from staff_leave_requests where type = 'bank_holiday' group by staff_id) z)
         then format('Only %s bank holidays (others have %s)', a.bank_hol_rows,
                     (select max(c) from (select count(*) c from staff_leave_requests where type = 'bank_holiday' group by staff_id) z)) end,
    case when m.day_mismatch > 0
         then format('%s leave entr%s where days recorded don''t match working days in the dates', m.day_mismatch, case when m.day_mismatch = 1 then 'y' else 'ies' end) end,
    case when a.next_year > 0
         then format('%s holiday entr%s after 31 Mar 2027 counting against this year', a.next_year, case when a.next_year = 1 then 'y' else 'ies' end) end,
    case when a.pending_old > 0
         then format('%s request%s pending over 7 days', a.pending_old, case when a.pending_old = 1 then '' else 's' end) end,
    case when c.no_out > 0
         then format('%s past day%s clocked in with no clock-out', c.no_out, case when c.no_out = 1 then '' else 's' end) end,
    case when c.out_no_in > 0
         then format('%s day%s with a clock-out but no clock-in', c.out_no_in, case when c.out_no_in = 1 then '' else 's' end) end
  ) as issues
from staff s
cross join lateral (
  select
    coalesce(sum(days) filter (where status = 'approved' and type = 'holiday'
             and (days <= 0 or coalesce(note, '') like 'Historical balance import%')), 0)                      as carried_in,
    coalesce(sum(days) filter (where status = 'approved' and type = 'holiday'
             and days > 0 and coalesce(note, '') not like 'Historical balance import%'), 0)                    as holiday_booked,
    coalesce(sum(days) filter (where status = 'approved' and type = 'shutdown'), 0)                            as shutdown,
    coalesce(sum(days) filter (where status = 'approved' and type in ('holiday', 'shutdown')), 0)              as used,
    coalesce(sum(days) filter (where status = 'approved' and type = 'sick'), 0)                                as sick,
    count(*) filter (where status = 'pending')                                                                 as pending,
    count(*) filter (where status = 'pending' and requested_at < now() - interval '7 days')                    as pending_old,
    count(*) filter (where type = 'shutdown')                                                                  as shutdown_rows,
    count(*) filter (where type = 'bank_holiday')                                                              as bank_hol_rows,
    count(*) filter (where status <> 'declined' and type in ('holiday', 'shutdown') and end_date > date '2027-03-31') as next_year
  from staff_leave_requests
  where staff_id = s.id
) a
cross join lateral (
  select count(*) as day_mismatch
  from staff_leave_requests l
  where l.staff_id = s.id
    and l.type in ('holiday', 'sick', 'other')
    and l.status <> 'declined'
    and l.days > 0
    and coalesce(l.note, '') not like 'Historical balance import%'
    and l.days <> (
      select count(*)
      from generate_series(l.start_date, l.end_date, interval '1 day') g(d)
      where extract(isodow from g.d) < 6
        and not exists (
          select 1 from staff_leave_requests b
          where b.staff_id = s.id
            and b.type in ('bank_holiday', 'shutdown')
            and b.start_date = g.d::date
        )
    )
) m
cross join lateral (
  select
    count(*) filter (where o is null and d < (now() at time zone 'Europe/London')::date) as no_out,
    count(*) filter (where i is null)                                                   as out_no_in
  from (
    select (ts at time zone 'Europe/London')::date as d,
           min(ts) filter (where action = 'in')  as i,
           max(ts) filter (where action = 'out') as o
    from staff_clock_events
    where staff_id = s.id
    group by 1
  ) x
) c
where s.active = true
order by s.name;
