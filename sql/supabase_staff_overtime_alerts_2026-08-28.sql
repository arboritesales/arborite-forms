-- ============================================================================
-- Staff Portal — late/early alert email + overtime approval (2026-08-28)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Adds:
--   1. staff_overtime_approvals — one row per (staff, work day) holding how
--      many overtime hours a manager has approved for that day.
--   2. sp_clock_report extended to also return overtime_claimed (computed
--      live from clock times, same "computed not stored" pattern as holiday
--      balances) and overtime_approved (from the new table).
--   3. sp_manager_set_overtime — manager types a number, this upserts it.
--
-- Normal hours are 07:00-16:00. Overtime = clocked in before 07:00 and/or
-- clocked out after 16:00. The separate "late-in/early-out" email alert
-- (clock in after 07:00, or clock out before 16:00) is handled client-side
-- in the app, same as the holiday-request email — no DB change needed for
-- that part.
-- ============================================================================

create table if not exists staff_overtime_approvals (
  staff_id        uuid not null references staff(id) on delete cascade,
  work_date       date not null,
  hours_approved  numeric not null default 0,
  decided_at      timestamptz not null default now(),
  primary key (staff_id, work_date)
);
alter table staff_overtime_approvals enable row level security;
drop policy if exists "authenticated_all" on staff_overtime_approvals;
create policy "authenticated_all" on staff_overtime_approvals for all to authenticated using (true) with check (true);

drop function if exists sp_clock_report(int, int);
create or replace function sp_clock_report(p_year int, p_month int)
returns table(staff_id uuid, name text, work_date date, clock_in time, clock_out time, hours numeric, overtime_claimed numeric, overtime_approved numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select
    s.id,
    s.name,
    (sce.ts at time zone 'Europe/London')::date as work_date,
    min(case when sce.action = 'in' then (sce.ts at time zone 'Europe/London')::time end) as clock_in,
    max(case when sce.action = 'out' then (sce.ts at time zone 'Europe/London')::time end) as clock_out,
    round(extract(epoch from (
      max(case when sce.action = 'out' then sce.ts end) - min(case when sce.action = 'in' then sce.ts end)
    )) / 3600.0, 2) as hours,
    round(
      greatest(0, extract(epoch from ('07:00'::time - min(case when sce.action = 'in' then (sce.ts at time zone 'Europe/London')::time end))) / 3600.0)
      + greatest(0, extract(epoch from (max(case when sce.action = 'out' then (sce.ts at time zone 'Europe/London')::time end) - '16:00'::time)) / 3600.0)
    , 2) as overtime_claimed,
    coalesce(max(soa.hours_approved), 0) as overtime_approved
  from staff_clock_events sce
  join staff s on s.id = sce.staff_id
  left join staff_overtime_approvals soa
    on soa.staff_id = s.id and soa.work_date = (sce.ts at time zone 'Europe/London')::date
  where date_trunc('month', sce.ts at time zone 'Europe/London') = make_date(p_year, p_month, 1)
  -- Grouping by the bare alias "work_date" is ambiguous now that
  -- staff_overtime_approvals (soa) also has a real work_date column —
  -- Postgres resolves the name to soa.work_date instead of this expression,
  -- so it has to be spelled out explicitly here.
  group by s.id, s.name, (sce.ts at time zone 'Europe/London')::date
  order by s.name asc, work_date asc;
$$;
grant execute on function sp_clock_report(int, int) to authenticated;

create or replace function sp_manager_set_overtime(p_staff_name text, p_work_date date, p_hours_approved numeric)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
begin
  if p_hours_approved < 0 then
    raise exception 'Hours approved cannot be negative';
  end if;
  select id into v_staff_id from staff where name = p_staff_name and active = true;
  if v_staff_id is null then
    raise exception 'Unknown staff member';
  end if;
  insert into staff_overtime_approvals (staff_id, work_date, hours_approved, decided_at)
    values (v_staff_id, p_work_date, p_hours_approved, now())
  on conflict (staff_id, work_date) do update set hours_approved = excluded.hours_approved, decided_at = now();
  return true;
end;
$$;
grant execute on function sp_manager_set_overtime(text, date, numeric) to authenticated;
