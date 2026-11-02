-- ============================================================================
-- Arborite Field Forms — Small Rigging Kit checks (LOLER interim inspection)
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — uses IF NOT EXISTS / drop-if-exists throughout.
--
-- The Rigging Kit tile in Checks now opens three sub-tabs: Large Rigging Kit
-- (the existing rigging_kit_checks table) and Small Rigging Kit for Jason and
-- Team / Jack and Team (two new tables below, same items). One column per kit
-- item, matching CHECK_CATEGORIES.riggingjason / .riggingjack
-- (js/modules/equipment-checks.js), a comments column, plus the same common
-- columns + defect columns + RLS policy as the other check tables.
-- ============================================================================

-- ── Small Rigging Kit – Jason and Team ──────────────────────────────────────
create table if not exists public.rigging_kit_jason_team_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  courant_aka_rigging_line_rg20170 text,
  courant_dead_eye_rg20166 text,
  teufelberger_trex_whoopie_rg20167 text,
  steel_carabiner_263900361 text,
  steel_carabiner_263900381 text,
  stein_ld1250_friction_2601062 text,
  isc_pulley_rp056_262110980010 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.rigging_kit_jason_team_checks enable row level security;

drop policy if exists "authenticated_all" on public.rigging_kit_jason_team_checks;
create policy "authenticated_all" on public.rigging_kit_jason_team_checks
  for all to authenticated using (true) with check (true);

-- ── Small Rigging Kit – Jack and Team ───────────────────────────────────────
create table if not exists public.rigging_kit_jack_team_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  courant_aka_rigging_line_rg20170 text,
  courant_dead_eye_rg20166 text,
  teufelberger_trex_whoopie_rg20167 text,
  steel_carabiner_263900361 text,
  steel_carabiner_263900381 text,
  stein_ld1250_friction_2601062 text,
  isc_pulley_rp056_262110980010 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.rigging_kit_jack_team_checks enable row level security;

drop policy if exists "authenticated_all" on public.rigging_kit_jack_team_checks;
create policy "authenticated_all" on public.rigging_kit_jack_team_checks
  for all to authenticated using (true) with check (true);

-- ── Large Rigging Kit: relabel checks saved under the old name ──────────────
update public.rigging_kit_checks set machine = 'Large Rigging Kit' where machine = 'Rigging Kit';

-- Verify: all three rigging tables should be listed
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'rigging_kit_%'
order by table_name;
