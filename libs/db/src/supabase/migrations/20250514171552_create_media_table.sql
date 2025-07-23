-- lowercase sql

create table public.media (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references public.profiles(id) on delete set null,
  file_name text not null,
  object_key text not null unique,
  file_type text,
  size_bytes bigint,
  description text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.media is 'stores information about uploaded media assets.';
comment on column public.media.object_key is 'unique key (path) in cloudflare r2.';

alter table public.media enable row level security;

create policy "media_is_readable_by_all"
on public.media for select
to anon, authenticated
using (true);

create policy "admins_and_writers_can_manage_media"
on public.media for all
to authenticated
using (public.get_current_user_role() in ('ADMIN', 'WRITER'))
with check (public.get_current_user_role() in ('ADMIN', 'WRITER'));

create or replace function public.handle_media_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger on_media_update
  before update on public.media
  for each row
  execute procedure public.handle_media_update();