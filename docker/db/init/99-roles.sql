-- Self-hosted Supabase role passwords.
--
-- The supabase/postgres image creates the platform roles; GoTrue logs in as supabase_auth_admin
-- and PostgREST as authenticator. We give the roles that exist the generated POSTGRES_PASSWORD so
-- a single secret is all the stack needs. The exact role set varies by image tag, so each role is
-- guarded with an existence check (the password is passed through a session GUC because psql
-- variables are not interpolated inside a dollar-quoted block). Runs once on first init.
\set pgpass `echo "$POSTGRES_PASSWORD"`
select set_config('nextblock.pgpass', :'pgpass', false);

do $$
declare
  role_name text;
begin
  foreach role_name in array array[
    'authenticator',
    'pgbouncer',
    'supabase_auth_admin',
    'supabase_storage_admin',
    'supabase_functions_admin',
    'supabase_read_only_user'
  ] loop
    if exists (select 1 from pg_roles where rolname = role_name) then
      execute format('alter role %I with password %L', role_name, current_setting('nextblock.pgpass'));
    end if;
  end loop;
end $$;
