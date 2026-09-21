-- Jobs inserted directly as 'live' get a published_at (the update trigger only fires on edits).
create or replace function careers_set_published_on_insert()
returns trigger language plpgsql as $$
begin
  if new.status = 'live' and new.published_at is null then new.published_at = now(); end if;
  return new;
end $$;
drop trigger if exists careers_jobs_insert_publish on careers_jobs;
create trigger careers_jobs_insert_publish before insert on careers_jobs
  for each row execute function careers_set_published_on_insert();
update careers_jobs set published_at = created_at where status = 'live' and published_at is null;
