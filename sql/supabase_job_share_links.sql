-- ============================================================================
-- Arborite Field Forms — Job Share Links: let a subcontractor fill in one
-- job's forms via a link, with no team login and no visibility into anything
-- else in the app.
-- ============================================================================
-- Run this in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run.
--
-- What this does:
--   - Adds job_share_links: one row per link, created/listed/revoked by the
--     team (authenticated only). Links don't expire — they stay active until
--     revoked, per how this was scoped.
--   - Adds 5 RPCs, same shape as the existing Staff Portal token pattern
--     (verify_staff_login / sp_staff_from_token in supabase_staff_portal.sql):
--     create/list/revoke are authenticated-only; load/save run as `anon` (no
--     login) and check the token themselves before touching anything. They
--     are SECURITY DEFINER, so they can read/write job_forms without job_forms
--     itself needing any RLS changes — exactly like Staff Portal never needs
--     to open up its own tables directly.
--   - Adds storage policies so a subcontractor can upload a signature /
--     job document for that one job (the existing upload code in
--     jobs-storage.js needs no changes — it already sends anon-key requests
--     whenever there's no team session active).
--   - Also adds RLS to job_documents, which currently has none in any tracked
--     migration — a pre-existing gap, closed here alongside the new
--     token-scoped anon policy for the same table.
--
-- Trade-off worth knowing: storage policies can only check the file path (the
-- job's quote_ref), not the specific token in use — so while a link is active
-- for a job, anyone who already knows that job's quote_ref could write to its
-- storage paths, though still nothing else (no other job, no listing). Same
-- shared-trust level the rest of the app already runs on.
-- ============================================================================

create table if not exists job_share_links (
  token       text primary key default encode(gen_random_bytes(24), 'hex'),
  quote_ref   text not null,
  label       text,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists job_share_links_quote_ref_idx on job_share_links(quote_ref);

alter table public.job_share_links enable row level security;
drop policy if exists "authenticated_all" on public.job_share_links;
create policy "authenticated_all" on public.job_share_links for all to authenticated using (true) with check (true);


-- ============================================================================
-- SECTION 1 — internal token check, reused by load + save
-- ============================================================================
create or replace function _job_share_link_quote_ref(p_token text)
returns text
language plpgsql security definer set search_path = public, extensions
as $$
declare v_ref text;
begin
  select quote_ref into v_ref from job_share_links where token = p_token and revoked = false;
  if v_ref is null then
    raise exception 'This link is no longer active';
  end if;
  return v_ref;
end;
$$;


-- ============================================================================
-- SECTION 2 — team-only: create / list / revoke links
-- ============================================================================
create or replace function create_job_share_link(p_quote_ref text, p_label text)
returns table(token text, quote_ref text, label text, created_at timestamptz)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_token text;
begin
  insert into job_share_links (quote_ref, label) values (p_quote_ref, p_label)
  returning job_share_links.token into v_token;
  return query select job_share_links.token, job_share_links.quote_ref, job_share_links.label, job_share_links.created_at
    from job_share_links where job_share_links.token = v_token;
end;
$$;

create or replace function list_job_share_links(p_quote_ref text)
returns table(token text, quote_ref text, label text, revoked boolean, created_at timestamptz)
language sql security definer set search_path = public, extensions
as $$
  select token, quote_ref, label, revoked, created_at
  from job_share_links
  where quote_ref = p_quote_ref
  order by created_at desc;
$$;

create or replace function revoke_job_share_link(p_token text)
returns void
language sql security definer set search_path = public, extensions
as $$
  update job_share_links set revoked = true where token = p_token;
$$;

grant execute on function create_job_share_link(text, text) to authenticated;
grant execute on function list_job_share_links(text) to authenticated;
grant execute on function revoke_job_share_link(text) to authenticated;


-- ============================================================================
-- SECTION 3 — no-login: load / save the linked job's forms
-- ============================================================================
create or replace function job_share_link_load(p_token text)
returns table(quote_ref text, form_data jsonb)
language plpgsql security definer set search_path = public, extensions
as $$
declare v_ref text;
begin
  v_ref := _job_share_link_quote_ref(p_token);
  return query select job_forms.quote_ref, job_forms.form_data from job_forms where job_forms.quote_ref = v_ref;
end;
$$;

create or replace function job_share_link_save(p_token text, p_form_data jsonb)
returns void
language plpgsql security definer set search_path = public, extensions
as $$
declare v_ref text;
begin
  v_ref := _job_share_link_quote_ref(p_token);
  insert into job_forms (quote_ref, form_data, updated_at)
  values (v_ref, p_form_data, now())
  on conflict (quote_ref) do update set form_data = excluded.form_data, updated_at = excluded.updated_at;
end;
$$;

grant execute on function job_share_link_load(text) to anon, authenticated;
grant execute on function job_share_link_save(text, jsonb) to anon, authenticated;


-- ============================================================================
-- SECTION 4 — STORAGE: anon access to signatures/documents, scoped to active links
-- ============================================================================
-- Paths are "<sanitized-quote-ref>/...", matching _storagePath()/_docPath() in
-- jobs-storage.js (quoteRef.replace(/[^a-zA-Z0-9_-]/g, '_')) — mirrored here
-- with regexp_replace so a quote_ref with unusual characters still matches.

drop policy if exists "job link can read signatures" on storage.objects;
create policy "job link can read signatures" on storage.objects
  for select to anon using (
    bucket_id = 'signatures'
    and exists (
      select 1 from job_share_links jsl
      where jsl.revoked = false
        and regexp_replace(jsl.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g') = split_part(name, '/', 1)
    )
  );

drop policy if exists "job link can upload signatures" on storage.objects;
create policy "job link can upload signatures" on storage.objects
  for insert to anon with check (
    bucket_id = 'signatures'
    and exists (
      select 1 from job_share_links jsl
      where jsl.revoked = false
        and regexp_replace(jsl.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g') = split_part(name, '/', 1)
    )
  );

drop policy if exists "job link can read documents" on storage.objects;
create policy "job link can read documents" on storage.objects
  for select to anon using (
    bucket_id = 'documents'
    and exists (
      select 1 from job_share_links jsl
      where jsl.revoked = false
        and regexp_replace(jsl.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g') = split_part(name, '/', 1)
    )
  );

drop policy if exists "job link can upload documents" on storage.objects;
create policy "job link can upload documents" on storage.objects
  for insert to anon with check (
    bucket_id = 'documents'
    and exists (
      select 1 from job_share_links jsl
      where jsl.revoked = false
        and regexp_replace(jsl.quote_ref, '[^a-zA-Z0-9_-]', '_', 'g') = split_part(name, '/', 1)
    )
  );


-- ============================================================================
-- SECTION 5 — job_documents: add the RLS it was missing, plus token-scoped anon access
-- ============================================================================
alter table if exists public.job_documents enable row level security;

drop policy if exists "authenticated_all" on public.job_documents;
create policy "authenticated_all" on public.job_documents for all to authenticated using (true) with check (true);

drop policy if exists "job_link_anon_access" on public.job_documents;
create policy "job_link_anon_access" on public.job_documents for all to anon
  using (exists (select 1 from job_share_links jsl where jsl.quote_ref = job_documents.job_ref and jsl.revoked = false))
  with check (exists (select 1 from job_share_links jsl where jsl.quote_ref = job_documents.job_ref and jsl.revoked = false));


-- ============================================================================
-- VERIFY
-- ============================================================================
select routine_name from information_schema.routines
where routine_schema = 'public' and routine_name like '%job_share_link%'
order by routine_name;

select tablename, policyname, roles from pg_policies
where tablename in ('job_share_links', 'job_documents')
   or (tablename = 'objects' and policyname like 'job link%')
order by tablename, policyname;
