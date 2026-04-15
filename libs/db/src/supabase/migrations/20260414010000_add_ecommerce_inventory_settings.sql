-- Adds ecommerce inventory settings, stock-related storefront translations,
-- and a shared order inventory deduction function.

INSERT INTO public.site_settings (key, value)
VALUES (
  'ecommerce_inventory_settings',
  '{"track_quantities": true}'::jsonb
)
ON CONFLICT (key) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'inventory_deducted_at'
  ) THEN
    ALTER TABLE public.orders
      ADD COLUMN inventory_deducted_at timestamptz;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_ecommerce_track_quantities()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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

CREATE OR REPLACE FUNCTION public.apply_order_inventory_deduction(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_track_quantities boolean := public.get_ecommerce_track_quantities();
  v_item record;
  v_variant_product_id uuid;
  v_inventory_deducted_at timestamptz;
BEGIN
  IF NOT v_track_quantities THEN
    RETURN;
  END IF;

  SELECT inventory_deducted_at
    INTO v_inventory_deducted_at
  FROM public.orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND OR v_inventory_deducted_at IS NOT NULL THEN
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
    IF v_item.variant_id IS NOT NULL THEN
      v_variant_product_id := NULL;

      UPDATE public.product_variants
      SET
        stock_quantity = GREATEST(COALESCE(stock_quantity, 0) - v_item.quantity, 0),
        updated_at = now()
      WHERE id = v_item.variant_id
      RETURNING product_id INTO v_variant_product_id;

      IF v_variant_product_id IS NOT NULL THEN
        UPDATE public.products
        SET
          stock = COALESCE((
            SELECT SUM(COALESCE(stock_quantity, 0))
            FROM public.product_variants
            WHERE product_id = v_variant_product_id
          ), 0),
          updated_at = now()
        WHERE id = v_variant_product_id;
      END IF;
    ELSIF v_item.product_id IS NOT NULL THEN
      UPDATE public.products
      SET
        stock = GREATEST(COALESCE(stock, 0) - v_item.quantity, 0),
        updated_at = now()
      WHERE id = v_item.product_id;
    END IF;
  END LOOP;

  UPDATE public.orders
  SET
    inventory_deducted_at = now(),
    updated_at = now()
  WHERE id = p_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ecommerce_track_quantities() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ecommerce_track_quantities() TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_order_inventory_deduction(uuid) TO service_role;

INSERT INTO public.translations (key, translations)
VALUES
  (
    'ecommerce.inventory_item_unavailable',
    '{"en": "Sorry, {item} is no longer available.", "fr": "Desole, {item} n''est plus disponible."}'::jsonb
  ),
  (
    'ecommerce.inventory_insufficient',
    '{"en": "Only {count} units remain for {item}.", "fr": "Il ne reste que {count} unites pour {item}."}'::jsonb
  )
ON CONFLICT (key) DO UPDATE
SET
  translations = EXCLUDED.translations,
  updated_at = now();
