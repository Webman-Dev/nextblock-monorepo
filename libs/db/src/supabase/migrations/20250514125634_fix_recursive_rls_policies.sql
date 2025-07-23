-- Migration to fix recursive RLS policies on the 'profiles' table

-- 1. Create a helper function to get the current user's role securely
-- This function runs with the definer's privileges, avoiding RLS recursion
-- when called from within an RLS policy.
create or replace function public.get_current_user_role()
returns public.user_role -- Your ENUM type for roles
language sql
stable -- Indicates the function doesn't modify the database
security definer
set search_path = public -- Ensures 'profiles' table is found in 'public' schema
as $$
  select role from public.profiles where id = auth.uid();
$$;

comment on function public.get_current_user_role() is 'Fetches the role of the currently authenticated user. SECURITY DEFINER to prevent RLS recursion issues when used in policies.';

-- 2. Drop the old, problematic RLS policies
-- It's good practice to drop before creating, even if they might not exist or cause errors if they don't.
-- The original error means the "admins_can_select_any_profile" policy was indeed created.
drop policy if exists "admins_can_select_any_profile" on public.profiles;
drop policy if exists "admins_can_update_any_profile" on public.profiles;
drop policy if exists "admins_can_insert_profiles" on public.profiles;
-- Add any other admin policies that used the recursive pattern, e.g., for delete
-- drop policy if exists "admins_can_delete_profiles" on public.profiles;

-- 3. Recreate the admin policies using the helper function
-- For SELECT: Allows admins to select any profile.
create policy "admins_can_select_any_profile"
on public.profiles for select
using (public.get_current_user_role() = 'ADMIN'); -- Compares ENUM to 'ADMIN' literal

-- For UPDATE: Allows admins to update any profile.
create policy "admins_can_update_any_profile"
on public.profiles for update
using (public.get_current_user_role() = 'ADMIN')
with check (public.get_current_user_role() = 'ADMIN');

-- For INSERT: Allows admins to insert profiles (trigger handles new users, this is for manual admin action).
create policy "admins_can_insert_profiles"
on public.profiles for insert
with check (public.get_current_user_role() = 'ADMIN');

-- (Optional) If you had an admin delete policy with the recursive pattern:
-- create policy "admins_can_delete_profiles"
-- on public.profiles for delete
-- using (public.get_current_user_role() = 'ADMIN');

-- Note: The "users_can_select_own_profile" and "users_can_update_own_profile"
-- policies from your previous migration are fine and do not need to be changed
-- as they don't have the recursive subquery pattern.