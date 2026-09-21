-- =====================================================================
-- Nuway Careers — email routing, job templates, module settings
-- Careers tables only. No HR table, policy or function is modified.
-- =====================================================================

do $$ begin
  create type careers_email_mode as enum ('store', 'store_and_others', 'others_only');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Per-job routing: where applications for THIS job are emailed
-- ---------------------------------------------------------------------
alter table careers_jobs
  add column if not exists email_mode   careers_email_mode not null default 'store',
  add column if not exists email_others text;

-- Live jobs are publicly readable, so the public role must not see the
-- internal routing columns. A table-wide grant overrides column revokes, so
-- the grant is replaced with an explicit column list. The public page reads
-- the careers_live_jobs view, which never selects the excluded columns.
revoke select on careers_jobs from anon;
grant select (id, slug, title, location_id, all_locations, role_types, employment_type,
              summary, description, requirements, pay_text, status, on_seek, seek_url,
              accept_direct, closes_on, published_at, created_at, updated_at)
  on careers_jobs to anon;

-- ---------------------------------------------------------------------
-- Module settings (single row)
-- ---------------------------------------------------------------------
create table if not exists careers_settings (
  id                   boolean primary key default true check (id),
  interest_email_mode  careers_email_mode not null default 'store',
  interest_email_others text,
  cc_email             text,          -- head-office copy on every application
  updated_at           timestamptz not null default now(),
  updated_by           text
);
insert into careers_settings (id) values (true) on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- Job templates. Deliberately store-free: the store is chosen each time a
-- job is posted. A "{store}" placeholder in the title is filled in then.
-- ---------------------------------------------------------------------
create table if not exists careers_job_templates (
  id              uuid primary key default gen_random_uuid(),
  name            text not null unique,
  title           text,
  role_types      careers_role_type[] not null default '{}',
  employment_type careers_employment_type not null default 'Full-time',
  summary         text,
  description     text,
  requirements    text,
  pay_text        text,
  email_mode      careers_email_mode not null default 'store',
  email_others    text,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Record of every application email sent (automatic and manual resends)
-- ---------------------------------------------------------------------
create table if not exists careers_email_log (
  id             uuid primary key default gen_random_uuid(),
  application_id uuid references careers_applications(id) on delete cascade,
  recipients     text not null,
  kind           text not null default 'auto',   -- 'auto' | 'resend'
  sent_by        text,
  ok             boolean not null default true,
  detail         text,
  created_at     timestamptz not null default now()
);
create index if not exists careers_email_log_app_idx on careers_email_log(application_id, created_at desc);

-- ---------------------------------------------------------------------
-- Row-level security: admins only (an admin is an HR admin with 2FA)
-- ---------------------------------------------------------------------
alter table careers_settings      enable row level security;
alter table careers_job_templates enable row level security;
alter table careers_email_log     enable row level security;

drop policy if exists "admins manage settings" on careers_settings;
create policy "admins manage settings" on careers_settings
  for all to authenticated using (careers_is_admin()) with check (careers_is_admin());

drop policy if exists "admins manage templates" on careers_job_templates;
create policy "admins manage templates" on careers_job_templates
  for all to authenticated using (careers_is_admin()) with check (careers_is_admin());

drop policy if exists "admins read email log" on careers_email_log;
create policy "admins read email log" on careers_email_log
  for select to authenticated using (careers_is_admin());

-- Plain updated_at touch (the jobs trigger also handles published_at, which
-- templates and settings do not have).
create or replace function careers_touch_only()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists careers_templates_touch on careers_job_templates;
create trigger careers_templates_touch before update on careers_job_templates
  for each row execute function careers_touch_only();

drop trigger if exists careers_settings_touch on careers_settings;
create trigger careers_settings_touch before update on careers_settings
  for each row execute function careers_touch_only();
