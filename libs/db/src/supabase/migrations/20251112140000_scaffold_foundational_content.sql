-- supabase/migrations/20251112140000_scaffold_foundational_content.sql
-- seeds additional languages plus the foundational Home/Blog pages and flagship post translations

do $migration$
declare
  v_home_page_group_id uuid := gen_random_uuid();
  v_blog_page_group_id uuid := gen_random_uuid();
  v_how_it_works_post_group_id uuid := gen_random_uuid();
  v_en_lang_id bigint;
  v_feature_media_id uuid;
begin
  -- add the remaining languages while preserving english (1) and french (2)
  insert into public.languages (id, name, code, is_default, is_active)
  values
    (3, 'Spanish', 'es', false, false),
    (4, 'Italian', 'it', false, false),
    (5, 'German', 'de', false, false),
    (6, 'Chinese', 'zh', false, false),
    (7, 'Japanese', 'ja', false, false)
  on conflict (id) do update
    set name = excluded.name,
        code = excluded.code,
        is_default = excluded.is_default,
        is_active = excluded.is_active;

  select id into v_en_lang_id from public.languages where code = 'en' limit 1;

  if v_en_lang_id is null then
    raise exception 'English language (en) not found. Please seed languages first.';
  end if;

  update public.languages
  set is_active = case when code = 'en' then true else false end,
      is_default = case when code = 'en' then true else false end
  where code in ('en', 'fr', 'es', 'it', 'de', 'zh', 'ja');

  delete from public.navigation_items
  where menu_key = 'HEADER'
    and language_id <> v_en_lang_id
    and label in ('Home', 'Accueil', 'Blog', 'Blogue');

  delete from public.pages
  where slug in ('home', 'blog')
    and language_id <> v_en_lang_id;

  delete from public.posts
  where slug in ('how-nextblock-works', 'comment-fonctionne-nextblock')
    and language_id <> v_en_lang_id;

  -- scaffold the Home and Blog parent pages
  insert into public.pages (language_id, title, slug, status, translation_group_id)
  values (v_en_lang_id, 'Home', 'home', 'published', v_home_page_group_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id;

  insert into public.pages (language_id, title, slug, status, translation_group_id)
  values (v_en_lang_id, 'Blog', 'blog', 'published', v_blog_page_group_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id;

  -- seed the flagship How It Works blog post in english only
  insert into public.posts (language_id, title, slug, status, translation_group_id)
  values (v_en_lang_id, 'How NextBlock Works: A Look Under the Hood', 'how-nextblock-works', 'published', v_how_it_works_post_group_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id;

  insert into public.media (file_name, object_key, file_type, description)
  values (
    'Programmer using Nextblock',
    '/images/programmer-upscaled.webp',
    'image/webp',
    'Placeholder hero for the flagship post'
  )
  on conflict (object_key) do update
    set file_name = excluded.file_name,
        description = excluded.description
  returning id into v_feature_media_id;

  update public.posts
  set feature_image_id = v_feature_media_id
  where slug = 'how-nextblock-works'
    and language_id = v_en_lang_id;
end;
$migration$;

select id as home_page_id
from public.pages
where slug = 'home' and language_id = (select id from public.languages where code = 'en' limit 1)
order by created_at desc
limit 1;

select id as post_id
from public.posts
where slug = 'how-nextblock-works' and language_id = (select id from public.languages where code = 'en' limit 1)
order by created_at desc
limit 1;
