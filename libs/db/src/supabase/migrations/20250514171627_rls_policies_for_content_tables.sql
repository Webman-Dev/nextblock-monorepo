-- supabase/migrations/YYYYMMDDHHMMSS_rls_policies_for_content_tables.sql
-- lowercase sql

begin;

--
-- Pages Table RLS
--
alter table public.pages enable row level security;

-- allow anonymous and authenticated users to read published pages
create policy "pages_are_publicly_readable_when_published"
on public.pages for select
to anon, authenticated
using (status = 'published');

-- allow authenticated users (authors, writers, admins) to read their own or all non-published pages
create policy "authors_writers_admins_can_read_own_or_all_drafts"
on public.pages for select
to authenticated
using (
  (status <> 'published' and author_id = auth.uid()) or -- author can read their own non-published
  (status <> 'published' and public.get_current_user_role() in ('ADMIN', 'WRITER')) -- admins/writers can read all non-published
);

--
-- Posts Table RLS
--
alter table public.posts enable row level security;

-- allow authenticated users (authors, writers, admins) to read their own or all non-published posts
create policy "authors_writers_admins_can_read_own_or_all_draft_posts"
on public.posts for select
to authenticated
using (
  (status <> 'published' and author_id = auth.uid()) or
  (status <> 'published'and public.get_current_user_role() in ('ADMIN', 'WRITER'))
);

--
-- Media Table RLS
--
alter table public.media enable row level security;


--
-- Blocks Table RLS
--
alter table public.blocks enable row level security;

-- allow anonymous and authenticated users to read blocks if their parent page/post is published
create policy "blocks_are_readable_if_parent_is_published"
on public.blocks for select
to anon, authenticated
using (
  (page_id is not null and exists(select 1 from public.pages p where p.id = blocks.page_id and p.status = 'published')) or
  (post_id is not null and exists(select 1 from public.posts pt where pt.id = blocks.post_id and pt.status = 'published' and (pt.published_at is null or pt.published_at <= now())))
);

-- allow admins and writers to insert, update, delete blocks
create policy "admins_and_writers_can_manage_blocks"
on public.blocks for all
to authenticated
using (public.get_current_user_role() in ('ADMIN', 'WRITER'))
with check (public.get_current_user_role() in ('ADMIN', 'WRITER'));

--
-- Navigation Items Table RLS
--
alter table public.navigation_items enable row level security;

commit;