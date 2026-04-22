-- 20260417010000_update_product_rpc_for_currency_prices.sql
-- Extends the product upsert RPC to persist prices/sale_prices JSONB maps.

CREATE OR REPLACE FUNCTION public.upsert_product_with_variants(product_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_product_id uuid := NULLIF(product_payload->>'id', '')::uuid;
  v_translation_group_id uuid := NULLIF(product_payload->>'translation_group_id', '')::uuid;
  v_product_type text := CASE
    WHEN product_payload->>'product_type' IN ('physical', 'digital') THEN product_payload->>'product_type'
    WHEN NULLIF(product_payload->>'freemius_product_id', '') IS NOT NULL
      OR NULLIF(product_payload->>'freemius_plan_id', '') IS NOT NULL THEN 'digital'
    ELSE 'physical'
  END;
  v_payment_provider text := CASE
    WHEN v_product_type = 'digital' THEN 'freemius'
    ELSE 'stripe'
  END;
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
      product_type,
      payment_provider,
      upc,
      stock,
      status,
      short_description,
      description_json,
      metadata,
      price,
      prices,
      sale_price,
      sale_prices,
      freemius_plan_id,
      freemius_product_id,
      language_id,
      translation_group_id
    )
    VALUES (
      product_payload->>'title',
      product_payload->>'slug',
      product_payload->>'sku',
      v_product_type,
      v_payment_provider,
      NULLIF(product_payload->>'upc', ''),
      CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      COALESCE(product_payload->>'status', 'draft'),
      NULLIF(product_payload->>'short_description', ''),
      product_payload->'description_json',
      COALESCE(product_payload->'metadata', '{}'::jsonb),
      COALESCE((product_payload->>'price')::integer, 0),
      COALESCE(product_payload->'prices', '{}'::jsonb),
      CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      CASE
        WHEN product_payload ? 'sale_prices' THEN COALESCE(product_payload->'sale_prices', '{}'::jsonb)
        ELSE NULL
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
      product_type = v_product_type,
      payment_provider = v_payment_provider,
      upc = NULLIF(product_payload->>'upc', ''),
      stock = CASE
        WHEN v_has_variants THEN v_total_variant_stock
        ELSE COALESCE((product_payload->>'stock')::integer, 0)
      END,
      status = COALESCE(product_payload->>'status', status),
      short_description = NULLIF(product_payload->>'short_description', ''),
      description_json = product_payload->'description_json',
      metadata = COALESCE(product_payload->'metadata', '{}'::jsonb),
      price = COALESCE((product_payload->>'price')::integer, 0),
      prices = COALESCE(product_payload->'prices', '{}'::jsonb),
      sale_price = CASE
        WHEN product_payload ? 'sale_price' AND product_payload->>'sale_price' <> '' THEN
          (product_payload->>'sale_price')::integer
        ELSE
          NULL
      END,
      sale_prices = CASE
        WHEN product_payload ? 'sale_prices' THEN COALESCE(product_payload->'sale_prices', '{}'::jsonb)
        ELSE NULL
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
        upc,
        price,
        prices,
        sale_price,
        sale_prices,
        stock_quantity,
        main_media_id
      )
      VALUES (
        v_product_id,
        v_variant->>'sku',
        NULLIF(v_variant->>'upc', ''),
        COALESCE((v_variant->>'price')::integer, 0),
        COALESCE(v_variant->'prices', '{}'::jsonb),
        CASE
          WHEN v_variant ? 'sale_price' AND v_variant->>'sale_price' <> '' THEN
            (v_variant->>'sale_price')::integer
          ELSE
            NULL
        END,
        CASE
          WHEN v_variant ? 'sale_prices' THEN COALESCE(v_variant->'sale_prices', '{}'::jsonb)
          ELSE NULL
        END,
        COALESCE((v_variant->>'stock_quantity')::integer, 0),
        NULLIF(v_variant->>'main_media_id', '')::uuid
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
