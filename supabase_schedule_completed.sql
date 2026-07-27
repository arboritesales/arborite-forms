-- ============================================================================
-- Arborite Field Forms — Scheduling calendar: track completed checks
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run.
--
-- What this does:
--   - Adds a `completed` column to todays_checks, defaulting to false.
--   - When an employee saves a check that was started from a scheduled item
--     (tapping "Start" on a day in the Checks calendar), the app PATCHes
--     that row's completed to true — see startScheduledCheck() /
--     _markScheduledComplete() / saveVehCheck() / saveCatCheck() in js/app.js.
--   - The calendar then shows "✓ Completed" instead of a Start button for
--     that item, both in the day-cell preview and the day detail modal.
--   - Checks started via "+ New Inspection" (not from the schedule) have no
--     associated row here, so nothing to mark — unaffected.
-- ============================================================================

alter table public.todays_checks
  add column if not exists completed boolean not null default false;

-- Verify: every row should now have a completed value (true/false)
select id, category, machine, scheduled_date, completed, created_at
from public.todays_checks
order by scheduled_date, created_at;
