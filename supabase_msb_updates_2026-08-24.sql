-- ============================================================================
-- Method Statement Builder — data updates (2026-08-24)
-- ============================================================================
-- Run this once in the Supabase SQL editor.
--
-- 1. Adds a competency to Luke Richardson.
-- 2. Removes "Tractors are escorted around the site with banksmen." from
--    fixed section 12.0 (re-run of an earlier migration, safe/idempotent
--    either way — no-ops if already applied).
-- 3. Removes Climbing Harness from required PPE on the relevant SOPs
--    (same idempotent re-run as above).
-- 4. Renames "Chainsaw protective trousers/chaps" to "Chainsaw protective
--    trousers" in the PPE library.
-- ============================================================================

-- 1. Luke Richardson — new competency
update ms_staff
set competencies = competencies || '[{"name":"City & Guilds NPTC 309 - Use of a chainsaw from a Mobile Elevated Work Platform","expiry":null}]'::jsonb
where name = 'Luke Richardson'
  and not exists (
    select 1 from jsonb_array_elements(competencies) elem
    where elem->>'name' = 'City & Guilds NPTC 309 - Use of a chainsaw from a Mobile Elevated Work Platform'
  );

-- 2. Remove the banksmen line from 12.0
update ms_fixed_sections
set paragraphs = paragraphs - 'Tractors are escorted around the site with banksmen.'
where n = '12.0';

-- 3. Remove Climbing Harness from required PPE
update ms_sop_library
set required_ppe = required_ppe - 'ppe_harness'
where id in ('sop_tree_climbing', 'sop_tools_in_tree', 'sop_dismantling_rigging', 'sop_chainsaw_from_mewp', 'sop_mewp');

-- 4. Rename PPE item
update ms_ppe_library
set name = 'Chainsaw protective trousers'
where id = 'ppe_chainsaw_trousers';

-- Verify
select name, competencies from ms_staff where name = 'Luke Richardson';
select n, title, paragraphs from ms_fixed_sections where n = '12.0';
select id, required_ppe from ms_sop_library
where id in ('sop_tree_climbing', 'sop_tools_in_tree', 'sop_dismantling_rigging', 'sop_chainsaw_from_mewp', 'sop_mewp');
select id, name from ms_ppe_library where id = 'ppe_chainsaw_trousers';
