-- Diagnostic — checking for a duplicate staff record.
select id, name, active, holiday_allowance_days
from staff
where name ilike '%couling%' or name ilike '%foulkes%';
