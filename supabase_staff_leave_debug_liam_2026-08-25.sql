-- Diagnostic — run in Supabase SQL editor and paste back the result.
select
  s.name,
  s.holiday_allowance_days,
  slr.id,
  slr.start_date,
  slr.end_date,
  slr.days,
  slr.type,
  slr.status,
  slr.note
from staff s
join staff_leave_requests slr on slr.staff_id = s.id
where s.name = 'Liam Couling-Foulkes'
order by slr.start_date;
