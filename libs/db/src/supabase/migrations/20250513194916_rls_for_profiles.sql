-- lowercase sql

-- 1. enable row level security on the profiles table
alter table public.profiles enable row level security;

-- 2. create policies for profiles table

-- allow users to read their own profile
create policy "users_can_select_own_profile"
on public.profiles for select
using (auth.uid() = id);

-- allow users to update their own profile
create policy "users_can_update_own_profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

-- allow admins to select any profile
create policy "admins_can_select_any_profile"
on public.profiles for select
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
);

-- allow admins to update any profile
create policy "admins_can_update_any_profile"
on public.profiles for update
using (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
);

-- allow admins to insert profiles (e.g., for manual setup, though trigger handles new users)
create policy "admins_can_insert_profiles"
on public.profiles for insert
with check (
  exists (
    select 1
    from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  )
);

-- (optional) allow any authenticated user to read any profile if roles need to be widely available
-- create policy "authenticated_users_can_read_profiles"
-- on public.profiles for select
-- to authenticated
-- using (true);
-- For now, we'll stick to more restrictive select policies above.
-- The middleware will need to fetch the current user's role. The "users_can_select_own_profile"
-- policy allows this. If an admin needs to see other user's roles in a list,
-- "admins_can_select_any_profile" covers that.

comment on policy "users_can_select_own_profile" on public.profiles is 'users can read their own profile.';
comment on policy "users_can_update_own_profile" on public.profiles is 'users can update their own profile.';
comment on policy "admins_can_select_any_profile" on public.profiles is 'admin users can read any profile.';
comment on policy "admins_can_update_any_profile" on public.profiles is 'admin users can update any profile.';
comment on policy "admins_can_insert_profiles" on public.profiles is 'admin users can insert new profiles.';

-- Note on Deletion: Deletion is handled by `on delete cascade` from `auth.users`.
-- If direct deletion from `profiles` table is needed (e.g., by an admin), a policy would be:
-- create policy "admins_can_delete_profiles"
-- on public.profiles for delete
-- using (
--   exists (
--     select 1
--     from public.profiles
--     where id = auth.uid() and role = 'ADMIN'
--   )
-- );