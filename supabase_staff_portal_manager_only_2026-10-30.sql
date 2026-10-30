-- ============================================================================
-- Staff Portal — manager-only functions need the MANAGER login (2026-10-30)
-- ============================================================================
-- Run this once in the Supabase SQL editor, before the Staff Portal goes live.
--
-- Found during the pre-launch health check: the 2026-10-28 script locked the
-- manager-only functions away from anon, but left them open to every
-- `authenticated` session — and the shared team login (login@arborite.app,
-- which every field user knows) is `authenticated` too, exactly like the
-- manager login (manager@arborite.app). So anyone on the team login could,
-- from the browser console, approve their own holiday, reset someone else's
-- Staff Portal password and claim their account, read everyone's GPS clock
-- events, or edit/delete leave and clock entries.
--
-- Fix: a small helper, sp_require_manager(), that raises unless the caller's
-- login email is manager@arborite.app, called as the FIRST statement of each
-- of the 14 manager-only functions. Bodies below are otherwise copied exactly
-- from their latest versions:
--   supabase_staff_portal.sql                        — reset_staff_password,
--     sp_clock_activity, sp_manager_delete_clock_event, sp_team_summary,
--     sp_pending_requests, sp_staff_leave_history, sp_manager_delete_leave_entry,
--     sp_sync_bank_holidays, sp_sync_shutdown_days
--   supabase_staff_overtime_alerts_2026-08-28.sql    — sp_clock_report,
--     sp_manager_set_overtime
--   supabase_staff_leave_duplicate_guard_2026-09-28.sql — sp_decide_leave_request,
--     sp_manager_add_leave_entry, sp_manager_edit_leave_entry
-- Signatures and return types are unchanged, so CREATE OR REPLACE is enough.
--
-- Also drops the "authenticated_all" policy on staff_overtime_approvals —
-- that let the team login write overtime approvals directly over REST. The
-- app only ever touches that table through sp_clock_report /
-- sp_manager_set_overtime (security definer, so they don't need the policy).
--
-- The Staff Portal's own staff functions (verify_staff_login, sp_clock_event,
-- sp_my_leave_*, sp_submit_leave_request, sp_calendar_days, sp_onsite_now,
-- sp_list_staff_names, staff_needs_password_setup, set_staff_password) are
-- left alone — they're protected by the per-person session token instead.
--
-- Staff Dashboards from the team login + Office password will now show
-- "Staff Dashboards needs the Manager login" (the app checks this up front
-- too, from 1.9.86).
-- ============================================================================

create or replace function sp_require_manager()
returns void
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
begin
  if coalesce(auth.jwt() ->> 'email', '') <> 'manager@arborite.app' then
    raise exception 'Staff Dashboards needs the Manager login' using errcode = '42501';
  end if;
end;
$$;
-- Internal helper: only ever called from inside the functions below.
revoke execute on function sp_require_manager() from public, anon, authenticated;

-- ── from supabase_staff_portal.sql ──

create or replace function reset_staff_password(p_name text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  update staff set password_hash = null where name = p_name and active = true;
  select true;
$$;

create or replace function sp_clock_activity(p_limit int default 100)
returns table(id uuid, name text, action text, ts timestamptz, lat double precision, lng double precision, accuracy_m numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  select sce.id, s.name, sce.action, sce.ts, sce.lat, sce.lng, sce.accuracy_m
  from staff_clock_events sce
  join staff s on s.id = sce.staff_id
  order by sce.ts desc
  limit p_limit;
$$;

create or replace function sp_manager_delete_clock_event(p_id uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  delete from staff_clock_events where id = p_id;
  select true;
$$;

create or replace function sp_team_summary()
returns table(name text, entitlement numeric, days_used numeric, days_remaining numeric, sick_days numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  select
    s.name,
    s.holiday_allowance_days,
    coalesce(sum(case when slr.status = 'approved' and slr.type in ('holiday','shutdown') then slr.days end), 0),
    s.holiday_allowance_days - coalesce(sum(case when slr.status = 'approved' and slr.type in ('holiday','shutdown') then slr.days end), 0),
    coalesce(sum(case when slr.status = 'approved' and slr.type = 'sick' then slr.days end), 0)
  from staff s
  left join staff_leave_requests slr on slr.staff_id = s.id
  where s.active = true
  group by s.id, s.name, s.holiday_allowance_days
  order by s.name asc;
$$;

create or replace function sp_pending_requests()
returns table(id uuid, name text, start_date date, end_date date, days numeric, type text, note text, requested_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  select slr.id, s.name, slr.start_date, slr.end_date, slr.days, slr.type, slr.note, slr.requested_at
  from staff_leave_requests slr
  join staff s on s.id = slr.staff_id
  where slr.status = 'pending'
  order by slr.requested_at asc;
$$;

create or replace function sp_staff_leave_history(p_staff_name text)
returns table(id uuid, start_date date, end_date date, days numeric, type text, note text, status text, requested_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  select slr.id, slr.start_date, slr.end_date, slr.days, slr.type, slr.note, slr.status, slr.requested_at
  from staff_leave_requests slr
  join staff s on s.id = slr.staff_id
  where s.name = p_staff_name
  order by slr.start_date desc;
$$;

create or replace function sp_manager_delete_leave_entry(p_id uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
  delete from staff_leave_requests where id = p_id;
  select true;
$$;

create or replace function sp_sync_bank_holidays(p_dates jsonb)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
  v_year_start date;
  v_year_end date;
begin
  perform sp_require_manager();
  v_year_start := make_date(
    (case when extract(month from current_date) >= 4 then extract(year from current_date) else extract(year from current_date) - 1 end)::int,
    4, 1
  );
  v_year_end := (v_year_start + interval '1 year' - interval '1 day')::date;
  with dates as (select (jsonb_array_elements_text(p_dates))::date as d)
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
  select s.id, dates.d, dates.d, 1, 'bank_holiday', 'UK bank holiday (auto-applied)', 'approved', now()
  from staff s cross join dates
  where s.active = true and dates.d between v_year_start and v_year_end
  on conflict (staff_id, start_date) where type = 'bank_holiday' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function sp_sync_shutdown_days()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  perform sp_require_manager();
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
  select s.id, csd.date, csd.date, 1, 'shutdown', csd.label, 'approved', now()
  from staff s cross join company_shutdown_days csd
  where s.active = true
  on conflict (staff_id, start_date) where type = 'shutdown' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ── from supabase_staff_overtime_alerts_2026-08-28.sql ──

create or replace function sp_clock_report(p_year int, p_month int)
returns table(staff_id uuid, name text, work_date date, clock_in time, clock_out time, hours numeric, overtime_claimed numeric, overtime_approved numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select sp_require_manager();
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

create or replace function sp_manager_set_overtime(p_staff_name text, p_work_date date, p_hours_approved numeric)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
begin
  perform sp_require_manager();
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

-- ── from supabase_staff_leave_duplicate_guard_2026-09-28.sql ──

create or replace function sp_decide_leave_request(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_req staff_leave_requests;
  v_conflict text;
begin
  perform sp_require_manager();
  if p_status not in ('approved', 'declined') then
    raise exception 'Invalid status';
  end if;
  select * into v_req from staff_leave_requests where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already decided';
  end if;
  if p_status = 'approved' then
    v_conflict := sp_leave_conflict(v_req.staff_id, v_req.start_date, v_req.end_date, v_req.type, v_req.id);
    if v_conflict is not null then
      raise exception '%', v_conflict;
    end if;
  end if;
  update staff_leave_requests set status = p_status, decided_at = now()
    where id = p_request_id and status = 'pending';
  return true;
end;
$$;

create or replace function sp_manager_add_leave_entry(p_staff_name text, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
  v_conflict text;
begin
  perform sp_require_manager();
  select id into v_staff_id from staff where name = p_staff_name and active = true;
  if v_staff_id is null then
    raise exception 'Unknown staff member';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  if p_days > 0 and coalesce(p_note, '') not like 'Historical balance import%' then
    v_conflict := sp_leave_conflict(v_staff_id, p_start_date, p_end_date, p_type);
    if v_conflict is not null then
      raise exception '%', v_conflict;
    end if;
  end if;
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
    values (v_staff_id, p_start_date, p_end_date, p_days, p_type, p_note, 'approved', now());
  return true;
end;
$$;

create or replace function sp_manager_edit_leave_entry(p_id uuid, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
  v_conflict text;
begin
  perform sp_require_manager();
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  if p_status not in ('pending', 'approved', 'declined') then
    raise exception 'Invalid status';
  end if;
  select staff_id into v_staff_id from staff_leave_requests where id = p_id;
  if not found then
    raise exception 'Entry not found';
  end if;
  if p_status <> 'declined' and p_days > 0 and coalesce(p_note, '') not like 'Historical balance import%' then
    v_conflict := sp_leave_conflict(v_staff_id, p_start_date, p_end_date, p_type, p_id);
    if v_conflict is not null then
      raise exception '%', v_conflict;
    end if;
  end if;
  update staff_leave_requests
    set start_date = p_start_date, end_date = p_end_date, days = p_days, type = p_type, note = p_note, status = p_status
    where id = p_id;
  return true;
end;
$$;

-- ── Grants: same as 2026-10-28 — authenticated only, never anon ──

revoke execute on function reset_staff_password(text)                                    from public, anon;
revoke execute on function sp_clock_activity(int)                                        from public, anon;
revoke execute on function sp_manager_delete_clock_event(uuid)                           from public, anon;
revoke execute on function sp_clock_report(int, int)                                     from public, anon;
revoke execute on function sp_team_summary()                                             from public, anon;
revoke execute on function sp_pending_requests()                                         from public, anon;
revoke execute on function sp_decide_leave_request(uuid, text)                           from public, anon;
revoke execute on function sp_staff_leave_history(text)                                  from public, anon;
revoke execute on function sp_manager_add_leave_entry(text, date, date, numeric, text, text)        from public, anon;
revoke execute on function sp_manager_edit_leave_entry(uuid, date, date, numeric, text, text, text) from public, anon;
revoke execute on function sp_manager_delete_leave_entry(uuid)                           from public, anon;
revoke execute on function sp_manager_set_overtime(text, date, numeric)                  from public, anon;
revoke execute on function sp_sync_bank_holidays(jsonb)                                  from public, anon;
revoke execute on function sp_sync_shutdown_days()                                       from public, anon;

grant execute on function reset_staff_password(text)                                     to authenticated;
grant execute on function sp_clock_activity(int)                                         to authenticated;
grant execute on function sp_manager_delete_clock_event(uuid)                            to authenticated;
grant execute on function sp_clock_report(int, int)                                      to authenticated;
grant execute on function sp_team_summary()                                              to authenticated;
grant execute on function sp_pending_requests()                                          to authenticated;
grant execute on function sp_decide_leave_request(uuid, text)                            to authenticated;
grant execute on function sp_staff_leave_history(text)                                   to authenticated;
grant execute on function sp_manager_add_leave_entry(text, date, date, numeric, text, text)        to authenticated;
grant execute on function sp_manager_edit_leave_entry(uuid, date, date, numeric, text, text, text) to authenticated;
grant execute on function sp_manager_delete_leave_entry(uuid)                            to authenticated;
grant execute on function sp_manager_set_overtime(text, date, numeric)                   to authenticated;
grant execute on function sp_sync_bank_holidays(jsonb)                                   to authenticated;
grant execute on function sp_sync_shutdown_days()                                        to authenticated;

-- ── Overtime approvals: RPC-only, like the other staff tables ──
drop policy if exists "authenticated_all" on staff_overtime_approvals;

-- ============================================================================
-- Check: every row should say anon_can_run = false and has_manager_check = true.
-- Then test in the app:
--   - Manager login → Staff dashboards: loads as normal.
--   - Team login + Office password → Office → Staff Dashboards: shows
--     "Staff Dashboards needs the Manager login".
-- ============================================================================
select p.proname as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_run,
       position('sp_require_manager()' in p.prosrc) > 0 as has_manager_check
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('reset_staff_password','sp_clock_activity','sp_manager_delete_clock_event','sp_clock_report',
                    'sp_team_summary','sp_pending_requests','sp_decide_leave_request','sp_staff_leave_history',
                    'sp_manager_add_leave_entry','sp_manager_edit_leave_entry','sp_manager_delete_leave_entry',
                    'sp_manager_set_overtime','sp_sync_bank_holidays','sp_sync_shutdown_days')
order by 1;
