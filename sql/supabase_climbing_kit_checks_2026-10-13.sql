-- ============================================================================
-- Arborite Field Forms — Climbing Kit checks (LOLER interim inspection)
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — uses IF NOT EXISTS / drop-if-exists throughout.
--
-- Creates one table per climber for the Climbing Kit tile in Checks. One
-- column per kit item, matching the field keys in CHECK_CATEGORIES.climbjack /
-- etc. (js/modules/equipment-checks.js), a comments column (the Comments
-- box after the last item), plus the same common columns
-- + defect columns + RLS policy as the other check tables.
-- ============================================================================

-- ── Jack Fisher ─────────────────────────────────────────────────────────────
create table if not exists public.climbing_kit_jack_fisher_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
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

alter table public.climbing_kit_jack_fisher_checks enable row level security;

drop policy if exists "authenticated_all" on public.climbing_kit_jack_fisher_checks;
create policy "authenticated_all" on public.climbing_kit_jack_fisher_checks
  for all to authenticated using (true) with check (true);

-- ── James Hilborne ──────────────────────────────────────────────────────────
create table if not exists public.climbing_kit_james_hilborne_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  teufelberger_harness_22110011931 text,
  edelrid_oval_krab_852055760 text,
  edelrid_oval_krab_852050990 text,
  edelrid_oval_krab_852051011 text,
  edelrid_oval_krab_852055779 text,
  edelrid_oval_krab_852050815 text,
  petzl_grillon_22l0455110490 text,
  marlow_boa_loop_22k1348031 text,
  yale_poison_ivy_rope_87789 text,
  petzl_krab_23b0469989039 text,
  petzl_krab_23b0469988052 text,
  petzl_zigzag_plus_22l0452791381 text,
  yale_poison_ivy_37m_rope_89096 text,
  camp_herbol_cambium_saver_h0353 text,
  courant_ellipse_sling_itn08245t528 text,
  courant_ellipse_sling_itn08245t525 text,
  petzl_ok_triact_25l0701687332 text,
  petzl_ok_triact_25l0701687471 text,
  courant_bumblebee_flipline_alp8522178 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.climbing_kit_james_hilborne_checks enable row level security;

drop policy if exists "authenticated_all" on public.climbing_kit_james_hilborne_checks;
create policy "authenticated_all" on public.climbing_kit_james_hilborne_checks
  for all to authenticated using (true) with check (true);

-- ── Luke Richardson ─────────────────────────────────────────────────────────
create table if not exists public.climbing_kit_luke_richardson_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  teufelberger_harness_22110011931 text,
  edelrid_oval_krab_852055760 text,
  edelrid_oval_krab_852050990 text,
  edelrid_oval_krab_852051011 text,
  edelrid_oval_krab_852055779 text,
  edelrid_oval_krab_852050815 text,
  petzl_grillon_22l0455110490 text,
  marlow_boa_loop_22k1348031 text,
  yale_poison_ivy_rope_87789 text,
  petzl_krab_23b0469989039 text,
  petzl_krab_23b0469988052 text,
  petzl_zigzag_plus_22l0452791381 text,
  yale_poison_ivy_37m_rope_89096 text,
  camp_herbol_cambium_saver_h0353 text,
  courant_ellipse_sling_itn08245t528 text,
  courant_ellipse_sling_itn08245t525 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.climbing_kit_luke_richardson_checks enable row level security;

drop policy if exists "authenticated_all" on public.climbing_kit_luke_richardson_checks;
create policy "authenticated_all" on public.climbing_kit_luke_richardson_checks
  for all to authenticated using (true) with check (true);

-- ── Dave Norris ─────────────────────────────────────────────────────────────
create table if not exists public.climbing_kit_dave_norris_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  harness_28486 text,
  steel_core_lanyard_0910808 text,
  tachyon_lanyard_4342 text,
  pulleysaver_2017832 text,
  sirius_loop_pinto_20170956 text,
  od_loop_20172764 text,
  sirius_loop_10mm_20171889 text,
  marlow_boa_loop_155634004 text,
  marlow_boa_loop_155634001 text,
  pantin_10049fu0505 text,
  karabiner_dn01 text,
  karabiner_dn02 text,
  rope_43427 text,
  lanyard_1330746 text,
  rope_grab_1451325043 text,
  zigzag_16f0029400540 text,
  prusik_loop_18041075 text,
  maillon_c887007 text,
  karabiner_1794684116 text,
  karabiner_h122242 text,
  karabiner_h242510 text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.climbing_kit_dave_norris_checks enable row level security;

drop policy if exists "authenticated_all" on public.climbing_kit_dave_norris_checks;
create policy "authenticated_all" on public.climbing_kit_dave_norris_checks
  for all to authenticated using (true) with check (true);

-- ── Jason Hiscock ───────────────────────────────────────────────────────────
create table if not exists public.climbing_kit_jason_hiscock_checks (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  inspector_name text,
  machine text,
  overall_rating text,
  remedial_notes text,
  comments text,
  used_since_last text,
  harness_1805152 text,
  rope_1711697 text,
  rope_32798 text,
  lanyard_33282 text,
  friction_saver_70310570 text,
  friction_cord_18080977 text,
  friction_cord_663875042 text,
  friction_cord_163617018 text,
  zigzag_18d0133144890 text,
  pulley_172473662e text,
  pantin_18a0119611118 text,
  hitchclimber_182500795e text,
  karabiner_181062638e text,
  karabiner_181062507e text,
  karabiner_173061274g text,
  karabiner_180314165e text,
  karabiner_172833546e text,
  has_defect boolean not null default false,
  defect_comment text,
  defect_images text[],
  defect_status text,
  office_note text
);

alter table public.climbing_kit_jason_hiscock_checks enable row level security;

drop policy if exists "authenticated_all" on public.climbing_kit_jason_hiscock_checks;
create policy "authenticated_all" on public.climbing_kit_jason_hiscock_checks
  for all to authenticated using (true) with check (true);

-- Verify: all five tables should be listed
select table_name from information_schema.tables
where table_schema = 'public' and table_name like 'climbing_kit_%'
order by table_name;
