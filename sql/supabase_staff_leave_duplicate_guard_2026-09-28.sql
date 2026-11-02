-- ============================================================================
-- Staff Portal — block duplicate / overlapping leave (2026-09-28)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Safe to re-run. The same definitions are in supabase_staff_portal.sql
-- so re-running that file keeps the guard.
--
-- Background: supabase_staff_leave_add_2026-09-11.sql was run twice, and
-- sp_manager_add_leave_entry happily inserted every booking a second time,
-- double-charging Olly Key and Sarah Haste (cleaned up in
-- supabase_staff_leave_remove_dupes_2026-09-28.sql). Nothing stopped it
-- because none of the leave RPCs checked for existing entries.
--
-- The rule, enforced in the database so it covers the Staff Portal, Staff
-- Dashboards and any SQL script alike:
--   - A holiday/sick/other entry can't overlap another holiday/sick/other
--     entry for the same person, unless that one was declined.
--   - A holiday can't overlap the company shutdown, which is already
--     auto-applied to everyone and counted against their allowance.
--   - The historical-import / balance-adjustment rows (dated 1 Apr, days <= 0
--     or 'Historical balance import' note) are ignored.
-- Checked on: staff submitting a request, manager adding an entry, manager
-- approving a request, and manager editing an entry (unless it's being set
-- to declined). The error message says which existing entry is in the way.
--
-- The report at the bottom lists any overlaps ALREADY in the data, for
-- everyone. Ideally it returns no rows.
-- ============================================================================

-- Returns null when the entry is fine, otherwise a message explaining the clash.
create or replace function sp_leave_conflict(p_staff_id uuid, p_start_date date, p_end_date date, p_type text, p_exclude_id uuid default null)
returns text
language plpgsql
stable
security definer
set search_path = public, extensions
as $$
declare
  r record;
begin
  if p_type not in ('holiday', 'sick', 'other') then
    return null;
  end if;

  select slr.type, slr.status, slr.start_date, slr.end_date into r
  from staff_leave_requests slr
  where slr.staff_id = p_staff_id
    and slr.id is distinct from p_exclude_id
    and slr.type in ('holiday', 'sick', 'other')
    and slr.status <> 'declined'
    and slr.days > 0
    and coalesce(slr.note, '') not like 'Historical balance import%'
    and slr.start_date <= p_end_date
    and slr.end_date >= p_start_date
  order by slr.start_date
  limit 1;
  if found then
    return format('Already has %s (%s) booked for %s — edit or delete that entry instead of adding another.',
      r.type, r.status,
      case when r.start_date = r.end_date then to_char(r.start_date, 'DD Mon YYYY')
           else to_char(r.start_date, 'DD Mon') || ' – ' || to_char(r.end_date, 'DD Mon YYYY') end);
  end if;

  if p_type = 'holiday' then
    select slr.start_date into r
    from staff_leave_requests slr
    where slr.staff_id = p_staff_id
      and slr.type = 'shutdown'
      and slr.start_date <= p_end_date
      and slr.end_date >= p_start_date
    order by slr.start_date
    limit 1;
    if found then
      return format('%s is already covered by the company shutdown, which is counted automatically — leave the shutdown days out of this holiday.',
        to_char(r.start_date, 'DD Mon YYYY'));
    end if;
  end if;

  return null;
end;
$$;

-- Internal helper only — called from the security-definer RPCs below.
revoke execute on function sp_leave_conflict(uuid, date, date, text, uuid) from public, anon, authenticated;

create or replace function sp_submit_leave_request(p_token text, p_start_date date, p_end_date date, p_days numeric, p_type text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_staff staff;
  v_conflict text;
begin
  if p_type not in ('holiday', 'sick', 'other') then
    raise exception 'Invalid leave type';
  end if;
  if p_end_date < p_start_date then
    raise exception 'End date is before start date';
  end if;
  v_staff := sp_staff_from_token(p_token);
  v_conflict := sp_leave_conflict(v_staff.id, p_start_date, p_end_date, p_type);
  if v_conflict is not null then
    raise exception '%', v_conflict;
  end if;
  insert into staff_leave_requests (staff_id, start_date, end_date, days, type, note)
    values (v_staff.id, p_start_date, p_end_date, p_days, p_type, p_note);
  return true;
end;
$$;

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

-- ============================================================================
-- Report — every overlap already in the data, for all staff. Each row is a
-- pair of entries that clash. Ideally this returns no rows.
--   'Duplicate / overlapping entries'  — two live holiday/sick/other entries
--                                        on the same day(s): one is extra.
--   'Holiday overlaps shutdown'        — charged twice for those days.
--   'Holiday on a bank holiday'        — not double-charged, but the day
--                                        count may include the bank holiday.
-- ============================================================================
with e as (
  select slr.*,
         case when slr.type in ('bank_holiday', 'shutdown') then 'system' else 'personal' end as kind
  from staff_leave_requests slr
  where slr.status <> 'declined'
    and (slr.type in ('bank_holiday', 'shutdown')
         or (slr.days > 0 and coalesce(slr.note, '') not like 'Historical balance import%'))
)
select s.name,
       case
         when a.kind = 'personal' and b.kind = 'personal' then 'Duplicate / overlapping entries'
         when 'shutdown' in (a.type, b.type) then 'Holiday overlaps shutdown'
         else 'Holiday on a bank holiday'
       end as problem,
       a.id as entry_1_id, a.type as entry_1_type, a.status as entry_1_status,
       a.start_date as entry_1_start, a.end_date as entry_1_end, a.days as entry_1_days, a.requested_at as entry_1_added,
       b.id as entry_2_id, b.type as entry_2_type, b.status as entry_2_status,
       b.start_date as entry_2_start, b.end_date as entry_2_end, b.days as entry_2_days, b.requested_at as entry_2_added
from e a
join e b on b.staff_id = a.staff_id
        and a.id < b.id
        and a.start_date <= b.end_date
        and a.end_date >= b.start_date
join staff s on s.id = a.staff_id
where (a.kind = 'personal' and b.kind = 'personal')
   or (a.kind = 'personal' and a.type = 'holiday' and b.kind = 'system')
   or (b.kind = 'personal' and b.type = 'holiday' and a.kind = 'system')
order by s.name, least(a.start_date, b.start_date);
