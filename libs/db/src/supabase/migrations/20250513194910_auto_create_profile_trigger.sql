-- lowercase sql

-- 1. create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public -- important for security definer to access public schema
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name', -- attempts to grab full_name from metadata if provided at signup
    new.raw_user_meta_data->>'avatar_url', -- attempts to grab avatar_url from metadata
    'USER' -- default role
  );
  return new;
end;
$$;

-- 2. create a trigger to call the function when a new user signs up in auth.users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- This comment is on a function in the 'public' schema, which is fine.
comment on function public.handle_new_user is 'creates a public.profile row for a new auth.users entry.';

-- The following line was causing the permission error and has been removed:
-- comment on trigger on_auth_user_created on auth.users is 'after a new user signs up, create their profile.';