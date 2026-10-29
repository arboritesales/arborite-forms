-- ============================================================================
-- Arborite Field Forms — "Not in use" on the Checks schedule (2026-10-29)
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query)
-- BEFORE pushing v1.9.84 — the app reads and writes these columns.
-- Safe to re-run.
--
-- Part 1 — Not in use:
--   Next to Start on a day's checks there is now a "Not in use" button. It
--   marks that todays_checks row completed with not_in_use = true (a daily
--   check gets a new row for today), so it comes off the list, and managers
--   see it under "Machines Not In Use" in the Weekly Report.
--
-- Part 2 — James Hilborn spelling (optional):
--   The app now spells his name "Hilborn". Checks saved before today still
--   say "James Hilborne" as the inspector / kit name; this corrects them.
--   The climbing kit table keeps its old name (climbing_kit_james_hilborne_
--   checks) — it's never shown to anyone, and renaming it would break saves.
-- ============================================================================

-- ── Part 1 ──
alter table public.todays_checks add column if not exists not_in_use boolean not null default false;
alter table public.todays_checks add column if not exists not_in_use_at timestamptz;

-- ── Part 2 ──
do $$
declare t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'inspector_name' and table_name like '%_checks'
  loop
    execute format('update public.%I set inspector_name = %L where inspector_name = %L', t, 'James Hilborn', 'James Hilborne');
  end loop;
end $$;

update public.climbing_kit_james_hilborne_checks
  set machine = 'James Hilborn – Climbing Kit'
  where machine = 'James Hilborne – Climbing Kit';

update public.todays_checks
  set machine = 'James Hilborn – Climbing Kit'
  where machine = 'James Hilborne – Climbing Kit';

-- Verify: both new columns listed
select column_name, data_type from information_schema.columns
where table_schema = 'public' and table_name = 'todays_checks' and column_name like 'not_in_use%';
