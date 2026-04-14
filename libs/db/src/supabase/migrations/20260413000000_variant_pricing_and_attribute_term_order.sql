-- 20260413000000_variant_pricing_and_attribute_term_order.sql
-- Variant pricing uses explicit price/sale_price and attribute terms get merchant-controlled ordering.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_attribute_terms'
      AND column_name = 'sort_order'
  ) THEN
    ALTER TABLE public.product_attribute_terms
      ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
  END IF;
END $$;

WITH ordered_terms AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY attribute_id
      ORDER BY created_at ASC NULLS LAST, value ASC, id ASC
    ) - 1 AS sort_position
  FROM public.product_attribute_terms
)
UPDATE public.product_attribute_terms AS terms
SET sort_order = ordered_terms.sort_position
FROM ordered_terms
WHERE terms.id = ordered_terms.id;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'price'
  ) THEN
    ALTER TABLE public.product_variants
      ADD COLUMN price integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'product_variants'
      AND column_name = 'sale_price'
  ) THEN
    ALTER TABLE public.product_variants
      ADD COLUMN sale_price integer NULL;
  END IF;
END $$;

UPDATE public.product_variants AS variants
SET
  price = GREATEST(0, COALESCE(products.price, 0) + COALESCE(variants.price_adjustment, 0)),
  sale_price = CASE
    WHEN products.sale_price IS NOT NULL THEN
      GREATEST(0, products.sale_price + COALESCE(variants.price_adjustment, 0))
    ELSE
      NULL
  END
FROM public.products
WHERE products.id = variants.product_id
  AND variants.price = 0
  AND variants.sale_price IS NULL;

CREATE OR REPLACE FUNCTION public.upsert_product_with_variants(product_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
        price,
        sale_price,
        stock_quantity
      )
      VALUES (
        v_product_id,
        v_variant->>'sku',
        COALESCE((v_variant->>'price')::integer, 0),
        CASE
          WHEN v_variant ? 'sale_price' AND v_variant->>'sale_price' <> '' THEN
            (v_variant->>'sale_price')::integer
          ELSE
            NULL
        END,
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
$function$;
