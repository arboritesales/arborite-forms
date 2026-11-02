-- 30 Oct 2026 — MV72 CEA — Transit (Jack) still showing twice on today's
-- checks list after Jack Fisher finished its check at 15:04 (rated
-- Excellent). It had more than one outstanding booking, and a saved check
-- only ticked off one of them (fixed in v1.9.88: a check now ticks off every
-- outstanding booking for that machine). This clears the leftovers.

-- 1. See what's outstanding first
select id, scheduled_date, completed, not_in_use
from public.todays_checks
where category = 'vehicle' and machine = 'MV72 CEA — Transit (Jack)'
  and completed is not true and scheduled_date <= '2026-10-30'
order by scheduled_date;

-- 2. Tick them all off
update public.todays_checks
set completed = true
where category = 'vehicle' and machine = 'MV72 CEA — Transit (Jack)'
  and completed is not true and scheduled_date <= '2026-10-30';
