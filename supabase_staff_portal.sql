-- ============================================================================
-- Arborite Field Forms — Staff Portal (clock in/out, leave requests, team
-- calendar, manager Staff Dashboards)
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — every statement uses IF NOT EXISTS / OR REPLACE / ON CONFLICT
-- DO NOTHING so re-running after a partial failure won't duplicate anything.
--
-- Follows this project's existing pattern (see supabase_rls.sql): RLS enabled
-- on every table, one "authenticated_all" policy granting full CRUD to the
-- single shared `authenticated` role (the team/manager login), anon denied.
--
-- Includes the 2026 Christmas shutdown (23/24/29/30/31 Dec — confirmed from
-- the December sheet of Holiday Chart 2026-2027.xlsx) as a `company_shutdown_days`
-- entry, auto-applied to everyone the same way bank holidays are.
--
-- Every function sets search_path to "public, extensions" — Supabase installs
-- pgcrypto (crypt/gen_salt/gen_random_bytes) into the `extensions` schema, not
-- `public`, so without this every password function fails at call time with
-- "function gen_salt(unknown) does not exist" even though CREATE FUNCTION
-- itself succeeds (plpgsql doesn't resolve function calls until they run).
--
-- The one thing that's NOT loose like the rest of the app: `staff.password_hash`.
-- Since every authenticated session can read every row of every table here,
-- a normal SELECT would hand out password hashes to anyone who knows the team
-- password. So password_hash is column-level REVOKEd from authenticated/anon —
-- the only way to check a password is through verify_staff_login() below,
-- which runs as the table owner and never returns the hash itself.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- TABLES
-- ============================================================================

create table if not exists staff (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null unique,
  role                    text,
  password_hash           text,             -- null until the employee sets their own password on first login
  is_manager              boolean not null default false,
  holiday_allowance_days  numeric not null default 20,
  active                  boolean not null default true,
  created_at              timestamptz not null default now()
);

create table if not exists staff_clock_events (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id) on delete cascade,
  action      text not null check (action in ('in','out')),
  ts          timestamptz not null default now(),
  lat         double precision,
  lng         double precision,
  accuracy_m  numeric
);
create index if not exists staff_clock_events_staff_id_ts_idx on staff_clock_events(staff_id, ts desc);

-- Server-issued session token, created on successful login (verify_staff_login
-- or set_staff_password). Staff Portal deliberately doesn't require the shared
-- team/manager Supabase Auth login — someone should be able to clock in
-- without knowing that password — which means requests here run as Supabase's
-- `anon` role, not `authenticated`. RLS can only tell those two apart, so it
-- can't protect per-employee data on its own; this token is what actually
-- proves who's making a request; every mutating RPC below requires one.
create table if not exists staff_sessions (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  staff_id    uuid not null references staff(id) on delete cascade,
  expires_at  timestamptz not null
);
create index if not exists staff_sessions_expires_at_idx on staff_sessions(expires_at);

create table if not exists staff_leave_requests (
  id            uuid primary key default gen_random_uuid(),
  staff_id      uuid not null references staff(id) on delete cascade,
  start_date    date not null,
  end_date      date not null,
  days          numeric not null,
  type          text not null check (type in ('holiday','sick','other','bank_holiday','shutdown')),
  note          text,
  status        text not null default 'pending' check (status in ('pending','approved','declined')),
  requested_at  timestamptz not null default now(),
  decided_by    uuid references staff(id),
  decided_at    timestamptz
);
create index if not exists staff_leave_requests_staff_id_idx on staff_leave_requests(staff_id);

-- Lets the bank-holiday/shutdown sync (run whenever a manager opens Staff
-- Dashboards) upsert idempotently via `Prefer: resolution=merge-duplicates`
-- instead of checking "does this date already exist" first.
create unique index if not exists staff_leave_requests_bank_holiday_uidx
  on staff_leave_requests(staff_id, start_date) where type = 'bank_holiday';
create unique index if not exists staff_leave_requests_shutdown_uidx
  on staff_leave_requests(staff_id, start_date) where type = 'shutdown';

-- Company-wide shutdown days (e.g. the Christmas closure) — unlike bank
-- holidays these aren't government-set, so they're a small table the manager
-- can add to directly (via Supabase, or a future admin UI) rather than
-- fetched from anywhere. Same auto-apply-to-everyone mechanism as bank
-- holidays: whenever Staff Dashboards loads, any date in here without a
-- matching 'shutdown' row for a given staff member gets one created.
create table if not exists company_shutdown_days (
  id      uuid primary key default gen_random_uuid(),
  date    date not null unique,
  label   text not null default 'Office shutdown'
);
alter table company_shutdown_days enable row level security;
drop policy if exists "authenticated_all" on company_shutdown_days;
create policy "authenticated_all" on company_shutdown_days for all to authenticated using (true) with check (true);

-- 2026 Christmas shutdown, from Holiday Chart 2026-2027.xlsx (December sheet,
-- Total Days=5 for every employee). Add next year's dates here the same way
-- once they're decided.
insert into company_shutdown_days (date, label) values
  ('2026-12-23', 'Christmas shutdown'),
  ('2026-12-24', 'Christmas shutdown'),
  ('2026-12-29', 'Christmas shutdown'),
  ('2026-12-30', 'Christmas shutdown'),
  ('2026-12-31', 'Christmas shutdown')
on conflict (date) do nothing;

-- ============================================================================
-- RLS
-- ============================================================================
-- Unlike the rest of the app, `staff` and `staff_clock_events` get NO
-- permissive policy at all — RLS stays on with zero rules, which means
-- direct REST access is denied to everyone, anon and authenticated alike.
-- All access goes through the RPC functions below instead (they run as this
-- script's owner, which also owns these tables, so they bypass RLS the same
-- way any table owner does — the RPC's own logic is what enforces who can
-- do what, not a table policy). This is deliberate: a plain "authenticated_all"
-- policy here would also need to cover `anon` (since Staff Portal doesn't use
-- the shared team login), and that would let anyone with no password at all
-- forge clock-in records for any employee via a raw REST call.
--
-- staff_leave_requests and company_shutdown_days (below) still use the
-- project's normal "authenticated_all" pattern for now — they're not called
-- from anywhere yet (Phase 1 is login + clock in/out only), but the same
-- RPC-only treatment needs to happen before Phase 2 (leave requests/calendar)
-- actually uses them from an anon context. Don't copy today's staff/
-- staff_clock_events pattern back onto those without applying this fix too.

alter table staff enable row level security;
alter table staff_clock_events enable row level security;
alter table staff_sessions enable row level security;
alter table staff_leave_requests enable row level security;

drop policy if exists "authenticated_all" on staff;
drop policy if exists "authenticated_all" on staff_clock_events;

drop policy if exists "authenticated_all" on staff_leave_requests;
create policy "authenticated_all" on staff_leave_requests for all to authenticated using (true) with check (true);

-- Column-level lockdown: belt-and-braces even with RLS fully closed above —
-- if this table's RLS setup ever changes, password_hash still can't leak via
-- a plain SELECT. The hash is only ever touched inside the functions below.
revoke select (password_hash) on staff from authenticated, anon;

-- ============================================================================
-- PASSWORD FUNCTIONS — the only code path allowed to read/write password_hash
-- ============================================================================

-- Called before showing the password field, to decide whether to show
-- "enter your password" or "create your password" (true = never set one yet).
create or replace function staff_needs_password_setup(p_name text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  select password_hash is null from staff where name = p_name and active = true;
$$;

-- First-time setup: p_current_password is ignored (there's nothing to check
-- against yet). Changing an existing password: p_current_password must match,
-- or this raises and the client shows an error instead of silently failing.
-- Either way, success logs the employee straight in — returns a fresh session
-- token the same as verify_staff_login, so the client doesn't need a second
-- round trip just to sign in right after creating a password.
-- (DROP first: this changes the return type from the first version of this
-- file, which CREATE OR REPLACE can't do on its own.)
drop function if exists set_staff_password(text, text, text);
create or replace function set_staff_password(p_name text, p_new_password text, p_current_password text default null)
returns table(session_token text, staff_id uuid, is_manager boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff%rowtype;
  v_token text;
begin
  select * into v_staff from staff where name = p_name and active = true;
  if v_staff.id is null then
    raise exception 'Unknown staff member';
  end if;
  if v_staff.password_hash is not null then
    if p_current_password is null or crypt(p_current_password, v_staff.password_hash) <> v_staff.password_hash then
      raise exception 'Current password is incorrect';
    end if;
  end if;
  update staff set password_hash = crypt(p_new_password, gen_salt('bf')) where id = v_staff.id;
  v_token := encode(gen_random_bytes(24), 'hex');
  insert into staff_sessions (token, staff_id, expires_at) values (v_token, v_staff.id, now() + interval '30 minutes');
  return query select v_token, v_staff.id, v_staff.is_manager;
end;
$$;

-- Manager-only reset (called from Staff Dashboards, which is only reachable
-- after the real manager Supabase Auth login — see grants below, this one's
-- deliberately NOT given to anon): clears the password so the employee is
-- put back into "create your password" mode next login.
create or replace function reset_staff_password(p_name text)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  update staff set password_hash = null where name = p_name and active = true;
  select true;
$$;

-- Actual login check. Returns one row (session_token, staff_id, is_manager)
-- on success, zero rows on a wrong password or unknown name — the client
-- treats "no rows" as "incorrect password", same UX either way.
-- (DROP first, same reason as set_staff_password above.)
drop function if exists verify_staff_login(text, text);
create or replace function verify_staff_login(p_name text, p_password text)
returns table(session_token text, staff_id uuid, is_manager boolean)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff%rowtype;
  v_token text;
begin
  select * into v_staff from staff where name = p_name and active = true;
  if v_staff.id is null or v_staff.password_hash is null then
    return;
  end if;
  if crypt(p_password, v_staff.password_hash) = v_staff.password_hash then
    v_token := encode(gen_random_bytes(24), 'hex');
    insert into staff_sessions (token, staff_id, expires_at) values (v_token, v_staff.id, now() + interval '30 minutes');
    return query select v_token, v_staff.id, v_staff.is_manager;
  end if;
  return;
end;
$$;

-- Shared helper: every mutating RPC below calls this first. Raises (so the
-- caller's whole request fails loudly) on an unknown/expired token, otherwise
-- slides the expiry forward and returns the staff row it belongs to — the
-- server-side 30-minute expiry is deliberately looser than the UI's 5-minute
-- inactivity timeout; the UI logs someone out well before this would ever bite.
create or replace function sp_staff_from_token(p_token text)
returns staff
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_session staff_sessions%rowtype;
  v_staff staff%rowtype;
begin
  select * into v_session from staff_sessions where token = p_token;
  if v_session.token is null or v_session.expires_at < now() then
    raise exception 'Session expired — please sign in again';
  end if;
  update staff_sessions set expires_at = now() + interval '30 minutes' where token = p_token;
  select * into v_staff from staff where id = v_session.staff_id;
  return v_staff;
end;
$$;

-- Read-only, no token needed — just first names for the sign-in dropdown,
-- nothing sensitive.
create or replace function sp_list_staff_names()
returns table(name text)
language sql
security definer
set search_path = public, extensions
as $$
  select name from staff where active = true order by name asc;
$$;

-- The only way a clock event ever gets written — requires a valid session
-- token (proves the caller actually logged in as this person), so a raw
-- REST call can't forge one for someone else the way an open table policy
-- would have allowed.
create or replace function sp_clock_event(p_token text, p_action text, p_lat double precision default null, p_lng double precision default null, p_accuracy_m numeric default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff;
begin
  if p_action not in ('in', 'out') then
    raise exception 'Invalid action';
  end if;
  v_staff := sp_staff_from_token(p_token);
  insert into staff_clock_events (staff_id, action, lat, lng, accuracy_m) values (v_staff.id, p_action, p_lat, p_lng, p_accuracy_m);
  return true;
end;
$$;

-- Read-only, no token needed — "who's on site" is meant to be visible to
-- anyone on the Clock In/Out screen or Staff Dashboards, not just the
-- person asking. Each employee's most recent clock event, filtered to
-- those whose latest event is 'in'.
create or replace function sp_onsite_now()
returns table(name text, since timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select s.name, latest.ts
  from staff s
  join lateral (
    select action, ts from staff_clock_events sce
    where sce.staff_id = s.id
    order by sce.ts desc
    limit 1
  ) latest on true
  where latest.action = 'in'
  order by latest.ts asc;
$$;

-- Manager-only — one row per employee per day worked in the given month:
-- first clock-in and last clock-out that day, and the hours between. A
-- simple first-in/last-out timesheet, not a full break-by-break log (that's
-- what "Recent clock activity" above is for if more detail is ever needed).
create or replace function sp_clock_report(p_year int, p_month int)
returns table(name text, work_date date, clock_in time, clock_out time, hours numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select
    s.name,
    (sce.ts at time zone 'Europe/London')::date as work_date,
    min(case when sce.action = 'in' then (sce.ts at time zone 'Europe/London')::time end) as clock_in,
    max(case when sce.action = 'out' then (sce.ts at time zone 'Europe/London')::time end) as clock_out,
    round(extract(epoch from (
      max(case when sce.action = 'out' then sce.ts end) - min(case when sce.action = 'in' then sce.ts end)
    )) / 3600.0, 2) as hours
  from staff_clock_events sce
  join staff s on s.id = sce.staff_id
  where date_trunc('month', sce.ts at time zone 'Europe/London') = make_date(p_year, p_month, 1)
  group by s.name, work_date
  order by s.name asc, work_date asc;
$$;

-- Manager-only (Staff Dashboards) — every recent clock in/out event with its
-- location, not just who's currently on site. Employees only ever see each
-- other's on-site status via sp_onsite_now above (name only, no location) —
-- location is manager-visible only, hence authenticated-only grant below.
create or replace function sp_clock_activity(p_limit int default 100)
returns table(name text, action text, ts timestamptz, lat double precision, lng double precision, accuracy_m numeric)
language sql
security definer
set search_path = public, extensions
as $$
  select s.name, sce.action, sce.ts, sce.lat, sce.lng, sce.accuracy_m
  from staff_clock_events sce
  join staff s on s.id = sce.staff_id
  order by sce.ts desc
  limit p_limit;
$$;

-- anon: Staff Portal doesn't use the shared team/manager login, so its own
-- requests run as anon — these are the only functions it's allowed to call,
-- and each one either requires a valid password/token or returns nothing
-- sensitive. authenticated also gets them so the functions work regardless
-- of whether someone happens to already have a team/manager session too.
grant execute on function staff_needs_password_setup(text) to anon, authenticated;
grant execute on function set_staff_password(text, text, text) to anon, authenticated;
grant execute on function verify_staff_login(text, text) to anon, authenticated;
grant execute on function sp_list_staff_names() to anon, authenticated;
grant execute on function sp_clock_event(text, text, double precision, double precision, numeric) to anon, authenticated;
grant execute on function sp_onsite_now() to anon, authenticated;

-- authenticated only: reset_staff_password is called from Staff Dashboards,
-- which is only reachable after the real manager Supabase Auth login — no
-- reason for anon to ever be able to call this one.
grant execute on function reset_staff_password(text) to authenticated;
grant execute on function sp_clock_activity(int) to authenticated;
grant execute on function sp_clock_report(int, int) to authenticated;

-- ============================================================================
-- SEED DATA — from Arborite Tree Services Holiday Chart 2026-2027.xlsx,
-- entitlement/days-left as of end of July 2026. Re-run is safe: ON CONFLICT
-- on the unique `name` does nothing, so this won't clobber real usage once
-- the app is live. holiday_allowance_days is the ANNUAL entitlement (20);
-- days already used aren't stored directly — instead we log the historical
-- usage as pre-approved leave rows below so "days left" comes out right via
-- the same SUM-of-approved-requests logic the app uses for everyone else.
-- ============================================================================

-- Rename, in case this is a re-run after the name was seeded as just "Brook" —
-- update() first so a fresh run and a re-run both end up in the same state.
update staff set name = 'Brook Taylor-Ware' where name = 'Brook';

insert into staff (name, holiday_allowance_days, is_manager) values
  ('Brook Taylor-Ware', 20, true),
  ('Liam Cooper', 20, false),
  ('Liam Couling-Foulkes', 20, false),
  ('Joel Cripps', 20, false),
  ('Jack Fisher', 20, false),
  ('Joe Grace', 20, false),
  ('Sarah Haste', 20, false),
  ('Shai Kelleher', 20, false),
  ('James Hilborn', 20, false),
  ('Jason Hiscock', 20, false),
  ('Dave Norris', 20, false),
  ('Luke Richardson', 20, false),
  ('Frances Winney', 20, false),
  ('Haiden R-Brown', 20, false),
  ('Olly Key', 20, false)
on conflict (name) do nothing;

-- One backdated "already used" holiday row per employee, sized to match the
-- spreadsheet's cumulative total as of end of July 2026 (date used is a
-- placeholder mid-year date, not a real request — it exists purely so the
-- days-left maths matches the spreadsheet from day one).
insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
select s.id, '2026-04-01', '2026-04-01', v.days_used, 'holiday', 'Historical balance import from Holiday Chart 2026-2027.xlsx (as of end of July 2026)', 'approved', now()
from (values
  ('Brook Taylor-Ware', 2.5), ('Liam Cooper', 6), ('Liam Couling-Foulkes', 11), ('Jack Fisher', 9),
  ('Joe Grace', 12), ('Sarah Haste', 7), ('James Hilborn', 5), ('Jason Hiscock', 4),
  ('Dave Norris', 8), ('Luke Richardson', 7), ('Frances Winney', 7), ('Haiden R-Brown', 3)
) as v(name, days_used)
join staff s on s.name = v.name
where v.days_used > 0
  and not exists (
    select 1 from staff_leave_requests slr
    where slr.staff_id = s.id and slr.note like 'Historical balance import%'
  );

-- ============================================================================
-- PHASE 2 — My Leave, Team Calendar, Staff Dashboards team summary/approvals,
-- bank holiday & shutdown auto-sync.
-- ============================================================================
-- staff_leave_requests now needs the same RPC-only treatment as staff/
-- staff_clock_events in Phase 1 — Staff Portal calls (My Leave, Team
-- Calendar) run as anon, and the old "authenticated_all" policy from the
-- first version of this file would either block anon entirely or (if widened)
-- let anyone submit/read leave requests for any employee with no login at
-- all. Same fix: close it off entirely, go through RPCs instead.

drop policy if exists "authenticated_all" on staff_leave_requests;

-- Everyone's balance, computed the same way regardless of who's asking:
-- entitlement minus every approved day that counts against it — personal
-- holiday and the Christmas shutdown count; sick/other don't (matches the
-- spreadsheet, where Sickness never touches Days Left). Bank holidays are
-- shown on the calendar for reference but deliberately excluded here too —
-- verified directly against the spreadsheet: employees with zero personal
-- holiday in a month with bank holidays still show an unchanged balance.
-- sick_days is informational only (doesn't affect days_remaining).
drop function if exists sp_my_leave_balance(text);
create or replace function sp_my_leave_balance(p_token text)
returns table(entitlement numeric, days_used numeric, days_remaining numeric, sick_days numeric)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff;
  v_used numeric;
  v_sick numeric;
begin
  v_staff := sp_staff_from_token(p_token);
  select coalesce(sum(days), 0) into v_used
    from staff_leave_requests
    where staff_id = v_staff.id and status = 'approved' and type in ('holiday','shutdown');
  select coalesce(sum(days), 0) into v_sick
    from staff_leave_requests
    where staff_id = v_staff.id and status = 'approved' and type = 'sick';
  return query select v_staff.holiday_allowance_days, v_used, v_staff.holiday_allowance_days - v_used, v_sick;
end;
$$;

-- The requester's own requests, any status — pending ones are only ever
-- visible here or to a manager, never on the shared Team Calendar.
create or replace function sp_my_leave_requests(p_token text)
returns table(id uuid, start_date date, end_date date, days numeric, type text, note text, status text, requested_at timestamptz)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff;
begin
  v_staff := sp_staff_from_token(p_token);
  return query
    select slr.id, slr.start_date, slr.end_date, slr.days, slr.type, slr.note, slr.status, slr.requested_at
    from staff_leave_requests slr
    where slr.staff_id = v_staff.id and slr.type in ('holiday','sick','other')
    order by slr.requested_at desc;
end;
$$;

-- p_type restricted to what an employee can actually request — bank_holiday
-- and shutdown are system-applied only, never submitted by hand.
create or replace function sp_submit_leave_request(p_token text, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff;
begin
  if p_type not in ('holiday', 'sick', 'other') then
    raise exception 'Invalid leave type';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  v_staff := sp_staff_from_token(p_token);
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note)
    values (v_staff.id, p_start_date, p_end_date, p_days, p_type, p_note);
  return true;
end;
$$;

-- Calendar visibility rules (p_token identifies the signed-in staff member,
-- if any):
--   - bank_holiday / shutdown — company-wide, always visible to everyone.
--   - approved 'holiday'      — visible to everyone (the whole point of a
--                                shared team calendar: see who's off).
--   - anything else that's yours (your own holiday even while still
--     pending, and your own sick/other regardless of status) — visible
--     only to you. Sickness and pending requests are never shown to
--     anyone but the person they belong to.
-- Still excludes the historical-import placeholder rows (they'd just
-- clutter the calendar with a single "1 Apr" entry covering a whole
-- backdated total).
create or replace function sp_calendar_days(p_year int, p_month int, p_token text default null)
returns table(staff_name text, start_date date, end_date date, type text, status text)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
begin
  if p_token is not null then
    begin
      v_staff_id := (sp_staff_from_token(p_token)).id;
    exception when others then
      v_staff_id := null; -- expired/invalid token — just fall back to what's public
    end;
  end if;

  return query
    select s.name, slr.start_date, slr.end_date, slr.type, slr.status
    from staff_leave_requests slr
    join staff s on s.id = slr.staff_id
    where coalesce(slr.note, '') not like 'Historical balance import%'
      and slr.start_date <= (make_date(p_year, p_month, 1) + interval '1 month' - interval '1 day')::date
      and slr.end_date >= make_date(p_year, p_month, 1)
      and (
        slr.type in ('bank_holiday', 'shutdown')
        or (slr.type = 'holiday' and slr.status = 'approved')
        or (v_staff_id is not null and slr.staff_id = v_staff_id)
      );
end;
$$;

-- Manager-only (Staff Dashboards, reached via the real Office login) —
-- everyone's balance in one call for the team summary table.
create or replace function sp_team_summary()
returns table(name text, entitlement numeric, days_used numeric, days_remaining numeric, sick_days numeric)
language sql
security definer
set search_path = public, extensions
as $$
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

-- Manager-only — every pending request across the whole team, for approval.
create or replace function sp_pending_requests()
returns table(id uuid, name text, start_date date, end_date date, days numeric, type text, note text, requested_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select slr.id, s.name, slr.start_date, slr.end_date, slr.days, slr.type, slr.note, slr.requested_at
  from staff_leave_requests slr
  join staff s on s.id = slr.staff_id
  where slr.status = 'pending'
  order by slr.requested_at asc;
$$;

-- Manager-only — approve/decline. p_status is checked against the same
-- constraint the table already enforces, so a bad value fails clearly
-- rather than silently doing nothing.
create or replace function sp_decide_leave_request(p_request_id uuid, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_status not in ('approved', 'declined') then
    raise exception 'Invalid status';
  end if;
  update staff_leave_requests set status = p_status, decided_at = now()
    where id = p_request_id and status = 'pending';
  if not found then
    raise exception 'Request not found or already decided';
  end if;
  return true;
end;
$$;

-- Manager-only — one employee's complete leave history, any status/type,
-- including the historical-import row and any bank_holiday/shutdown entries.
-- This is the manager's "full edit access" view — everything sp_my_leave_requests
-- hides from the employee themselves (bank_holiday/shutdown rows, the import
-- placeholder) is visible here so a manager can actually correct any of it.
create or replace function sp_staff_leave_history(p_staff_name text)
returns table(id uuid, start_date date, end_date date, days numeric, type text, note text, status text, requested_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select slr.id, slr.start_date, slr.end_date, slr.days, slr.type, slr.note, slr.status, slr.requested_at
  from staff_leave_requests slr
  join staff s on s.id = slr.staff_id
  where s.name = p_staff_name
  order by slr.start_date desc;
$$;

-- Manager-only — add a new entry directly (sick pay, a manual holiday
-- correction, etc.), auto-approved rather than going through the pending
-- workflow since a manager entering it is already a decision, not a request.
create or replace function sp_manager_add_leave_entry(p_staff_name text, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff_id uuid;
begin
  select id into v_staff_id from staff where name = p_staff_name and active = true;
  if v_staff_id is null then
    raise exception 'Unknown staff member';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
    values (v_staff_id, p_start_date, p_end_date, p_days, p_type, p_note, 'approved', now());
  return true;
end;
$$;

-- Manager-only — edit any field of any existing entry directly. Deliberately
-- unrestricted on which rows can be touched (including the historical-import
-- and bank_holiday/shutdown rows) per "full edit access to every entry".
create or replace function sp_manager_edit_leave_entry(p_id uuid, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  if p_status not in ('pending', 'approved', 'declined') then
    raise exception 'Invalid status';
  end if;
  update staff_leave_requests
    set start_date = p_start_date, end_date = p_end_date, days = p_days, type = p_type, note = p_note, status = p_status
    where id = p_id;
  if not found then
    raise exception 'Entry not found';
  end if;
  return true;
end;
$$;

-- Manager-only — remove an entry entirely (e.g. a mistaken sick-day log, or
-- to "remove holiday" by deleting a previously-approved request).
create or replace function sp_manager_delete_leave_entry(p_id uuid)
returns boolean
language sql
security definer
set search_path = public, extensions
as $$
  delete from staff_leave_requests where id = p_id;
  select true;
$$;

-- Manager-only — called whenever Staff Dashboards loads. p_dates is a plain
-- JSON array of ISO date strings, fetched client-side from
-- https://www.gov.uk/bank-holidays.json (england-and-wales, which spans
-- 2019-2028) since Postgres itself has no outbound internet access here.
-- ON CONFLICT DO NOTHING makes repeat calls (every time a manager opens the
-- screen) cheap no-ops once a date's already applied to everyone.
--
-- Re-bounds to the current leave year SERVER-SIDE, not just trusting the
-- client to have already filtered — a stale cached copy of the app (or any
-- future bug) sending the full unfiltered decade of dates previously
-- inflated everyone's "days used" by ~80 days. This is the actual fix;
-- the client-side filter in spSyncBankHolidaysAndShutdowns() is now just a
-- courtesy that avoids sending pointless data, not the safety mechanism.
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

-- Manager-only — same idea as bank holidays, but the dates come from
-- company_shutdown_days (manually maintained) instead of an external fetch.
-- Deliberately applies future-dated shutdown days immediately (unlike a
-- future personal request, this one's already confirmed company-wide, so
-- everyone's remaining balance reflects it right away rather than waiting
-- until December actually arrives).
create or replace function sp_sync_shutdown_days()
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_count integer;
begin
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note, status, decided_at)
  select s.id, csd.date, csd.date, 1, 'shutdown', csd.label, 'approved', now()
  from staff s cross join company_shutdown_days csd
  where s.active = true
  on conflict (staff_id, start_date) where type = 'shutdown' do nothing;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- anon + authenticated: the Staff Portal side (My Leave, Team Calendar).
grant execute on function sp_my_leave_balance(text) to anon, authenticated;
grant execute on function sp_my_leave_requests(text) to anon, authenticated;
grant execute on function sp_submit_leave_request(text, date, date, numeric, text, text) to anon, authenticated;
grant execute on function sp_calendar_days(int, int, text) to anon, authenticated;

-- authenticated only: the manager side (Staff Dashboards, reached via the
-- real Office login) — no reason for anon to see everyone's balances,
-- pending requests, or trigger a sync.
grant execute on function sp_team_summary() to authenticated;
grant execute on function sp_pending_requests() to authenticated;
grant execute on function sp_decide_leave_request(uuid, text) to authenticated;
grant execute on function sp_staff_leave_history(text) to authenticated;
grant execute on function sp_manager_add_leave_entry(text, date, date, numeric, text, text) to authenticated;
grant execute on function sp_manager_edit_leave_entry(uuid, date, date, numeric, text, text, text) to authenticated;
grant execute on function sp_manager_delete_leave_entry(uuid) to authenticated;
grant execute on function sp_sync_bank_holidays(jsonb) to authenticated;
grant execute on function sp_sync_shutdown_days() to authenticated;
