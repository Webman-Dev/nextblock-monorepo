-- Custom block definition registry for data-rendered user blocks.

CREATE OR REPLACE FUNCTION public.is_valid_custom_block_fields(candidate jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(candidate) <> 'array' THEN false
    ELSE
      NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(candidate) AS field(value)
        WHERE jsonb_typeof(field.value) <> 'object'
          OR jsonb_typeof(field.value -> 'key') IS DISTINCT FROM 'string'
          OR jsonb_typeof(field.value -> 'label') IS DISTINCT FROM 'string'
          OR jsonb_typeof(field.value -> 'type') IS DISTINCT FROM 'string'
          OR field.value ->> 'key' !~ '^[a-z][a-z0-9_]*$'
          OR field.value ->> 'type' NOT IN ('text', 'rich-text', 'image_r2', 'db_relation')
      )
      AND (
        SELECT COUNT(*) = COUNT(DISTINCT field.value ->> 'key')
        FROM jsonb_array_elements(candidate) AS field(value)
      )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_valid_custom_block_layout_schema(candidate jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(candidate) <> 'object' THEN false
    ELSE candidate ->> 'type' IN ('container', 'field_render')
  END;
$$;

CREATE TABLE IF NOT EXISTS public.custom_block_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z][a-z0-9-]*$'),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text NOT NULL DEFAULT '',
  fields jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (public.is_valid_custom_block_fields(fields)),
  layout_schema jsonb NOT NULL CHECK (public.is_valid_custom_block_layout_schema(layout_schema)),
  is_original boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.custom_block_definitions IS
  'Registry for user-created block definitions rendered from database JSONB without runtime code compilation.';
COMMENT ON COLUMN public.custom_block_definitions.fields IS
  'Strict JSONB field declarations for data-rendered custom blocks.';
COMMENT ON COLUMN public.custom_block_definitions.layout_schema IS
  'Open-ended recursive layout schema consumed by the dynamic layout renderer.';
COMMENT ON COLUMN public.custom_block_definitions.is_original IS
  'False when a definition was created by duplicating an existing registry row.';

CREATE INDEX IF NOT EXISTS idx_custom_block_definitions_is_original
  ON public.custom_block_definitions (is_original);

CREATE OR REPLACE FUNCTION public.duplicate_block_definition(target_id uuid)
RETURNS public.custom_block_definitions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  source_definition public.custom_block_definitions%ROWTYPE;
  copied_definition public.custom_block_definitions%ROWTYPE;
  base_slug text;
  copy_slug text;
  copy_index integer := 1;
BEGIN
  IF auth.role() <> 'service_role'
     AND COALESCE((SELECT public.get_current_user_role())::text, '') NOT IN ('ADMIN', 'WRITER') THEN
    RAISE EXCEPTION 'Not authorized to duplicate custom block definitions.'
      USING ERRCODE = '42501';
  END IF;

  SELECT *
    INTO source_definition
  FROM public.custom_block_definitions
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Custom block definition % not found.', target_id
      USING ERRCODE = 'P0002';
  END IF;

  base_slug := regexp_replace(source_definition.slug, '-copy(-[0-9]+)?$', '');
  copy_slug := base_slug || '-copy';

  WHILE EXISTS (
    SELECT 1
    FROM public.custom_block_definitions
    WHERE slug = copy_slug
  ) LOOP
    copy_index := copy_index + 1;
    copy_slug := base_slug || '-copy-' || copy_index;
  END LOOP;

  INSERT INTO public.custom_block_definitions (
    id,
    slug,
    name,
    description,
    fields,
    layout_schema,
    is_original
  )
  VALUES (
    gen_random_uuid(),
    copy_slug,
    source_definition.name || ' Copy',
    source_definition.description,
    source_definition.fields,
    source_definition.layout_schema,
    false
  )
  RETURNING *
    INTO copied_definition;

  RETURN copied_definition;
END;
$$;

ALTER TABLE public.custom_block_definitions ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.custom_block_definitions TO anon, authenticated, service_role;
GRANT INSERT, UPDATE, DELETE ON public.custom_block_definitions TO authenticated;
GRANT ALL ON public.custom_block_definitions TO service_role;

DROP POLICY IF EXISTS custom_block_definitions_public_read_policy
  ON public.custom_block_definitions;

CREATE POLICY custom_block_definitions_public_read_policy
  ON public.custom_block_definitions
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS custom_block_definitions_insert_policy
  ON public.custom_block_definitions;

CREATE POLICY custom_block_definitions_insert_policy
  ON public.custom_block_definitions
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

DROP POLICY IF EXISTS custom_block_definitions_update_policy
  ON public.custom_block_definitions;

CREATE POLICY custom_block_definitions_update_policy
  ON public.custom_block_definitions
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'))
  WITH CHECK ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

DROP POLICY IF EXISTS custom_block_definitions_delete_policy
  ON public.custom_block_definitions;

CREATE POLICY custom_block_definitions_delete_policy
  ON public.custom_block_definitions
  FOR DELETE
  TO authenticated
  USING ((SELECT public.get_current_user_role()) IN ('ADMIN', 'WRITER'));

DROP POLICY IF EXISTS custom_block_definitions_service_role_policy
  ON public.custom_block_definitions;

CREATE POLICY custom_block_definitions_service_role_policy
  ON public.custom_block_definitions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON FUNCTION public.duplicate_block_definition(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.duplicate_block_definition(uuid) TO authenticated, service_role;
