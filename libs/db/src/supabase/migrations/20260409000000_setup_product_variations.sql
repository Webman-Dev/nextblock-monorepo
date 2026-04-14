-- 20260409000000_setup_product_variations.sql
-- Module 6: product attributes, terms, variants, and transactional persistence

-- 1. Global product attributes
CREATE TABLE IF NOT EXISTS public.product_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_attribute_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id uuid NOT NULL REFERENCES public.product_attributes(id) ON DELETE CASCADE,
  value text NOT NULL,
  slug text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_attribute_terms_attribute_id_slug_key UNIQUE (attribute_id, slug)
);

CREATE TABLE IF NOT EXISTS public.product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sku text NOT NULL,
  price_adjustment integer NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT product_variants_product_id_sku_key UNIQUE (product_id, sku)
);

CREATE TABLE IF NOT EXISTS public.variant_attribute_mapping (
  variant_id uuid NOT NULL REFERENCES public.product_variants(id) ON DELETE CASCADE,
  attribute_term_id uuid NOT NULL REFERENCES public.product_attribute_terms(id) ON DELETE CASCADE,
  PRIMARY KEY (variant_id, attribute_term_id)
);

-- 2. Variant-aware order items for fulfillment + stock sync
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'order_items'
      AND column_name = 'variant_id'
  ) THEN
    ALTER TABLE public.order_items
      ADD COLUMN variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_product_attribute_terms_attribute_id
  ON public.product_attribute_terms(attribute_id);

CREATE INDEX IF NOT EXISTS idx_product_variants_product_id
  ON public.product_variants(product_id);

CREATE INDEX IF NOT EXISTS idx_variant_attribute_mapping_variant_id
  ON public.variant_attribute_mapping(variant_id);

CREATE INDEX IF NOT EXISTS idx_variant_attribute_mapping_attribute_term_id
  ON public.variant_attribute_mapping(attribute_term_id);

CREATE INDEX IF NOT EXISTS idx_order_items_variant_id
  ON public.order_items(variant_id);

-- 4. RLS
ALTER TABLE public.product_attributes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_attribute_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_attribute_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read product_attributes" ON public.product_attributes;
CREATE POLICY "Public read product_attributes"
  ON public.product_attributes
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_attributes" ON public.product_attributes;
CREATE POLICY "Admins manage product_attributes"
  ON public.product_attributes
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read product_attribute_terms" ON public.product_attribute_terms;
CREATE POLICY "Public read product_attribute_terms"
  ON public.product_attribute_terms
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_attribute_terms" ON public.product_attribute_terms;
CREATE POLICY "Admins manage product_attribute_terms"
  ON public.product_attribute_terms
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read product_variants" ON public.product_variants;
CREATE POLICY "Public read product_variants"
  ON public.product_variants
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage product_variants" ON public.product_variants;
CREATE POLICY "Admins manage product_variants"
  ON public.product_variants
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public read variant_attribute_mapping" ON public.variant_attribute_mapping;
CREATE POLICY "Public read variant_attribute_mapping"
  ON public.variant_attribute_mapping
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins manage variant_attribute_mapping" ON public.variant_attribute_mapping;
CREATE POLICY "Admins manage variant_attribute_mapping"
  ON public.variant_attribute_mapping
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Transactional RPC for product + variants
CREATE OR REPLACE FUNCTION public.upsert_product_with_variants(product_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product_id uuid := NULLIF(product_payload->>'id', '')::uuid;
  v_translation_group_id uuid := NULLIF(product_payload->>'translation_group_id', '')::uuid;
  v_variants jsonb := COALESCE(product_payload->'variants', '[]'::jsonb);
  v_variant jsonb;
  v_variant_id uuid;
  v_term_id text;
  v_has_variants boolean := jsonb_typeof(v_variants) = 'array' AND jsonb_array_length(v_variants) > 0;
  v_total_variant_stock integer := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  IF v_has_variants THEN
    SELECT COALESCE(SUM(COALESCE((value->>'stock_quantity')::integer, 0)), 0)
      INTO v_total_variant_stock
    FROM jsonb_array_elements(v_variants);
  END IF;

  IF v_product_id IS NULL THEN
    INSERT INTO public.products (
      title,
      slug,
      sku,
      stock,
      status,
      short_description,
      description_json,
      metadata,
      price,
      sale_price,
      freemius_plan_id,
      freemius_product_id,
      language_id,
      translation_group_id
    )
    VALUES (
      product_payload->>'title',
      product_payload->>'slug',
      product_payload->>'sku',
      CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      COALESCE(product_payload->>'status', 'draft'),
      NULLIF(product_payload->>'short_description', ''),
      product_payload->'description_json',
      COALESCE(product_payload->'metadata', '{}'::jsonb),
      COALESCE((product_payload->>'price')::integer, 0),
      CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      NULLIF(product_payload->>'freemius_plan_id', ''),
      NULLIF(product_payload->>'freemius_product_id', ''),
      (product_payload->>'language_id')::bigint,
      COALESCE(v_translation_group_id, gen_random_uuid())
    )
    RETURNING id INTO v_product_id;
  ELSE
    UPDATE public.products
    SET
      title = product_payload->>'title',
      slug = product_payload->>'slug',
      sku = product_payload->>'sku',
      stock = CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      status = COALESCE(product_payload->>'status', status),
      short_description = NULLIF(product_payload->>'short_description', ''),
      description_json = product_payload->'description_json',
      metadata = COALESCE(product_payload->'metadata', '{}'::jsonb),
      price = COALESCE((product_payload->>'price')::integer, 0),
      sale_price = CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      freemius_plan_id = NULLIF(product_payload->>'freemius_plan_id', ''),
      freemius_product_id = NULLIF(product_payload->>'freemius_product_id', ''),
      language_id = COALESCE((product_payload->>'language_id')::bigint, language_id),
      translation_group_id = COALESCE(v_translation_group_id, translation_group_id),
      updated_at = now()
    WHERE id = v_product_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Product not found';
    END IF;
  END IF;

  DELETE FROM public.variant_attribute_mapping
  WHERE variant_id IN (
    SELECT id FROM public.product_variants WHERE product_id = v_product_id
  );

  DELETE FROM public.product_variants
  WHERE product_id = v_product_id;

  IF v_has_variants THEN
    FOR v_variant IN
      SELECT value FROM jsonb_array_elements(v_variants)
    LOOP
      INSERT INTO public.product_variants (
        product_id,
        sku,
        price_adjustment,
        stock_quantity
      )
      VALUES (
        v_product_id,
        v_variant->>'sku',
        COALESCE((v_variant->>'price_adjustment')::integer, 0),
        COALESCE((v_variant->>'stock_quantity')::integer, 0)
      )
      RETURNING id INTO v_variant_id;

      FOR v_term_id IN
        SELECT jsonb_array_elements_text(COALESCE(v_variant->'attribute_term_ids', '[]'::jsonb))
      LOOP
        INSERT INTO public.variant_attribute_mapping (variant_id, attribute_term_id)
        VALUES (v_variant_id, v_term_id::uuid);
      END LOOP;
    END LOOP;
  END IF;

  RETURN v_product_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO service_role;

-- 6. Grants
GRANT SELECT ON TABLE public.product_attributes TO anon, authenticated;
GRANT SELECT ON TABLE public.product_attribute_terms TO anon, authenticated;
GRANT SELECT ON TABLE public.product_variants TO anon, authenticated;
GRANT SELECT ON TABLE public.variant_attribute_mapping TO anon, authenticated;

GRANT ALL ON TABLE public.product_attributes TO service_role;
GRANT ALL ON TABLE public.product_attribute_terms TO service_role;
GRANT ALL ON TABLE public.product_variants TO service_role;
GRANT ALL ON TABLE public.variant_attribute_mapping TO service_role;
