-- Diagnostic — compare the live function's output against a manual sum.
select * from sp_team_summary() where name = 'Liam Couling-Foulkes';

select
  coalesce(sum(days), 0) as manual_sum
from staff_leave_requests
where staff_id = (select id from staff where name = 'Liam Couling-Foulkes')
  and status = 'approved'
  and type in ('holiday', 'shutdown');
