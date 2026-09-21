-- =====================================================================
-- Nuway Careers — database schema
-- Safe to run in the existing Nuway HR Supabase project: every object
-- is prefixed careers_ and nothing touches existing tables.
-- Run in Supabase SQL editor (or `supabase db push`).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------
do $$ begin
  create type careers_role_type as enum
    ('Sales','Driver','Yard','Manager','Assistant Manager','Head Office');
exception when duplicate_object then null; end $$;

do $$ begin
  create type careers_employment_type as enum
    ('Full-time','Part-time','Casual','Fixed-term');
exception when duplicate_object then null; end $$;

do $$ begin
  create type careers_job_status as enum ('draft','live','paused','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type careers_application_status as enum
    ('new','reviewed','interviewing','offered','hired','declined');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Admins: anyone whose auth email is listed here can use the admin panel
-- ---------------------------------------------------------------------
create table if not exists careers_admins (
  email       text primary key,
  name        text,
  created_at  timestamptz not null default now()
);

create or replace function careers_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from careers_admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------------------------------------------------------------------
-- Locations (public-facing store details)
-- ---------------------------------------------------------------------
create table if not exists careers_locations (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  address       text not null,
  suburb        text not null,
  postcode      text not null,
  phone         text,
  store_email   text,                 -- public store email
  hiring_email  text,                 -- where applications go (defaults to store_email)
  region        text,                 -- e.g. Brisbane South, Gold Coast, Sunshine Coast
  sort_order    int  not null default 100,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Jobs
-- ---------------------------------------------------------------------
create table if not exists careers_jobs (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  location_id      uuid references careers_locations(id) on delete set null,
  all_locations    boolean not null default false,     -- e.g. "Drivers wanted — all stores"
  role_types       careers_role_type[] not null default '{}',
  employment_type  careers_employment_type not null default 'Full-time',
  summary          text not null,                      -- one or two lines for the card
  description      text not null,                      -- markdown body
  requirements     text,                               -- markdown bullet list
  pay_text         text,                               -- optional, free text e.g. "Above award + super"
  status           careers_job_status not null default 'draft',
  on_seek          boolean not null default false,
  seek_url         text,
  accept_direct    boolean not null default true,      -- show our own form (can be true alongside SEEK)
  closes_on        date,
  published_at     timestamptz,
  created_by       text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint seek_url_required check (not on_seek or seek_url is not null)
);

create index if not exists careers_jobs_status_idx on careers_jobs(status, published_at desc);

create or replace function careers_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if new.status = 'live' and (old.status is distinct from 'live') and new.published_at is null then
    new.published_at = now();
  end if;
  return new;
end $$;

drop trigger if exists careers_jobs_touch on careers_jobs;
create trigger careers_jobs_touch before update on careers_jobs
  for each row execute function careers_touch_updated_at();

-- ---------------------------------------------------------------------
-- Applications (both job applications and general "register interest")
-- ---------------------------------------------------------------------
create table if not exists careers_applications (
  id                 uuid primary key default gen_random_uuid(),
  job_id             uuid references careers_jobs(id) on delete set null,   -- null = register interest
  location_id        uuid references careers_locations(id) on delete set null,
  role_types         careers_role_type[] not null default '{}',             -- what they're interested in
  first_name         text not null,
  last_name          text not null,
  email              text not null,
  phone              text not null,
  suburb             text,
  -- availability
  employment_types   careers_employment_type[] not null default '{}',
  weekends           boolean,
  start_date         text,                                                  -- free text: "Immediately", "2 weeks"
  -- licences & tickets
  licence_class      text,                                                  -- C, LR, MR, HR, HC, MC, None
  licence_auto_only  boolean,
  forklift           boolean not null default false,
  loader             boolean not null default false,
  white_card         boolean not null default false,
  -- working rights
  working_rights     text not null,                                         -- Citizen / PR / Visa (type)
  visa_details       text,
  -- message + cv
  message            text,
  cv_path            text,                                                  -- storage object path in careers-cvs
  cv_filename        text,
  -- housekeeping
  status             careers_application_status not null default 'new',
  admin_notes        text,
  source             text default 'website',
  consent            boolean not null default false,
  ip_hash            text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists careers_applications_job_idx on careers_applications(job_id, created_at desc);
create index if not exists careers_applications_status_idx on careers_applications(status, created_at desc);

drop trigger if exists careers_applications_touch on careers_applications;
create trigger careers_applications_touch before update on careers_applications
  for each row execute function careers_touch_updated_at();

-- ---------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------
alter table careers_admins        enable row level security;
alter table careers_locations     enable row level security;
alter table careers_jobs          enable row level security;
alter table careers_applications  enable row level security;

-- admins table: only admins can see who the admins are
drop policy if exists "admins read admins" on careers_admins;
create policy "admins read admins" on careers_admins
  for select to authenticated using (careers_is_admin());

-- locations: public read of active stores, admins do everything
drop policy if exists "public read active locations" on careers_locations;
create policy "public read active locations" on careers_locations
  for select to anon, authenticated using (active);
drop policy if exists "admins manage locations" on careers_locations;
create policy "admins manage locations" on careers_locations
  for all to authenticated using (careers_is_admin()) with check (careers_is_admin());

-- jobs: public read of live jobs only, admins do everything
drop policy if exists "public read live jobs" on careers_jobs;
create policy "public read live jobs" on careers_jobs
  for select to anon, authenticated
  using (status = 'live' and (closes_on is null or closes_on >= current_date));
drop policy if exists "admins manage jobs" on careers_jobs;
create policy "admins manage jobs" on careers_jobs
  for all to authenticated using (careers_is_admin()) with check (careers_is_admin());

-- applications: public can INSERT only (never read), admins read/update
drop policy if exists "public submit application" on careers_applications;
create policy "public submit application" on careers_applications
  for insert to anon, authenticated
  with check (consent = true and status = 'new');
drop policy if exists "admins manage applications" on careers_applications;
create policy "admins manage applications" on careers_applications
  for all to authenticated using (careers_is_admin()) with check (careers_is_admin());

-- ---------------------------------------------------------------------
-- Storage bucket for CVs (private; 5 MB; PDF / Word only)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('careers-cvs', 'careers-cvs', false, 5242880,
        array['application/pdf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- anyone may upload a CV (write-only), only admins may read/delete
drop policy if exists "public upload cv" on storage.objects;
create policy "public upload cv" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'careers-cvs');
drop policy if exists "admins read cv" on storage.objects;
create policy "admins read cv" on storage.objects
  for select to authenticated
  using (bucket_id = 'careers-cvs' and careers_is_admin());
drop policy if exists "admins delete cv" on storage.objects;
create policy "admins delete cv" on storage.objects
  for delete to authenticated
  using (bucket_id = 'careers-cvs' and careers_is_admin());

-- ---------------------------------------------------------------------
-- Public view: live jobs joined to location (what the careers page reads)
-- ---------------------------------------------------------------------
create or replace view careers_live_jobs
with (security_invoker = true) as
select j.id, j.slug, j.title, j.role_types, j.employment_type, j.summary,
       j.description, j.requirements, j.pay_text, j.on_seek, j.seek_url,
       j.accept_direct, j.closes_on, j.published_at, j.all_locations,
       l.id as location_id, l.name as location_name, l.suburb as location_suburb,
       l.region as location_region
from careers_jobs j
left join careers_locations l on l.id = j.location_id
where j.status = 'live' and (j.closes_on is null or j.closes_on >= current_date);

grant select on careers_live_jobs to anon, authenticated;

-- ---------------------------------------------------------------------
-- Admin dashboard helper: application counts per job
-- ---------------------------------------------------------------------
create or replace view careers_job_stats
with (security_invoker = true) as
select j.id as job_id,
       count(a.id)                                   as total_applications,
       count(a.id) filter (where a.status = 'new')   as new_applications
from careers_jobs j
left join careers_applications a on a.job_id = j.id
group by j.id;

grant select on careers_job_stats to authenticated;
