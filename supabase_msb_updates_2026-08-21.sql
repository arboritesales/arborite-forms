-- ============================================================================
-- Method Statement Builder — data updates (2026-08-21)
-- ============================================================================
-- Run this once in the Supabase SQL editor. Two changes:
--
-- 1. Removes "Climbing harness" from required PPE. The PPE Requirements
--    table (8.0) is auto-derived from the required_ppe of whichever SOPs
--    are selected — removing ppe_harness from those SOPs stops it appearing
--    anywhere in that derived list. The ppe_harness row itself stays in
--    ms_ppe_library (harmless to leave, avoids touching historical records).
--
-- 2. Removes the "Tractors are escorted around the site with banksmen." line
--    from fixed section 12.0 Plant & Machinery Movements.
-- ============================================================================

update ms_sop_library
set required_ppe = required_ppe - 'ppe_harness'
where id in ('sop_tree_climbing', 'sop_tools_in_tree', 'sop_dismantling_rigging', 'sop_chainsaw_from_mewp', 'sop_mewp');

update ms_fixed_sections
set paragraphs = paragraphs - 'Tractors are escorted around the site with banksmen.'
where n = '12.0';

-- Verify
select id, required_ppe from ms_sop_library
where id in ('sop_tree_climbing', 'sop_tools_in_tree', 'sop_dismantling_rigging', 'sop_chainsaw_from_mewp', 'sop_mewp');

select n, title, paragraphs from ms_fixed_sections where n = '12.0';
