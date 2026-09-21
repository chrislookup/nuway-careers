-- Careers admin access = HR profile tier 'admin' AND a session that has completed 2FA (aal2).
-- Touches only the careers helper function; no HR tables, policies or functions are modified.
create or replace function careers_is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
     and exists (select 1 from profiles where id = auth.uid() and tier = 'admin');
$$;

-- The separate email list is no longer used.
drop table if exists careers_admins;
