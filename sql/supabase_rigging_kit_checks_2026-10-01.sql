-- ============================================================================
-- Arborite Field Forms — Rigging Kit checks (LOLER interim inspection)
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — uses IF NOT EXISTS / drop-if-exists throughout.
--
-- Creates the rigging_kit_checks table used by the new Rigging Kit tile in
-- Checks. One column per kit item, matching the field keys in
-- CHECK_CATEGORIES.rigging (js/modules/equipment-checks.js), plus the same
-- common columns + defect columns + RLS policy as the other check tables.
-- ============================================================================

create table if not exists public.rigging_kit_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  used_since_last text,
  notch_harness_gv0162021 text,
  art_ropeguide_032101484 text,
  isc_fig8_descender_211341770101 text,
  petzl_zigzag_2530649719968 text,
  petzl_ok_krab_18g0147431547 text,
  petzl_ok_krab_21f0335559864 text,
  petzl_ok_krab_21f0335559821 text,
  dmm_ultra_o_krab_190022004e text,
  isc_oval_krab_241887580022 text,
  isc_oval_krab_241884990014 text,
  notch_tool_lanyard_00457 text,
  bumblebee_flipline_rbl9blcoitn0747cw478 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.rigging_kit_checks enable row level security;

drop policy if exists "authenticated_all" on public.rigging_kit_checks;
create policy "authenticated_all" on public.rigging_kit_checks
  for all to authenticated using (true) with check (true);
