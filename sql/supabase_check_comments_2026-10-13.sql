-- ============================================================================
-- Arborite Field Forms — Comments box on every check form
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — uses ADD COLUMN IF NOT EXISTS.
--
-- Every check form now has a Comments box straight after the last item,
-- saved to a `comments` column. The climbing kit and small rigging kit tables
-- already have it; this adds it to all the others.
-- ============================================================================

alter table public.vehicle_checks        add column if not exists comments text;
alter table public.stump_grinder_checks  add column if not exists comments text;
alter table public.woodchipper_checks    add column if not exists comments text;
alter table public.digger_checks         add column if not exists comments text;
alter table public.green_climber_checks  add column if not exists comments text;
alter table public.handheld_tool_checks  add column if not exists comments text;
alter table public.trailer_checks        add column if not exists comments text;
alter table public.mewp_checks           add column if not exists comments text;
alter table public.rigging_kit_checks    add column if not exists comments text;

-- Verify: every check table should be listed (17 rows)
select table_name from information_schema.columns
where table_schema = 'public' and column_name = 'comments' and table_name like '%_checks'
order by table_name;
