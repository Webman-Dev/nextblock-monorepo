-- lowercase sql

-- 1. create the user_role enum type
create type public.user_role as enum ('ADMIN', 'WRITER', 'USER');

-- 2. create the profiles table
create table public.profiles (
  id uuid not null primary key, -- references auth.users(id)
  updated_at timestamp with time zone,
  username text unique,
  full_name text,
  avatar_url text,
  website text,
  role public.user_role not null default 'USER',

  constraint username_length check (char_length(username) >= 3)
);

-- 3. set up foreign key from profiles.id to auth.users.id
alter table public.profiles
  add constraint profiles_id_fkey
  foreign key (id)
  references auth.users (id)
  on delete cascade; -- if a user is deleted, their profile is also deleted

-- 4. (optional) add some sample inserts for roles if needed directly, though roles are part of the enum.
-- users will get roles assigned. an admin user might need to be set manually or via seed.
-- example: update a specific user to be an admin after they sign up.
-- update public.profiles set role = 'ADMIN' where id = 'user_id_of_admin';

-- 5. (optional) seed an initial admin user if you know their auth.users.id
-- this requires the user to exist in auth.users first.
-- insert into public.profiles (id, username, full_name, role)
-- values ('<some-auth-user-id>', 'admin_user', 'Admin User', 'ADMIN')
-- on conflict (id) do update set role = 'ADMIN';
-- note: the trigger in the next migration is preferred for new users.
-- this manual insert/update is for bootstrapping your first admin.

comment on table public.profiles is 'profile information for each user, extending auth.users.';
comment on column public.profiles.id is 'references auth.users.id';
comment on column public.profiles.role is 'user role for rbac.';