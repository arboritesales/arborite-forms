-- ============================================================================
-- Arborite Field Forms — Scheduling calendar: adds a date to Today's Checks
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run.
--
-- What this does:
--   - Adds a scheduled_date column to todays_checks, defaulting to today's
--     date. The existing "Today's Checks" list (crew-facing) now only shows
--     items whose scheduled_date is today — anything scheduled further
--     ahead via the new manager Schedule calendar simply won't show up until
--     its actual day arrives.
--   - Backfills any existing rows (added before this change) to today's date
--     so nothing already on the list silently disappears.
-- ============================================================================

alter table public.todays_checks
  add column if not exists scheduled_date date not null default current_date;

update public.todays_checks
  set scheduled_date = current_date
  where scheduled_date is null;

-- Verify: every row should now have a scheduled_date
select id, category, machine, scheduled_date, created_at
from public.todays_checks
order by scheduled_date, created_at;
