-- 00000000000005_setup_functions_and_triggers.sql
-- Consolidated migration preserving original statement order within grouped sections.

-- 00000000000015_setup_core_functions_and_triggers.sql
-- Shared auth helpers and CMS timestamp triggers.

CREATE OR REPLACE FUNCTION public.get_my_claim(claim text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(current_setting('request.jwt.claims', true)::jsonb ->> claim, NULL)::jsonb
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS public.user_role
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT role = 'ADMIN' FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_flag_set boolean := false;
  user_role public.user_role;
  v_full_name text;
  v_avatar_url text;
  v_github_username text;
  v_provider text;
BEGIN
  INSERT INTO public.site_settings (key, value)
  VALUES ('is_admin_created', 'false'::jsonb)
  ON CONFLICT (key) DO NOTHING;

  SELECT COALESCE(value::jsonb::boolean, false)
    INTO admin_flag_set
  FROM public.site_settings
  WHERE key = 'is_admin_created'
  FOR UPDATE;

  IF admin_flag_set = false THEN
    user_role := 'ADMIN'::public.user_role;

    UPDATE public.site_settings
    SET value = 'true'::jsonb
    WHERE key = 'is_admin_created';
  ELSE
    user_role := 'USER'::public.user_role;
  END IF;

  v_full_name := NEW.raw_user_meta_data->>'full_name';
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  v_provider := NEW.raw_app_meta_data->>'provider';

  IF v_provider = 'github' OR (NEW.raw_user_meta_data->>'iss') LIKE '%github%' THEN
    v_github_username := COALESCE(
      NEW.raw_user_meta_data->>'user_name',
      NEW.raw_user_meta_data->>'preferred_username'
    );
  ELSE
    v_github_username := NULL;
  END IF;

  INSERT INTO public.profiles (
    id,
    role,
    full_name,
    avatar_url,
    github_username
  )
  VALUES (
    NEW.id,
    user_role,
    v_full_name,
    v_avatar_url,
    v_github_username
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    github_username = EXCLUDED.github_username;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  missing_user record;
  v_github_username text;
  v_full_name text;
  v_role public.user_role;
  v_admin_exists boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'ADMIN')
    INTO v_admin_exists;

  FOR missing_user IN
    SELECT *
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM public.profiles)
    ORDER BY created_at ASC
  LOOP
    IF missing_user.raw_app_meta_data->>'provider' = 'github'
       OR (missing_user.raw_user_meta_data->>'iss') LIKE '%github%' THEN
      v_github_username := COALESCE(
        missing_user.raw_user_meta_data->>'user_name',
        missing_user.raw_user_meta_data->>'preferred_username'
      );
    ELSE
      v_github_username := NULL;
    END IF;

    v_full_name := missing_user.raw_user_meta_data->>'full_name';

    IF v_admin_exists = false THEN
      v_role := 'ADMIN';
      v_admin_exists := true;

      INSERT INTO public.site_settings (key, value)
      VALUES ('is_admin_created', 'true'::jsonb)
      ON CONFLICT (key) DO UPDATE
      SET value = 'true'::jsonb;
    ELSE
      v_role := 'USER';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, avatar_url, github_username)
    VALUES (
      missing_user.id,
      v_role,
      v_full_name,
      missing_user.raw_user_meta_data->>'avatar_url',
      v_github_username
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  _new record;
BEGIN
  _new := NEW;
  _new.updated_at = now();
  RETURN _new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_languages_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_media_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_posts_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_pages_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_blocks_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_navigation_items_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_updated_at ON public.translations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_current_timestamp_updated_at();

DROP TRIGGER IF EXISTS on_languages_update ON public.languages;
CREATE TRIGGER on_languages_update
  BEFORE UPDATE ON public.languages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_languages_update();

DROP TRIGGER IF EXISTS on_media_update ON public.media;
CREATE TRIGGER on_media_update
  BEFORE UPDATE ON public.media
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_media_update();

DROP TRIGGER IF EXISTS on_posts_update ON public.posts;
CREATE TRIGGER on_posts_update
  BEFORE UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_posts_update();

DROP TRIGGER IF EXISTS on_pages_update ON public.pages;
CREATE TRIGGER on_pages_update
  BEFORE UPDATE ON public.pages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_pages_update();

DROP TRIGGER IF EXISTS on_blocks_update ON public.blocks;
CREATE TRIGGER on_blocks_update
  BEFORE UPDATE ON public.blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_blocks_update();

DROP TRIGGER IF EXISTS on_navigation_items_update ON public.navigation_items;
CREATE TRIGGER on_navigation_items_update
  BEFORE UPDATE ON public.navigation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_navigation_items_update();

-- 00000000000016_setup_ecommerce_functions_and_triggers.sql
-- Product RPCs, inventory sync, and invoice helpers.

CREATE OR REPLACE FUNCTION public.get_ecommerce_track_quantities()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_value jsonb;
  v_raw text;
BEGIN
  SELECT value
    INTO v_value
  FROM public.site_settings
  WHERE key = 'ecommerce_inventory_settings';

  IF v_value IS NULL THEN
    RETURN true;
  END IF;

  IF jsonb_typeof(v_value) = 'object' THEN
    v_raw := NULLIF(v_value->>'track_quantities', '');
  ELSE
    v_raw := NULLIF(trim(BOTH '"' FROM v_value::text), '');
  END IF;

  IF v_raw IS NULL THEN
    RETURN true;
  END IF;

  IF lower(v_raw) IN ('false', 'f', '0', 'no', 'off') THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.format_order_invoice_number(p_value bigint)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT 'INV-' || lpad(p_value::text, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.generate_order_invoice_number()
RETURNS text
LANGUAGE sql
VOLATILE
SET search_path = ''
AS $$
  SELECT public.format_order_invoice_number(nextval('public.order_invoice_number_seq'));
$$;

CREATE OR REPLACE FUNCTION public.assign_order_invoice_metadata(
  p_order_id uuid,
  p_paid_at timestamptz DEFAULT now()
)
RETURNS TABLE(invoice_number text, paid_at timestamptz)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_effective_paid_at timestamptz;
BEGIN
  SELECT *
    INTO v_order
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order % not found', p_order_id;
  END IF;

  v_effective_paid_at := COALESCE(v_order.paid_at, p_paid_at, now(), v_order.created_at);

  UPDATE public.orders
  SET
    invoice_number = COALESCE(v_order.invoice_number, public.generate_order_invoice_number()),
    paid_at = v_effective_paid_at
  WHERE id = p_order_id
  RETURNING orders.invoice_number, orders.paid_at
  INTO invoice_number, paid_at;

  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_product_with_variants(product_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public
AS $function$
DECLARE
  v_product_id uuid := NULLIF(product_payload->>'id', '')::uuid;
  v_translation_group_id uuid := NULLIF(product_payload->>'translation_group_id', '')::uuid;
  v_product_type text := CASE
    WHEN product_payload->>'product_type' IN ('physical', 'digital') THEN
      product_payload->>'product_type'
    WHEN NULLIF(product_payload->>'freemius_product_id', '') IS NOT NULL
      OR NULLIF(product_payload->>'freemius_plan_id', '') IS NOT NULL THEN
      'digital'
    ELSE
      'physical'
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
    SELECT id
    FROM public.product_variants
    WHERE product_id = v_product_id
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

CREATE OR REPLACE FUNCTION public.handle_inventory_items_update()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_inventory_cache_for_sku(p_sku text)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_quantity integer := 0;
BEGIN
  IF NULLIF(trim(p_sku), '') IS NULL THEN
    RETURN;
  END IF;

  SELECT quantity
    INTO v_quantity
  FROM public.inventory_items
  WHERE sku = p_sku
  LIMIT 1;

  v_quantity := COALESCE(v_quantity, 0);

  UPDATE public.product_variants
  SET
    stock_quantity = v_quantity,
    updated_at = now()
  WHERE sku = p_sku;

  UPDATE public.products AS products
  SET
    stock = v_quantity,
    updated_at = now()
  WHERE products.sku = p_sku
    AND NOT EXISTS (
      SELECT 1
      FROM public.product_variants
      WHERE product_id = products.id
    );

  UPDATE public.products AS products
  SET
    stock = COALESCE((
      SELECT SUM(COALESCE(inventory.quantity, 0))
      FROM public.product_variants AS variants
      LEFT JOIN public.inventory_items AS inventory
        ON inventory.sku = variants.sku
      WHERE variants.product_id = products.id
    ), 0),
    updated_at = now()
  WHERE EXISTS (
    SELECT 1
    FROM public.product_variants AS variants
    WHERE variants.product_id = products.id
      AND variants.sku = p_sku
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_inventory_item_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_sku text := COALESCE(NEW.sku, OLD.sku);
BEGIN
  PERFORM public.sync_inventory_cache_for_sku(v_sku);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_order_inventory_deduction(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_track_quantities boolean := public.get_ecommerce_track_quantities();
  v_item record;
  v_inventory_deducted_at timestamptz;
  v_sku text;
  v_current_quantity integer;
BEGIN
  SELECT inventory_deducted_at
    INTO v_inventory_deducted_at
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_inventory_deducted_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF NOT v_track_quantities THEN
    UPDATE public.orders
    SET inventory_deducted_at = now()
    WHERE id = p_order_id;

    RETURN;
  END IF;

  FOR v_item IN
    SELECT
      product_id,
      variant_id,
      SUM(quantity)::integer AS quantity
    FROM public.order_items
    WHERE order_id = p_order_id
    GROUP BY product_id, variant_id
  LOOP
    v_sku := NULL;
    v_current_quantity := 0;

    IF v_item.variant_id IS NOT NULL THEN
      SELECT
        sku,
        GREATEST(COALESCE(stock_quantity, 0), 0)
        INTO v_sku,
             v_current_quantity
      FROM public.product_variants
      WHERE id = v_item.variant_id
      LIMIT 1;
    ELSIF v_item.product_id IS NOT NULL THEN
      SELECT
        sku,
        GREATEST(COALESCE(stock, 0), 0)
        INTO v_sku,
             v_current_quantity
      FROM public.products
      WHERE id = v_item.product_id
      LIMIT 1;
    END IF;

    IF NULLIF(trim(v_sku), '') IS NULL THEN
      CONTINUE;
    END IF;

    INSERT INTO public.inventory_items (sku, quantity)
    VALUES (v_sku, v_current_quantity)
    ON CONFLICT (sku) DO NOTHING;

    UPDATE public.inventory_items
    SET
      quantity = GREATEST(COALESCE(quantity, 0) - v_item.quantity, 0),
      updated_at = now()
    WHERE sku = v_sku;
  END LOOP;

  UPDATE public.orders
  SET inventory_deducted_at = now()
  WHERE id = p_order_id;
END;
$$;

DROP TRIGGER IF EXISTS on_inventory_items_update ON public.inventory_items;
CREATE TRIGGER on_inventory_items_update
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_items_update();

DROP TRIGGER IF EXISTS on_inventory_item_change ON public.inventory_items;
CREATE TRIGGER on_inventory_item_change
  AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_inventory_item_change();

GRANT EXECUTE ON FUNCTION public.get_ecommerce_track_quantities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ecommerce_track_quantities() TO service_role;
GRANT EXECUTE ON FUNCTION public.generate_order_invoice_number() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_order_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.assign_order_invoice_metadata(uuid, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_order_invoice_metadata(uuid, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_product_with_variants(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_inventory_cache_for_sku(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_inventory_cache_for_sku(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO service_role;
