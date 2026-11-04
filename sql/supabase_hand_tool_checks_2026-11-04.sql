-- ============================================================================
-- Arborite Field Forms — Chainsaw, Pole Saw and Backpack Blower checks
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — uses IF NOT EXISTS / drop-if-exists throughout.
--
-- Creates one table per new sub-tab of the Hand Held Tools tile in Checks. One
-- column per question, matching the field keys in CHECK_CATEGORIES.chainsaw /
-- polesaw / backpackblower (js/modules/equipment-checks.js), a comments column,
-- plus the same common columns + defect columns + RLS policy as the other
-- check tables.
-- ============================================================================

-- ── Chainsaws ───────────────────────────────────────────────────────────────
create table if not exists public.chainsaw_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  guidebar text,
  safety_features text,
  chain_condition text,
  fasteners text,
  av_system text,
  exhaust text,
  warning_stickers text,
  chain_catcher text,
  filler_caps text,
  cooling_ports text,
  starter_cord text,
  sprocket_wear text,
  throttle_interlock text,
  chain_brake text,
  onoff_switch text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.chainsaw_checks enable row level security;

drop policy if exists "authenticated_all" on public.chainsaw_checks;
create policy "authenticated_all" on public.chainsaw_checks
  for all to authenticated using (true) with check (true);

-- ── Pole Saw ────────────────────────────────────────────────────────────────
create table if not exists public.pole_saw_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  guidebar text,
  telescopic_mechanism text,
  safety_features text,
  chain_condition text,
  fasteners text,
  av_system text,
  exhaust text,
  warning_stickers text,
  chain_catcher text,
  filler_caps text,
  cooling_ports text,
  starter_cord text,
  sprocket_wear text,
  throttle_interlock text,
  chain_brake text,
  onoff_switch text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.pole_saw_checks enable row level security;

drop policy if exists "authenticated_all" on public.pole_saw_checks;
create policy "authenticated_all" on public.pole_saw_checks
  for all to authenticated using (true) with check (true);

-- ── Backpack Blower ─────────────────────────────────────────────────────────
create table if not exists public.backpack_blower_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  guards text,
  fasteners text,
  av_system text,
  exhaust text,
  harness_point text,
  warning_stickers text,
  filler_caps text,
  air_filter text,
  cooling_ports text,
  starter_cord text,
  throttle_interlock text,
  onoff_switch text,
  blade_condition text,
  grease_levels text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.backpack_blower_checks enable row level security;

drop policy if exists "authenticated_all" on public.backpack_blower_checks;
create policy "authenticated_all" on public.backpack_blower_checks
  for all to authenticated using (true) with check (true);

-- Verify: all three tables should be listed
select table_name from information_schema.tables
where table_schema = 'public'
  and table_name in ('chainsaw_checks', 'pole_saw_checks', 'backpack_blower_checks')
order by table_name;
