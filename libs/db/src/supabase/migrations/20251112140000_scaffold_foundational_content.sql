-- supabase/migrations/20251112140000_scaffold_foundational_content.sql
-- seeds additional languages plus the foundational Home/Articles pages and flagship post translations

do $migration$
declare
  v_home_page_group_id uuid := gen_random_uuid();
  v_blog_page_group_id uuid := gen_random_uuid();
  v_how_it_works_post_group_id uuid := gen_random_uuid();
  v_en_lang_id bigint;
  v_fr_lang_id bigint;
  v_feature_media_id uuid;
begin
  -- only english and french
  insert into public.languages (id, name, code, is_default, is_active)
  values
    (1, 'English', 'en', true, true),
    (2, 'Français', 'fr', false, true)
  on conflict (id) do update
    set name = excluded.name,
        code = excluded.code,
        is_default = excluded.is_default,
        is_active = excluded.is_active;

  select id into v_en_lang_id from public.languages where code = 'en' limit 1;
  select id into v_fr_lang_id from public.languages where code = 'fr' limit 1;

  if v_en_lang_id is null or v_fr_lang_id is null then
    raise exception 'Required languages (en, fr) not found. Please seed languages first.';
  end if;

  -- reset defaults/actives
  update public.languages
  set is_active = true,
      is_default = case when code = 'en' then true else false end
  where code in ('en', 'fr');

-- scaffold the Home and Articles parent pages (EN + FR)
  insert into public.pages (language_id, title, slug, status, translation_group_id)
  values (v_en_lang_id, 'Home', 'home', 'published', v_home_page_group_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id;

  insert into public.pages (language_id, title, slug, status, translation_group_id)
  values (v_fr_lang_id, 'Accueil', 'accueil', 'published', v_home_page_group_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id;

insert into public.pages (language_id, title, slug, status, translation_group_id)
values (v_en_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
on conflict (language_id, slug) do update
  set title = excluded.title,
      status = excluded.status,
      translation_group_id = excluded.translation_group_id;

insert into public.pages (language_id, title, slug, status, translation_group_id)
values (v_fr_lang_id, 'Articles', 'articles', 'published', v_blog_page_group_id)
on conflict (language_id, slug) do update
  set title = excluded.title,
      status = excluded.status,
      translation_group_id = excluded.translation_group_id;

  -- Seed the featured image media record
  v_feature_media_id := gen_random_uuid();
  
  insert into public.media (id, file_name, object_key, file_type, size_bytes)
  values (v_feature_media_id, 'programmer-upscaled.webp', '/images/programmer-upscaled.webp', 'image/webp', 100000)
  on conflict (object_key) do update
    set file_name = excluded.file_name,
        file_type = excluded.file_type,
        size_bytes = excluded.size_bytes
  returning id into v_feature_media_id;

  -- seed the flagship How It Works blog post in EN + FR
  insert into public.posts (language_id, title, slug, status, translation_group_id, feature_image_id)
  values (v_en_lang_id, 'How NextBlock Works: A Look Under the Hood', 'how-nextblock-works', 'published', v_how_it_works_post_group_id, v_feature_media_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id,
        feature_image_id = excluded.feature_image_id;

  insert into public.posts (language_id, title, slug, status, translation_group_id, feature_image_id)
  values (v_fr_lang_id, 'Comment NextBlock Fonctionne : Regard Sous le Capot', 'comment-nextblock-fonctionne', 'published', v_how_it_works_post_group_id, v_feature_media_id)
  on conflict (language_id, slug) do update
    set title = excluded.title,
        status = excluded.status,
        translation_group_id = excluded.translation_group_id,
        feature_image_id = excluded.feature_image_id;

  -- Feature image for the flagship post can be set later via CMS; no seed insert for static asset.
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
