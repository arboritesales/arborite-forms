-- ============================================================================
-- Staff Portal — lock manager-only functions away from anon (2026-10-28)
-- ============================================================================
-- Run this once in the Supabase SQL editor, before the Staff Portal goes live.
-- RUN 2026-10-28: check query showed anon_can_run = false for all 15; a call
-- with just the anon key now gets "permission denied", and the Staff Portal's
-- own anon functions still answer normally.
--
-- Found during the pre-launch check: the manager-only functions below were
-- only ever GRANTed to authenticated, but Postgres/Supabase also give every
-- new function EXECUTE to PUBLIC (and so anon) by default. A grant to
-- authenticated doesn't take that away. Tested on 2026-10-28 with just the
-- public anon key (no login): sp_clock_activity returned clock events with
-- GPS, sp_team_summary returned every holiday balance. By the same default,
-- reset_staff_password, sp_decide_leave_request, the sp_manager_* edits etc.
-- were callable by anyone with the app's address.
--
-- Fix: revoke from PUBLIC and anon, keep authenticated. Every caller of these
-- is Staff Dashboards / Office, which is only reached after the manager login,
-- so nothing staff use changes. The Staff Portal's own anon functions
-- (verify_staff_login, sp_clock_event, sp_my_leave_*, sp_submit_leave_request,
-- sp_calendar_days, sp_onsite_now, sp_list_staff_names, staff_needs_password_setup,
-- set_staff_password) are deliberately left alone.
-- ============================================================================

revoke execute on function reset_staff_password(text)                                    from public, anon;
revoke execute on function sp_clock_activity(int)                                        from public, anon;
revoke execute on function sp_manager_delete_clock_event(uuid)                           from public, anon;
revoke execute on function sp_clock_report(int, int)                                     from public, anon;
revoke execute on function sp_team_summary()                                             from public, anon;
revoke execute on function sp_pending_requests()                                         from public, anon;
revoke execute on function sp_decide_leave_request(uuid, text)                           from public, anon;
revoke execute on function sp_staff_leave_history(text)                                  from public, anon;
revoke execute on function sp_manager_add_leave_entry(text, date, date, numeric, text, text)        from public, anon;
revoke execute on function sp_manager_edit_leave_entry(uuid, date, date, numeric, text, text, text) from public, anon;
revoke execute on function sp_manager_delete_leave_entry(uuid)                           from public, anon;
revoke execute on function sp_manager_set_overtime(text, date, numeric)                  from public, anon;
revoke execute on function sp_sync_bank_holidays(jsonb)                                  from public, anon;
revoke execute on function sp_sync_shutdown_days()                                       from public, anon;
-- Internal helper: only ever called from inside the other functions.
revoke execute on function sp_staff_from_token(text)                                     from public, anon, authenticated;

grant execute on function reset_staff_password(text)                                     to authenticated;
grant execute on function sp_clock_activity(int)                                         to authenticated;
grant execute on function sp_manager_delete_clock_event(uuid)                            to authenticated;
grant execute on function sp_clock_report(int, int)                                      to authenticated;
grant execute on function sp_team_summary()                                              to authenticated;
grant execute on function sp_pending_requests()                                          to authenticated;
grant execute on function sp_decide_leave_request(uuid, text)                            to authenticated;
grant execute on function sp_staff_leave_history(text)                                   to authenticated;
grant execute on function sp_manager_add_leave_entry(text, date, date, numeric, text, text)        to authenticated;
grant execute on function sp_manager_edit_leave_entry(uuid, date, date, numeric, text, text, text) to authenticated;
grant execute on function sp_manager_delete_leave_entry(uuid)                            to authenticated;
grant execute on function sp_manager_set_overtime(text, date, numeric)                   to authenticated;
grant execute on function sp_sync_bank_holidays(jsonb)                                   to authenticated;
grant execute on function sp_sync_shutdown_days()                                        to authenticated;

-- Check: every row should say anon_can_run = false.
select p.proname as function_name,
       has_function_privilege('anon', p.oid, 'execute') as anon_can_run
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('reset_staff_password','sp_clock_activity','sp_manager_delete_clock_event','sp_clock_report',
                    'sp_team_summary','sp_pending_requests','sp_decide_leave_request','sp_staff_leave_history',
                    'sp_manager_add_leave_entry','sp_manager_edit_leave_entry','sp_manager_delete_leave_entry',
                    'sp_manager_set_overtime','sp_sync_bank_holidays','sp_sync_shutdown_days','sp_staff_from_token')
order by 1;
