-- ============================================================================
-- Method Statement Builder — data updates (2026-09-08)
-- ============================================================================
-- Run this once in the Supabase SQL editor.
--
-- 1. Marks every staff member as a First Aider (all staff genuinely hold a
--    first aid certification, so the "First Aider" column on the 3.0
--    Operational Team table should read "Yes" for everyone).
-- ============================================================================

-- 1. All staff — mark as First Aider
update ms_staff
set first_aider = true
where first_aider is distinct from true;

-- Verify
select name, first_aider from ms_staff order by name;
