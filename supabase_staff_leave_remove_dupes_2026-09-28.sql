-- ============================================================================
-- Staff Portal — remove duplicate holiday entries (2026-09-28) — ALREADY RUN
-- ============================================================================
-- Run once in the Supabase SQL editor on 2026-09-28. Kept as a record; do
-- not re-run (it is harmless if you do — the ids no longer exist).
--
-- supabase_staff_leave_add_2026-09-11.sql was run a second time on
-- 2026-09-21 08:50, so every booking in it existed twice and was charged
-- twice against the allowance. Deletes only the second (2026-09-21) copy of
-- each, by exact id, keeping the original 2026-09-11 rows.
--
--   Olly Key      08 Oct, 12 Oct, 02 Nov, 06 Nov, 20 Nov 2026   (5 days)
--   Sarah Haste   25 Sep, 28 Sep 2026                           (2 days)
--
-- A company-wide duplicate check afterwards only turned up Brook
-- Taylor-Ware's repeated 26 Aug / 08 Sep requests, which are all 'declined'
-- and so don't count against the balance or show on the calendar — left as-is.
-- ============================================================================

delete from staff_leave_requests
where staff_id = (select id from staff where name = 'Olly Key')
  and type = 'holiday'
  and id in (
    '77a12e7c-0427-40f9-ab90-aeb339bc2b3e',
    '33e0439d-7866-4f6e-be2e-bf21df55b1a0',
    '01c832cc-b3fe-4a84-9e87-7b9b86fb30d4',
    'd955013d-5208-46c4-916b-32936f97a7ab',
    'b38a1238-dc4d-42d0-8758-1499aeb91063'
  );

delete from staff_leave_requests
where staff_id = (select id from staff where name = 'Sarah Haste')
  and type = 'holiday'
  and id in (
    'df3471a7-0c0d-4990-8371-ecc4e2f4784d',
    '14f287f0-1393-4edc-a241-fe1f7992cd30'
  );

-- Verify — no approved entry should appear more than once for the same
-- person, dates and type.
select s.name, slr.start_date, slr.end_date, slr.type, count(*) as copies
from staff_leave_requests slr
join staff s on s.id = slr.staff_id
where slr.status = 'approved'
group by s.name, slr.start_date, slr.end_date, slr.type
having count(*) > 1
order by s.name, slr.start_date;
