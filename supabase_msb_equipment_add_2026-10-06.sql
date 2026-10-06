-- ============================================================================
-- Method Statement Builder — new plant & machinery (2026-10-06)
-- ============================================================================
-- Run this once in the Supabase SQL editor (Project → SQL Editor → New
-- query). Adds four machines to ms_equipment_library (Section 5.0 list).
--   - Sanny 8t: same sound/vibration as the Volvo EC145EL (14t) excavator
--   - Ufkes Greentec Jaguar 40/80 and Arb Max D35 (tracked + wheeled): same
--     sound/vibration as the Forst chippers
-- ============================================================================

insert into ms_equipment_library (id, name, sound, vibration) values
  ('eq_sany_8t', 'Sanny 8 Tonne Excavator', '110 dB', '0.5 m/s²'),
  ('eq_ufkes_jaguar', 'Ufkes Greentec Jaguar 40/80 Wood Chipper', '120 dB', 'N/A'),
  ('eq_arbmax_d35_tracked', 'Arb Max D35 Tracked Wood Chipper', '120 dB', 'N/A'),
  ('eq_arbmax_d35_wheeled', 'Arb Max D35 Wheeled Wood Chipper', '120 dB', 'N/A')
on conflict (id) do nothing;

-- Verify — the four new rows should appear
select id, name, sound, vibration from ms_equipment_library order by name;
