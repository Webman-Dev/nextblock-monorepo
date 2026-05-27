-- 00000000000021_migrate_hero_blocks_to_sections.sql
-- Migration to convert 'hero' block types to 'section' block types with {"is_hero": true} content.

-- 1. Migrate active blocks
UPDATE public.blocks
SET
  block_type = 'section',
  content = COALESCE(content, '{}'::jsonb) || '{"is_hero": true}'::jsonb
WHERE block_type = 'hero';

-- 2. Migrate content drafts containing hero blocks
UPDATE public.content_drafts
SET blocks = (
  SELECT COALESCE(
    jsonb_agg(
      CASE
        WHEN elem.value->>'block_type' = 'hero' THEN
          jsonb_set(elem.value, '{block_type}', '"section"'::jsonb) ||
          jsonb_build_object('content', COALESCE(elem.value->'content', '{}'::jsonb) || '{"is_hero": true}'::jsonb)
        ELSE elem.value
      END
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(public.content_drafts.blocks) AS elem(value)
)
WHERE public.content_drafts.blocks @> '[{"block_type": "hero"}]';


