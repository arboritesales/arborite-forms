-- ============================================================================
-- Arborite Field Forms — Client Ledger (CRM): persist leads to Supabase
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run — create/insert statements use IF NOT EXISTS / ON CONFLICT.
--
-- What this does:
--   - Creates crm_leads, one row per lead, replacing the old crm/data.json
--     file as the source of truth (the Client Ledger previously had no real
--     save — "Add lead" only lived in the browser tab until you exported and
--     committed data.json by hand).
--   - Numeric/date-shaped fields (quoteValue, projectValue, networth,
--     contactDate, nextFollowUp, dateInsight, dateProposal, dateConfirmed)
--     are kept as plain text, matching how they were already stored in
--     data.json (often "" rather than a real number/date) — this avoids
--     save failures on rows with blank values.
--   - RLS: same authenticated_all policy as every other table in this app
--     (supabase_rls.sql) — any user logged into the shared team/manager
--     account can read/write/delete. No new permission model.
--   - Seeds the 5 leads that were in crm/data.json so nothing is lost.
-- ============================================================================

create table if not exists crm_leads (
  id                text primary key,
  name              text not null,
  company           text,
  "jobTitle"        text,
  sector            text,
  source            text,
  "linkedinUrl"     text,
  email             text,
  phone             text,
  "contactDate"     text,
  emailed           boolean not null default false,
  status            text not null default 'New',
  "quoteValue"      text,
  "projectName"     text,
  "projectValue"    text,
  region            text,
  notes             text,
  owner             text,
  priority          text default 'Medium',
  "nextFollowUp"    text,
  networth          text,
  called            boolean not null default false,
  "retargetSituation" text,
  "dateInsight"     text,
  "dateProposal"    text,
  "dateConfirmed"   text,
  contacts          jsonb not null default '[]'::jsonb,
  "planningStage"   text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.crm_leads enable row level security;
drop policy if exists "authenticated_all" on public.crm_leads;
create policy "authenticated_all" on public.crm_leads for all to authenticated using (true) with check (true);

insert into crm_leads (id, name, company, "jobTitle", sector, source, "linkedinUrl", email, phone, "contactDate", emailed, status, "quoteValue", "dateConfirmed")
values
  ('l001', 'James Bennett', 'Catling Group', 'Managing QS', 'Commercial', 'LinkedIn', 'https://www.linkedin.com/in/james-bennett-6b4420b2/', 'lirind@catlingltd.co.uk', '', '2026-03-09', true, 'Project Confirmed', '2100', '2026-06-09'),
  ('l002', 'Billy Powell', 'Colmor Construction', 'QS', 'Commercial', 'LinkedIn', 'https://www.linkedin.com/in/billy-powell-5bb440133/', 'Billy@Colmorconstruction.co.uk', '', '2026-06-01', true, 'Insight', '', ''),
  ('l003', 'William Steadman', 'Prestec UK Ltd', 'Assistant QS', 'Commercial', 'LinkedIn', 'https://www.linkedin.com/in/william-steadman-82a23a349/', 'will.steadman@prestecuk.com', '', '2026-06-09', true, 'Insight', '', ''),
  ('l004', 'Amanda Ling', 'SFM Ltd', 'MD', 'Other', 'LinkedIn', 'https://www.linkedin.com/in/amandaling/', 'Laura.Mascall@sfm-limited.com', '', '2026-03-30', true, 'Dead', '', ''),
  ('l005', 'Omar Parvez', 'London Basement', 'QS', 'Commercial', 'LinkedIn', 'https://www.linkedin.com/in/omar-p-53b12b8a/', 'sales@londonbasement.co.uk', '', '2026-06-09', true, 'Potential Project', '', '')
on conflict (id) do nothing;

-- ============================================================================
-- VERIFY — should show 5 rows
-- ============================================================================
select id, name, company, status from crm_leads order by id;
